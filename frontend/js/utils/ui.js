// ══════════════════════════════════════════════════════════════
//  UI.JS — Funciones de interfaz compartidas entre todos los módulos
//  Depende de: helpers.js (sanitizarClase), api.js (crearNodo)
//  Expone: toast(), mostrarLoading(), mostrarVacio(), mostrarErrorVisual(), crearBadgeEstado(),
//          closeModal(), copyJsonModal(), showSection(), initModalBackdrop(),
//          initRefreshBtn(), renderTablaDataTable()
// ══════════════════════════════════════════════════════════════

// ── ESTADO PRIVADO ────────────────────────────────────────────
let _toastTimer = null;

// ── TOAST ─────────────────────────────────────────────────────
/**
 * Muestra una notificación flotante.
 * @param {string} mensaje
 * @param {'success'|'error'|'info'} tipo
 */
function toast(mensaje, tipo = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;

    const iconos = { success: '✓', error: '✕', info: 'ℹ' };
    el.className = 'toast ' + tipo;
    el.textContent = '';

    const span = crearNodo('span', {}, [iconos[tipo] || 'ℹ']);
    el.appendChild(span);
    el.appendChild(document.createTextNode(' ' + mensaje));
    el.classList.add('show');

    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── ESTADOS DE CONTENEDOR ─────────────────────────────────────

/** Muestra spinner de carga dentro de un contenedor DOM */
function mostrarLoading(contenedor) {
    if (!contenedor) return;
    contenedor.textContent = '';
    const sp = crearNodo('div', { className: 'spinner' });
    const txt = crearNodo('div', { className: 'loading-text' }, ['Cargando datos...']);
    contenedor.appendChild(crearNodo('div', { className: 'loading-state' }, [sp, txt]));
}

/** Muestra estado vacío dentro de un contenedor DOM */
function mostrarVacio(contenedor, texto = 'No hay datos') {
    if (!contenedor) return;
    contenedor.textContent = '';
    const ic = crearNodo('div', { className: 'empty-icon' }, ['📭']);
    contenedor.appendChild(crearNodo('div', { className: 'loading-state' }, [ic, texto]));
}

/** Muestra estado de error dentro de un contenedor DOM */
function mostrarErrorVisual(contenedor, texto = 'Error al cargar') {
    if (!contenedor) return;
    contenedor.textContent = '';
    const ic = crearNodo('div', { className: 'empty-icon' }, ['⚠']);
    contenedor.appendChild(crearNodo('div', { className: 'loading-state error-state' }, [ic, texto]));
}

/** Construye badge visual para un estado de negocio */
function crearBadgeEstado(estado) {
    return crearNodo(
        'span',
        { className: `badge badge-${sanitizarClase(estado)}` },
        [estado || '–']
    );
}

// ── MODALES ───────────────────────────────────────────────────

/**
 * Cierra un modal por id, limpiando sus inputs.
 * @param {string} id - id del elemento .modal-overlay
 */
function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('show');
    modal.querySelectorAll('input, textarea').forEach(el => el.value = '');
    modal.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
}

/**
 * Copia el contenido del visor JSON al portapapeles.
 * Asume que existe #modal-json-content en el DOM.
 */
function copyJsonModal() {
    const el = document.getElementById('modal-json-content');
    if (!el) return;
    navigator.clipboard.writeText(el.textContent)
        .then(() => toast('JSON copiado al portapapeles'));
}

/**
 * Inicializa el cierre de modales al hacer click en el backdrop (overlay).
 * Llamar una sola vez en DOMContentLoaded.
 */
function initModalBackdrop() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal(e.target.id);
        }
    });
}

// ── NAVEGACIÓN ────────────────────────────────────────────────

/**
 * Muestra una sección y oculta las demás.
 * Actualiza el título del topbar.
 * NO carga datos — eso lo hace cada módulo en su propio showSection().
 *
 * @param {string}      nombre   - id de la sección sin prefijo "section-"
 * @param {HTMLElement} elemento - ítem del sidebar que se activó (opcional)
 */
