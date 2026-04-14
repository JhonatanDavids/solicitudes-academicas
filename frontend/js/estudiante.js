/* ============================================================
   CONFIGURACIÓN GENERAL
============================================================ */

const _usuario = JSON.parse(sessionStorage.getItem('portalUser'));
const _token = sessionStorage.getItem('token');
if (!_usuario || !_token) {
    window.location.href = "../index.html";
}

let todasLasSolicitudes = [];
let solicitudAbierta = null;
let idUsuarioActual = null;
let timerToast;


/* ============================================================
   USUARIO DEL PORTAL (TOPBAR)
============================================================ */

const usuarioPortal = JSON.parse(sessionStorage.getItem('portalUser') || '{}');

if (usuarioPortal.nombre) {
    const topN = document.getElementById('topbar-nombre');
    if (topN) topN.textContent = usuarioPortal.nombre + ' ' + (usuarioPortal.apellido || '');

    const welcomeEl = document.getElementById('welcome-name');
    if (welcomeEl) welcomeEl.textContent = usuarioPortal.nombre + ' ' + (usuarioPortal.apellido || '');
}


/* ============================================================
   CARGAR SOLICITUDES
============================================================ */

async function cargarSolicitudes() {
    try {
        const usuario = JSON.parse(sessionStorage.getItem('portalUser') || '{}');

        if (!usuario.id_usuario) {
            mostrarErrorConexion();
            return;
        }

        const datos = await api.obtenerSolicitudesPorUsuario(usuario.id_usuario);
        todasLasSolicitudes = datos.resultado || datos || [];

        actualizarContadores();
        mostrarSolicitudes(todasLasSolicitudes);

    } catch (error) {
        console.error(error);
        mostrarErrorConexion();
    }
}


/* ============================================================
   CONTADORES
============================================================ */

function actualizarContadores() {
    const total = todasLasSolicitudes.length;
    const pendientes = todasLasSolicitudes.filter(s => s.estado_actual === 'pendiente').length;
    const aprobadas = todasLasSolicitudes.filter(s => s.estado_actual === 'aprobada').length;
    const enRevision = todasLasSolicitudes.filter(s => s.estado_actual === 'en_revision').length;

    const setE = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };

    setE('stat-total', total);
    setE('stat-pendientes', pendientes);
    setE('stat-aprobadas', aprobadas);
    setE('stat-revision', enRevision);

    setE('h-total', total);
    setE('h-pendientes', pendientes);
    setE('h-aprobadas', aprobadas);
}


/* ============================================================
   MOSTRAR SOLICITUDES
============================================================ */

function mostrarSolicitudes(lista) {
    const contenedor = document.getElementById('lista-solicitudes');
    contenedor.textContent = '';

    if (!lista.length) {
        contenedor.appendChild(document.getElementById('tpl-lista-vacia').content.cloneNode(true));
        return;
    }

    lista.forEach(sol => {
        const tarjeta = document.createElement('solicitud-card');
        tarjeta.datos = sol;

        tarjeta.addEventListener('ver-detalle', (e) => verDetalle(e.detail.id_solicitud));
        tarjeta.addEventListener('eliminar-sol', (e) => eliminarSolicitud(e.detail.id_solicitud));

        contenedor.appendChild(tarjeta);
    });
}


/* ============================================================
   FILTROS
============================================================ */

function filtrar(estado, boton) {
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    boton.classList.add('active');

    const filtradas = estado === 'todas'
        ? todasLasSolicitudes
        : todasLasSolicitudes.filter(s => s.estado_actual === estado);

    mostrarSolicitudes(filtradas);
}


/* ============================================================
   CREAR SOLICITUD
============================================================ */

