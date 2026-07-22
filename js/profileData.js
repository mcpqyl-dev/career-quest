/**
 * Career Quest
 * v1.1 - Career Profile
 *
 * Datos y configuración del perfil del jugador.
 */

(function (global) {

    const PROFILE_STORAGE_KEY = 'careerQuestProfile';

    const DEFAULT_PROFILE = {
        name: '',
        mcpCode: '',
        currentArea: '',
        createdAt: null,
        completed: false
    };

    function getProfile() {

        try {

            const saved = localStorage.getItem(PROFILE_STORAGE_KEY);

            if (!saved) {
                return { ...DEFAULT_PROFILE };
            }

            return {
                ...DEFAULT_PROFILE,
                ...JSON.parse(saved)
            };

        } catch (error) {

            console.warn(
                'No se pudo cargar el perfil de Career Quest:',
                error
            );

            return { ...DEFAULT_PROFILE };

        }

    }

    function saveProfile(profile) {

        const profileToSave = {
            ...DEFAULT_PROFILE,
            ...profile,
            createdAt:
                profile.createdAt ||
                new Date().toISOString(),
            completed: true
        };

        localStorage.setItem(
            PROFILE_STORAGE_KEY,
            JSON.stringify(profileToSave)
        );

        return profileToSave;

    }

    function clearProfile() {

        localStorage.removeItem(PROFILE_STORAGE_KEY);

    }

    global.CareerProfileData = {

        PROFILE_STORAGE_KEY,

        DEFAULT_PROFILE,

        getProfile,

        saveProfile,

        clearProfile

    };

})(window);