function _activarSeccion(nombre, elemento) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const seccion = document.getElementById('section-' + nombre);
    if (seccion) seccion.classList.add('active');

    const topbar = document.getElementById('topbar-section-name');
    if (topbar) topbar.textContent = nombre.toUpperCase();
}

// ── DATATABLES ────────────────────────────────────────────────

/**
 * Inicializa DataTables sobre una tabla ya insertada en el DOM.
 * Centraliza el patrón setTimeout + destroy + init repetido en cada render.
 *
 * @param {HTMLTableElement} tabla
 * @param {object}           opciones - opciones extra para DataTables (opcional)
 */
function initDataTable(tabla, opciones = {}) {
    if (typeof $ === 'undefined' || !$.fn || !$.fn.DataTable) return;

    setTimeout(() => {
        const $t = $(tabla);
        if ($.fn.DataTable.isDataTable($t)) {
            $t.DataTable().destroy();
        }
        $t.DataTable({
            language: { url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json' },
            ...opciones
        });
    }, 100);
}

/**
 * Helper para construir una fila <tr> de tabla con badge de estado y prioridad.
 * Usado por renderSolicitudes() en funcionario y coordinador.
 *
 * @param {object}   sol       - objeto solicitud del backend
 * @param {Function} buildAcciones - función(sol) que retorna un <td> con botones
 * @returns {HTMLTableRowElement}
 */
function buildFilaSolicitud(sol, buildAcciones) {
    const tr = crearNodo('tr', { dataset: { id: sol.id_solicitud } });

    // Estudiante
    const tdEst = crearNodo('td', { className: 'td-nombre' },
        [`${sol.nombre || ''} ${sol.apellido || ''}`]);

    // Tipo
    const tdTipo = crearNodo('td', { className: 'td-tipo' },
        [sol.tipo || sol.nombre_tipo || '–']);

    // Estado badge
    const badgeEst = crearBadgeEstado(sol.estado_actual);
    const tdEst2 = crearNodo('td', {}, [badgeEst]);

    // Prioridad badge
    const badgePrio = crearNodo('span',
        { className: `badge-prio prio-${sanitizarClase(sol.prioridad)}` },
        [sol.prioridad || '–']);
    const tdPrio = crearNodo('td', {}, [badgePrio]);

    // Fecha
    const tdFecha = crearNodo('td', { className: 'td-fecha' }, [
        (() => {
            const div = crearNodo('div');

            const fechaAct = crearNodo('span', {
                style: 'font-weight:600; color:var(--success); font-size:0.85rem;'
            }, [
                'Actualizado: ' + (
                    sol.fecha_actualizacion
                        ? new Date(sol.fecha_actualizacion).toLocaleDateString('es-CO')
                        : '–'
                )
            ]);

            const fechaCre = crearNodo('small', {
                style: 'display:block; color:var(--text-muted); font-size:0.7rem;'
            }, [
                'Creado: ' + (
                    sol.fecha_creacion
                        ? new Date(sol.fecha_creacion).toLocaleDateString('es-CO')
                        : '–'
                )
            ]);

            div.appendChild(fechaAct);
            div.appendChild(fechaCre);

            return div;
        })()
    ]);

    tr.appendChild(tdEst);
    tr.appendChild(tdTipo);
    tr.appendChild(tdEst2);
    tr.appendChild(tdPrio);
    tr.appendChild(tdFecha);
    tr.appendChild(buildAcciones(sol));

    return tr;
}

/**
 * Construye y retorna una tabla <table> lista para insertar en el DOM.
 * Incluye thead con los headers dados y un tbody vacío para que el llamador agregue filas.
 *
 * @param {string[]} headers
 * @returns {{ tabla: HTMLTableElement, tbody: HTMLTableSectionElement }}
 */
function crearTabla(headers) {
    const tabla = crearNodo('table', { className: 'data-table' });
    const trH = crearNodo('tr');
    headers.forEach(t => trH.appendChild(crearNodo('th', {}, [t])));
    tabla.appendChild(crearNodo('thead', {}, [trH]));
    const tbody = crearNodo('tbody');
    tabla.appendChild(tbody);
    return { tabla, tbody };
}