async function crearSolicitud() {
    const idTipo = document.getElementById('f-tipo').value;
    const prioridad = document.getElementById('f-prioridad').value;
    const descripcion = document.getElementById('f-descripcion').value;

    if (!idTipo || !descripcion) {
        mostrarToast('✕ Completa todos los campos', 'error');
        return;
    }

    try {
        const usuario = JSON.parse(sessionStorage.getItem('portalUser') || '{}');

        await api.crearSolicitud({
            id_usuario: usuario.id_usuario,
            id_tipo_solicitud: parseInt(idTipo),
            prioridad,
            descripcion
        });

        closeModal('modal-nueva');
        mostrarToast('✓ Solicitud creada', 'success');

        await cargarSolicitudes();

    } catch {
        mostrarToast('✕ Error al crear', 'error');
    }
}


/* ============================================================
   ELIMINAR SOLICITUD
============================================================ */

async function eliminarSolicitud(id) {
    if (!confirm(`¿Eliminar solicitud #` + id + `?`)) return;

    try {
        await api.eliminarSolicitud(id);

        mostrarToast(`✓ Eliminada #` + id, 'success');
        await cargarSolicitudes();

    } catch {
        mostrarToast('✕ Error al eliminar', 'error');
    }
}


/* ============================================================
   DETALLE JSON
============================================================ */

function verDetalle(id) {
    const sol = todasLasSolicitudes.find(s => s.id_solicitud === id);
    if (!sol) return;

    solicitudAbierta = sol;

    document.getElementById('modal-detalle-title').textContent = `// Solicitud #` + id;

    const content = document.getElementById('modal-detalle-content');
    content.textContent = JSON.stringify(sol, null, 2);

    document.getElementById('modal-detalle').classList.add('show');
}

function closeModal(id) {
    const d = document.getElementById(id);
    if (d) {
        d.classList.remove('show');
        d.querySelectorAll('input,textarea').forEach(e => e.value = '');
        d.querySelectorAll('select').forEach(e => e.selectedIndex = 0);
    }
}

function copyDetalle() {
    const texto = document.getElementById('modal-detalle-content').textContent;
    navigator.clipboard.writeText(texto).then(() => {
        mostrarToast('✓ JSON copiado', 'success');
    });
}

async function abrirModal() {
    document.getElementById('f-descripcion').value = '';

    document.getElementById('usuario-nombre').textContent =
        (usuarioPortal.nombre || '') + ' ' + (usuarioPortal.apellido || '');
    document.getElementById('usuario-correo').textContent =
        usuarioPortal.correo || '';

    const fTipo = document.getElementById('f-tipo');
    fTipo.textContent = '';

    try {
        const data = await api.obtenerTipos();
        const arr = data.resultado || data || [];

        const defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = 'Selecciona...';
        fTipo.appendChild(defOpt);

        arr.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id_tipo_solicitud;
            opt.textContent = t.nombre;
            fTipo.appendChild(opt);
        });

    } catch (err) {
        console.error('Error cargando tipos:', err);
        const eOpt = document.createElement('option');
        eOpt.value = '';
        eOpt.textContent = 'Error al cargar tipos';
        fTipo.appendChild(eOpt);
    }

    document.getElementById('modal-nueva').classList.add('show');
}


/* ============================================================
   INIT
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    cargarSolicitudes();

    // Binding SoC
    const btnN = document.getElementById('btn-nueva-solicitud');
    if (btnN) btnN.addEventListener('click', abrirModal);

    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filterMap = e.target.getAttribute('data-filter');
            if (filterMap) filtrar(filterMap, e.target);
        });
    });

    const bC1 = document.getElementById('btn-cerrar-nueva-1');
    if (bC1) bC1.addEventListener('click', () => closeModal('modal-nueva'));

    const bC2 = document.getElementById('btn-cerrar-nueva-2');
    if (bC2) bC2.addEventListener('click', () => closeModal('modal-nueva'));

    const bCr = document.getElementById('btn-crear-solicitud');
    if (bCr) bCr.addEventListener('click', crearSolicitud);

    const bD1 = document.getElementById('btn-cerrar-detalle-1');
    if (bD1) bD1.addEventListener('click', () => closeModal('modal-detalle'));

    const bCop = document.getElementById('btn-copiar-detalle');
    if (bCop) bCop.addEventListener('click', copyDetalle);

    // Cerrar modal auto
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal(e.target.id);
        }
    });
});
