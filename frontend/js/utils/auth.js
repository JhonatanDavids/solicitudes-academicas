// ══════════════════════════════════════════════════════════════
//  AUTH.JS — Utilidad centralizada de autenticación
//  Reemplaza los bloques de verificación repetidos en cada módulo.
//  Expone: verificarSesion(), doLogout(), getUsuarioActual()
// ══════════════════════════════════════════════════════════════

/**
 * Verifica que exista sesión activa y, opcionalmente, que el rol coincida.
 * Si falla, redirige a index.html inmediatamente.
 *
 * @param {string|null} rolRequerido  - 'admin' | 'funcionario' | 'coordinador' | null
 * @param {string}      rutaLogin     - ruta relativa a index.html (default '../index.html')
 */
function verificarSesion(rolRequerido = null, rutaLogin = '../index.html') {
    const usuario = _getUsuarioRaw();
    const token = sessionStorage.getItem('token');

    if (!usuario || !token) {
        window.location.href = rutaLogin;
        return;
    }

    if (rolRequerido && usuario.rol !== rolRequerido) {
        window.location.href = rutaLogin;
    }
}

/**
 * Devuelve el objeto de usuario guardado en sessionStorage.
 * Si no existe retorna un objeto vacío (nunca lanza).
 *
 * @returns {{ nombre, apellido, correo, rol, id_usuario } | {}}
 */
function getUsuarioActual() {
    return _getUsuarioRaw() || {};
}

/**
 * Cierra la sesión y redirige al login.
 * Compatible con el nombre doLogout() que ya usan admin/funcionario/coordinador.
 */
function doLogout() {
    sessionStorage.removeItem('portalUser');
    sessionStorage.removeItem('token');
    window.location.href = '../index.html';
}

// ── PRIVADO ──────────────────────────────────────────────────
function _getUsuarioRaw() {
    try {
        return JSON.parse(sessionStorage.getItem('portalUser'));
    } catch {
        return null;
    }
}