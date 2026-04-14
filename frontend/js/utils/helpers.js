// ══════════════════════════════════════════════════════════════
//  HELPERS.JS — Funciones puras sin dependencias de DOM
//  Expone: sanitizarClase(), formatearFecha(), normalizarRespuesta(),
//          ROL_CONFIG, getRolConfig()
// ══════════════════════════════════════════════════════════════

// ── CONFIGURACIÓN DE ROLES ────────────────────────────────────
const ROL_CONFIG = {
    estudiante: { icon: '🎓', clase: 'rol-estudiante', label: 'Estudiante' },
    admin: { icon: '⚡', clase: 'rol-admin', label: 'Admin' },
    coordinador: { icon: '📋', clase: 'rol-coordinador', label: 'Coordinador' },
    funcionario: { icon: '🏛️', clase: 'rol-funcionario', label: 'Funcionario' },
};

/**
 * Convierte un string a formato seguro para clase CSS.
 * "En Revisión" → "en-revisión"
 */
function sanitizarClase(texto) {
    return (texto || 'otro').toLowerCase().replace(/\s+/g, '-');
}

/**
 * Formatea una fecha ISO a formato legible en español colombiano.
 * "2026-03-30T10:00:00" → "30 mar. 2026"
 */
function formatearFecha(fecha) {
    if (!fecha) return '–';
    return new Date(fecha).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

/**
 * Normaliza la respuesta del backend.
 * Algunos endpoints devuelven { resultado: [...] }, otros devuelven [] directamente.
 * Centraliza este patrón que estaba repetido en cada cargar*().
 */
function normalizarRespuesta(datos) {
    if (!datos) return [];
    if (Array.isArray(datos)) return datos;
    if (Array.isArray(datos.resultado)) return datos.resultado;
    return [];
}

/**
 * Devuelve la configuración (icon, clase, label) para un nombre de rol dado.
 * Si no existe el rol, retorna un fallback genérico.
 */
function getRolConfig(nombre) {
    const key = sanitizarClase(nombre);
    return ROL_CONFIG[key] || { icon: '👤', clase: 'rol-otro', label: nombre || 'Otro' };
}