/**
 * Career Quest
 * v1.1 - Career Passport
 *
 * Muestra el progreso del jugador.
 */

(function (global) {

    const Passport = {

        getStats(state) {

            const discoveredDepartments =
                state?.discoveredDepartments?.length || 0;

            const discoveredPositions =
                state?.discoveredPositions?.length || 0;

            const completedQuizzes =
                state?.completedQuizzes || 0;

            const achievements =
                state?.achievements?.length || 0;

            const xp =
                state?.xp || 0;

            const level =
                state?.level || 1;


            return {

                discoveredDepartments,

                discoveredPositions,

                completedQuizzes,

                achievements,

                xp,

                level

            };

        },


        render(container, state) {

            if (!container) return;


            const profile =
                global.CareerProfileData
                    .getProfile();


            const stats =
                this.getStats(state);


            const nextLevelXP =
                stats.level * 500;


            const previousLevelXP =
                (stats.level - 1) * 500;


            const progressXP =
                Math.max(
                    0,
                    stats.xp - previousLevelXP
                );


            const requiredXP =
                Math.max(
                    1,
                    nextLevelXP -
                    previousLevelXP
                );


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
                                        ${stats.discoveredDepartments}
                                    </strong>

                                    <span>
                                        Áreas descubiertas
                                    </span>

                                </div>


                                <div class="passport-stat">

                                    <span class="stat-icon">
                                        💼
                                    </span>

                                    <strong>
                                        ${stats.discoveredPositions}
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
                                        ${stats.achievements}
                                    </strong>

                                    <span>
                                        Logros obtenidos
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