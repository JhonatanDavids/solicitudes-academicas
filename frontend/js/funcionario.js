/* ============================================================
   FUNCIONARIO.JS — Panel de Funcionario
   Solo gestión de solicitudes (ver, cambiar estado a en_revision)
   Depende de: helpers.js · auth.js · ui.js · api.js · components.js
============================================================ */

// ── AUTENTICACIÓN ─────────────────────────────────────────────
// Reemplaza el bloque if (!_usuario || !_token) repetido antes
verificarSesion('funcionario');

// ── ESTADO DEL MÓDULO ─────────────────────────────────────────
let listaSolicitudes = [];
let _solicitudSeleccionada = null;
let _estadoActualSeleccionado = null;

const usuarioPortal = getUsuarioActual();

// Solo el funcionario puede cambiar a este estado
const ESTADOS_PERMITIDOS = ['en_revision'];


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
        const tr = buildFilaSolicitud(sol, _buildAccionesFuncionario);
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

/** Construye el <td> de acciones específico del funcionario */
function _buildAccionesFuncionario(sol) {
    const tdAct = crearNodo('td', { className: 'td-actions' });

    const btnCambiar = crearNodo('button', { className: 'btn-sm yellow' }, ['✎ Estado']);
    btnCambiar.addEventListener('click', () => abrirCambioEstado(sol.id_solicitud));

    const btnVer = crearNodo('button', { className: 'btn-sm blue' }, ['{ }']);
    btnVer.addEventListener('click', () => verJsonSolicitud(sol.id_solicitud));

    tdAct.appendChild(btnCambiar);
    tdAct.appendChild(btnVer);
    return tdAct;
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

    // Últimas 8 solicitudes — solo tabla de lectura, sin acciones
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
        const tr = buildFilaSolicitud(sol, () => crearNodo('td')); // sin acciones
        // Quitar la última celda vacía que agrega buildFilaSolicitud
        const celdas = tr.querySelectorAll('td');
        if (celdas.length) celdas[celdas.length - 1].remove();
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}


/* ============================================================
   CAMBIAR ESTADO — Modal
============================================================ */

function abrirCambioEstado(id) {
    const sol = listaSolicitudes.find(s => s.id_solicitud === id);
    if (!sol) return;

    _solicitudSeleccionada = id;
    _estadoActualSeleccionado = sol.estado_actual;

    document.getElementById('modal-estado-title').textContent =
        `// SOLICITUD #${id} — Cambiar Estado`;

    const infoContainer = document.getElementById('modal-estado-info');
    infoContainer.textContent = '';
    infoContainer.appendChild(crearNodo('strong', {}, [`${sol.nombre || ''} ${sol.apellido || ''}`]));
    infoContainer.appendChild(crearNodo('br'));
    infoContainer.appendChild(crearNodo('span', { className: 'info-muted' },
        [`Tipo: ${sol.tipo || sol.nombre_tipo || '–'} · Estado actual: ${sol.estado_actual}`]));

    const select = document.getElementById('select-nuevo-estado');
    select.textContent = '';
    ESTADOS_PERMITIDOS.forEach(estado => {
        const label = estado === 'en_revision' ? '🔍 En Revisión' : estado;
        select.appendChild(crearNodo('option', { value: estado }, [label]));
    });
    select.value = ESTADOS_PERMITIDOS[0];

    document.getElementById('modal-estado').classList.add('show');
}

async function confirmarCambioEstado() {
    if (!_solicitudSeleccionada) return;

    const nuevoEstado = document.getElementById('select-nuevo-estado').value;

    if (nuevoEstado === _estadoActualSeleccionado) {
        toast('El estado ya es el mismo', 'info');
        return;
    }

    if (!ESTADOS_PERMITIDOS.includes(nuevoEstado)) {
        toast('Estado no permitido para funcionario', 'error');
        return;
    }

    try {
        await api.actualizarEstadoSolicitud(_solicitudSeleccionada, nuevoEstado);
        toast('Estado actualizado correctamente');
        closeModal('modal-estado');
        _solicitudSeleccionada = null;
        _estadoActualSeleccionado = null;
        await cargarSolicitudes();
        actualizarOverview();
    } catch (err) {
        toast('Error al actualizar estado: ' + err.message, 'error');
    }
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

// Filtro de texto — opera sobre las filas ya renderizadas por DataTables
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

// Alias para compatibilidad con llamadas que usen el nombre antiguo
function verJsonObj(id) { verJsonSolicitud(id); }


/* ============================================================
   INICIALIZACIÓN
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar cierre de modales con backdrop
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

    // Modal estado
    bind('btn-cerrar-estado-1', 'click', () => closeModal('modal-estado'));
    bind('btn-cerrar-estado-2', 'click', () => closeModal('modal-estado'));
    bind('btn-confirmar-estado', 'click', confirmarCambioEstado);

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