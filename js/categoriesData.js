// Categorías de puestos extraídas del Excel
const positionCategories = [
  {
    "id": "analista",
    "title": "Analista",
    "icon": "📊",
    "description": "Especialista en análisis y evaluación de procesos",
    "color": "#3B82F6",
    "areas": [
      "Almacenes y Control de Inventario",
      "Almacén de Concentrado y Operaciones Portuarias",
      "Comercial",
      "Compras y Contratos",
      "Dirección de Logistica y Comercial",
      "Planeamiento de Inventario",
      "Transporte y Tráfico Internacional"
    ]
  },
  {
    "id": "jefe",
    "title": "Jefe",
    "icon": "👔",
    "description": "Liderazgo de equipos y áreas",
    "color": "#F59E0B",
    "areas": [
      "Almacenes y Control de Inventario",
      "Almacén de Concentrado y Operaciones Portuarias",
      "Compras y Contratos",
      "Planeamiento de Inventario",
      "Transporte y Tráfico Internacional"
    ]
  },
  {
    "id": "superintendente",
    "title": "Superintendente",
    "icon": "🏆",
    "description": "Dirección estratégica de operaciones",
    "color": "#EF4444",
    "areas": [
      "Almacenes y Control de Inventario",
      "Almacén de Concentrado y Operaciones Portuarias",
      "Comercial",
      "Compras y Contratos",
      "Transporte y Tráfico Internacional"
    ]
  },
  {
    "id": "supervisor",
    "title": "Supervisor",
    "icon": "👨‍💼",
    "description": "Supervisión directa de equipos",
    "color": "#10B981",
    "areas": [
      "Almacenes y Control de Inventario",
      "Almacén de Concentrado y Operaciones Portuarias",
      "Comercial",
      "Compras y Contratos",
      "Dirección de Logistica y Comercial",
      "Planeamiento de Inventario",
      "Transporte y Tráfico Internacional"
    ]
  },
  {
    "id": "asistente",
    "title": "Asistente",
    "icon": "🤝",
    "description": "Apoyo administrativo y operativo",
    "color": "#8B5CF6",
    "areas": [
      "Comercial",
      "Compras y Contratos"
    ]
  },
  {
    "id": "auxiliar",
    "title": "Auxiliar",
    "icon": "⚙️",
    "description": "Personal de soporte operativo",
    "color": "#EC4899",
    "areas": [
      "Compras y Contratos"
    ]
  }
];

// Exportar para uso en el juego
if (typeof window !== 'undefined') {
  window.positionCategories = positionCategories;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { positionCategories };
}
