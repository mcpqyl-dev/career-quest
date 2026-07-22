/**
 * Career Quest
 * v1.1 - Career Passport
 *
 * Muestra el progreso del jugador.
 */

(function (global) {

    const Passport = {

        getStats(state) {

            const missionSummary =
                global.MissionEngine
                    ? global.MissionEngine.getSummary(state || {})
                    : { completed: 0, total: 0 };

            return {

                exploredDepartments:
                     state?.visitedDepartments?.length ||
                     state?.discoveredDepartments?.length || 0,

                exploredPositions:
                     state?.visitedPositions?.length ||
                     state?.discoveredPositions?.length || 0,

                completedQuizzes:
                    state?.completedQuizzes || 0,

                completedMissions:
                    missionSummary.completed || 0,

                totalMissions:
                    missionSummary.total || 0,

                xp:
                    state?.xp || 0,

                level:
                    state?.level || 1

            };

        },


        render(container, state, options = {}) {

            if (!container) return;


            const profile =
                global.CareerProfileData
                    .getProfile();


            const stats =
                this.getStats(state);

            const canDownloadPassport =
                Boolean(options.canDownloadPassport);

            const missionProgressText =
                this.escape(options.missionProgressText || '0/4');

            const requiredMissions =
                Number(options.requiredMissions) || 4;

            const requiredXP =
                stats.level * 100;

            const progressXP =
                stats.xp;

            const progress =
                Math.min(
                    100,
                    (progressXP / requiredXP) * 100
        );

            


            container.innerHTML = `

                <section
                    class="passport-screen"
                >

                    <div class="passport-card">

                        <div class="passport-cover">

                            <div class="passport-emblem">
                                🎯
                            </div>

                            <span class="eyebrow">
                                Career Quest
                            </span>

                            <h2>
                                Career Passport
                            </h2>

                            <p>
                                Tu recorrido de
                                descubrimiento profesional
                            </p>

                        </div>


                        <div class="passport-content">


                            <div class="passport-player">

                                <div class="passport-player-avatar">
                                    👤
                                </div>

                                <div>

                                    <span>
                                        Explorador
                                    </span>

                                    <h3>
                                        ${this.escape(
                                            profile.name ||
                                            'Jugador'
                                        )}
                                    </h3>

                                    <p>
                                        ${this.escape(
                                            profile.currentArea ||
                                            'Área no definida'
                                        )}
                                    </p>

                                </div>

                            </div>


                            <div class="passport-level">

                                <div class="level-header">

                                    <strong>
                                        Nivel ${stats.level}
                                    </strong>

                                    <span>
                                        ${stats.xp} XP
                                    </span>

                                </div>

                                <div class="xp-bar">

                                    <div
                                        class="xp-progress"
                                        style="
                                            width:
                                            ${progress}%;
                                        "
                                    ></div>

                                </div>

                                <small>
                                    ${Math.round(
                                        progress
                                    )}% hacia el siguiente nivel
                                </small>

                            </div>


                            <div class="passport-stats">


                                <div class="passport-stat">

                                    <span class="stat-icon">
                                        🏢
                                    </span>

                                    <strong>
                                        ${stats.exploredDepartments}
                                    </strong>

                                    <span>
                                        Áreas exploradas
                                    </span>

                                </div>


                                <div class="passport-stat">

                                    <span class="stat-icon">
                                        💼
                                    </span>

                                    <strong>
                                        ${stats.exploredPositions}
                                    </strong>

                                    <span>
                                        Puestos explorados
                                    </span>

                                </div>


                                <div class="passport-stat">

                                    <span class="stat-icon">
                                        🧠
                                    </span>

                                    <strong>
                                        ${stats.completedQuizzes}
                                    </strong>

                                    <span>
                                        Retos completados
                                    </span>

                                </div>


                                <div class="passport-stat">

                                    <span class="stat-icon">
                                        🏆
                                    </span>

                                    <strong>
                                        ${stats.completedMissions}/${stats.totalMissions}
                                    </strong>

                                    <span>
                                        Misiones completadas
                                    </span>

                                </div>


                            </div>


                            <div class="passport-message">

                                <span>
                                    🚀
                                </span>

                                <p>
                                    Sigue explorando nuevas áreas
                                    y puestos para descubrir
                                    tu próximo desafío.
                                </p>

                            </div>

                            <div class="passport-download-panel">
                                <div class="passport-download-meta">
                                    <strong>Misiones completadas: ${missionProgressText}</strong>
                                    <span>
                                        ${canDownloadPassport
                                            ? '¡Desbloqueado! Ya puedes capturar y descargar tu Passport.'
                                            : `Completa ${requiredMissions} misiones para habilitar la descarga.`}
                                    </span>
                                </div>
                                ${canDownloadPassport
                                    ? `<button class="primary-btn passport-download-btn" onclick="downloadCareerPassport()">Capturar y descargar Passport</button>`
                                    : `<button class="secondary-btn passport-download-btn" disabled>Descarga bloqueada</button>`}
                            </div>


                        </div>

                    </div>

                </section>

            `;

        },


        escape(value) {

            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

        }

    };


    global.CareerPassport = Passport;

})(window);