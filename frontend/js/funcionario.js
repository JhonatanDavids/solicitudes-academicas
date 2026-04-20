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
let _solicitudJsonRaw = '';
let _nuevoEstadoSeleccionado = null;

const usuarioPortal = getUsuarioActual();

// Solo el funcionario puede cambiar a este estado
const ESTADOS_PERMITIDOS = ['aprobada', 'rechazada', 'en_revision'];


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

    const estadoFinalizado = ['aprobada', 'rechazada', 'cancelada'].includes(sol.estado_actual);
    const btnCambiar = crearNodo('button', {
        className: estadoFinalizado ? 'btn-sm yellow btn-estado disabled' : 'btn-sm yellow'
    }, ['✎ Estado']);

    if (estadoFinalizado) {
        btnCambiar.title = 'Solicitud finalizada';
    } else {
        btnCambiar.addEventListener('click', () => abrirCambioEstado(sol.id_solicitud));
    }

    const btnVer = crearNodo('button', { className: 'btn-sm blue' }, ['👁 Ver']);
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
        const tr = buildFilaSolicitud(sol, () => crearNodo('td'));
        const celdas = tr.querySelectorAll('td');
        if (celdas.length) celdas[celdas.length - 1].remove();
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);

    renderSidebarFuncionario();
}


