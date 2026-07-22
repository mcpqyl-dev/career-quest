/* =========================================================
   CAREER QUEST v1.2
   MISSION DATA
========================================================= */

const MISSION_DATA = [

    {
        id: 'first_department_visit',

        title: 'Primer paso',

        description:
            'Ingresa a 1 área del mapa.',

        guide:
            'Haz clic en cualquier punto del mapa para entrar por primera vez a un área.',

        type: 'visited_departments',

        target: 1,

        rewardXP: 50,

        icon: '🧭',

        achievementId:
            'primer_paso'
    },


    {
        id: 'discover_departments',

        title: 'Explorador de áreas',

        description:
            'Ingresa a 3 áreas diferentes de la organización.',

        guide:
            'Muévete por el mapa y entra a tres áreas distintas.',

        type: 'visited_departments',

        target: 3,

        rewardXP: 90,

        icon: '🌎',

        achievementId:
            'explorador_areas'
    },


    {
        id: 'first_position_visit',

        title: 'Curiosidad inicial',

        description:
            'Abre 1 puesto profesional.',

        guide:
            'Entra a un área y selecciona cualquier puesto para ver su detalle.',

        type: 'visited_positions',

        target: 1,

        rewardXP: 60,

        icon: '👀',

        achievementId:
            'curiosidad_inicial'
    },


    {
        id: 'explore_positions',

        title: 'Radar Profesional',

        description:
            'Abre 4 puestos diferentes.',

        guide:
            'Ingresa a distintas áreas y abre 4 puestos para comparar opciones.',

        type: 'visited_positions',

        target: 4,

        rewardXP: 120,

        icon: '💼',

        achievementId:
            'radar_profesional'
    },


    {
        id: 'quiz_participant',

        title: 'Participa y aprende',

        description:
            'Responde 3 preguntas de mini juegos.',

        guide:
            'Inicia mini juegos y responde preguntas, aunque no todas sean correctas.',

        type: 'quiz_attempts',

        target: 3,

        rewardXP: 130,

        icon: '✍️',

        achievementId:
            'participa_y_aprende'
    },


    {
        id: 'complete_quizzes',

        title: 'Pon a prueba tus conocimientos',

        description:
            'Responde correctamente 5 preguntas de mini juego.',

        guide:
            'Busca respuestas correctas en distintos puestos para llegar al objetivo.',

        type: 'quizzes',

        target: 5,

        rewardXP: 220,

        icon: '🧠',

        achievementId:
            'mente_curiosa'
    },


    {
        id: 'explore_new_area',

        title: 'Sal de tu zona',

        description:
            'Explora un área diferente a tu área actual.',

        guide:
            'Ingresa al menos a un área que no sea la que marcaste en tu perfil inicial.',

        type: 'different_department',

        target: 1,

        rewardXP: 250,

        icon: '🚀',

        achievementId:
            'explorador_de_oportunidades'
    }

];

if (typeof window !== 'undefined') {
    window.MISSION_DATA = MISSION_DATA;
}