#!/usr/bin/env python3
"""
Conversor: Excel → areasData.js
Transforma datos de 'Información - Puestos LyC VF.xlsx' al formato del juego Career Quest.
"""

import pandas as pd
import json
import re
from pathlib import Path

def slugify(text):
    """Convierte texto a ID válido (ej: 'Almacén de Concentrado' -> 'almacen-concentrado')"""
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r'[áàâä]', 'a', text)
    text = re.sub(r'[éèêë]', 'e', text)
    text = re.sub(r'[íìîï]', 'i', text)
    text = re.sub(r'[óòôö]', 'o', text)
    text = re.sub(r'[úùûü]', 'u', text)
    text = re.sub(r'[ñ]', 'n', text)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text

def clean_text(text):
    """Limpia espacios excesivos y saltos de línea"""
    if not text or pd.isna(text):
        return ""
    text = str(text).strip()
    text = re.sub(r'\s+', ' ', text)
    return text

# Colores para cada área (se asignan cíclicamente)
COLORS = [
    '#4cc9f0', '#2dd4bf', '#7c4dff', '#ffb703', 
    '#ff6b6b', '#8ec5ff', '#06d6a0', '#ffd60a'
]

def read_excel_data():
    """Lee el Excel y retorna DataFrames limpios"""
    excel_path = Path("js/EXCEL/Informacion - Puestos LyC VF.xlsx")
    
    if not excel_path.exists():
        raise FileNotFoundError(f"No se encontró: {excel_path}")
    
    puestos_df = pd.read_excel(excel_path, sheet_name="Lista de Puestos")
    funciones_df = pd.read_excel(excel_path, sheet_name="Funciones")
    
    # Limpiar y normalizar
    puestos_df = puestos_df.dropna(subset=['ÁREA', 'NOMBRE DEL PUESTO'])
    puestos_df = puestos_df.applymap(clean_text) if hasattr(puestos_df, 'applymap') else puestos_df.map(clean_text)
    
    funciones_df['Puesto'] = funciones_df['Puesto'].apply(clean_text)
    funciones_df['Funcion'] = funciones_df['Funcion'].apply(clean_text)
    funciones_df = funciones_df.dropna(subset=['Puesto', 'Funcion'])
    
    return puestos_df, funciones_df

def get_functions_for_puesto(nombre_puesto, funciones_df):
    """Obtiene todas las funciones para un puesto específico"""
    puesto_functions = funciones_df[funciones_df['Puesto'].str.upper() == nombre_puesto.upper()]
    return [row['Funcion'] for _, row in puesto_functions.iterrows() if row['Funcion']]

def build_areas_catalog(puestos_df, funciones_df):
    """Construye el catálogo de áreas con puestos y funciones"""
    areas = {}
    area_order = []
    
    for _, row in puestos_df.iterrows():
        area_name = row['ÁREA']
        area_id = slugify(area_name)
        nombre_puesto = row['NOMBRE DEL PUESTO']
        categoria = row['CATEGORÍA']
        
        # Inicializar área si no existe
        if area_id not in areas:
            area_order.append(area_id)
            areas[area_id] = {
                'id': area_id,
                'title': area_name,
                'icon': '🏢',  # Icono genérico
                'summary': f"Área de {area_name}",
                'accent': COLORS[len(areas) % len(COLORS)],
                'departmentTitle': f"Gerencia de {area_name}",
                'subtitle': f"Categoría: {categoria}",
                'description': clean_text(row['MISION DEL PUESTO']) or f"Área especializada en {area_name}",
                'npc': 'Gerente',
                'npcRole': f'Responsable de {area_name}',
                'quote': f"Bienvenido al área de {area_name}",
                'competencies': [],
                'functions': [],
                'kpis': [],
                'skills': [],
                'positions': [],
                'x': 150 + (len(areas) * 100),
                'y': 300 + (len(areas) * 50) % 200,
                'color': COLORS[len(areas) % len(COLORS)],
                'mapLabel': area_name,
            }
        
        # Agregar puesto a la área
        functions = get_functions_for_puesto(nombre_puesto, funciones_df)
        
        position = {
            'title': nombre_puesto,
            'level': f"Nivel {3 if 'SR' in nombre_puesto.upper() else 2}",
            'blurb': clean_text(row.get('ESPECIALIDAD', '')) or nombre_puesto,
            'functions': functions,
            'carrera_afin': clean_text(row.get('CARRERA AFÍN', '')),
            'idioma': clean_text(row.get('IDIOMA', '')),
            'experiencia_general': str(row.get('EXP.GENERAL', '')),
            'experiencia_puesto': str(row.get('EXP.PUESTO', '')),
            'experiencia_sector': str(row.get('EXP.SECTOR', '')),
        }
        
        areas[area_id]['positions'].append(position)
        
        # Agregar funciones únicas al área
        areas[area_id]['functions'].extend(functions)
        areas[area_id]['functions'] = list(set(areas[area_id]['functions']))  # Deduplicar
    
    # Retornar en orden
    return [areas[area_id] for area_id in area_order]

def generate_javascript(areas_catalog):
    """Genera el archivo JavaScript con los datos"""
    
    js_content = """(function (global) {
  const areaCatalog = """ + json.dumps(areas_catalog, indent=2, ensure_ascii=False) + """;

  const roleOptions = areaCatalog.map(area => ({
    id: area.id,
    title: area.title,
    icon: area.icon,
    summary: area.summary,
    accent: area.accent
  }));

  const departments = areaCatalog.map(area => ({ ...area }));

  global.areaCatalog = areaCatalog;
  global.roleOptions = roleOptions;
  global.departments = departments;
})(window);
"""
    
    return js_content

def main():
    try:
        print("📖 Leyendo Excel...")
        puestos_df, funciones_df = read_excel_data()
        
        print(f"✓ {len(puestos_df)} puestos cargados")
        print(f"✓ {len(funciones_df)} funciones cargadas")
        
        print("\n🔧 Construyendo catálogo de áreas...")
        areas_catalog = build_areas_catalog(puestos_df, funciones_df)
        
        print(f"✓ {len(areas_catalog)} áreas identificadas:\n")
        for area in areas_catalog:
            print(f"  • {area['title']} ({len(area['positions'])} puestos, {len(area['functions'])} funciones)")
        
        print("\n📝 Generando areasData.js...")
        js_content = generate_javascript(areas_catalog)
        
        output_path = Path("js/areasData.js")
        output_path.write_text(js_content, encoding='utf-8')
        
        print(f"✅ Archivo generado: {output_path}")
        print(f"   Tamaño: {len(js_content)} bytes")
        
        # También guardar como JSON para referencia
        json_path = Path("js/areasData.json")
        json_path.write_text(json.dumps(areas_catalog, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f"📊 Datos JSON guardados: {json_path}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