function tiempoRelativo(fechaStr) {
    var fecha = new Date(fechaStr);
    var ahora = new Date();
    var diff = Math.floor((ahora - fecha) / 1000);
    var minutos = Math.floor(diff / 60);
    var horas = Math.floor(diff / 3600);
    var dias = Math.floor(diff / 86400);

    if (diff < 60) return 'Hace unos segundos';
    if (minutos < 60) return 'Hace ' + minutos + ' min';
    if (horas < 24) return 'Hace ' + horas + ' h';
    if (dias < 7) return 'Hace ' + dias + ' días';

    return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ============================================================
   SIDEBAR FUNCIONARIO — Distribución + Actividad
   Reutiliza clases de admin.css (.qs-item, .qs-bar-wrap,
   .qs-bar, .activity-list, .activity-item, .act-dot)
============================================================ */

function renderSidebarFuncionario() {
    const distCont = document.getElementById('dist-content');
    const actCont = document.getElementById('act-content');
    if (!distCont || !actCont) return;

    const estados = {
        aprobada: 0,
        pendiente: 0,
        rechazada: 0,
        en_revision: 0
    };

    listaSolicitudes.forEach(s => {
        if (estados[s.estado_actual] !== undefined) estados[s.estado_actual]++;
    });

    const total = listaSolicitudes.length || 1;

    const colorMap = {
        aprobada: 'green',
        pendiente: 'amber',
        rechazada: 'red',
        en_revision: 'blue'
    };

    const labelMap = {
        aprobada: 'Aprobadas',
        pendiente: 'Pendientes',
        rechazada: 'Rechazadas',
        en_revision: 'En revisión'
    };

    const iconMap = {
        aprobada: '✔',
        pendiente: '⏳',
        rechazada: '✕',
        en_revision: '🔍'
    };

    distCont.innerHTML =
        '<div class="quick-stat-list">' +
        Object.entries(estados).map(function(entry) {
            var k = entry[0], v = entry[1];
            var pct = (v / total) * 100;
            return '<div class="qs-item" data-estado="' + k + '" style="cursor:pointer">' +
                '<div class="qs-icon" style="background:var(--ad-' + colorMap[k] + '-bg)">' + (iconMap[k] || '●') + '</div>' +
                '<div class="qs-info">' +
                    '<div style="display:flex;justify-content:space-between">' +
                        '<span class="qs-label">' + labelMap[k] + '</span>' +
                        '<span class="qs-val">' + v + '</span>' +
                    '</div>' +
                    '<div class="qs-bar-wrap">' +
                        '<div class="qs-bar" style="width:' + pct + '%;background:var(--ad-' + colorMap[k] + ')"></div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('') +
        '</div>';

    document.querySelectorAll('#panel-distribucion .qs-item').forEach(function(item) {
        item.addEventListener('click', function() {
            var estado = item.dataset.estado;
            var filtradas = listaSolicitudes.filter(function(s) { return s.estado_actual === estado; });
            showSection('solicitudes');
            renderSolicitudes(filtradas);
        });
    });

    var recientes = listaSolicitudes.slice().sort(function(a, b) {
        return new Date(b.fecha_actualizacion || b.fecha_creacion) - new Date(a.fecha_actualizacion || a.fecha_creacion);
    }).slice(0, 5);

    if (!recientes.length) {
        actCont.innerHTML = '<div class="empty-hint">Sin actividad reciente</div>';
        return;
    }

    actCont.innerHTML =
        '<div class="activity-list">' +
        recientes.map(function(s) {
            var dotColor = colorMap[s.estado_actual] || 'teal';
            var nombreCompleto = (s.nombre || '') + ' ' + (s.apellido || '');
            var estadoLabel = labelMap[s.estado_actual] || capitalizar(s.estado_actual);
            return '<div class="activity-item">' +
                '<div class="act-dot-wrap"><div class="act-dot ' + dotColor + '"></div></div>' +
                '<div class="act-content">' +
                    '<div class="act-text"><strong>' + nombreCompleto.trim() + '</strong> cambió a ' + estadoLabel + '</div>' +
                    '<div class="act-time">' + tiempoRelativo(s.fecha_actualizacion || s.fecha_creacion) + '</div>' +
                '</div>' +
            '</div>';
        }).join('') +
        '</div>';
}


/* ============================================================
   CAMBIAR ESTADO — Modal
============================================================ */

function abrirCambioEstado(id) {
    const sol = listaSolicitudes.find(s => s.id_solicitud === id);
    if (!sol) return;

    if (['aprobada', 'rechazada', 'cancelada'].includes(sol.estado_actual)) {
        toast('Esta solicitud ya está finalizada y no puede modificarse');
        return;
    }

    _solicitudSeleccionada = id;
    _estadoActualSeleccionado = sol.estado_actual;
    _nuevoEstadoSeleccionado = null;

    document.getElementById('modal-estado-title').textContent =
        `Solicitud #${id} — Cambiar Estado`;

    const nombre = sol.nombre || '';
    const apellido = sol.apellido || '';
    const initials = (
        (nombre.charAt(0) || 'A') +
        (apellido.charAt(0) || 'A')
    ).toUpperCase();
    const avatarNum = (
        (nombre.charCodeAt(0) || 65) +
        (apellido.charCodeAt(0) || 65)
    ) % 8;

    const estadoClase = (sol.estado_actual || '').toLowerCase().replace(/_/g, '-');
    const prioridadClase = (sol.prioridad || '').toLowerCase();

    const infoContainer = document.getElementById('modal-estado-info');
    infoContainer.innerHTML = `
        <div class="estado-resumen-card">
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Estudiante</span>
                    <div class="detail-student">
                        <div class="td-avatar td-avatar-${avatarNum}">${initials}</div>
                        <strong>${nombre} ${apellido}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tipo</span>
                    <strong>${sol.tipo || sol.nombre_tipo || '–'}</strong>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Estado actual</span>
                    <span class="badge badge-${estadoClase}">${capitalizar(sol.estado_actual)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Prioridad</span>
                    <span class="badge-prio prio-${prioridadClase}">${capitalizar(sol.prioridad)}</span>
                </div>
            </div>
        </div>
    `;

    const opcionesContainer = document.getElementById('estado-opciones');
    opcionesContainer.textContent = '';

    const estados = [
        { value: 'aprobada', label: '✔ Aprobar', cls: 'estado-btn-aprobar' },
        { value: 'rechazada', label: '✕ Rechazar', cls: 'estado-btn-rechazar' },
        { value: 'en_revision', label: '🔍 En revisión', cls: 'estado-btn-revision' }
    ];

    estados.forEach(({ value, label, cls }) => {
        const btn = crearNodo('button', { className: `estado-btn ${cls}`, 'data-estado': value }, [label]);
        btn.addEventListener('click', () => {
            _nuevoEstadoSeleccionado = value;
            opcionesContainer.querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        if (value === _estadoActualSeleccionado) {
            btn.classList.add('active');
            _nuevoEstadoSeleccionado = value;
        }
        opcionesContainer.appendChild(btn);
    });

    const comentario = document.getElementById('estado-comentario');
    if (comentario) comentario.value = '';

    document.getElementById('modal-estado').classList.add('show');
}

async function confirmarCambioEstado() {
    if (!_solicitudSeleccionada) return;

    const nuevoEstado = _nuevoEstadoSeleccionado;

    if (!nuevoEstado) {
        toast('Selecciona un estado', 'error');
        return;
    }

    if (nuevoEstado === _estadoActualSeleccionado) {
        toast('El estado ya es el mismo', 'info');
        return;
    }

    if (!ESTADOS_PERMITIDOS.includes(nuevoEstado)) {
        toast('Estado no permitido para funcionario', 'error');
        return;
    }

    const comentario = document.getElementById('estado-comentario')?.value?.trim() || '';

    if (nuevoEstado === 'rechazada' && !comentario) {
        toast('Debes agregar un motivo al rechazar', 'error');
        return;
    }

    try {
        await api.actualizarEstadoSolicitud(_solicitudSeleccionada, nuevoEstado);
        toast('Estado actualizado correctamente');
        closeModal('modal-estado');
        _solicitudSeleccionada = null;
        _estadoActualSeleccionado = null;
        _nuevoEstadoSeleccionado = null;
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
   MODAL DETALLE
============================================================ */

function verJsonSolicitud(id) {
    const sol = listaSolicitudes.find(s => s.id_solicitud === id);
    if (!sol) return;

    _solicitudJsonRaw = JSON.stringify(sol, null, 2);

    document.getElementById('modal-json-title').textContent = `Solicitud #${sol.id_solicitud}`;

    const estadoClase = (sol.estado_actual || '').toLowerCase().replace(/_/g, '-');
    const prioridadClase = (sol.prioridad || '').toLowerCase();

    const nombre = sol.nombre || '';
    const apellido = sol.apellido || '';

    const initials = (
        (nombre.charAt(0) || 'A') +
        (apellido.charAt(0) || 'A')
    ).toUpperCase();

    const avatarNum = (
        (nombre.charCodeAt(0) || 65) +
        (apellido.charCodeAt(0) || 65)
    ) % 8;

    document.getElementById('modal-json-content').innerHTML = `
        <div class="detail-container">
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Tipo</span>
                    <strong>${sol.tipo || sol.nombre_tipo || '–'}</strong>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Estado</span>
                    <span class="badge badge-${estadoClase}">
                        ${capitalizar(sol.estado_actual)}
                    </span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Estudiante</span>
                    <div class="detail-student">
                        <div class="td-avatar td-avatar-${avatarNum}">
                            ${initials}
                        </div>
                        <strong>${nombre} ${apellido}</strong>
                    </div>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Fecha</span>
                    <strong>${formatearFecha(sol.fecha_creacion)}</strong>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Prioridad</span>
                    <span class="badge-prio prio-${prioridadClase}">
                        ${capitalizar(sol.prioridad)}
                    </span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">ID</span>
                    <strong>#${sol.id_solicitud}</strong>
                </div>
                <div class="detail-item full">
                    <span class="detail-label">Descripción</span>
                    <div class="desc-box">
                        ${sol.descripcion || 'Sin descripción'}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modal-json').classList.add('show');
}

function capitalizar(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function copiarJsonFuncionario() {
    if (!_solicitudJsonRaw) return;
    navigator.clipboard.writeText(_solicitudJsonRaw)
        .then(() => toast('Copiado al portapapeles'));
}

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
    bind('btn-cerrar-estado-1', 'click', () => {
        _nuevoEstadoSeleccionado = null;
        const ta = document.getElementById('estado-comentario');
        if (ta) ta.value = '';
        const opciones = document.getElementById('estado-opciones');
        if (opciones) opciones.querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
        closeModal('modal-estado');
    });
    bind('btn-cerrar-estado-2', 'click', () => {
        _nuevoEstadoSeleccionado = null;
        const ta = document.getElementById('estado-comentario');
        if (ta) ta.value = '';
        const opciones = document.getElementById('estado-opciones');
        if (opciones) opciones.querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
        closeModal('modal-estado');
    });
    bind('btn-confirmar-estado', 'click', confirmarCambioEstado);

    // Modal JSON
    bind('btn-cerrar-json-1', 'click', () => closeModal('modal-json'));
    bind('btn-copiar-json', 'click', copiarJsonFuncionario);

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