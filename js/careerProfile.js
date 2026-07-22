/**
 * Career Quest
 * v1.1 - Career Profile UI
 *
 * Gestiona la creación y edición del perfil
 * del jugador.
 */

(function (global) {

    const Profile = {

        render(container, options = {}) {

            if (!container) {
                console.error(
                    'CareerProfile: no se encontró el contenedor.'
                );
                return;
            }

            const profile =
                global.CareerProfileData.getProfile();

            const areas =
                options.areas || [];

            const areaOptions = areas
                .map(area => {

                    const value =
                        area.title ||
                        area.name ||
                        '';

                    const selected =
                        profile.currentArea === value
                            ? 'selected'
                            : '';

                    return `
                        <option
                            value="${this.escape(value)}"
                            ${selected}
                        >
                            ${this.escape(value)}
                        </option>
                    `;

                })
                .join('');

            container.innerHTML = `

                <section
                    class="profile-screen"
                    id="careerProfileScreen"
                >

                    <div class="profile-card">

                        <div class="profile-header">

                            <div class="profile-avatar">
                                👤
                            </div>

                            <div>

                                <span class="eyebrow">
                                    Tu aventura profesional
                                </span>

                                <h2>
                                    Crea tu Career Profile
                                </h2>

                                <p>
                                    Personaliza tu experiencia
                                    y descubre nuevas oportunidades
                                    de movilidad interna.
                                </p>

                            </div>

                        </div>


                        <form
                            id="careerProfileForm"
                            class="profile-form"
                        >

                            <div class="form-group">

                                <label for="profileName">
                                    Dinos tu nombre y apellido
                                </label>

                                <input
                                    id="profileName"
                                    name="profileName"
                                    type="text"
                                    maxlength="30"
                                    autocomplete="off"
                                    placeholder="Escribe tu nombre y apellido"
                                    value="${this.escape(
                                        profile.name || ''
                                    )}"
                                    required
                                >

                            </div>


                            <div class="form-group">

                                <label for="profileMcpCode">
                                    Escribe tu codigo de MCP (solo numeros)
                                </label>

                                <input
                                    id="profileMcpCode"
                                    name="profileMcpCode"
                                    type="text"
                                    inputmode="numeric"
                                    pattern="[0-9]+"
                                    maxlength="12"
                                    autocomplete="off"
                                    placeholder="Ejemplo: 123456"
                                    value="${this.escape(
                                        profile.mcpCode || ''
                                    )}"
                                    required
                                >

                            </div>


                            <div class="form-group">

                                <label for="profileArea">
                                    ¿Cuál es tu área actual?
                                </label>

                                <select
                                    id="profileArea"
                                    name="profileArea"
                                    required
                                >

                                    <option value="">
                                        Selecciona tu área
                                    </option>

                                    ${areaOptions}

                                </select>

                            </div>


                            <div class="profile-note">

                                <span>💡</span>

                                <p>
                                    Esta información se utiliza
                                    únicamente para personalizar
                                    tu experiencia dentro de
                                    Career Quest.
                                </p>

                            </div>


                            <button
                                type="submit"
                                class="primary-btn profile-submit"
                            >

                                ${profile.completed
                                    ? 'Actualizar mi perfil'
                                    : 'Comenzar mi aventura'
                                }

                                <span>→</span>

                            </button>

                        </form>

                    </div>

                </section>

            `;


            const form =
                container.querySelector(
                    '#careerProfileForm'
                );


            form.addEventListener(
                'submit',
                (event) => {

                    event.preventDefault();

                    const name =
                        container
                            .querySelector('#profileName')
                            .value
                            .trim();

                    const currentArea =
                        container
                            .querySelector('#profileArea')
                            .value
                            .trim();

                    const mcpCode =
                        container
                            .querySelector('#profileMcpCode')
                            .value
                            .trim();


                    if (!name) {

                        this.showValidation(
                            'Escribe tu nombre y apellido.'
                        );

                        return;

                    }


                    if (!mcpCode || !/^\d+$/.test(mcpCode)) {

                        this.showValidation(
                            'Escribe tu codigo de MCP usando solo numeros.'
                        );

                        return;

                    }


                    if (!currentArea) {

                        this.showValidation(
                            'Selecciona tu área actual.'
                        );

                        return;

                    }


                    const savedProfile =
                        global.CareerProfileData
                            .saveProfile({

                                name,

                                mcpCode,

                                currentArea

                            });


                    if (
                        typeof options.onSave ===
                        'function'
                    ) {

                        options.onSave(
                            savedProfile
                        );

                    }

                }
            );

        },


        showValidation(message) {

            if (
                typeof global.showToast ===
                'function'
            ) {

                global.showToast(message);

                return;

            }

            alert(message);

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


    global.CareerProfile = Profile;

})(window);