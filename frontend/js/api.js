// ══════════════════════════════════════════════════════════════
//  API — Módulo centralizado de peticiones al backend
//  Todas las peticiones envían el token JWT automáticamente.
// ══════════════════════════════════════════════════════════════

// Dirección base de la API
const DIRECCION_API = "https://solicitudes-academicas.onrender.com";

console.log("USANDO RENDER API");

// ── CABECERAS ──
// Genera las cabeceras para cada petición, incluyendo el token JWT si existe.
function obtenerCabeceras(conJson = false) {
    const cabeceras = {};
    const token = sessionStorage.getItem('token');

    if (token) {
        cabeceras["Authorization"] = `Bearer ${token}`;
    }

    if (conJson) {
        cabeceras["Content-Type"] = "application/json";
    }

    return cabeceras;
}

// ── PARSEAR RESPUESTA ──
// Parsea JSON y lanza error si la respuesta no es exitosa (4xx, 5xx).
async function parsearRespuesta(respuesta) {
    // Respuesta vacía exitosa
    if (respuesta.status === 204) {
        return { ok: true };
    }

    // Intentar parsear el cuerpo
    let datos;
    try {
        datos = await respuesta.json();
    } catch {
        datos = null;
    }

    // Si la respuesta NO es exitosa, lanzar error con el detalle del backend
    if (!respuesta.ok) {
        const mensaje = (datos && datos.detail) || `Error ${respuesta.status}`;
        throw new Error(mensaje);
    }

    return datos;
}

