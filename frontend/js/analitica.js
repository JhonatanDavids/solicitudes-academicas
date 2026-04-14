/* ============================================================
   ANALÍTICA - VALIDACIÓN DE SESIÓN (SOLO ADMIN)
============================================================ */

const _usuario = JSON.parse(sessionStorage.getItem('portalUser'));
const _token = sessionStorage.getItem('token');
if (!_usuario || !_token || _usuario.rol !== 'admin') {
    // Si no es admin o no hay token, fuera
    window.location.href = "../index.html";
}

document.addEventListener('DOMContentLoaded', () => {
    // Escucha eventos del topbar genérico para poder cerrar sesión
    document.addEventListener('logout-event', () => {
        sessionStorage.clear();
        window.location.href = "../index.html";
    });
});
