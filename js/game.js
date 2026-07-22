const app = document.getElementById('app');

    const EXCLUDED_ROLE_ID = 'superintendente';
    const EXCLUDED_ROLE_TITLE = 'superintendente';

    function isExcludedCategory(category) {
      if (!category) return false;
      const id = String(category.id || '').trim().toLowerCase();
      const title = String(category.title || '').trim().toLowerCase();
      return id === EXCLUDED_ROLE_ID || title === EXCLUDED_ROLE_TITLE;
    }

    function getAvailableCategories() {
      return (window.positionCategories || []).filter(category => !isExcludedCategory(category));
    }

    function getVisibleRoleOptions() {
      return roleOptions.filter(role => !isExcludedCategory(role));
    }

    const roleOptions = ((window.positionCategories && window.positionCategories.length)
      ? window.positionCategories
      : (window.roleOptions || [])).map(role => ({
      id: role.id,
      title: role.title,
      icon: role.icon,
      description: role.description,
      color: role.color
    }));
    const departments = (window.departments || []).map(dep => ({ ...dep }));
    const ONBOARDING_STORAGE_KEY = 'careerQuestOnboardingSeenV1';
    const USER_DATA_STORAGE_KEY = 'careerQuestUsersDataV1';
    const GOOGLE_SHEETS_WEBHOOK_URL = String(window.CAREER_QUEST_WEBHOOK_URL || '').trim();
    const REQUIRED_MISSIONS_FOR_PASSPORT_DOWNLOAD = 4;
    const XP_FOR_NEW_DEPARTMENT_VISIT = 8;
    const XP_FOR_NEW_POSITION_VISIT = 5;
    const onboardingSteps = [
      {
        selector: '[data-guide="hud-xp"]',
        title: 'Tu progreso',
        description: 'Aqui ves tu nivel y XP actual. Al responder mini juegos subes de nivel.'
      },
      {
        selector: '[data-guide="category-filter"]',
        title: 'Filtro por categoria',
        description: 'Usa este selector para enfocarte en un tipo de puesto y limpiar el mapa visualmente.'
      },
      {
        selector: '.building',
        title: 'Puntos del mapa',
        description: 'Estos puntos representan areas. Haz clic para entrar y explorar sus puestos.'
      },
      {
        selector: '[data-guide="hud-actions"]',
        title: 'Accesos rapidos',
        description: 'Desde aqui abres Passport, Misiones, Mapa y Perfil en cualquier momento.'
      },
      {
        selector: '[data-guide="passport-btn"]',
        title: 'Passport final',
        description: 'Cuando completes tus misiones, descarga tu pasaporte y envialo.'
      }
    ];
    let onboardingResizeHandler = null;
    let html2CanvasLoaderPromise = null;

    // Asignar quizzes a cada departamento
    const quizzesByArea = window.quizzesByArea || {};
    departments.forEach(dep => {
      const depSlugId = (dep.id || '').replace(/\s+/g, '-').toLowerCase();
      if (quizzesByArea[depSlugId]) {
        dep.quiz = quizzesByArea[depSlugId];
      } else {
        dep.quiz = [];
      }
    });

    function normalizeText(value) {
      return String(value || '')
        .replace(/^\s*\d+[\.)-]?\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function uniqueTexts(items) {
      const seen = new Set();
      return items.filter(item => {
        const key = normalizeText(item).toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function hashString(value) {
      return Array.from(String(value || '')).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }

    function buildChoiceQuestionData(correctOption, candidates, fallbackPool, desiredCount, seed) {
      const normalizedCorrect = normalizeText(correctOption) || 'No definida';
      const wantedDistractors = Math.max(1, desiredCount - 1);
      const uniqueCandidateDistractors = uniqueTexts(candidates)
        .filter(item => item.toLowerCase() !== normalizedCorrect.toLowerCase());
      const uniqueFallbackDistractors = uniqueTexts(fallbackPool)
        .filter(item => item.toLowerCase() !== normalizedCorrect.toLowerCase());

      const distractors = [];
      const addUniqueDistractor = (item) => {
        if (!item) return;
        const normalized = normalizeText(item);
        if (!normalized) return;
        if (normalized.toLowerCase() === normalizedCorrect.toLowerCase()) return;
        if (distractors.some(existing => existing.toLowerCase() === normalized.toLowerCase())) return;
        distractors.push(normalized);
      };

      uniqueCandidateDistractors.forEach(addUniqueDistractor);
      uniqueFallbackDistractors.forEach(addUniqueDistractor);

      let fillerIndex = 1;
      while (distractors.length < wantedDistractors) {
        addUniqueDistractor(`Alternativa adicional ${fillerIndex}`);
        fillerIndex += 1;
      }

      const options = [normalizedCorrect, ...distractors.slice(0, wantedDistractors)];
      const rotation = hashString(seed) % options.length;
      const rotatedOptions = options
        .slice(rotation)
        .concat(options.slice(0, rotation));

      return {
        options: rotatedOptions,
        answer: rotatedOptions.findIndex(option => option === normalizedCorrect)
      };
    }

    function createPositionQuiz(dep, position) {
      const functions = uniqueTexts(position.functions || []);
      const allDepFunctions = uniqueTexts(
        (dep.positions || []).reduce((acc, pos) => {
          return acc.concat(pos.functions || []);
        }, [])
      );
      const otherFunctions = allDepFunctions.filter(func =>
        !functions.some(own => own.toLowerCase() === func.toLowerCase())
      );

      const fallbackDistractors = [
        'Diseñar campañas masivas de marketing para redes sociales.',
        'Programar videojuegos para entretenimiento corporativo.',
        'Realizar cirugías de alta complejidad en campo.'
      ];

      const correctFunction = functions[0] || `${position.title} coordina procesos clave de ${dep.title}.`;
      const functionChoiceData = buildChoiceQuestionData(
        correctFunction,
        otherFunctions,
        fallbackDistractors,
        3,
        `${dep.id}:${position.title}:function`
      );

      let booleanQuestion = {
        type: 'boolean',
        question: `¿Es parte del puesto ${position.title}: ${correctFunction}?`,
        answer: true
      };

      if (otherFunctions.length) {
        const falseFunction = otherFunctions[0];
        booleanQuestion = {
          type: 'boolean',
          question: `¿Es parte del puesto ${position.title}: ${falseFunction}?`,
          answer: false
        };
      }

      const speciality = normalizeText(position.speciality || position.blurb || 'No definida');
      const allSpecialities = uniqueTexts(
        (dep.positions || []).map(pos => normalizeText(pos.speciality || pos.blurb || ''))
      );
      const specialityChoiceData = buildChoiceQuestionData(
        speciality,
        allSpecialities,
        ['Administración', 'Ingeniería Industrial', 'Logística', 'Operaciones'],
        3,
        `${dep.id}:${position.title}:speciality`
      );

      return [
        {
          type: 'choice',
          question: `¿Cuál de estas funciones corresponde al puesto ${position.title}?`,
          options: functionChoiceData.options,
          answer: functionChoiceData.answer
        },
        booleanQuestion,
        {
          type: 'choice',
          question: `¿Qué especialidad base se alinea con el puesto ${position.title}?`,
          options: specialityChoiceData.options,
          answer: specialityChoiceData.answer
        }
      ];
    }

    function assignPositionQuizzes() {
      departments.forEach(dep => {
        (dep.positions || []).forEach(position => {
          position.quiz = createPositionQuiz(dep, position);
        });
      });
    }

    function getCurrentPosition(dep) {
      const positions = dep && dep.positions ? dep.positions : [];
      if (!positions.length) return null;
      if (state.currentPosition) {
        const selected = positions.find(pos => pos.title === state.currentPosition);
        if (selected) return selected;
      }
      return positions[0];
    }

    function getCurrentQuizSet(dep) {
      const position = getCurrentPosition(dep);
      if (position && Array.isArray(position.quiz) && position.quiz.length) {
        return position.quiz;
      }
      return dep && Array.isArray(dep.quiz) ? dep.quiz : [];
    }

    assignPositionQuizzes();

    // Coordenadas de edificios sobre el mapa imagen (1560x640)
    const DEPT_COORDS = {
      'almacen-de-concentrado-y-operaciones-portuarias': { x: 185, y: 320 },
      'almacenes-y-control-de-inventario':               { x: 480, y: 205 },
      'direccion-de-logistica-y-comercial':              { x: 895, y: 265 },
      'comercial':                                       { x: 1385, y: 205 },
      'compras-y-contratos':                             { x: 480, y: 415 },
      'planeamiento-de-inventario':                      { x: 820, y: 440 },
      'transporte-y-trafico-internacional':              { x: 1285, y: 455 }
    };
    departments.forEach(dep => {
      if (DEPT_COORDS[dep.id]) {
        dep.x = DEPT_COORDS[dep.id].x;
        dep.y = DEPT_COORDS[dep.id].y;
      }
    });

    const state = {
      screen: 'splash',
      currentRole: null,
      currentCategory: null,
      currentDepartment: null,
      currentPosition: null,
      currentQuizIndex: 0,
      discoveredDepartments: [],
      discoveredPositions: [],
      visitedDepartments: [],
      visitedPositions: [],
      xp: 0,
      level: 1,
      completedQuizzes: 0,
      quizAttempts: 0,
      achievements: [],
      quizAnswered: false,
      quizLocked: false,
      avatarPosition: { x: 700, y: 490 },
      moving: false,
      camera: { x: 0, y: 0 },
      quizSelection: [],
      pendingDepartment: null,
      lastAchievement: null,
      toastTimer: null,
      categoryMenuOpen: false,
      missionRewardsClaimed: [],
      onboardingSeen: false,
      onboardingActive: false,
      onboardingStep: 0
    };

    let audioCtx = null;

    function waitForWelcomeInteraction() {
      return new Promise((resolve) => {
        let completed = false;

        const done = () => {
          if (completed) return;
          completed = true;
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mousedown', onMouseDown);
          document.removeEventListener('touchstart', onTouchStart);
          resolve();
        };

        const onMouseMove = () => done();
        const onMouseDown = (event) => {
          if (event.button === 0) done();
        };
        const onTouchStart = () => done();

        document.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('touchstart', onTouchStart, { passive: true });
      });
    }

    function init() {
      state.onboardingSeen = hasSeenOnboarding();
      state.screen = 'splash';
      renderSplash();
      waitForWelcomeInteraction().then(() => {
        if (state.screen === 'splash') {
          renderScreen('welcome');
        }
      });
    }

    function hasSeenOnboarding() {
      try {
        return window.localStorage && localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
      } catch (error) {
        return false;
      }
    }

    function setOnboardingSeen() {
      state.onboardingSeen = true;
      try {
        if (window.localStorage) {
          localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
        }
      } catch (error) {
        // noop
      }
    }

    function renderScreen(name) {
      state.screen = name;
      document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
      playTone('transition');
      if (name === 'splash') renderSplash();
      else if (name === 'welcome') renderWelcome();
      else if (name === 'role') renderRoleSelection();
      else if (name === 'profile') renderProfileScreen();
      else if (name === 'map') renderMap();
      else if (name === 'positions') renderPositionsList();
      else if (name === 'department') renderDepartmentScene();
      else if (name === 'quiz') renderQuizScene();
      else if (name === 'collection') renderCollection();
      else if (name === 'summary') renderSummary();
      updateHud();
      const overlay = document.createElement('div');
      overlay.className = 'transition-overlay';
      app.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));
      setTimeout(() => overlay.remove(), 380);
    }

    function renderSplash() {
      app.innerHTML = `
        <section id="splash" class="screen splash active screen-enter">
          <div class="splash-card">
            <div class="logo-badge pulse">
              <img src="images/Chinalco.png" alt="Chinalco" />
            </div>
            <p class="eyebrow">Roadshow de movilidad horizontal</p>
            <h1>Career Quest</h1>
            <p>Descubre tu próximo desafío dentro de Chinalco.</p>
            <div class="loader"><div class="loader-bar" id="loaderBar"></div></div>
            <p>Preparando la aventura…</p>
          </div>
        </section>
      `;
      requestAnimationFrame(() => {
        const loaderBar = document.getElementById('loaderBar');
        if (loaderBar) {
          loaderBar.style.width = '100%';
        }
      });
    }

    function renderWelcome() {
      app.innerHTML = `
        <section id="welcome" class="screen welcome active screen-enter">
          <div class="hero-card">
            <div>
              <span class="eyebrow">Inicio de misión</span>
              <h2>En Chinalco creemos que el crecimiento comienza cuando conocemos nuevos desafíos.</h2>
              <div class="typing" id="typingText"></div>
              <button class="hero-button" onclick="startAdventure()">Comenzar aventura</button>
            </div>
            <div class="right-pane">
              <div class="hero-badge">
                <div class="mini-figure">
                  <div class="avatar idle" style="left: 60px; top: 24px; transform:scale(1.15);">
                    ${avatarSVG()}
                  </div>
                </div>
              </div>
              <div>
                <div class="label" style="color:var(--muted); text-transform:uppercase; letter-spacing:.18em; font-size:12px;">Tu viaje</div>
                <div style="font-size:18px; font-weight:700; margin-top:6px;">Explora gerencias, descubre puestos y gana XP.</div>
              </div>
            </div>
          </div>
        </section>
      `;
      const text = 'Hoy iniciarás una aventura para descubrir oportunidades dentro de la organización y conocer cómo la movilidad horizontal puede abrirte nuevas puertas.';
      typeWriter(text, 'typingText');
    }

    function startAdventure() {
      renderScreen('role');
    }

    function renderRoleSelection() {
      const visibleRoleOptions = getVisibleRoleOptions();
      app.innerHTML = `
        <section id="selection" class="screen selection active screen-enter">
          <div class="section-header">
            <div>
              <h3>Selecciona tu rol</h3>
              <p>Elige el perfil con el que quieres iniciar tu exploración.</p>
            </div>
            <button class="secondary-btn" onclick="renderScreen('welcome')">Volver</button>
          </div>
          <div class="role-grid">
            ${visibleRoleOptions.map(role => `
              <article class="role-card" onclick="selectRole('${role.id}')" style="border-color:${role.color}44;">
                <div class="icon">${role.icon || '🎯'}</div>
                <h4>${role.title}</h4>
                <p>${role.description || 'Explora áreas y descubre oportunidades de carrera.'}</p>
              </article>
            `).join('')}
          </div>
        </section>
      `;
    }

    function renderProfileScreen() {
      if (!window.CareerProfile || !window.CareerProfileData) {
        showToast('No se pudo cargar Career Profile. Revisa los scripts del proyecto.');
        return;
      }
      CareerProfile.render(app, {
        areas: departments,
        onSave: (savedProfile) => {
          saveRegistrationData(savedProfile);
          state.avatarPosition = { x: 150, y: 330 };
          showToast(`Perfil guardado. Bienvenido, ${savedProfile.name}.`);
          renderScreen('map');
        }
      });
    }

    function renderMap() {
      const role = state.currentRole ? roleOptions.find(r => r.id === state.currentRole) : null;
      const currentDep = state.currentDepartment ? departments.find(d => d.id === state.currentDepartment) : null;
      const categories = getAvailableCategories();
      const selectedCategory = categories.find(c => c.id === state.currentCategory);
      const isMobileViewport = window.innerWidth <= 760;
      const categoryPanelStyle = isMobileViewport
        ? 'position: absolute; top: 84px; left: 10px; right: 10px; z-index: 100; min-width: 0;'
        : 'position: absolute; top: 96px; left: 24px; z-index: 100; min-width: 210px;';
      
      // Filtrar departamentos si hay categoría seleccionada
      const visibleDepartments = state.currentCategory 
        ? (selectedCategory && Array.isArray(selectedCategory.areas)
          ? departments.filter(dep => selectedCategory.areas.includes(dep.title))
          : departments)
        : departments;
      
      app.innerHTML = `
        <section id="map" class="screen map-screen active screen-enter">
          ${renderHud()}
          <div style="${categoryPanelStyle}">
            <button data-guide="category-filter" onclick="toggleCategoryMenu()" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 16px; background: rgba(10, 18, 38, 0.92); backdrop-filter: blur(12px); border: 1px solid rgba(100, 200, 255, 0.22); border-radius: ${state.categoryMenuOpen ? '12px 12px 0 0' : '12px'}; color: #f7fbff; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
              <span style="font-size:16px;">${selectedCategory ? selectedCategory.icon : '🗂️'}</span>
              <span style="flex:1; text-align:left;">${selectedCategory ? selectedCategory.title : 'Elige tu categoría'}</span>
              <span style="font-size:11px; color:rgba(255,255,255,0.45); display:inline-block; transform: rotate(${state.categoryMenuOpen ? '180deg' : '0deg'});">▼</span>
            </button>
            ${state.categoryMenuOpen ? `
            <div style="background: rgba(10, 18, 38, 0.96); backdrop-filter: blur(12px); border: 1px solid rgba(100, 200, 255, 0.22); border-top: none; border-radius: 0 0 12px 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
              ${categories.map(cat => `
                <button onclick="filterByCategory('${cat.id}')" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: ${state.currentCategory === cat.id ? cat.color + '20' : 'transparent'}; border: none; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${state.currentCategory === cat.id ? cat.color : '#c8dff5'}; font-size: 13px; cursor: pointer; width: 100%; text-align: left; font-weight: ${state.currentCategory === cat.id ? '700' : '400'};">
                  <span style="font-size:15px;">${cat.icon}</span>
                  <span>${cat.title}</span>
                  ${state.currentCategory === cat.id ? `<span style="margin-left:auto; width:6px; height:6px; border-radius:50%; background:${cat.color};"></span>` : ''}
                </button>
              `).join('')}
              ${state.currentCategory ? `
                <button onclick="clearCategoryFilter()" style="display:flex; align-items:center; gap:8px; padding: 10px 16px; background: transparent; border: none; color: #8fafc8; font-size: 12px; cursor: pointer; width: 100%; text-align: left;">✕ Ver todas las áreas</button>
              ` : ''}
            </div>` : ''}
          </div>
          <div class="map-backdrop"></div>
          <div class="map-shell" data-guide="map-shell">
            <div class="map-world" id="mapWorld">
              <svg class="map-svg" viewBox="0 0 1560 640" role="img" aria-label="Mapa de aventura">
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <image href="images/map.png" x="0" y="0" width="1560" height="640" preserveAspectRatio="xMidYMid meet"/>
                ${visibleDepartments.map(dep => `${renderDepartmentBuilding(dep)}`).join('')}
              </svg>
              <div class="avatar ${state.moving ? 'walking' : 'idle'}" id="avatar" style="left:${state.avatarPosition.x}px; top:${state.avatarPosition.y}px;">
                ${avatarSVG()}
              </div>
            </div>
          </div>
        </section>
      `;
      requestAnimationFrame(() => {
        placeAvatarAt(state.avatarPosition.x, state.avatarPosition.y);
        updateCamera();
        if (state.onboardingActive) {
          renderOnboardingStep();
        } else if (!state.onboardingSeen) {
          startOnboarding();
        }
      });
    }

    function startOnboarding() {
      if (state.screen !== 'map' || state.onboardingSeen) return;
      state.onboardingActive = true;
      state.onboardingStep = 0;
      renderOnboardingStep();
    }

    function cleanupOnboardingListeners() {
      if (onboardingResizeHandler) {
        window.removeEventListener('resize', onboardingResizeHandler);
        onboardingResizeHandler = null;
      }
    }

    function closeOnboarding(markSeen) {
      const overlay = document.getElementById('onboardingOverlay');
      if (overlay) overlay.remove();
      cleanupOnboardingListeners();
      state.onboardingActive = false;
      if (markSeen) setOnboardingSeen();
    }

    function renderOnboardingStep() {
      if (!state.onboardingActive || state.screen !== 'map') return;
      const step = onboardingSteps[state.onboardingStep];
      if (!step) {
        closeOnboarding(true);
        return;
      }

      const appRect = app.getBoundingClientRect();
      const target = document.querySelector(step.selector);
      const targetRect = target ? target.getBoundingClientRect() : null;

      const existing = document.getElementById('onboardingOverlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'onboardingOverlay';
      overlay.className = 'onboarding-overlay';

      let highlightStyle = 'display:none;';
      if (targetRect) {
        const top = Math.max(0, targetRect.top - appRect.top - 6);
        const left = Math.max(0, targetRect.left - appRect.left - 6);
        const width = Math.max(40, targetRect.width + 12);
        const height = Math.max(40, targetRect.height + 12);
        highlightStyle = `top:${top}px;left:${left}px;width:${width}px;height:${height}px;`;
      }

      const isFirst = state.onboardingStep === 0;
      const isLast = state.onboardingStep === onboardingSteps.length - 1;

      overlay.innerHTML = `
        <div class="onboarding-highlight" style="${highlightStyle}"></div>
        <div class="onboarding-card">
          <div class="onboarding-step">Guia inicial · Paso ${state.onboardingStep + 1} / ${onboardingSteps.length}</div>
          <h4>${step.title}</h4>
          <p>${step.description}</p>
          <div class="onboarding-actions">
            <button class="secondary-btn" onclick="skipOnboarding()">Omitir</button>
            ${isFirst ? '' : '<button class="secondary-btn" onclick="prevOnboardingStep()">Anterior</button>'}
            <button class="primary-btn" onclick="nextOnboardingStep()">${isLast ? 'Finalizar' : 'Siguiente'}</button>
          </div>
        </div>
      `;

      app.appendChild(overlay);

      if (!onboardingResizeHandler) {
        onboardingResizeHandler = () => {
          if (state.onboardingActive) {
            renderOnboardingStep();
          }
        };
        window.addEventListener('resize', onboardingResizeHandler);
      }
    }

    function nextOnboardingStep() {
      if (!state.onboardingActive) return;
      if (state.onboardingStep < onboardingSteps.length - 1) {
        state.onboardingStep += 1;
        renderOnboardingStep();
      } else {
        closeOnboarding(true);
        showToast('Guia completada. Ya puedes explorar libremente.');
      }
    }

    function prevOnboardingStep() {
      if (!state.onboardingActive) return;
      if (state.onboardingStep > 0) {
        state.onboardingStep -= 1;
        renderOnboardingStep();
      }
    }

    function skipOnboarding() {
      closeOnboarding(true);
      showToast('Guia omitida. Puedes comenzar a explorar.');
    }

    function renderPositionsList() {
      const dep = departments.find(d => d.id === state.currentDepartment);
      if (!dep) return;

      // Obtener la categoría seleccionada
      const categories = getAvailableCategories();
      const selectedCategory = categories.find(c => c.id === state.currentCategory);
      
      // Filtrar posiciones por categoría si hay
      const filteredPositions = selectedCategory 
        ? dep.positions.filter(pos => pos.category === selectedCategory.title)
        : dep.positions;
      
      app.innerHTML = `
        <section id="positions" class="screen department-screen active screen-enter">
          ${renderHud()}
          <div class="positions-container">
            <div class="positions-header" style="background: linear-gradient(135deg, ${dep.color}20 0%, ${dep.color}40 100%); border-left: 5px solid ${dep.color}; padding: 28px; border-radius: 16px; margin-bottom: 24px;">
              <div class="meta" style="color: ${dep.color}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 8px;">${selectedCategory ? selectedCategory.icon + ' ' + selectedCategory.title + ' • ' : ''}${dep.mapLabel || dep.title}</div>
              <h2 style="font-size: 40px; margin: 0 0 12px 0; line-height: 1.1;">${dep.title}</h2>
              <p style="margin: 0 0 16px 0; color: #dceaf8; line-height: 1.6; font-size: 14px;">${dep.description}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #f7fbff; text-transform: uppercase; letter-spacing: 0.08em;">Puestos disponibles (${filteredPositions.length})</h3>
              ${filteredPositions.length === 0 ? `
                <div style="padding: 20px; background: rgba(255, 100, 100, 0.1); border: 1px solid rgba(255, 100, 100, 0.2); border-radius: 8px; color: #ff6464;">
                  No hay puestos en la categoría seleccionada. Prueba a mostrar todas las categorías.
                </div>
              ` : `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px;">
                  ${filteredPositions.map(pos => `
                    <div class="position-card" onclick="selectPosition('${pos.title}')" style="cursor:pointer; transition: all 0.3s ease; border: 2px solid rgba(${dep.color.substring(1).match(/.{1,2}/g).map(x => parseInt(x, 16)).join(', ')}, 0.3); border-left: 4px solid ${dep.color}; padding: 16px; border-radius: 12px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); display: flex; flex-direction: column;">
                      <strong style="font-size: 15px; color: #f7fbff; margin-bottom: 8px; line-height: 1.3; word-break: break-word;">${pos.title}</strong>
                      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 12px; color: var(--muted);">${pos.level}</span>
                        ${pos.functions && pos.functions.length > 0 ? `<span style="color: var(--accent); font-size: 11px; background: rgba(${dep.color.substring(1).match(/.{1,2}/g).map(x => parseInt(x, 16)).join(', ')}, 0.2); padding: 4px 8px; border-radius: 4px; white-space: nowrap;">📋 ${pos.functions.length}</span>` : ''}
                      </div>
                      <span style="font-size: 13px; color: #dceaf8; margin-bottom: 10px; display: block; line-height: 1.4; flex-grow: 1;">${pos.blurb}</span>
                      <span style="font-size: 11px; color: var(--accent); display: inline-block;">Ver detalles →</span>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
            
            <div style="margin-top: 24px;">
              <button class="secondary-btn" onclick="renderScreen('map')">Volver al mapa</button>
            </div>
          </div>
        </section>
      `;
      updateHud();
    }

    function renderDepartmentScene() {
      const dep = departments.find(d => d.id === state.currentDepartment);
      if (!dep) return;

      // Filtrar posiciones por categoría si está seleccionada
      const categories = getAvailableCategories();
      const selectedCategory = categories.find(c => c.id === state.currentCategory);
      const availablePositions = selectedCategory 
        ? dep.positions.filter(pos => pos.category === selectedCategory.title)
        : dep.positions;

      const position = state.currentPosition ? availablePositions.find(p => p.title === state.currentPosition) : availablePositions[0];
      if (!position) return;

      const careers = String(position.carrera_afin || '')
        .split(/\n|,/)
        .map(item => item.trim())
        .filter(item => item && item.toLowerCase() !== 'nan');

      app.innerHTML = `
        <section id="department" class="screen department-screen active screen-enter">
          ${renderHud()}
          <div class="department-shell">
            <div class="department-card">
              <h3>${position.title}</h3>
              <p style="margin:0 0 10px 0; color:#cfe5fa; font-size:14px;"><strong style="color:#f1f8ff;">Área:</strong> ${dep.title}</p>
              <h5 style="margin:0 0 8px 0; font-size:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.08em;">Detalles del puesto</h5>
              <p>${dep.description}</p>
              ${position.speciality || position.blurb ? `<p style="margin:10px 0 0 0; color:#c8ddf2; font-size:13px;"><strong style="color:#e7f4ff;">Especialidad:</strong> ${position.speciality || position.blurb}</p>` : ''}
              <div style="margin-top:14px; padding:14px; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                <h5 style="margin:0 0 10px 0; font-size:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.08em;">Funciones del puesto</h5>
                ${position.functions && position.functions.length > 0 ? `
                  <ul style="margin:0; padding:0 0 0 18px; color:var(--muted); font-size:13px; line-height:1.5; max-height:300px; overflow:auto;">
                    ${position.functions.map(func => `<li style="margin-bottom:7px;">${func}</li>`).join('')}
                  </ul>
                ` : `<div style="color:var(--muted); font-size:13px;">No hay funciones registradas para este puesto.</div>`}
              </div>
              <div class="department-stats">
                ${position.experiencia_general && position.experiencia_general !== 'nan' ? `<div class="stat"><div class="stat-label">Exp. General</div><div class="stat-value">${position.experiencia_general} años</div></div>` : ''}
                ${position.experiencia_puesto && position.experiencia_puesto !== 'nan' ? `<div class="stat"><div class="stat-label">Exp. Puesto</div><div class="stat-value">${position.experiencia_puesto} años</div></div>` : ''}
                ${position.experiencia_sector && position.experiencia_sector !== 'nan' ? `<div class="stat"><div class="stat-label">Exp. Sector</div><div class="stat-value">${position.experiencia_sector} años</div></div>` : ''}
              </div>
            </div>
            <div class="info-card">
              <div class="chip-row" style="margin:0 0 14px 0;">
                ${selectedCategory ? `<span class="chip" style="background: ${selectedCategory.color}20; color: ${selectedCategory.color};">${selectedCategory.icon} ${selectedCategory.title}</span>` : ''}
                ${position.idioma ? `<span class="chip">🗣️ ${position.idioma}</span>` : ''}
              </div>
              <div style="display:grid; grid-template-columns:1fr; gap:12px; margin-top:14px;">
                <div style="padding:14px; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                  <div style="font-size:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Especialidad base</div>
                  <div style="font-size:14px; color:#e7f4ff; font-weight:700; line-height:1.4;">${position.speciality || position.blurb || 'No definida'}</div>
                </div>
                <div style="padding:14px; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                  <h5 style="margin:0 0 10px 0; font-size:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.08em;">Carreras afines</h5>
                  ${careers.length ? `
                    <ul style="margin:0; padding:0 0 0 18px; color:var(--muted); font-size:13px; line-height:1.5; max-height:220px; overflow:auto;">
                      ${careers.map(career => `<li style="margin-bottom:6px;">${career}</li>`).join('')}
                    </ul>
                  ` : `<div style="color:var(--muted); font-size:13px;">No hay carreras afines registradas.</div>`}
                </div>
              </div>
              <div class="quiz-card">
                <div class="meta">Mini juego</div>
                <h4 style="margin:10px 0 4px;">Pon a prueba tu comprensión</h4>
                <p style="margin:0; color:var(--muted);">Responde correctamente para ganar XP y registrar el puesto.</p>
                <div class="summary-actions" style="margin-top:14px;">
                  <button class="primary-btn" onclick="startQuiz('${dep.id}', '${position.title.replace(/'/g, "\\'")}')">Comenzar mini juego</button>
                  <button class="secondary-btn" onclick="renderScreen('positions')">Volver a puestos</button>
                  <button class="secondary-btn" onclick="renderScreen('map')">Volver al mapa</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;
      updateHud();
    }

    function renderQuizScene() {
      const dep = departments.find(d => d.id === state.currentDepartment);
      if (!dep) return;
      const quizSet = getCurrentQuizSet(dep);
      if (!quizSet.length) {
        app.innerHTML = `
          <section id="quiz" class="screen department-screen active screen-enter">
            ${renderHud()}
            <div class="department-shell">
              <div class="department-card">
                <div class="meta">Mini juego · ${dep.title}</div>
                <h3>No hay preguntas disponibles para este puesto.</h3>
                <p>Selecciona otro puesto para continuar explorando.</p>
              </div>
              <div class="info-card">
                <div class="summary-actions">
                  <button class="secondary-btn" onclick="renderScreen('department')">Volver al puesto</button>
                </div>
              </div>
            </div>
          </section>
        `;
        updateHud();
        return;
      }
      const question = quizSet[state.currentQuizIndex];
      app.innerHTML = `
        <section id="quiz" class="screen department-screen active screen-enter">
          ${renderHud()}
          <div class="department-shell">
            <div class="department-card">
              <div class="meta">Mini juego · ${dep.title}</div>
              <h3>${question.question}</h3>
              <p>Elige la opción más acertada y acumula XP con cada acierto.</p>
              ${renderQuizControls(question)}
            </div>
            <div class="info-card">
              <div class="meta">Progreso</div>
              <h3>Pregunta ${state.currentQuizIndex + 1} / ${quizSet.length}</h3>
              <p>Después de cada respuesta correcta, se desbloqueará una nueva pieza de la colección y una medalla de progreso.</p>
              <div class="summary-actions">
                <button class="secondary-btn" onclick="renderScreen('department')">Volver al puesto</button>
              </div>
            </div>
          </div>
        </section>
      `;
      updateHud();
    }

    function renderQuizControls(question) {
      if (question.type === 'choice') {
        return `
          <div class="quiz-options">
            ${question.options.map((option, idx) => `
              <button class="quiz-option" onclick="answerQuiz(${idx})">${option}</button>
            `).join('')}
          </div>
        `;
      }
      if (question.type === 'boolean') {
        return `
          <div class="quiz-options">
            <button class="quiz-option" onclick="answerQuiz(true)">Verdadero</button>
            <button class="quiz-option" onclick="answerQuiz(false)">Falso</button>
          </div>
        `;
      }
      return `
        <div class="quiz-stepper">
          ${question.options.map((option, idx) => `
            <button class="quiz-step" onclick="submitSequenceStep(${idx})">${option}</button>
          `).join('')}
        </div>
        <div class="quiz-options">
          <div class="quiz-option">Orden actual: ${state.quizSelection.length ? state.quizSelection.map(step => question.options[step]).join(' → ') : 'Sin selección'}</div>
          <button class="secondary-btn" onclick="clearSequence()">Limpiar</button>
          <button class="primary-btn" onclick="submitSequenceAnswer()">Enviar</button>
        </div>
      `;
    }

    function renderCollection() {
      app.innerHTML = `
        <section id="collection" class="screen collection-screen active screen-enter">
          ${renderHud()}
          <div class="section-header">
            <div>
              <h3>Álbum de descubrimientos</h3>
              <p>Tus puestos explorados quedan guardados aquí como cartas coleccionables.</p>
            </div>
            <button class="secondary-btn" onclick="renderScreen('map')">Volver al mapa</button>
          </div>
          <div class="collection-grid">
            ${departments.map(dep => {
              const discovered = state.discoveredDepartments.includes(dep.id);
              const stars = discovered ? '⭐⭐⭐' : '☆';
              return `<div class="collection-card ${discovered ? 'unlocked' : 'locked'}">
                <span class="check">${discovered ? '✓' : '○'}</span>
                <div class="rarity">${stars}</div>
                <strong>${dep.title}</strong>
                <div style="color:var(--muted); margin-top:6px;">${dep.title}</div>
              </div>`;
            }).join('')}
          </div>
          <div class="achievement-list">
            ${state.achievements.length ? state.achievements.map(a => `
              <div class="achievement">
                <div style="font-size:22px;">🏅</div>
                <strong>${a}</strong>
              </div>
            `).join('') : '<div class="achievement"><strong>Aún no tienes logros</strong><div style="color:var(--muted); margin-top:6px;">Completa misiones para despertar nuevas medallas.</div></div>'}
          </div>
        </section>
      `;
      updateHud();
    }

    function renderSummary() {
      const visited = state.discoveredDepartments.length;
      const positions = state.discoveredPositions.length;
      const completed = state.completedQuizzes;
      app.innerHTML = `
        <section id="summary" class="screen summary-screen active screen-enter">
          <div class="summary-shell">
            <div class="summary-panel">
              <div class="meta">Ceremonia final</div>
              <h3 style="font-size:34px; margin:10px 0;">Tu recorrido ha quedado registrado.</h3>
              <p style="color:#dceaf8; line-height:1.7;">Has convertido tu primera exploración en una experiencia de movilidad horizontal. Cada puesto descubierto representa una puerta nueva para tu carrera.</p>
              <div class="stats-grid">
                <div class="stat"><div class="stat-label">Tiempo</div><div class="stat-value">${Math.floor((Date.now()-state.startedAt)/60000)} min</div></div>
                <div class="stat"><div class="stat-label">Nivel</div><div class="stat-value">${state.level}</div></div>
                <div class="stat"><div class="stat-label">XP</div><div class="stat-value">${state.xp}</div></div>
                <div class="stat"><div class="stat-label">Gerencias visitadas</div><div class="stat-value">${visited}</div></div>
                <div class="stat"><div class="stat-label">Puestos conocidos</div><div class="stat-value">${positions}</div></div>
                <div class="stat"><div class="stat-label">Competencias descubiertas</div><div class="stat-value">${Math.min(8, 2 + completed)}</div></div>
              </div>
              <div class="summary-actions">
                <button class="primary-btn" onclick="showInterest()">Quiero recibir información sobre oportunidades</button>
                <button class="secondary-btn" onclick="resetGame()">Reiniciar aventura</button>
              </div>
            </div>
            <div class="summary-panel">
              <div class="meta">Recomendador</div>
              <h3 style="font-size:28px; margin:10px 0;">Creemos que podrían interesarte</h3>
              <div class="position-list">
                <div class="position-card"><strong>Especialista Comercial</strong><span>Ideal si te atrae el storytelling y el negocio.</span></div>
                <div class="position-card"><strong>Business Analyst</strong><span>Perfecto para quien disfruta el análisis de datos y decisiones.</span></div>
                <div class="position-card"><strong>Planner Senior</strong><span>Excelente ruta para quienes miran el futuro con estrategia.</span></div>
              </div>
              <div class="achievement-list">
                ${state.achievements.map(a => `<div class="achievement"><strong>${a}</strong></div>`).join('')}
              </div>
            </div>
          </div>
        </section>
      `;
      launchConfetti();
      updateHud();
    }

    function renderHud() {
      const percent = Math.min(100, (state.xp % 100));
      const missionSummary = window.MissionEngine
        ? MissionEngine.getSummary(state)
        : { completed: 0, total: 0 };
      return `
        <div class="hud">
          <div class="hud-card">
            <div>
              <div class="label">Nivel</div>
              <div class="value">${state.level}</div>
            </div>
          </div>
          <div class="hud-card xp-pill" data-guide="hud-xp">
            <div style="flex:1;">
              <div class="label">XP</div>
              <div class="value">${state.xp} / ${state.level * 100}</div>
              <div class="bar"><span style="width:${percent}%"></span></div>
            </div>
          </div>
          <div class="hud-card">
            <div>
              <div class="label">Misiones</div>
              <div class="value">${missionSummary.completed}/${missionSummary.total}</div>
            </div>
          </div>
          <div class="hud-btns" data-guide="hud-actions">
            <button
              class="hud-btn"
              data-guide="passport-btn"
              onclick="openPassport()"
            >
              📖 Passport
            </button>
            <button
              class="hud-btn"
              onclick="openMissionBoard()"
            >
              🎯 Misiones
            </button>
            <button
              class="hud-btn"
              onclick="renderScreen('map')"
            >
              🗺️ Mapa
            </button>
            <button
              class="hud-btn"
              onclick="renderScreen('profile')"
            >
              👤 Perfil
            </button>
          </div>
        </div>
      `;
    }

    function updateHud() {
      const hudHost = document.querySelector('.hud');
      if (hudHost) hudHost.outerHTML = renderHud();
    }

    function toggleCategoryMenu() {
      state.categoryMenuOpen = !state.categoryMenuOpen;
      renderScreen('map');
    }

    function filterByCategory(categoryId) {
      const categories = getAvailableCategories();
      const exists = categories.some(category => category.id === categoryId);
      if (!exists) {
        state.currentCategory = null;
      } else {
        state.currentCategory = categoryId === state.currentCategory ? null : categoryId;
      }
      state.categoryMenuOpen = false;
      renderScreen('map');
    }

    function clearCategoryFilter() {
      state.currentCategory = null;
      state.categoryMenuOpen = false;
      renderScreen('map');
    }

    function selectRole(roleId) {
      state.currentRole = roleId;
      const categories = getAvailableCategories();
      state.currentCategory = categories.some(category => category.id === roleId)
        ? roleId
        : null;
      state.categoryMenuOpen = false;
      state.startedAt = Date.now();
      state.avatarPosition = { x: 150, y: 330 };
      const profile = window.CareerProfileData ? CareerProfileData.getProfile() : null;
      if (profile && profile.completed) {
        renderScreen('map');
      } else {
        renderScreen('profile');
      }
      unlockAchievement('Explorador Career Quest');
    }

    function openCollection() {
      renderScreen('collection');
    }

    function applyMissionRewards() {
      if (!window.MissionEngine) return;

      const completedMissions = MissionEngine.getCompletedMissions(state);
      completedMissions.forEach(mission => {
        if (!mission || !mission.id) return;
        if (state.missionRewardsClaimed.includes(mission.id)) return;

        state.missionRewardsClaimed.push(mission.id);
        gainXP(Number(mission.rewardXP) || 0);
        unlockAchievement(`Misión completada: ${mission.title}`);
        showToast(`+${mission.rewardXP} XP por misión: ${mission.title}`);
      });
    }

    function renderMissionBoardContent(stateSnapshot) {
      const missions = MissionEngine.getAllMissions(stateSnapshot);
      const completedMissions = MissionEngine.getCompletedMissions(stateSnapshot);
      const activeMissions = MissionEngine.getActiveMissions(stateSnapshot);
      const summary = MissionEngine.getSummary(stateSnapshot);

      return `
        <section class="mission-board-screen">
          <div class="mission-board-card">
            <div class="mission-board-header">
              <div>
                <span class="eyebrow">🎯 Mission Board</span>
                <h2>Misiones de Career Quest</h2>
                <p>Revisa tu progreso actual y completa objetivos para seguir explorando.</p>
              </div>
              <div class="mission-board-summary">
                <strong>${summary.completed} / ${summary.total}</strong>
                <span>misiones completadas</span>
                <small>Activas: ${activeMissions.length} · Completadas: ${completedMissions.length}</small>
              </div>
            </div>
            <div class="mission-list">
              ${missions.map(mission => {
                const target = Math.max(1, Number(mission.target) || 1);
                const progressValue = Math.min(target, Number(mission.progress) || 0);
                const percent = Math.min(100, Math.round((progressValue / target) * 100));
                return `
                  <article class="mission-item ${mission.completed ? 'completed' : 'active'}">
                    <div class="mission-title-row">
                      <div class="mission-title-wrap">
                        <span class="mission-icon">${mission.icon || '🎯'}</span>
                        <div>
                          <h3>${mission.title}</h3>
                          <p>${mission.description}</p>
                          ${mission.guide ? `<small style="display:block; margin-top:6px; color:#b5cee4; line-height:1.45;"><strong style="color:#d9ecff;">Cómo completar:</strong> ${mission.guide}</small>` : ''}
                        </div>
                      </div>
                      <span class="mission-state ${mission.completed ? 'completed' : 'active'}">
                        ${mission.completed ? '✓ COMPLETADA' : '• ACTIVA'}
                      </span>
                    </div>
                    <div class="mission-progress-row">
                      <strong>Progreso: ${progressValue} / ${target}</strong>
                      <span>${percent}%</span>
                    </div>
                    <div class="mission-progress-bar">
                      <span style="width:${percent}%;"></span>
                    </div>
                    <div class="mission-reward">
                      ⭐ ${mission.completed ? 'Recompensa obtenida' : 'Recompensa'}: +${mission.rewardXP} XP
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          </div>
        </section>
      `;
    }

    function openMissionBoard() {
      if (!window.MissionEngine || !window.MISSION_DATA) {
        showToast('No se pudo abrir Mission Board. Revisa los scripts de misión.');
        return;
      }

      const existingOverlay = document.getElementById('missionOverlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      const missionContainer = document.createElement('div');
      missionContainer.id = 'missionOverlay';
      missionContainer.className = 'mission-overlay';
      missionContainer.innerHTML = renderMissionBoardContent(state);
      app.appendChild(missionContainer);

      const closeButton = document.createElement('button');
      closeButton.className = 'mission-close';
      closeButton.innerHTML = '✕';
      closeButton.setAttribute('aria-label', 'Cerrar Mission Board');

      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          closeMissionBoard();
        }
      };

      const closeMissionBoard = () => {
        missionContainer.remove();
        document.removeEventListener('keydown', handleEscape);
      };

      closeButton.onclick = closeMissionBoard;

      missionContainer.addEventListener('click', (event) => {
        if (event.target === missionContainer) {
          closeMissionBoard();
        }
      });

      document.addEventListener('keydown', handleEscape);
      missionContainer.appendChild(closeButton);
    }
    
    function openPassport() {
      if (!window.CareerPassport) {
        showToast('No se pudo abrir Passport. Revisa los scripts del proyecto.');
        return;
      }
      const existingOverlay = document.getElementById('passportOverlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      
      const passportContainer =
        document.createElement('div');

      passportContainer.id =
        'passportOverlay';

      passportContainer.className =
        'passport-overlay';

      app.appendChild(
        passportContainer
      );

      const missionSummary = window.MissionEngine
        ? MissionEngine.getSummary(state)
        : { completed: 0, total: 0 };
      const completedMissions = Number(missionSummary.completed) || 0;
      const requiredMissions = Math.max(
        REQUIRED_MISSIONS_FOR_PASSPORT_DOWNLOAD,
        Number(missionSummary.total) || REQUIRED_MISSIONS_FOR_PASSPORT_DOWNLOAD
      );

      CareerPassport.render(
        passportContainer,
        state,
        {
          canDownloadPassport: completedMissions >= REQUIRED_MISSIONS_FOR_PASSPORT_DOWNLOAD,
          missionProgressText: `${completedMissions}/${requiredMissions}`,
          requiredMissions: REQUIRED_MISSIONS_FOR_PASSPORT_DOWNLOAD
        }
      );

      const closeButton =
        document.createElement('button');

      closeButton.className =
        'passport-close';

      closeButton.innerHTML =
        '✕';

      closeButton.setAttribute(
        'aria-label',
        'Cerrar Passport'
      );

      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          closePassport();
        }
      };

      const closePassport = () => {
        passportContainer.remove();
        document.removeEventListener('keydown', handleEscape);
      };

      closeButton.onclick = closePassport;

      passportContainer.addEventListener('click', (event) => {
        if (event.target === passportContainer) {
          closePassport();
        }
      });

      document.addEventListener('keydown', handleEscape);

      passportContainer.appendChild(
        closeButton
      );

    }

    function ensureHtml2Canvas() {
      if (window.html2canvas) {
        return Promise.resolve(window.html2canvas);
      }
      if (html2CanvasLoaderPromise) {
        return html2CanvasLoaderPromise;
      }

      html2CanvasLoaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.async = true;
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error('No se pudo cargar html2canvas'));
        document.head.appendChild(script);
      });

      return html2CanvasLoaderPromise;
    }

    function safeReadUserRecords() {
      try {
        if (!window.localStorage) return [];
        const rawRecords = localStorage.getItem(USER_DATA_STORAGE_KEY);
        if (!rawRecords) return [];
        const parsed = JSON.parse(rawRecords);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function safeWriteUserRecords(records) {
      try {
        if (!window.localStorage) return;
        localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(records));
      } catch (error) {
        // noop
      }
    }

    function buildUserRecordId(profile) {
      const code = String(profile?.mcpCode || '').trim();
      if (code) return `mcp-${code}`;
      const name = String(profile?.name || '').trim().toLowerCase();
      const slug = name.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return slug ? `name-${slug}` : 'anon-user';
    }

    function saveRegistrationData(profile) {
      if (!profile) return;
      const nowIso = new Date().toISOString();
      const records = safeReadUserRecords();
      const recordId = buildUserRecordId(profile);
      const existingIndex = records.findIndex(record => record.recordId === recordId);
      const nextRecord = {
        recordId,
        updatedAt: nowIso,
        registration: {
          name: profile.name || '',
          mcpCode: profile.mcpCode || '',
          currentArea: profile.currentArea || '',
          createdAt: profile.createdAt || nowIso
        },
        finalPassport: existingIndex >= 0 ? records[existingIndex].finalPassport || null : null
      };

      if (existingIndex >= 0) {
        records[existingIndex] = nextRecord;
      } else {
        records.push(nextRecord);
      }

      safeWriteUserRecords(records);
    }

    function buildUserDataSnapshot() {
      const profile = window.CareerProfileData
        ? CareerProfileData.getProfile()
        : null;

      const missionSummary = window.MissionEngine
        ? MissionEngine.getSummary(state)
        : { completed: 0, total: 0 };

      const stats = window.CareerPassport
        ? CareerPassport.getStats(state)
        : {
            exploredDepartments: 0,
            exploredPositions: 0,
            completedQuizzes: 0,
            completedMissions: 0,
            totalMissions: 0,
            xp: 0,
            level: 1
          };

      return {
        generatedAt: new Date().toISOString(),
        registration: {
          name: profile?.name || '',
          mcpCode: profile?.mcpCode || '',
          currentArea: profile?.currentArea || '',
          createdAt: profile?.createdAt || null
        },
        finalPassport: {
          stats,
          missionSummary,
          achievements: [...(state.achievements || [])],
          visitedDepartments: [...(state.visitedDepartments || [])],
          visitedPositions: [...(state.visitedPositions || [])],
          currentRole: state.currentRole || null,
          currentCategory: state.currentCategory || null
        }
      };
    }

    function saveFinalPassportData(snapshot) {
      if (!snapshot) return;
      const records = safeReadUserRecords();
      const recordId = buildUserRecordId(snapshot.registration || {});
      const nowIso = new Date().toISOString();
      const existingIndex = records.findIndex(record => record.recordId === recordId);
      const baseRecord = existingIndex >= 0
        ? records[existingIndex]
        : {
            recordId,
            updatedAt: nowIso,
            registration: {
              name: '',
              mcpCode: '',
              currentArea: '',
              createdAt: null
            },
            finalPassport: null
          };

      const nextRecord = {
        ...baseRecord,
        updatedAt: nowIso,
        registration: {
          ...baseRecord.registration,
          ...snapshot.registration
        },
        finalPassport: snapshot.finalPassport
      };

      if (existingIndex >= 0) {
        records[existingIndex] = nextRecord;
      } else {
        records.push(nextRecord);
      }

      safeWriteUserRecords(records);
    }

    async function syncUserDataToGoogleSheets(snapshot) {
      if (!GOOGLE_SHEETS_WEBHOOK_URL || !snapshot) return false;

      try {
        await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(snapshot)
        });
        return true;
      } catch (error) {
        return false;
      }
    }

    async function downloadCareerPassport() {
      const missionSummary = window.MissionEngine
        ? MissionEngine.getSummary(state)
        : { completed: 0, total: 0 };
      const completedMissions = Number(missionSummary.completed) || 0;
      if (completedMissions < REQUIRED_MISSIONS_FOR_PASSPORT_DOWNLOAD) {
        showToast(`Completa ${REQUIRED_MISSIONS_FOR_PASSPORT_DOWNLOAD} misiones para descargar tu Passport.`);
        return;
      }

      const passportCard = document.querySelector('#passportOverlay .passport-card');
      if (!passportCard) {
        showToast('Abre tu Passport para capturarlo.');
        return;
      }

      const actionsPanel = passportCard.querySelector('.passport-download-panel');
      const originalVisibility = actionsPanel ? actionsPanel.style.visibility : '';

      try {
        const userDataSnapshot = buildUserDataSnapshot();
        saveFinalPassportData(userDataSnapshot);
        syncUserDataToGoogleSheets(userDataSnapshot);

        if (actionsPanel) actionsPanel.style.visibility = 'hidden';
        showToast('Generando captura del Passport...');

        const html2canvas = await ensureHtml2Canvas();
        const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1.25));
        const canvas = await html2canvas(passportCard, {
          backgroundColor: '#07101d',
          scale,
          useCORS: true,
          logging: false
        });

        const profile = window.CareerProfileData ? CareerProfileData.getProfile() : null;
        const profileName = (profile && profile.name) ? profile.name : 'Jugador';
        const safeName = String(profileName)
          .replace(/[^a-zA-Z0-9_-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'jugador';
        const stamp = new Date().toISOString().slice(0, 10);
        const fileName = `passport-${safeName}-${stamp}.png`;

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = fileName;
        link.click();

        showToast('Passport descargado correctamente.');
      } catch (error) {
        showToast('No se pudo generar la captura del Passport.');
      } finally {
        if (actionsPanel) actionsPanel.style.visibility = originalVisibility;
      }
    }

    function enterDepartment(depId) {
      if (state.moving) return;
      const dep = departments.find(d => d.id === depId);
      if (!dep) return;
      state.pendingDepartment = depId;
      moveAvatarTo({ x: dep.x, y: dep.y }, () => {
        state.currentDepartment = state.pendingDepartment;
        trackDepartmentVisit(state.currentDepartment);
        state.currentPosition = null;
        state.currentQuizIndex = 0;
        state.quizAnswered = false;
        state.quizSelection = [];
        state.pendingDepartment = null;
        renderScreen('positions');
      });
    }

    function selectPosition(positionTitle) {
      state.currentPosition = positionTitle;
      trackPositionVisit(positionTitle);
      state.currentQuizIndex = 0;
      state.quizAnswered = false;
      state.quizSelection = [];
      renderScreen('department');
    }

    function startQuiz(depId, positionTitle) {
      state.currentDepartment = depId;
      if (positionTitle) state.currentPosition = positionTitle;
      state.currentQuizIndex = 0;
      state.quizAnswered = false;
      state.quizSelection = [];
      renderScreen('quiz');
    }

    function answerQuiz(value) {
      const dep = departments.find(d => d.id === state.currentDepartment);
      if (!dep) return;
      const quizSet = getCurrentQuizSet(dep);
      const question = quizSet[state.currentQuizIndex];
      if (!question) {
        renderScreen('department');
        return;
      }
      const buttons = document.querySelectorAll('.quiz-option, .quiz-step');
      buttons.forEach(btn => btn.disabled = true);
      const isCorrect = question.type === 'boolean'
        ? value === question.answer
        : question.type === 'choice'
          ? value === question.answer
          : false;
      state.quizAttempts += 1;
      applyMissionRewards();
      if (isCorrect) {
        gainXP(40);
        addDiscovery(dep);
        unlockAchievement(`${dep.title} en acción`);
        state.completedQuizzes += 1;
        applyMissionRewards();
        showToast('✅ ¡Respuesta correcta! +40 XP');
      } else {
        showToast('❌ Respuesta incorrecta');
      }
      setTimeout(() => {
        if (state.currentQuizIndex < quizSet.length - 1) {
          state.currentQuizIndex += 1;
          state.quizSelection = [];
          renderScreen('quiz');
        } else {
          renderScreen('department');
        }
      }, 900);
    }

    function submitSequenceStep(index) {
      if (state.quizSelection.includes(index)) return;
      state.quizSelection.push(index);
      renderScreen('quiz');
    }

    function clearSequence() {
      state.quizSelection = [];
      renderScreen('quiz');
    }

    function submitSequenceAnswer() {
      const dep = departments.find(d => d.id === state.currentDepartment);
      if (!dep) return;
      const quizSet = getCurrentQuizSet(dep);
      const question = quizSet[state.currentQuizIndex];
      if (!question || !Array.isArray(question.answer)) {
        renderScreen('quiz');
        return;
      }
      state.quizAttempts += 1;
      applyMissionRewards();
      const isCorrect = state.quizSelection.length === question.answer.length && question.answer.every((value, index) => value === state.quizSelection[index]);
      if (isCorrect) {
        gainXP(40);
        addDiscovery(dep);
        unlockAchievement(`${dep.title} en acción`);
        state.completedQuizzes += 1;
        applyMissionRewards();
        showToast('✅ ¡Respuesta correcta! +40 XP');
      } else {
        showToast('❌ Respuesta incorrecta');
      }
      setTimeout(() => {
        if (state.currentQuizIndex < quizSet.length - 1) {
          state.currentQuizIndex += 1;
          state.quizSelection = [];
          renderScreen('quiz');
        } else {
          renderScreen('department');
        }
      }, 900);
    }

    function addDiscovery(dep) {
      if (!state.discoveredDepartments.includes(dep.id)) state.discoveredDepartments.push(dep.id);
      if (state.currentPosition && !state.discoveredPositions.includes(state.currentPosition)) {
        state.discoveredPositions.push(state.currentPosition);
      }
      applyMissionRewards();
    }

    function trackDepartmentVisit(depId) {
      if (!depId) return;
      if (state.visitedDepartments.includes(depId)) return;
      state.visitedDepartments.push(depId);
      gainXP(XP_FOR_NEW_DEPARTMENT_VISIT);
      showToast(`🧭 Área visitada por primera vez. +${XP_FOR_NEW_DEPARTMENT_VISIT} XP`);
      applyMissionRewards();
    }

    function trackPositionVisit(positionTitle) {
      if (!positionTitle) return;
      if (state.visitedPositions.includes(positionTitle)) return;
      state.visitedPositions.push(positionTitle);
      gainXP(XP_FOR_NEW_POSITION_VISIT);
      showToast(`💼 Puesto explorado por primera vez. +${XP_FOR_NEW_POSITION_VISIT} XP`);
      applyMissionRewards();
    }

    function gainXP(amount) {
      state.xp += amount;
      while (state.xp >= state.level * 100) {
        state.xp -= state.level * 100;
        state.level += 1;
      }
      updateHud();
      if (state.level >= 2) unlockAchievement('Nivel ascendido');
    }

    function unlockAchievement(name) {
      if (!state.achievements.includes(name)) {
        state.achievements.push(name);
        state.lastAchievement = name;
        showAchievement(name);
        playTone('unlock');
      }
    }

    function placeAvatarAt(x, y) {
      const avatar = document.getElementById('avatar');
      if (!avatar) return;
      avatar.style.left = `${x}px`;
      avatar.style.top = `${y}px`;
    }

    function moveAvatarTo(target, onComplete) {
      const avatar = document.getElementById('avatar');
      if (!avatar) {
        if (onComplete) onComplete();
        return;
      }
      const start = { x: state.avatarPosition.x, y: state.avatarPosition.y };
      const end = { x: target.x, y: target.y };
      state.moving = true;
      avatar.classList.remove('idle');
      avatar.classList.add('walking');
      const duration = 1250 + Math.hypot(end.x - start.x, end.y - start.y) * 0.9;
      const startTime = performance.now();
      function tick(now) {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const curveX = start.x + (end.x - start.x) * eased;
        const curveY = start.y + (end.y - start.y) * eased;
        const bend = (start.y - end.y) * 0.05;
        const x = curveX + Math.sin(progress * Math.PI) * bend * 0.35;
        const y = curveY - Math.sin(progress * Math.PI) * 36;
        state.avatarPosition = { x, y };
        placeAvatarAt(x, y);
        updateCamera();
        if (progress < 1) requestAnimationFrame(tick); else {
          state.moving = false;
          avatar.classList.remove('walking');
          avatar.classList.add('idle');
          if (onComplete) onComplete();
        }
      }
      requestAnimationFrame(tick);
    }

    function updateCamera() {
      const mapWorld = document.getElementById('mapWorld');
      if (!mapWorld) return;
      // Mantener el mapa fijo: solo se desplaza el avatar.
      state.camera = { x: 0, y: 0 };
      mapWorld.style.transform = 'translate(-50%, -50%)';
    }

    function showInterest() {
      showToast('Gracias. Tu interés ha quedado registrado para recibir más información.');
      renderScreen('summary');
    }

    function resetGame() {
      state.currentRole = null;
      state.currentDepartment = null;
      state.currentPosition = null;
      state.currentQuizIndex = 0;
      state.discoveredDepartments = [];
      state.discoveredPositions = [];
      state.visitedDepartments = [];
      state.visitedPositions = [];
      state.xp = 0;
      state.level = 1;
      state.completedQuizzes = 0;
      state.quizAttempts = 0;
      state.achievements = [];
      state.quizAnswered = false;
      state.quizLocked = false;
      state.avatarPosition = { x: 150, y: 330 };
      state.moving = false;
      state.quizSelection = [];
      state.pendingDepartment = null;
      state.missionRewardsClaimed = [];
      renderScreen('welcome');
    }

    function launchConfetti() {
      const container = document.getElementById('summary') || app;
      for (let i = 0; i < 70; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = ['#4cc9f0', '#2dd4bf', '#7c4dff', '#ffb703', '#ff6b6b'][Math.floor(Math.random() * 5)];
        piece.style.setProperty('--x', `${(Math.random() - 0.5) * 220}px`);
        piece.style.animationDelay = `${Math.random() * 0.2}s`;
        container.appendChild(piece);
        setTimeout(() => piece.remove(), 2600);
      }
    }

    function typeWriter(text, targetId) {
      const target = document.getElementById(targetId);
      let i = 0;
      target.textContent = '';
      const interval = setInterval(() => {
        target.textContent += text[i];
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 24);
    }

    function renderDepartmentBuilding(dep) {
      const accent = dep.color;
      const isDiscovered = state.discoveredDepartments.includes(dep.id);
      const strokeColor = isDiscovered ? '#7df2c9' : accent;
      const innerFill = isDiscovered ? 'rgba(125,242,201,0.24)' : `${accent}2E`;
      return `
        <g class="building" onclick="enterDepartment('${dep.id}')" transform="translate(${dep.x}, ${dep.y})">
          <circle r="64" fill="${strokeColor}" opacity="0.14"/>
          <circle r="52" fill="none" stroke="${strokeColor}" stroke-width="3.5" stroke-dasharray="10 6" opacity="0.92"/>
          <circle r="36" fill="rgba(7,14,25,0.96)" stroke="${strokeColor}" stroke-width="3"/>
          <circle r="23" fill="${innerFill}" stroke="${strokeColor}" stroke-width="2"/>
          <circle r="8" fill="#f7fbff" opacity="0.98"/>
        </g>
      `;
    }

    function avatarSVG() {
      return `
        <svg viewBox="0 0 72 104" width="72" height="104" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="36" cy="100" rx="22" ry="7" fill="rgba(0,0,0,0.3)"/>
          <g class="leg left" transform="translate(27,62)">
            <rect x="-7" y="0" width="13" height="26" rx="4" fill="#2C5FC4"/>
            <rect x="-9" y="23" width="17" height="9" rx="3" fill="#7A4E2A"/>
          </g>
          <g class="leg right" transform="translate(45,62)">
            <rect x="-6" y="0" width="13" height="26" rx="4" fill="#2C5FC4"/>
            <rect x="-7" y="23" width="17" height="9" rx="3" fill="#7A4E2A"/>
          </g>
          <rect x="22" y="38" width="28" height="28" rx="6" fill="#EFEFEF"/>
          <rect x="22" y="38" width="11" height="28" rx="4" fill="#F07020"/>
          <rect x="39" y="38" width="11" height="28" rx="4" fill="#F07020"/>
          <rect x="22" y="53" width="11" height="3" fill="rgba(255,255,255,0.9)"/>
          <rect x="39" y="53" width="11" height="3" fill="rgba(255,255,255,0.9)"/>
          <rect x="22" y="60" width="11" height="3" fill="rgba(255,255,255,0.9)"/>
          <rect x="39" y="60" width="11" height="3" fill="rgba(255,255,255,0.9)"/>
          <g class="arm left" transform="translate(16,40)">
            <rect x="-6" y="0" width="12" height="24" rx="5" fill="#EFEFEF"/>
          </g>
          <g class="arm right" transform="translate(56,40)">
            <rect x="-6" y="0" width="12" height="24" rx="5" fill="#EFEFEF"/>
          </g>
          <rect x="30" y="31" width="12" height="11" rx="4" fill="#F5C8A0"/>
          <circle cx="36" cy="23" r="14" fill="#F5C8A0"/>
          <path d="M23 20 Q23 5 36 4 Q49 5 49 20" fill="#5A3010"/>
          <path d="M49 17 Q57 21 58 31 Q57 40 53 41 Q56 34 53 26 Q51 19 49 21 Z" fill="#5A3010"/>
          <path d="M22 20 Q22 4 36 3 Q50 4 50 20 L52 25 L20 25 Z" fill="#F2F2F2"/>
          <rect x="19" y="22" width="34" height="5" rx="2.5" fill="#DCDCDC"/>
          <polygon points="36,10 41,19 31,19" fill="#1565C0"/>
          <circle cx="30" cy="22" r="2.2" fill="#2A1A0A"/>
          <circle cx="42" cy="22" r="2.2" fill="#2A1A0A"/>
          <circle cx="31" cy="21" r="0.9" fill="white"/>
          <circle cx="43" cy="21" r="0.9" fill="white"/>
          <path d="M29 29 Q36 34 43 29" stroke="#C08060" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        </svg>
      `;
    }

    function showAchievement(name) {
      const modal = document.createElement('div');
      modal.className = 'achievement-modal';
      modal.innerHTML = `
        <div class="modal-card">
          <div style="font-size:48px;">🏅</div>
          <h3 style="margin:8px 0 4px;">Logro desbloqueado</h3>
          <p style="margin:0; color:#e7f4ff;">${name}</p>
        </div>
      `;
      app.appendChild(modal);
      launchConfetti();
      setTimeout(() => modal.remove(), 1400);
    }

    function showToast(message) {
      if (state.toastTimer) clearTimeout(state.toastTimer);
      const toast = document.createElement('div');
      toast.className = 'toast';

      const messageBox = document.createElement('div');
      messageBox.className = 'toast-message';
      messageBox.textContent = message;

      const closeButton = document.createElement('button');
      closeButton.className = 'toast-close';
      closeButton.type = 'button';
      closeButton.setAttribute('aria-label', 'Cerrar notificación');
      closeButton.innerHTML = '×';
      closeButton.addEventListener('click', () => {
        if (state.toastTimer) clearTimeout(state.toastTimer);
        state.toastTimer = null;
        toast.remove();
      });

      toast.appendChild(messageBox);
      toast.appendChild(closeButton);
      app.appendChild(toast);
      state.toastTimer = setTimeout(() => {
        if (toast.isConnected) {
          toast.remove();
        }
        state.toastTimer = null;
      }, 1800);
    }

    function playTone(type) {
      try {
        if (typeof window === 'undefined') return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioCtx) {
          audioCtx = new AudioContextClass();
        }

        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }

        const now = audioCtx.currentTime;
        const gain = audioCtx.createGain();
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(type === 'unlock' ? 0.05 : 0.025, now + 0.02);

        const osc = audioCtx.createOscillator();
        osc.connect(gain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'unlock' ? 720 : 500, now);
        osc.frequency.exponentialRampToValueAtTime(type === 'unlock' ? 1100 : 620, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      } catch (error) {
        // No bloquear renderizado por fallos de audio.
      }
    }

    // Exponer explícitamente callbacks usados en atributos onclick para
    // compatibilidad consistente entre navegadores (incluyendo Safari/iPad).
    window.startAdventure = startAdventure;
    window.renderScreen = renderScreen;
    window.toggleCategoryMenu = toggleCategoryMenu;
    window.filterByCategory = filterByCategory;
    window.clearCategoryFilter = clearCategoryFilter;
    window.selectRole = selectRole;
    window.openCollection = openCollection;
    window.openPassport = openPassport;
    window.openMissionBoard = openMissionBoard;
    window.enterDepartment = enterDepartment;
    window.selectPosition = selectPosition;
    window.startQuiz = startQuiz;
    window.answerQuiz = answerQuiz;
    window.submitSequenceStep = submitSequenceStep;
    window.clearSequence = clearSequence;
    window.submitSequenceAnswer = submitSequenceAnswer;
    window.nextOnboardingStep = nextOnboardingStep;
    window.prevOnboardingStep = prevOnboardingStep;
    window.skipOnboarding = skipOnboarding;
    window.downloadCareerPassport = downloadCareerPassport;
    window.showInterest = showInterest;
    window.resetGame = resetGame;
    window.showToast = showToast;

    init();
window.addEventListener("load", () => {

    AnimationEngine.register(CloudSystem);

    AnimationEngine.start();

});