// ── OBJETO API ──
const api = {

    // ────────────────────────────────────────
    // USUARIOS
    // ────────────────────────────────────────
    obtenerUsuarios: () =>
        fetch(`${DIRECCION_API}/usuarios/get_all`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerUsuarioPorId: (id) =>
        fetch(`${DIRECCION_API}/usuarios/get/${id}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerUsuarioPorCedula: (cedula) =>
        fetch(`${DIRECCION_API}/usuarios/by_cedula/${cedula}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerUsuariosPorRol: (idRol) =>
        fetch(`${DIRECCION_API}/usuarios/by_rol/${idRol}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    crearUsuario: (datos) =>
        fetch(`${DIRECCION_API}/usuarios/create`, {
            method: "POST",
            headers: obtenerCabeceras(true),
            body: JSON.stringify(datos)
        }).then(parsearRespuesta),

    actualizarUsuario: (id, datos) =>
        fetch(`${DIRECCION_API}/usuarios/update/${id}`, {
            method: "PUT",
            headers: obtenerCabeceras(true),
            body: JSON.stringify(datos)
        }).then(parsearRespuesta),

    actualizarEstadoUsuario: (id, nuevoEstado) =>
        fetch(`${DIRECCION_API}/usuarios/update_estado/${id}?nuevo_estado=${nuevoEstado}`, {
            method: "PUT",
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    eliminarUsuario: (id) =>
        fetch(`${DIRECCION_API}/usuarios/delete/${id}`, {
            method: "DELETE",
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    // ────────────────────────────────────────
    // ROLES
    // ────────────────────────────────────────
    obtenerRoles: () =>
        fetch(`${DIRECCION_API}/roles/get_all`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerRolPorId: (id) =>
        fetch(`${DIRECCION_API}/roles/get/${id}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    crearRol: (datos) =>
        fetch(`${DIRECCION_API}/roles/create`, {
            method: "POST",
            headers: obtenerCabeceras(true),
            body: JSON.stringify(datos)
        }).then(parsearRespuesta),

    actualizarRol: (id, datos) =>
        fetch(`${DIRECCION_API}/roles/update/${id}`, {
            method: "PUT",
            headers: obtenerCabeceras(true),
            body: JSON.stringify(datos)
        }).then(parsearRespuesta),

    eliminarRol: (id) =>
        fetch(`${DIRECCION_API}/roles/delete/${id}`, {
            method: "DELETE",
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    // ────────────────────────────────────────
    // SOLICITUDES
    // ────────────────────────────────────────
    obtenerSolicitudes: () =>
        fetch(`${DIRECCION_API}/solicitudes/get_all`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerSolicitudPorId: (id) =>
        fetch(`${DIRECCION_API}/solicitudes/get/${id}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerSolicitudesPorUsuario: (id) =>
        fetch(`${DIRECCION_API}/solicitudes/by_usuario/${id}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerSolicitudesPorEstado: (estado) =>
        fetch(`${DIRECCION_API}/solicitudes/by_estado/${estado}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    crearSolicitud: (datos) =>
        fetch(`${DIRECCION_API}/solicitudes/create`, {
            method: "POST",
            headers: obtenerCabeceras(true),
            body: JSON.stringify(datos)
        }).then(parsearRespuesta),

    actualizarEstadoSolicitud: (id, nuevoEstado) =>
        fetch(`${DIRECCION_API}/solicitudes/update_estado/${id}?nuevo_estado=${nuevoEstado}`, {
            method: "PUT",
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    eliminarSolicitud: (id) =>
        fetch(`${DIRECCION_API}/solicitudes/delete/${id}`, {
            method: "DELETE",
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    // ────────────────────────────────────────
    // TIPOS DE SOLICITUD
    // ────────────────────────────────────────
    obtenerTipos: () =>
        fetch(`${DIRECCION_API}/tipos/get_all`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerTipoPorId: (id) =>
        fetch(`${DIRECCION_API}/tipos/get/${id}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    crearTipo: (datos) =>
        fetch(`${DIRECCION_API}/tipos/create`, {
            method: "POST",
            headers: obtenerCabeceras(true),
            body: JSON.stringify(datos)
        }).then(parsearRespuesta),

    actualizarTipo: (id, datos) =>
        fetch(`${DIRECCION_API}/tipos/update/${id}`, {
            method: "PUT",
            headers: obtenerCabeceras(true),
            body: JSON.stringify(datos)
        }).then(parsearRespuesta),

    eliminarTipo: (id) =>
        fetch(`${DIRECCION_API}/tipos/delete/${id}`, {
            method: "DELETE",
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    // ────────────────────────────────────────
    // DOCUMENTOS
    // ────────────────────────────────────────
    obtenerDocumentosPorSolicitud: (id) =>
        fetch(`${DIRECCION_API}/documentos/by_solicitud/${id}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    crearDocumento: (datos) =>
        fetch(`${DIRECCION_API}/documentos/create`, {
            method: "POST",
            headers: obtenerCabeceras(true),
            body: JSON.stringify(datos)
        }).then(parsearRespuesta),

    eliminarDocumento: (id) =>
        fetch(`${DIRECCION_API}/documentos/delete/${id}`, {
            method: "DELETE",
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    // ────────────────────────────────────────
    // REVISIONES
    // ────────────────────────────────────────
    obtenerRevisiones: () =>
        fetch(`${DIRECCION_API}/revisiones/get_all`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    obtenerRevisionesPorSolicitud: (id) =>
        fetch(`${DIRECCION_API}/revisiones/by_solicitud/${id}`, {
            headers: obtenerCabeceras()
        }).then(parsearRespuesta),

    crearRevision: ({ id_solicitud, comentario, estado_revision }) =>
        fetch(`${DIRECCION_API}/revisiones/create`, {
            method: "POST",
            headers: obtenerCabeceras(true),
            body: JSON.stringify({ id_solicitud, comentario, estado_revision })
        }).then(parsearRespuesta),

};

// ── UTILIDAD DOM SoC ──
window.crearNodo = function(tag, options = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(options)) {
        if (key === 'dataset') {
            for (const [dKey, dVal] of Object.entries(val)) { el.dataset[dKey] = dVal; }
        } else if (key === 'style' && typeof val === 'object') {
            for (const [sKey, sVal] of Object.entries(val)) { el.style[sKey] = sVal; }
        } else {
            el[key] = val;
        }
    }
    for (const child of children) {
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    }
    return el;
};
