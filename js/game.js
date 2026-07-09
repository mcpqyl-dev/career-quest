const app = document.getElementById('app');

    const roleOptions = (window.roleOptions || []).map(role => ({ ...role }));
    const departments = (window.departments || []).map(dep => ({ ...dep }));

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
      xp: 0,
      level: 1,
      completedQuizzes: 0,
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
      categoryMenuOpen: false
    };

    let audioCtx = null;

    function init() {
      renderScreen('splash');
      setTimeout(() => renderScreen('welcome'), 1800);
    }

    function renderScreen(name) {
      state.screen = name;
      document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
      playTone('transition');
      if (name === 'splash') renderSplash();
      else if (name === 'welcome') renderWelcome();
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
            <div class="logo-badge pulse">🎯</div>
            <p class="eyebrow">Roadshow de movilidad horizontal</p>
            <h1>Career Quest</h1>
            <p>Descubre tu próximo desafío dentro de Chinalco.</p>
            <div class="loader"><div class="loader-bar" id="loaderBar"></div></div>
            <p>Preparando la aventura…</p>
          </div>
        </section>
      `;
      requestAnimationFrame(() => document.getElementById('loaderBar').style.width = '100%');
    }

    function renderWelcome() {
      app.innerHTML = `
        <section id="welcome" class="screen welcome active screen-enter">
          <div class="hero-card">
            <div>
              <span class="eyebrow">Inicio de misión</span>
              <h2>En Chinalco creemos que el crecimiento comienza cuando conocemos nuevos desafíos.</h2>
              <div class="typing" id="typingText"></div>
              <button class="hero-button" onclick="renderScreen('map')">Comenzar aventura</button>
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

    function renderMap() {
      const role = state.currentRole ? roleOptions.find(r => r.id === state.currentRole) : null;
      const currentDep = state.currentDepartment ? departments.find(d => d.id === state.currentDepartment) : null;
      const categories = window.positionCategories || [];
      const selectedCategory = categories.find(c => c.id === state.currentCategory);
      
      // Filtrar departamentos si hay categoría seleccionada
      const visibleDepartments = state.currentCategory 
        ? departments.filter(dep => selectedCategory.areas.includes(dep.title))
        : departments;
      
      app.innerHTML = `
        <section id="map" class="screen map-screen active screen-enter">
          ${renderHud()}
          <div style="position: absolute; top: 80px; left: 20px; z-index: 100; min-width: 210px;">
            <button onclick="toggleCategoryMenu()" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 16px; background: rgba(10, 18, 38, 0.92); backdrop-filter: blur(12px); border: 1px solid rgba(100, 200, 255, 0.22); border-radius: ${state.categoryMenuOpen ? '12px 12px 0 0' : '12px'}; color: #f7fbff; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
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
          <div class="npc-bubble">
            <div class="npc-portrait">${currentDep ? '🧑' : '🗺️'}</div>
            <div>
              <div class="small">${currentDep ? `${currentDep.npc} · ${currentDep.npcRole}` : role ? role.title : 'Guía'}</div>
              <div class="text">${currentDep ? currentDep.quote : 'Tu aventura comienza. Explora las gerencias para descubrir puestos, competencias y oportunidades.'}</div>
            </div>
          </div>
          <div class="map-shell">
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
      });
    }

    function renderPositionsList() {
      const dep = departments.find(d => d.id === state.currentDepartment);
      if (!dep) return;

      // Obtener la categoría seleccionada
      const categories = window.positionCategories || [];
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
      const categories = window.positionCategories || [];
      const selectedCategory = categories.find(c => c.id === state.currentCategory);
      const availablePositions = selectedCategory 
        ? dep.positions.filter(pos => pos.category === selectedCategory.title)
        : dep.positions;

      const position = state.currentPosition ? availablePositions.find(p => p.title === state.currentPosition) : availablePositions[0];
      if (!position) return;

      app.innerHTML = `
        <section id="department" class="screen department-screen active screen-enter">
          ${renderHud()}
          <div class="department-shell">
            <div class="department-card">
              <div class="meta">${position.level}</div>
              <h3>${position.title}</h3>
              <p>${position.blurb}</p>
              <div class="chip-row">
                ${selectedCategory ? `<span class="chip" style="background: ${selectedCategory.color}20; color: ${selectedCategory.color};">${selectedCategory.icon} ${selectedCategory.title}</span>` : ''}
                ${position.carrera_afin ? `<span class="chip">📚 ${position.carrera_afin}</span>` : ''}
                ${position.idioma ? `<span class="chip">🗣️ ${position.idioma}</span>` : ''}
              </div>
              <div class="department-stats">
                ${position.experiencia_general && position.experiencia_general !== 'nan' ? `<div class="stat"><div class="stat-label">Exp. General</div><div class="stat-value">${position.experiencia_general} años</div></div>` : ''}
                ${position.experiencia_puesto && position.experiencia_puesto !== 'nan' ? `<div class="stat"><div class="stat-label">Exp. Puesto</div><div class="stat-value">${position.experiencia_puesto} años</div></div>` : ''}
                ${position.experiencia_sector && position.experiencia_sector !== 'nan' ? `<div class="stat"><div class="stat-label">Exp. Sector</div><div class="stat-value">${position.experiencia_sector} años</div></div>` : ''}
              </div>
            </div>
            <div class="info-card">
              <div class="meta">Detalles del puesto</div>
              <h4 style="margin:0 0 12px 0;">${dep.title}</h4>
              <p style="margin:0 0 14px 0; color:#dceaf8; font-size:14px; line-height:1.6;">${dep.description}</p>
              ${position.functions && position.functions.length > 0 ? `
                <div style="margin-top:14px;">
                  <h5 style="margin:0 0 8px 0; font-size:12px; color:var(--accent); text-transform:uppercase; letter-spacing:0.08em;">Funciones principales</h5>
                  <ul style="margin:0; padding:0 0 0 20px; color:var(--muted); font-size:13px;">
                    ${position.functions.slice(0, 4).map(func => `<li style="margin-bottom:6px;">${func}</li>`).join('')}
                    ${position.functions.length > 4 ? `<li style="margin-top:8px; font-style:italic;">... y ${position.functions.length - 4} funciones más</li>` : ''}
                  </ul>
                </div>
              ` : ''}
              <div class="quiz-card">
                <div class="meta">Mini juego</div>
                <h4 style="margin:10px 0 4px;">Pon a prueba tu comprensión</h4>
                <p style="margin:0; color:var(--muted);">Responde correctamente para ganar XP y registrar el puesto.</p>
                <div class="summary-actions" style="margin-top:14px;">
                  <button class="primary-btn" onclick="startQuiz('${dep.id}')">Comenzar mini juego</button>
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
      const question = dep.quiz[state.currentQuizIndex];
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
              <h3>Pregunta ${state.currentQuizIndex + 1} / ${dep.quiz.length}</h3>
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
              const discovered = state.discoveredDepartments.includes(dep.id) || state.discoveredPositions.includes(dep.name);
              const stars = discovered ? '⭐⭐⭐' : '☆';
              return `<div class="collection-card ${discovered ? 'unlocked' : 'locked'}">
                <span class="check">${discovered ? '✓' : '○'}</span>
                <div class="rarity">${stars}</div>
                <strong>${dep.name}</strong>
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
      return `
        <div class="hud">
          <div class="hud-card">
            <div>
              <div class="label">Nivel</div>
              <div class="value">${state.level}</div>
            </div>
          </div>
          <div class="hud-card xp-pill">
            <div style="flex:1;">
              <div class="label">XP</div>
              <div class="value">${state.xp} / ${state.level * 100}</div>
              <div class="bar"><span style="width:${percent}%"></span></div>
            </div>
          </div>
          <div class="hud-card">
            <div>
              <div class="label">Puestos</div>
              <div class="value">${state.discoveredPositions.length}</div>
            </div>
          </div>
          <div class="hud-card">
            <div>
              <div class="label">Misiones</div>
              <div class="value">${state.completedQuizzes}/${departments.length}</div>
            </div>
          </div>
          <div class="hud-btns">
            <button class="hud-btn" onclick="openCollection()">Colección</button>
            <button class="hud-btn" onclick="renderScreen('map')">Mapa</button>
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

    function toggleCategoryMenu() {
      state.categoryMenuOpen = !state.categoryMenuOpen;
      renderScreen('map');
    }

    function filterByCategory(categoryId) {
      state.currentCategory = categoryId === state.currentCategory ? null : categoryId;
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
      state.startedAt = Date.now();
      state.avatarPosition = { x: 150, y: 330 };
      renderScreen('map');
      unlockAchievement('Explorador Career Quest');
    }

    function openCollection() {
      renderScreen('collection');
    }

    function enterDepartment(depId) {
      if (state.moving) return;
      const dep = departments.find(d => d.id === depId);
      state.pendingDepartment = depId;
      moveAvatarTo({ x: dep.x, y: dep.y }, () => {
        state.currentDepartment = state.pendingDepartment;
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
      state.currentQuizIndex = 0;
      state.quizAnswered = false;
      state.quizSelection = [];
      renderScreen('department');
    }

    function startQuiz(depId) {
      state.currentDepartment = depId;
      state.currentQuizIndex = 0;
      state.quizAnswered = false;
      state.quizSelection = [];
      renderScreen('quiz');
    }

    function answerQuiz(value) {
      const dep = departments.find(d => d.id === state.currentDepartment);
      const question = dep.quiz[state.currentQuizIndex];
      const buttons = document.querySelectorAll('.quiz-option, .quiz-step');
      buttons.forEach(btn => btn.disabled = true);
      const isCorrect = question.type === 'boolean'
        ? value === question.answer
        : question.type === 'choice'
          ? value === question.answer
          : false;
      if (isCorrect) {
        gainXP(40);
        addDiscovery(dep);
        unlockAchievement(`${dep.title} en acción`);
        state.completedQuizzes += 1;
      }
      setTimeout(() => {
        if (state.currentQuizIndex < dep.quiz.length - 1) {
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
      const question = dep.quiz[state.currentQuizIndex];
      const isCorrect = state.quizSelection.length === question.answer.length && question.answer.every((value, index) => value === state.quizSelection[index]);
      if (isCorrect) {
        gainXP(40);
        addDiscovery(dep);
        unlockAchievement(`${dep.title} en acción`);
        state.completedQuizzes += 1;
      }
      setTimeout(() => {
        if (state.currentQuizIndex < dep.quiz.length - 1) {
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
      if (!state.discoveredPositions.includes(dep.name)) state.discoveredPositions.push(dep.name);
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
      const shell = document.querySelector('.map-shell');
      if (!mapWorld || !shell) return;
      const viewportW = shell.clientWidth || 930;
      const viewportH = shell.clientHeight || 600;
      const targetX = state.avatarPosition.x - viewportW / 2 + 60;
      const targetY = state.avatarPosition.y - viewportH / 2 + 70;
      const maxX = Math.max(0, 1560 - viewportW);
      const maxY = Math.max(0, 640 - viewportH);
      const cameraX = Math.max(0, Math.min(maxX, targetX));
      const cameraY = Math.max(0, Math.min(maxY, targetY));
      state.camera = { x: cameraX, y: cameraY };
      mapWorld.style.transform = `translate(-50%, -50%) translate(${-cameraX}px, ${-cameraY}px)`;
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
      state.xp = 0;
      state.level = 1;
      state.completedQuizzes = 0;
      state.achievements = [];
      state.quizAnswered = false;
      state.quizLocked = false;
      state.avatarPosition = { x: 150, y: 330 };
      state.moving = false;
      state.quizSelection = [];
      state.pendingDepartment = null;
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
      return `
        <g class="building" onclick="enterDepartment('${dep.id}')" transform="translate(${dep.x}, ${dep.y})">
          <circle r="50" fill="${accent}" opacity="0.12"/>
          <circle r="50" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="8 5" opacity="0.75"/>
          <circle r="22" fill="rgba(8,14,24,0.9)" stroke="${accent}" stroke-width="2.5"/>
          <text x="0" y="8" text-anchor="middle" font-size="18" fill="${accent}">${dep.icon}</text>
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
      if (typeof window === 'undefined') return;
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
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
    }

    init();
window.addEventListener("load", () => {

    AnimationEngine.register(CloudSystem);

    AnimationEngine.start();

});