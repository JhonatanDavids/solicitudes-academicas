/* ============================================================
   COORDINADOR.JS — Panel de Coordinador
   Solo gestión de aprobaciones (aprobar / rechazar solicitudes)
   Depende de: helpers.js · auth.js · ui.js · api.js · components.js
============================================================ */

// ── AUTENTICACIÓN ─────────────────────────────────────────────
verificarSesion('coordinador');

// ── ESTADO DEL MÓDULO ─────────────────────────────────────────
let listaSolicitudes = [];

const usuarioPortal = getUsuarioActual();


/* ============================================================
   NAVEGACIÓN
============================================================ */

async function showSection(nombre, elemento) {
    _activarSeccion(nombre, elemento);

    if (nombre === 'solicitudes') cargarSolicitudes();
    if (nombre === 'overview') {
        await cargarSolicitudes();
        actualizarOverview();
    }
}

async function refreshAll() {
    toast('Actualizando datos...', 'info');
    try {
        await cargarSolicitudes();
        actualizarOverview();
    } catch (e) {
        console.error('refreshAll error:', e);
    }
}


/* ============================================================
   CARGAR SOLICITUDES
============================================================ */

async function cargarSolicitudes() {
    const contenedor = document.getElementById('data-solicitudes');
    mostrarLoading(contenedor);

    try {
        const datos = await api.obtenerSolicitudes();
        listaSolicitudes = normalizarRespuesta(datos);

        renderSolicitudes(listaSolicitudes);

        const badge = document.getElementById('badge-solicitudes');
        if (badge) badge.textContent = listaSolicitudes.length;

    } catch (error) {
        console.error(error);
        mostrarErrorVisual(contenedor, 'Error cargando solicitudes');
        if (error.message && error.message.includes('401')) doLogout();
    }
}


/* ============================================================
   RENDER SOLICITUDES
============================================================ */

function renderSolicitudes(lista) {
    const contenedor = document.getElementById('data-solicitudes');
    if (!contenedor) return;
    contenedor.textContent = '';

    if (!lista.length) {
        mostrarVacio(contenedor, 'No hay solicitudes');
        return;
    }

    const { tabla, tbody } = crearTabla(
        ['Estudiante', 'Tipo', 'Estado', 'Prioridad', 'Fecha', 'Acciones']
    );

    lista.forEach(sol => {
        const tr = buildFilaSolicitud(sol, _buildAccionesCoordinador);
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

/** Construye el <td> de acciones específico del coordinador */
function _buildAccionesCoordinador(sol) {
    const tdAct = crearNodo('td', { className: 'td-actions' });

    const btnAprobar = crearNodo('button', { className: 'btn-sm green' }, ['✓ Aprobar']);
    btnAprobar.addEventListener('click', () => aprobarSolicitud(sol.id_solicitud));

    const btnRechazar = crearNodo('button', { className: 'btn-sm red' }, ['✕ Rechazar']);
    btnRechazar.addEventListener('click', () => rechazarSolicitud(sol.id_solicitud));

    const btnVer = crearNodo('button', { className: 'btn-sm blue' }, ['{ }']);
    btnVer.addEventListener('click', () => verJsonSolicitud(sol.id_solicitud));

    tdAct.appendChild(btnAprobar);
    tdAct.appendChild(btnRechazar);
    tdAct.appendChild(btnVer);
    return tdAct;
}


/* ============================================================
   ACCIONES DE APROBACIÓN
============================================================ */

async function aprobarSolicitud(id) {
    try {
        await api.actualizarEstadoSolicitud(id, 'aprobada');
        toast('Solicitud aprobada correctamente', 'success');
        await cargarSolicitudes();
        actualizarOverview();
    } catch (e) {
        toast('Error al aprobar: ' + e.message, 'error');
    }
}

async function rechazarSolicitud(id) {
    try {
        await api.actualizarEstadoSolicitud(id, 'rechazada');
        toast('Solicitud rechazada', 'success');
        await cargarSolicitudes();
        actualizarOverview();
    } catch (e) {
        toast('Error al rechazar: ' + e.message, 'error');
    }
}


/* ============================================================
   OVERVIEW
============================================================ */

function actualizarOverview() {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('ov-solicitudes', listaSolicitudes.length);
    set('ov-pendientes', listaSolicitudes.filter(s => s.estado_actual === 'pendiente').length);
    set('ov-en-revision', listaSolicitudes.filter(s => s.estado_actual === 'en_revision').length);
    set('ov-aprobadas', listaSolicitudes.filter(s => s.estado_actual === 'aprobada').length);
    set('ov-rechazadas', listaSolicitudes.filter(s => s.estado_actual === 'rechazada').length);

    // Últimas 8 solicitudes — solo lectura
    const contenedor = document.getElementById('overview-recent');
    if (!contenedor) return;
    contenedor.textContent = '';

    if (!listaSolicitudes.length) {
        mostrarVacio(contenedor, 'Sin solicitudes recientes');
        return;
    }

    const { tabla, tbody } = crearTabla(
        ['Estudiante', 'Tipo', 'Estado', 'Prioridad', 'Fecha']
    );

    listaSolicitudes.slice(0, 8).forEach(sol => {
        const tr = buildFilaSolicitud(sol, () => crearNodo('td'));
        const celdas = tr.querySelectorAll('td');
        if (celdas.length) celdas[celdas.length - 1].remove();
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}


/* ============================================================
   FILTROS
============================================================ */

function filterByEstado() {
    const estado = document.getElementById('filter-estado').value;
    renderSolicitudes(
        estado ? listaSolicitudes.filter(s => s.estado_actual === estado) : listaSolicitudes
    );
}

function filterTable(valor) {
    const texto = valor.toLowerCase();
    const contenedor = document.getElementById('data-solicitudes');
    if (!contenedor) return;
    contenedor.querySelectorAll('tbody tr').forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
}


/* ============================================================
   MODAL JSON
============================================================ */

function verJsonSolicitud(id) {
    const obj = listaSolicitudes.find(s => s.id_solicitud === id);
    document.getElementById('modal-json-title').textContent = `// SOLICITUD #${id}`;
    document.getElementById('modal-json-content').textContent = JSON.stringify(obj || { error: 'No encontrado' }, null, 2);
    document.getElementById('modal-json').classList.add('show');
}

// Alias para compatibilidad con el nombre antiguo
function verJsonObj(id) { verJsonSolicitud(id); }


/* ============================================================
   INICIALIZACIÓN
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    initModalBackdrop();

    // Mostrar correo del usuario en topbar
    const topbarUser = document.getElementById('topbar-user');
    if (topbarUser && usuarioPortal.correo) {
        topbarUser.textContent = usuarioPortal.correo;
    }

    // ── Event Listeners ──
    const bind = (id, evt, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(evt, fn);
    };

    bind('filter-estado', 'change', filterByEstado);
    bind('btn-recargar-solicitudes', 'click', cargarSolicitudes);
    bind('input-buscar-solicitudes', 'input', e => filterTable(e.target.value));

    // Modal JSON
    bind('btn-cerrar-json-1', 'click', () => closeModal('modal-json'));
    bind('btn-copiar-json', 'click', copyJsonModal);

    // ── Carga inicial ──
    try {
        await cargarSolicitudes();
        actualizarOverview();
    } catch (e) {
        console.error('Error en carga inicial:', e);
    }

     // Auto-refresh cada 60 segundos - DESACTIVADO para mejorar UX
     // setInterval(refreshAll, 60000);
});