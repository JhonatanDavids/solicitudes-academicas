/* ============================================================
   COORDINADOR.JS — Panel de Coordinador
   Solo gestión de aprobaciones (aprobar / rechazar solicitudes)
   Depende de: helpers.js · auth.js · ui.js · api.js · components.js
============================================================ */

// ── AUTENTICACIÓN ─────────────────────────────────────────────
verificarSesion('coordinador');

// ── ESTADO DEL MÓDULO ─────────────────────────────────────────
let listaSolicitudes = [];
let _solicitudSeleccionada = null;
let _decisionSeleccionada = null;

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

    const estadoFinalizado = ['aprobada', 'rechazada', 'cancelada'].includes(sol.estado_actual);

    const btnAprobar = crearNodo('button', {
        className: estadoFinalizado ? 'btn-sm green btn-estado disabled' : 'btn-sm green'
    }, ['✓ Aprobar']);

    if (estadoFinalizado) {
        btnAprobar.title = 'Solicitud finalizada';
    } else {
        btnAprobar.addEventListener('click', () => openDecision(sol.id_solicitud, 'approve'));
    }

    const btnRechazar = crearNodo('button', {
        className: estadoFinalizado ? 'btn-sm red btn-estado disabled' : 'btn-sm red'
    }, ['✕ Rechazar']);

    if (estadoFinalizado) {
        btnRechazar.title = 'Solicitud finalizada';
    } else {
        btnRechazar.addEventListener('click', () => openDecision(sol.id_solicitud, 'reject'));
    }

    const btnVer = crearNodo('button', { className: 'btn-sm blue' }, ['👁 Ver']);
    btnVer.addEventListener('click', () => verJsonSolicitud(sol.id_solicitud));

    tdAct.appendChild(btnAprobar);
    tdAct.appendChild(btnRechazar);
    tdAct.appendChild(btnVer);
    return tdAct;
}


/* ============================================================
   MODAL DE DECISIÓN — Confirmación antes de aprobar/rechazar
============================================================ */

