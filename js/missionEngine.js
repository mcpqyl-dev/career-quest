/* =========================================================
   CAREER QUEST v1.2
   MISSION ENGINE
========================================================= */

const MissionEngine = {

    normalizeAreaKey(value) {

        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');

    },


    resolveCurrentAreaIdFromProfile(profile) {

        if (!profile) {
            return '';
        }


        const profileArea =
            profile.currentArea ||
            profile.area ||
            '';


        const normalizedProfileArea =
            this.normalizeAreaKey(profileArea);


        const catalog =
            Array.isArray(window.departments)
                ? window.departments
                : [];


        const match = catalog.find(dep => {

            const idKey =
                this.normalizeAreaKey(dep.id);

            const titleKey =
                this.normalizeAreaKey(dep.title);

            const nameKey =
                this.normalizeAreaKey(dep.name);

            return (
                normalizedProfileArea === idKey ||
                normalizedProfileArea === titleKey ||
                normalizedProfileArea === nameKey
            );

        });


        return match
            ? this.normalizeAreaKey(match.id)
            : normalizedProfileArea;

    },

    getProgress(mission, state) {

        if (!mission || !state) {
            return 0;
        }


        switch (mission.type) {


            case 'departments':

                return Array.isArray(
                    state.discoveredDepartments
                )
                    ? state.discoveredDepartments.length
                    : 0;


            case 'visited_departments':

                return Array.isArray(
                    state.visitedDepartments
                )
                    ? state.visitedDepartments.length
                    : 0;


            case 'positions':

                return Array.isArray(
                    state.discoveredPositions
                )
                    ? state.discoveredPositions.length
                    : 0;


            case 'visited_positions':

                return Array.isArray(
                    state.visitedPositions
                )
                    ? state.visitedPositions.length
                    : 0;


            case 'quizzes':

                return Number(
                    state.completedQuizzes || 0
                );


            case 'quiz_attempts':

                return Number(
                    state.quizAttempts || 0
                );


            case 'different_department':

                return this.hasExploredDifferentDepartment(
                    state
                )
                    ? 1
                    : 0;


            default:

                return 0;

        }

    },


    hasExploredDifferentDepartment(state) {

        if (!state) {
            return false;
        }


        const profile =
            typeof CareerProfileData !== 'undefined'
                ? CareerProfileData.getProfile()
                : (
                    typeof ProfileData !== 'undefined'
                        ? ProfileData.get()
                        : null
                );


        if (
            !profile
        ) {
            return false;
        }


        const currentAreaId =
            this.resolveCurrentAreaIdFromProfile(
                profile
            );


        if (!currentAreaId) {
            return false;
        }


        const discovered =
            Array.isArray(
                state.visitedDepartments
            )
                ? state.visitedDepartments
                : [];


        return discovered.some(
            area => {

                if (!area) {
                    return false;
                }


                return this
                    .normalizeAreaKey(area)
                    !== currentAreaId;

            }
        );

    },


    isCompleted(mission, state) {

        const progress =
            this.getProgress(
                mission,
                state
            );


        return progress >=
            mission.target;

    },


    getMissionStatus(mission, state) {

        const progress =
            this.getProgress(
                mission,
                state
            );


        const completed =
            this.isCompleted(
                mission,
                state
            );


        return {

            id:
                mission.id,

            title:
                mission.title,

            description:
                mission.description,

            guide:
                mission.guide,

            icon:
                mission.icon,

            progress,

            target:
                mission.target,

            rewardXP:
                mission.rewardXP,

            completed

        };

    },


    getAllMissions(state) {

        if (
            typeof MISSION_DATA ===
            'undefined'
        ) {

            return [];

        }


        return MISSION_DATA.map(
            mission =>
                this.getMissionStatus(
                    mission,
                    state
                )
        );

    },


    getCompletedMissions(state) {

        return this
            .getAllMissions(state)
            .filter(
                mission =>
                    mission.completed
            );

    },


    getActiveMissions(state) {

        return this
            .getAllMissions(state)
            .filter(
                mission =>
                    !mission.completed
            );

    },


    getSummary(state) {

        const missions =
            this.getAllMissions(
                state
            );


        const completed =
            missions.filter(
                mission =>
                    mission.completed
            );


        return {

            total:
                missions.length,

            completed:
                completed.length,

            active:
                missions.length -
                completed.length

        };

    }

};

if (typeof window !== 'undefined') {
    window.MissionEngine = MissionEngine;
}