function openDecision(id, preselect) {
    const sol = listaSolicitudes.find(s => s.id_solicitud === id);
    if (!sol) return;

    if (['aprobada', 'rechazada', 'cancelada'].includes(sol.estado_actual)) {
        toast('La solicitud ya fue finalizada (aprobada/rechazada) y no se puede modificar');
        return;
    }

    _solicitudSeleccionada = id;
    _decisionSeleccionada = null;

    const nombre = sol.nombre || '';
    const apellido = sol.apellido || '';
    const initials = ((nombre.charAt(0) || 'A') + (apellido.charAt(0) || 'A')).toUpperCase();
    const avatarNum = ((nombre.charCodeAt(0) || 65) + (apellido.charCodeAt(0) || 65)) % 8;
    const estadoClase = (sol.estado_actual || '').toLowerCase().replace(/_/g, '-');
    const prioridadClase = (sol.prioridad || '').toLowerCase();

    document.getElementById('modal-decision-title').textContent =
        `Solicitud #${sol.id_solicitud} — Decisión`;

    document.getElementById('modal-decision-info').innerHTML = `
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

    const approveBtn = document.getElementById('choice-approve');
    const rejectBtn = document.getElementById('choice-reject');
    approveBtn.classList.remove('selected');
    rejectBtn.classList.remove('selected');

    const confirmBtn = document.getElementById('btn-confirmar-decision');
    confirmBtn.textContent = 'Confirmar Decisión';
    confirmBtn.className = 'btn-sm green';
    confirmBtn.style.padding = '7px 18px';

    const comentario = document.getElementById('decision-comentario');
    if (comentario) comentario.value = '';

    if (preselect) {
        selectChoice(preselect);
    }

    document.getElementById('modal-decision').classList.add('show');
}

function selectChoice(type) {
    const approveBtn = document.getElementById('choice-approve');
    const rejectBtn = document.getElementById('choice-reject');
    const confirmBtn = document.getElementById('btn-confirmar-decision');

    approveBtn.classList.toggle('selected', type === 'approve');
    rejectBtn.classList.toggle('selected', type === 'reject');

    _decisionSeleccionada = type;

    if (type === 'approve') {
        confirmBtn.textContent = '✓ Confirmar Aprobación';
        confirmBtn.className = 'btn-sm green';
        confirmBtn.style.padding = '7px 18px';
    } else if (type === 'reject') {
        confirmBtn.textContent = '✕ Confirmar Rechazo';
        confirmBtn.className = 'btn-sm red';
        confirmBtn.style.padding = '7px 18px';
    }
}

async function submitDecision() {
    if (!_solicitudSeleccionada) return;

    if (!_decisionSeleccionada) {
        toast('Seleccione una acción antes de confirmar', 'error');
        return;
    }

    const nuevoEstado = _decisionSeleccionada === 'approve' ? 'aprobada' : 'rechazada';
    const comentario = document.getElementById('decision-comentario')?.value?.trim() || '';

    if (nuevoEstado === 'rechazada' && !comentario) {
        toast('Debe agregar un motivo al rechazar', 'error');
        return;
    }

    const confirmBtn = document.getElementById('btn-confirmar-decision');
    if (confirmBtn.disabled) return;

    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Procesando...';

    try {
        await api.actualizarEstadoSolicitud(_solicitudSeleccionada, nuevoEstado);
        toast(nuevoEstado === 'aprobada' ? 'Solicitud aprobada correctamente' : 'Solicitud rechazada', 'success');
        closeModal('modal-decision');

        _highlightRow(_solicitudSeleccionada, nuevoEstado);

        _solicitudSeleccionada = null;
        _decisionSeleccionada = null;
        await cargarSolicitudes();
        actualizarOverview();
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

function _highlightRow(id, estado) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;
    const cls = estado === 'aprobada' ? 'row-highlight-green' : 'row-highlight-red';
    row.classList.add(cls);
    setTimeout(() => row.classList.remove(cls), 1500);
}


/* ============================================================
   OVERVIEW
============================================================ */

function actualizarOverview() {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const pendientes = listaSolicitudes.filter(s => s.estado_actual === 'pendiente').length;

    set('ov-solicitudes', listaSolicitudes.length);
    set('ov-pendientes', pendientes);
    set('ov-en-revision', listaSolicitudes.filter(s => s.estado_actual === 'en_revision').length);
    set('ov-aprobadas', listaSolicitudes.filter(s => s.estado_actual === 'aprobada').length);
    set('ov-rechazadas', listaSolicitudes.filter(s => s.estado_actual === 'rechazada').length);

    const pendientesEl = document.getElementById('pendientes-count');
    if (pendientesEl) {
        pendientesEl.textContent = pendientes + ' solicitud' + (pendientes !== 1 ? 'es' : '') + ' pendiente' + (pendientes !== 1 ? 's' : '');
    }

    const alertBanner = document.getElementById('alert-pendientes');
    if (alertBanner) {
        alertBanner.style.display = pendientes > 0 ? 'flex' : 'none';
    }

    _renderOverviewTable(listaSolicitudes);
}

let _ovListaActual = [];

function _renderOverviewTable(lista) {
    _ovListaActual = lista;

    const contenedor = document.getElementById('overview-recent');
    if (!contenedor) return;
    contenedor.textContent = '';

    if (!lista.length) {
        mostrarVacio(contenedor, 'Sin solicitudes recientes');
        return;
    }

    const { tabla, tbody } = crearTabla(
        ['Estudiante', 'Tipo', 'Estado', 'Prioridad', 'Fecha']
    );

    lista.slice(0, 8).forEach(sol => {
        const tr = buildFilaSolicitud(sol, () => crearNodo('td'));
        const celdas = tr.querySelectorAll('td');
        if (celdas.length) celdas[celdas.length - 1].remove();
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

function _initOvFilterChips() {
    const bar = document.getElementById('ov-filter-bar');
    if (!bar) return;

    bar.addEventListener('click', function(e) {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;

        bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const estado = chip.dataset.estado;
        if (!estado) {
            _renderOverviewTable(listaSolicitudes);
        } else {
            _renderOverviewTable(listaSolicitudes.filter(s => s.estado_actual === estado));
        }
    });
}


/* ============================================================
   FILTROS
============================================================ */

let filtroAprobaciones = 'all';

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

function renderSolicitudesFiltradas() {
    let data = listaSolicitudes;
    if (filtroAprobaciones !== 'all') {
        data = listaSolicitudes.filter(s => s.estado_actual === filtroAprobaciones);
    }
    renderSolicitudes(data);
}

function initAprobacionesFilters() {
    const container = document.getElementById('aprobaciones-filters');
    if (!container) return;

    container.addEventListener('click', function(e) {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;

        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        filtroAprobaciones = chip.dataset.filter;
        renderSolicitudesFiltradas();
    });
}


let _solicitudJsonRaw = '';

/* ============================================================
   MODAL DETALLE
============================================================ */

function verJsonSolicitud(id) {
    const sol = listaSolicitudes.find(s => s.id_solicitud === id);
    if (!sol) return;

    _solicitudJsonRaw = JSON.stringify(sol, null, 2);

    const estadoClase = (sol.estado_actual || '').toLowerCase().replace(/_/g, '-');
    const prioridadClase = (sol.prioridad || '').toLowerCase();
    const nombre = sol.nombre || '';
    const apellido = sol.apellido || '';
    const initials = ((nombre.charAt(0) || 'A') + (apellido.charAt(0) || 'A')).toUpperCase();
    const avatarNum = ((nombre.charCodeAt(0) || 65) + (apellido.charCodeAt(0) || 65)) % 8;

    document.getElementById('modal-json-title').textContent = `Solicitud #${sol.id_solicitud}`;

    document.getElementById('modal-json-content').innerHTML = `
        <div class="detail-container">
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
                    <span class="detail-label">Estado</span>
                    <span class="badge badge-${estadoClase}">${capitalizar(sol.estado_actual)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Prioridad</span>
                    <span class="badge-prio prio-${prioridadClase}">${capitalizar(sol.prioridad)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fecha creación</span>
                    <strong>${formatearFecha(sol.fecha_creacion)}</strong>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Última actualización</span>
                    <strong>${sol.fecha_actualizacion ? formatearFecha(sol.fecha_actualizacion) : '–'}</strong>
                </div>
                <div class="detail-item">
                    <span class="detail-label">ID</span>
                    <strong>#${sol.id_solicitud}</strong>
                </div>
                <div class="detail-item full">
                    <span class="detail-label">Descripción</span>
                    <div class="desc-box">${sol.descripcion || 'Sin descripción'}</div>
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
    bind('btn-copiar-json', 'click', () => {
        if (!_solicitudJsonRaw) return;
        navigator.clipboard.writeText(_solicitudJsonRaw)
            .then(() => toast('Copiado al portapapeles'));
    });

    // Modal Decisión
    bind('btn-cerrar-decision-1', 'click', () => {
        _decisionSeleccionada = null;
        const ta = document.getElementById('decision-comentario');
        if (ta) ta.value = '';
        document.getElementById('choice-approve').classList.remove('selected');
        document.getElementById('choice-reject').classList.remove('selected');
        closeModal('modal-decision');
    });
    bind('btn-cerrar-decision-2', 'click', () => {
        _decisionSeleccionada = null;
        const ta = document.getElementById('decision-comentario');
        if (ta) ta.value = '';
        document.getElementById('choice-approve').classList.remove('selected');
        document.getElementById('choice-reject').classList.remove('selected');
        closeModal('modal-decision');
    });
    bind('choice-approve', 'click', () => selectChoice('approve'));
    bind('choice-reject', 'click', () => selectChoice('reject'));
    bind('btn-confirmar-decision', 'click', submitDecision);

    _initOvFilterChips();
    initAprobacionesFilters();

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