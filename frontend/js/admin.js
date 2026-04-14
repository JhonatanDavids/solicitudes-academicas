/* ============================================================
   ADMIN.JS — Panel de Administración
   Depende de: helpers.js · auth.js · ui.js · api.js · components.js
============================================================ */

// ── AUTENTICACIÓN ─────────────────────────────────────────────
verificarSesion('admin');

// ── ESTADO DEL MÓDULO ─────────────────────────────────────────
let listaUsuarios = [];
let listaSolicitudes = [];
let listaRoles = [];
let listaTipos = [];
let listaRevisiones = [];

const usuarioPortal = getUsuarioActual();

// Datos mock para documentos (sección demostrativa — backend pendiente)
const documentosMock = [
    { id: 1, cedula: '1010202030', nombre: 'certificado_estudio.pdf', tipo: 'PDF', fecha: '2026-03-30', estado: 'válido' },
    { id: 2, cedula: '1010202030', nombre: 'notas_semestre.png', tipo: 'Imagen', fecha: '2026-03-29', estado: 'pendiente' },
    { id: 3, cedula: '1001234567', nombre: 'paz_y_salvo.pdf', tipo: 'PDF', fecha: '2026-03-28', estado: 'válido' },
];

// Estado del modal CRUD
let crudState = { tipo: null, modo: null, id: null, id_usuario_encontrado: null };


/* ============================================================
   NAVEGACIÓN
============================================================ */

async function showSection(nombre, elemento) {
    _activarSeccion(nombre, elemento);

    if (nombre === 'usuarios') cargarUsuarios();
    if (nombre === 'solicitudes') cargarSolicitudes();
    if (nombre === 'roles') loadRoles();
    if (nombre === 'tipos') loadTipos();
    if (nombre === 'revisiones') loadRevisiones();
    if (nombre === 'overview') {
        await Promise.all([cargarUsuarios(), cargarSolicitudes()]);
        actualizarOverview();
    }
    // 🔥 FIX POWER BI (AQUÍ VA)
    if (nombre === 'analitica') {
        setTimeout(() => {
            const iframe = document.querySelector('#section-analitica iframe');
            if (iframe) {
                const src = iframe.src;
                iframe.src = '';
                iframe.src = src;
            }
        }, 200);
    }
}

async function refreshAll() {
    toast('Actualizando datos...', 'info');
    try {
        await Promise.all([
            cargarUsuarios(),
            cargarSolicitudes(),
            loadRoles(),
            loadTipos(),
            loadRevisiones(),
        ]);
        actualizarOverview();
    } catch (e) {
        console.error('refreshAll error:', e);
    }
}


/* ============================================================
   USUARIOS
============================================================ */

async function cargarUsuarios() {
    const contenedor = document.getElementById('data-usuarios');
    mostrarLoading(contenedor);
    try {
        const datos = await api.obtenerUsuarios();
        listaUsuarios = normalizarRespuesta(datos);
        renderUsuarios(listaUsuarios);
        _setBadge('badge-usuarios', listaUsuarios.length);
    } catch (error) {
        console.error(error);
        mostrarErrorVisual(contenedor, 'Error cargando usuarios');
        if (error.message?.includes('401')) doLogout();
    }
}

function loadUsuarios() { cargarUsuarios(); }

function renderUsuarios(lista) {
    const contenedor = document.getElementById('data-usuarios');
    if (!contenedor) return;
    contenedor.textContent = '';

    if (!lista.length) { mostrarVacio(contenedor, 'No hay usuarios'); return; }

    // PASO 8 / requisito profesor: sin columna ID visible
    const { tabla, tbody } = crearTabla(['Nombre', 'Correo', 'Cédula', 'Rol', 'Acciones']);

    lista.forEach(u => {
        const tr = crearNodo('tr', { dataset: { id: u.id_usuario } });

        tr.appendChild(crearNodo('td', { className: 'td-nombre' },
            [`${u.nombre || ''} ${u.apellido || ''}`]));

        tr.appendChild(crearNodo('td', {}, [u.correo || '–']));
        tr.appendChild(crearNodo('td', { className: 'td-mono' }, [u.cedula || '–']));

        const conf = getRolConfig(u.rol);
        const badge = crearNodo('span', { className: `badge-rol ${conf.clase}` },
            [`${conf.icon} ${u.rol || '–'}`]);
        tr.appendChild(crearNodo('td', {}, [badge]));

        tr.appendChild(_buildAccionesUsuario(u));
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

function _buildAccionesUsuario(u) {
    const td = crearNodo('td', { className: 'td-actions' });

    const btnEdit = crearNodo('button', { className: 'btn-sm yellow' }, ['✎ Editar']);
    btnEdit.addEventListener('click', () => openCrud('usuario', 'edit', u.id_usuario));

    const btnVer = crearNodo('button', { className: 'btn-sm blue' }, ['{ }']);
    btnVer.addEventListener('click', () => verJsonObj(u.id_usuario, 'usuario'));

    const btnDel = crearNodo('button', { className: 'btn-sm red' }, ['✕ Eliminar']);
    btnDel.addEventListener('click', () => eliminarUsuario(u.id_usuario));

    td.appendChild(btnEdit);
    td.appendChild(btnVer);
    td.appendChild(btnDel);
    return td;
}


/* ============================================================
   SOLICITUDES
============================================================ */

async function cargarSolicitudes() {
    const contenedor = document.getElementById('data-solicitudes');
    mostrarLoading(contenedor);
    try {
        const datos = await api.obtenerSolicitudes();
        listaSolicitudes = normalizarRespuesta(datos);
        renderSolicitudes(listaSolicitudes);
        _setBadge('badge-solicitudes', listaSolicitudes.length);
    } catch (error) {
        console.error(error);
        mostrarErrorVisual(contenedor, 'Error cargando solicitudes');
        if (error.message?.includes('401')) doLogout();
    }
}

function loadSolicitudes() { cargarSolicitudes(); }

function renderSolicitudes(lista) {
    const contenedor = document.getElementById('data-solicitudes');
    if (!contenedor) return;
    contenedor.textContent = '';

    if (!lista.length) { mostrarVacio(contenedor, 'No hay solicitudes'); return; }

    // Sin columna ID visible
    const { tabla, tbody } = crearTabla(
        ['Estudiante', 'Tipo', 'Estado', 'Prioridad', 'Fecha', 'Acciones']
    );

    lista.forEach(sol => {
        const tr = buildFilaSolicitud(sol, _buildAccionesSolicitudAdmin);
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

function _buildAccionesSolicitudAdmin(sol) {
    const td = crearNodo('td', { className: 'td-actions' });

    const btnEdit = crearNodo('button', { className: 'btn-sm yellow' }, ['✎ Estado']);
    btnEdit.addEventListener('click', () => openCrud('solicitud', 'edit', sol.id_solicitud));

    const btnReview = crearNodo('button', { className: 'btn-sm green' }, ['✓ Revisar']);
    btnReview.addEventListener('click', () => openCrud('revision', 'create', sol.id_solicitud));

    const btnDocs = crearNodo('button', { className: 'btn-sm blue' }, ['📄 Docs']);
    btnDocs.addEventListener('click', () => verDocumentosSolicitud(sol.id_solicitud));

    const btnVer = crearNodo('button', { className: 'btn-sm blue' }, ['{ }']);
    btnVer.addEventListener('click', () => verJsonObj(sol.id_solicitud, 'solicitud'));

    const btnDel = crearNodo('button', { className: 'btn-sm red' }, ['✕ Eliminar']);
    btnDel.addEventListener('click', () => eliminarSolicitud(sol.id_solicitud));

    td.appendChild(btnEdit);
    td.appendChild(btnReview);
    td.appendChild(btnDocs);
    td.appendChild(btnVer);
    td.appendChild(btnDel);
    return td;
}


/* ============================================================
   ROLES
============================================================ */

async function loadRoles() {
    const contenedor = document.getElementById('data-roles');
    mostrarLoading(contenedor);
    try {
        const datos = await api.obtenerRoles();
        listaRoles = normalizarRespuesta(datos);
        _setBadge('badge-roles', listaRoles.length);
        _renderRoles(contenedor);
    } catch {
        toast('Error cargando roles', 'error');
    }
}

// Render desde datos locales (usado también por setView)
function renderRoles() {
    _renderRoles(document.getElementById('data-roles'));
}

function _renderRoles(contenedor) {
    if (!contenedor) return;
    contenedor.textContent = '';

    if (!listaRoles.length) { mostrarVacio(contenedor, 'No hay roles'); return; }

    const { tabla, tbody } = crearTabla(['Nombre', 'Descripción', 'Acciones']);

    listaRoles.forEach(r => {
        const tr = crearNodo('tr', { dataset: { id: r.id_rol } });
        const rolNombre = r.nombre_rol || r.nombre || '–';
        const rc = getRolConfig(rolNombre);

        const badge = crearNodo('span', { className: `badge-rol ${rc.clase}` },
            [`${rc.icon} ${rolNombre}`]);
        tr.appendChild(crearNodo('td', {}, [badge]));
        tr.appendChild(crearNodo('td', { className: 'td-muted' }, [r.descripcion || '–']));
        tr.appendChild(_buildAccionesRol(r));
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

function _buildAccionesRol(r) {
    const td = crearNodo('td', { className: 'td-actions' });

    const btnEdit = crearNodo('button', { className: 'btn-sm yellow' }, ['✎ Editar']);
    btnEdit.addEventListener('click', () => openCrud('rol', 'edit', r.id_rol));

    const btnVer = crearNodo('button', { className: 'btn-sm blue' }, ['{ }']);
    btnVer.addEventListener('click', () => verJsonObj(r.id_rol, 'rol'));

    const btnDel = crearNodo('button', { className: 'btn-sm red' }, ['✕ Eliminar']);
    btnDel.addEventListener('click', () => eliminarRol(r.id_rol));

    td.appendChild(btnEdit);
    td.appendChild(btnVer);
    td.appendChild(btnDel);
    return td;
}


/* ============================================================
   TIPOS DE SOLICITUD
============================================================ */

async function loadTipos() {
    const contenedor = document.getElementById('data-tipos');
    mostrarLoading(contenedor);
    try {
        const datos = await api.obtenerTipos();
        listaTipos = normalizarRespuesta(datos);
        _setBadge('badge-tipos', listaTipos.length);
        _renderTipos(contenedor);
    } catch {
        toast('Error cargando tipos', 'error');
    }
}

function renderTipos() {
    _renderTipos(document.getElementById('data-tipos'));
}

function _renderTipos(contenedor) {
    if (!contenedor) return;
    contenedor.textContent = '';

    if (!listaTipos.length) { mostrarVacio(contenedor, 'No hay tipos'); return; }

    const { tabla, tbody } = crearTabla(['Nombre', 'Descripción', 'Acciones']);

    listaTipos.forEach(t => {
        const id = t.id_tipo_solicitud || t.id;
        const tr = crearNodo('tr', { dataset: { id } });

        tr.appendChild(crearNodo('td', { className: 'td-nombre' }, [t.nombre || '–']));
        tr.appendChild(crearNodo('td', { className: 'td-muted' }, [t.descripcion || '–']));
        tr.appendChild(_buildAccionesTipo(t));
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

function _buildAccionesTipo(t) {
    const id = t.id_tipo_solicitud || t.id;
    const td = crearNodo('td', { className: 'td-actions' });

    const btnEdit = crearNodo('button', { className: 'btn-sm yellow' }, ['✎ Editar']);
    btnEdit.addEventListener('click', () => openCrud('tipo', 'edit', id));

    const btnVer = crearNodo('button', { className: 'btn-sm blue' }, ['{ }']);
    btnVer.addEventListener('click', () => verJsonObj(id, 'tipo'));

    const btnDel = crearNodo('button', { className: 'btn-sm red' }, ['✕ Eliminar']);
    btnDel.addEventListener('click', () => eliminarTipo(id));

    td.appendChild(btnEdit);
    td.appendChild(btnVer);
    td.appendChild(btnDel);
    return td;
}


/* ============================================================
   DOCUMENTOS (placeholder — datos mock mientras backend pendiente)
============================================================ */

function consultarDocumentos() {
    const cedulaInput = document.getElementById('input-cedula-doc');
    const tabla = document.getElementById('tabla-documentos');
    if (!cedulaInput || !tabla) return;

    const cedula = cedulaInput.value.trim();
    tabla.textContent = '';

    if (!cedula) {
        tabla.appendChild(crearNodo('p', { className: 'empty-hint' }, ['Ingrese una cédula']));
        return;
    }

    const resultados = documentosMock.filter(doc => doc.cedula === cedula);

    if (!resultados.length) {
        tabla.appendChild(crearNodo('p', { className: 'empty-hint' }, ['No hay documentos para esta cédula']));
        return;
    }

    // Sin columna ID (requisito del profesor)
    const { tabla: tbl, tbody } = crearTabla(['Nombre', 'Tipo', 'Fecha', 'Estado']);
    resultados.forEach(doc => {
        const tr = crearNodo('tr');
        tr.appendChild(crearNodo('td', {}, [doc.nombre]));
        tr.appendChild(crearNodo('td', {}, [doc.tipo]));
        tr.appendChild(crearNodo('td', {}, [doc.fecha]));
        tr.appendChild(crearNodo('td', {}, [doc.estado]));
        tbody.appendChild(tr);
    });
    tabla.appendChild(tbl);
}

async function loadRevisiones() {
    const contenedor = document.getElementById('data-revisiones');
    if (!contenedor) return;

    mostrarLoading(contenedor);
    try {
        const inputSolicitud = document.getElementById('rev-solicitud-id');
        const idSolicitud = inputSolicitud?.value?.trim();

        let datos;
        if (idSolicitud) {
            const parsedId = parseInt(idSolicitud, 10);
            if (Number.isNaN(parsedId) || parsedId <= 0) {
                throw new Error('El filtro debe ser un ID de solicitud válido');
            }
            datos = await api.obtenerRevisionesPorSolicitud(parsedId);
        } else {
            datos = await api.obtenerRevisiones();
        }

        listaRevisiones = normalizarRespuesta(datos);
        renderRevisiones(listaRevisiones);
    } catch (err) {
        console.error('Error cargando revisiones:', err);
        mostrarErrorVisual(contenedor, 'Error cargando revisiones');
        toast('Error cargando revisiones', 'error');
    }
}

function renderRevisiones(lista = listaRevisiones) {
    const contenedor = document.getElementById('data-revisiones');
    if (!contenedor) return;
    contenedor.textContent = '';

    if (!lista.length) {
        mostrarVacio(contenedor, 'No hay revisiones registradas');
        return;
    }

    const { tabla, tbody } = crearTabla([
        'Estudiante',
        'Tipo solicitud',
        'Revisión',
        'Comentario',
        'Quien reviso',
        'Fecha',
    ]);

    lista.forEach(rev => {
        const tr = crearNodo('tr', { dataset: { id: rev.id_revision } });

        tr.appendChild(crearNodo('td', { className: 'td-nombre' }, [rev.estudiante || '–']));
        tr.appendChild(crearNodo('td', {}, [rev.tipo_solicitud || '–']));

        const estado = rev.estado_revision || '–';
        const estadoActual = rev.estado_actual || '–';
        const tdEstado = crearNodo('td');
        tdEstado.appendChild(crearBadgeEstado(estado));
        tdEstado.appendChild(
            crearNodo('small', {
                className: 'td-muted',
                style: 'display:block; opacity:0.7;'
            }, [`Actual: ${estadoActual}`])
        );
        tr.appendChild(tdEstado);

        tr.appendChild(crearNodo('td', { className: 'td-muted' }, [rev.comentario || 'Sin comentario']));
        tr.appendChild(crearNodo('td', {}, [rev.revisor || '–']));

        const fecha = rev.fecha_creacion
            ? new Date(rev.fecha_creacion).toLocaleString('es-CO')
            : '–';
        tr.appendChild(crearNodo('td', { className: 'td-fecha' }, [fecha]));

        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}


/* ============================================================
   ELIMINACIÓN — con modal de confirmación
============================================================ */

function confirmarEliminacion(tipo, id) {
    const modal = document.getElementById('modal-confirm');
    if (!modal?.show) { console.error('modal-confirm no disponible'); return; }

    modal.show(
        `¿Seguro que deseas eliminar ${tipo} #${id}? Esta acción no se puede deshacer.`,
        async () => {
            try {
                const acciones = {
                    usuario: () => api.eliminarUsuario(id).then(cargarUsuarios),
                    solicitud: () => api.eliminarSolicitud(id).then(cargarSolicitudes),
                    rol: () => api.eliminarRol(id).then(loadRoles),
                    tipo: () => api.eliminarTipo(id).then(loadTipos),
                };
                if (acciones[tipo]) await acciones[tipo]();
                toast(`${tipo.toUpperCase()} eliminado correctamente`, 'success');
            } catch (err) {
                const msg = (err.message || '').toLowerCase();
                if (msg.includes('foreign') || msg.includes('violates') || msg.includes('500')) {
                    toast('No se puede eliminar: este registro está siendo usado.', 'error');
                } else {
                    toast('Error al eliminar: ' + err.message, 'error');
                }
            }
        }
    );
}

function eliminarUsuario(id) { confirmarEliminacion('usuario', id); }
function eliminarSolicitud(id) { confirmarEliminacion('solicitud', id); }
function eliminarRol(id) { confirmarEliminacion('rol', id); }
function eliminarTipo(id) { confirmarEliminacion('tipo', id); }


/* ============================================================
   OVERVIEW
============================================================ */

function actualizarOverview() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('ov-usuarios', listaUsuarios.length);
    set('ov-solicitudes', listaSolicitudes.length);
    set('ov-pendientes', listaSolicitudes.filter(s => s.estado_actual === 'pendiente').length);
    set('ov-aprobadas', listaSolicitudes.filter(s => s.estado_actual === 'aprobada').length);
    set('ov-rechazadas', listaSolicitudes.filter(s => s.estado_actual === 'rechazada').length);

    // Últimas 8 solicitudes — sin columna ID, sin acciones
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
        // Quitar la celda de acciones vacía que agrega buildFilaSolicitud
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

function filterTable(seccion, valor) {
    const texto = valor.toLowerCase();
    const contenedor = document.getElementById('data-' + seccion);
    if (!contenedor) return;
    contenedor.querySelectorAll('tbody tr').forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
}

function filterByEstado() {
    const estado = document.getElementById('filter-estado')?.value;
    renderSolicitudes(
        estado ? listaSolicitudes.filter(s => s.estado_actual === estado) : listaSolicitudes
    );
}


/* ============================================================
   VISTA TABLE / JSON
============================================================ */

function setView(seccion, modo, boton) {
    if (boton) {
        boton.closest('.view-toggle')?.querySelectorAll('.vt-btn')
            .forEach(b => b.classList.remove('active'));
        boton.classList.add('active');
    }

    const contenedor = document.getElementById('data-' + seccion);
    if (!contenedor) return;

    if (modo === 'json') {
        const mapaListas = {
            usuarios: listaUsuarios,
            solicitudes: listaSolicitudes,
            roles: listaRoles,
            tipos: listaTipos,
            revisiones: listaRevisiones,
        };
        contenedor.textContent = '';
        const pre = crearNodo('pre', { className: 'json-view-inline' });
        pre.textContent = JSON.stringify(mapaListas[seccion] || [], null, 2);
        contenedor.appendChild(pre);
    } else {
        // Re-render desde datos locales — sin nueva petición al backend
        const mapaRender = {
            usuarios: () => renderUsuarios(listaUsuarios),
            solicitudes: () => renderSolicitudes(listaSolicitudes),
            roles: renderRoles,
            tipos: renderTipos,
            revisiones: () => renderRevisiones(listaRevisiones),
        };
        mapaRender[seccion]?.();
    }
}


/* ============================================================
   MODAL CRUD — openCrud / saveCrud
============================================================ */

async function openCrud(tipo, modo, id = null) {
    crudState = { tipo, modo, id, id_usuario_encontrado: null };

    // Buscar template: primero específico (tpl-form-tipo-create), luego genérico
    const tplId = _resolverTplId(tipo, modo);
    const tpl = document.getElementById(tplId);
    if (!tpl) { toast(`Plantilla ${tplId} no encontrada`, 'error'); return; }

    const modalBody = document.getElementById('modal-crud-body');
    if (!modalBody) { toast('Contenedor del modal no disponible', 'error'); return; }
    modalBody.textContent = '';

    // Los formularios están definidos como <template>, por lo que se debe clonar .content
    if (tpl.content) {
        modalBody.appendChild(tpl.content.cloneNode(true));
    } else {
        Array.from(tpl.children).forEach(child => modalBody.appendChild(child.cloneNode(true)));
    }

    const labelTipo = tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
    const actionText = modo === 'create' ? 'Nuevo' : 'Editar';
    document.getElementById('modal-crud-title').textContent = `${actionText} ${labelTipo}`;

    // Poblar selects dependientes
    if (tipo === 'usuario') {
        const sel = document.getElementById('cf-rol');
        if (sel) {
            sel.textContent = '';
            listaRoles.forEach(r => sel.appendChild(new Option(r.nombre_rol, r.id_rol)));
        }
    }
    if (tipo === 'solicitud' && modo === 'create') {
        const sel = document.getElementById('cf-tipo');
        if (sel) {
            sel.textContent = '';
            listaTipos.forEach(t => sel.appendChild(
                new Option(t.nombre, t.id_tipo_solicitud || t.id)
            ));
        }

        // El botón de búsqueda vive dentro del template inyectado
        const btnBuscarCedula = document.getElementById('btn-buscar-cedula');
        if (btnBuscarCedula) {
            btnBuscarCedula.addEventListener('click', buscarPorCedulaAdmin);
        }

        const inputCedula = document.getElementById('cf-cedula');
        if (inputCedula) {
            inputCedula.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarPorCedulaAdmin();
                }
            });
        }
    }

    if (tipo === 'revision') {
        const inputSolicitud = document.getElementById('cf-sol-id');
        if (inputSolicitud && id) {
            inputSolicitud.value = String(id);
        }

        const info = document.getElementById('cf-info-revision-solicitud');
        if (info && id) {
            const solicitud = listaSolicitudes.find(s => s.id_solicitud === id);
            if (solicitud) {
                info.textContent = `${solicitud.nombre || ''} ${solicitud.apellido || ''} · ${solicitud.tipo || 'Tipo no disponible'} · Estado actual: ${solicitud.estado_actual || '–'}`;
            } else {
                info.textContent = `Solicitud #${id}`;
            }
        }
    }

    // Pre-rellenar en modo edit
    if (modo === 'edit') await _rellenarFormEdit(tipo, id);

    // Implementar toggle de contraseña para inputs dinámicos
    setTimeout(() => {
        const input = document.getElementById("cf-pass");
        const btn = document.getElementById("toggle-password");

        if (!input || !btn) return;

        const icon = btn.querySelector("i");

        btn.onclick = () => {
            if (input.type === "password") {
                input.type = "text";
                icon.classList.replace("fa-eye", "fa-eye-slash");
            } else {
                input.type = "password";
                icon.classList.replace("fa-eye-slash", "fa-eye");
            }
        };
    }, 100);

    document.getElementById('modal-crud').classList.add('show');
}

function _resolverTplId(tipo, modo) {
    const especifico = `tpl-form-${tipo}-${modo}`;
    return document.getElementById(especifico) ? especifico : `tpl-form-${tipo}`;
}

async function _rellenarFormEdit(tipo, id) {
    const get = (elId) => document.getElementById(elId);
    const setValue = (elId, valor = '') => {
        const el = get(elId);
        if (el) el.value = valor;
    };
    try {
        if (tipo === 'usuario') {
            const raw = await api.obtenerUsuarioPorId(id);
            const user = raw.resultado || raw;
            setValue('cf-nombre', user?.nombre || '');
            setValue('cf-apellido', user?.apellido || '');
            setValue('cf-correo', user?.correo || '');
            setValue('cf-cedula-usuario', user?.cedula || '');
            setValue('cf-programa', user?.programa || '');
            setValue('cf-semestre', user?.semestre || '');
            const rolMatch = listaRoles.find(r => r.nombre_rol === user.rol);
            if (rolMatch && get('cf-rol')) get('cf-rol').value = rolMatch.id_rol;
            setValue('cf-estado-usuario', user?.estado || 'activo');

        } else if (tipo === 'solicitud') {
            const raw = await api.obtenerSolicitudPorId(id);
            const sol = raw.resultado || raw;
            setValue('cf-estado', sol?.estado_actual || 'pendiente');
            const info = get('cf-info-solicitud');
            if (info) {
                info.textContent = '';
                [
                    ['Estudiante: ', `${sol.nombre || ''} ${sol.apellido || ''}`],
                    ['Cédula: ', sol.cedula || '–'],
                    ['Tipo: ', sol.tipo || sol.nombre_tipo || '–'],
                    ['Desc: ', sol.descripcion || 'Sin descripción'],
                ].forEach(([label, valor]) => {
                    info.appendChild(crearNodo('b', {}, [label]));
                    info.appendChild(document.createTextNode(valor));
                    info.appendChild(crearNodo('br'));
                });
            }

        } else if (tipo === 'rol') {
            const raw = await api.obtenerRolPorId(id);
            const r = raw.resultado || raw;
            setValue('cf-nombre-rol', r?.nombre_rol || r?.nombre || '');
            setValue('cf-descripcion', r?.descripcion || '');

        } else if (tipo === 'tipo') {
            const raw = await api.obtenerTipoPorId(id);
            const t = raw.resultado || raw;
            setValue('cf-nombre', t?.nombre || '');
            setValue('cf-descripcion', t?.descripcion || '');
        }
    } catch (err) {
        toast('Error cargando datos: ' + err.message, 'error');
    }
}

async function saveCrud() {
    const { tipo, modo, id } = crudState;
    const get = (elId) => document.getElementById(elId)?.value;

    try {
        let promesa;

        if (modo === 'create') {
            const payloads = {
                usuario: () => {
                    return api.crearUsuario({
                        nombre: get('cf-nombre'),
                        apellido: get('cf-apellido'),
                        correo: get('cf-correo'),
                        cedula: get('cf-cedula-usuario'),
                        contrasena: get('cf-pass'),
                        programa: get('cf-programa'),
                        semestre: parseInt(get('cf-semestre'), 10) || 0,
                        id_rol: parseInt(get('cf-rol'), 10),
                        estado: 'activo',
                    });
                },
                rol: () => api.crearRol({
                    nombre_rol: get('cf-nombre-rol'),
                    descripcion: get('cf-descripcion'),
                }),
                solicitud: () => {
                    if (!crudState.id_usuario_encontrado)
                        throw new Error('Debe buscar y validar la cédula del estudiante primero');
                    return api.crearSolicitud({
                        id_usuario: parseInt(crudState.id_usuario_encontrado, 10),
                        id_tipo_solicitud: parseInt(get('cf-tipo'), 10),
                        descripcion: get('cf-descripcion'),
                        prioridad: get('cf-prioridad'),
                    });
                },
                tipo: () => api.crearTipo({
                    nombre: get('cf-nombre'),
                    descripcion: get('cf-descripcion'),
                    requiere_documento: false,
                }),
                revision: () => {
                    const idSolicitud = parseInt(get('cf-sol-id'), 10);
                    if (!idSolicitud || idSolicitud <= 0) {
                        throw new Error('Debe indicar un ID de solicitud válido');
                    }

                    const estadoRevision = get('cf-estado-revision');
                    if (!estadoRevision) {
                        throw new Error('Debe seleccionar un estado de revisión');
                    }

                    return api.crearRevision({
                        id_solicitud: idSolicitud,
                        comentario: get('cf-comentario') || '',
                        estado_revision: estadoRevision,
                    });
                },
            };
            promesa = payloads[tipo]?.();

        } else if (modo === 'edit') {
            const payloads = {
                usuario: () => {
                    const payload = {
                        nombre: get('cf-nombre'),
                        apellido: get('cf-apellido'),
                        correo: get('cf-correo'),
                        cedula: get('cf-cedula-usuario'),
                        contrasena: '',
                        programa: get('cf-programa'),
                        semestre: parseInt(get('cf-semestre'), 10) || 0,
                        id_rol: parseInt(get('cf-rol'), 10),
                        estado: get('cf-estado-usuario') || 'activo',
                    };
                    return api.actualizarUsuario(id, payload)
                        .then(() => api.actualizarEstadoUsuario(id, payload.estado));
                },
                rol: () => api.actualizarRol(id, {
                    nombre_rol: get('cf-nombre-rol'),
                    descripcion: get('cf-descripcion'),
                }),
                solicitud: () => api.actualizarEstadoSolicitud(id, get('cf-estado')),
                tipo: () => api.actualizarTipo(id, {
                    nombre: get('cf-nombre'),
                    descripcion: get('cf-descripcion'),
                    requiere_documento: false,
                }),
            };
            promesa = payloads[tipo]?.();
        }

        if (!promesa) {
            throw new Error('Operación no soportada para este formulario');
        }

        await promesa;
        toast(`${tipo} ${modo === 'create' ? 'creado' : 'actualizado'} correctamente`, 'success');
        closeModal('modal-crud');

        // Recargar tabla afectada
        const recargar = {
            usuario: () => cargarUsuarios(),
            rol: () => loadRoles(),
            solicitud: () => cargarSolicitudes(),
            tipo: () => loadTipos(),
            revision: () => Promise.all([cargarSolicitudes(), loadRevisiones()]),
        };
        await recargar[tipo]?.();

    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
}


/* ============================================================
   MODAL JSON
============================================================ */

function verJsonObj(id, tipo) {
    const mapaObjetos = {
        usuario:   listaUsuarios.find(u => u.id_usuario === id),
        solicitud: listaSolicitudes.find(s => s.id_solicitud === id),
        rol:       listaRoles.find(r => r.id_rol === id),
        tipo:      listaTipos.find(t => (t.id_tipo_solicitud || t.id) === id),
        revision:  listaRevisiones.find(r => r.id_revision === id),
    };
    const obj = mapaObjetos[tipo] || { id };

    const labelType = tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase() : 'Objeto';
    document.getElementById('modal-json-title').textContent = `${labelType} #${id}`;

    // ── Helpers locales ────────────────────────────────────────
    const esc = v => String(v ?? '–').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    function mdRow(label, value, raw = false) {
        const val = raw ? (value || '–') : esc(value);
        return `<div class="md-row"><span class="md-label">${label}</span><span class="md-value">${val}</span></div>`;
    }

    function mdBadge(value, prefix = '') {
        const slug = String(value || '').toLowerCase().replace(/\s+/g, '_');
        return `<span class="badge badge-${prefix}${slug}">${esc(value)}</span>`;
    }

    function mdAvatar(initials) {
        return `<div class="md-avatar">${esc(initials)}</div>`;
    }

    function mdSection(title, body) {
        return `<div class="md-section"><div class="md-section-title">${title}</div>${body}</div>`;
    }

    // ── Documentos mock (fallback si no existe var global) ─────
    const _docsMock = typeof documentosMock !== 'undefined' ? documentosMock : [
        { cedula: '0000', nombre: 'ejemplo.pdf', tipo: 'PDF', fecha: '2026-01-01', estado: 'válido' }
    ];

    // ── Render por tipo ────────────────────────────────────────
    const content = document.getElementById('modal-json-content');
    let html = '';

    if (tipo === 'solicitud') {
        const ini = ((obj.nombre || '?')[0] + (obj.apellido || '?')[0]).toUpperCase();
        const estadoBadge = mdBadge(obj.estado_actual || 'pendiente');
        const prioBadge   = mdBadge(obj.prioridad   || 'baja', 'prio-');

        // Documentos adjuntos filtrados por cédula
        const docsAdj = _docsMock.filter(d => d.cedula === String(obj.cedula || ''));
        const docsHtml = docsAdj.length
            ? docsAdj.map(d =>
                `<div class="md-doc-item">
                    <span class="md-doc-icon">📄</span>
                    <span class="md-doc-name">${esc(d.nombre)}</span>
                    <span class="md-doc-type">${esc(d.tipo)}</span>
                    <span class="md-doc-date">${esc(d.fecha)}</span>
                    <span class="md-doc-estado badge badge-${d.estado === 'válido' ? 'aprobada' : 'pendiente'}">${esc(d.estado)}</span>
                </div>`).join('')
            : `<div class="md-doc-empty">Sin documentos adjuntos</div>`;

        html = `
        <div class="md-card">
            <div class="md-header">
                ${mdAvatar(ini)}
                <div class="md-header-info">
                    <div class="md-name">${esc(obj.nombre)} ${esc(obj.apellido)}</div>
                    <div class="md-sub">${esc(obj.cedula || '–')} · ${esc(obj.tipo || obj.nombre_tipo || '–')}</div>
                    <div class="md-badges">${estadoBadge}${prioBadge}</div>
                </div>
            </div>
            ${mdSection('Identidad',
                mdRow('Nombre',   `${esc(obj.nombre)} ${esc(obj.apellido)}`) +
                mdRow('Cédula',   obj.cedula) +
                mdRow('Correo',   obj.correo)
            )}
            ${mdSection('Solicitud',
                mdRow('Tipo',      obj.tipo || obj.nombre_tipo) +
                mdRow('Estado',    estadoBadge, true) +
                mdRow('Prioridad', prioBadge, true)
            )}
            ${mdSection('Fechas',
                mdRow('Creación',      obj.fecha_creacion?.slice(0, 10)) +
                mdRow('Actualización', obj.fecha_actualizacion?.slice(0, 10))
            )}
            ${mdSection('Descripción',
                `<div class="md-desc">${esc(obj.descripcion || 'Sin descripción')}</div>`
            )}
            ${mdSection('Documentos adjuntos', `<div class="md-docs">${docsHtml}</div>`)}
        </div>`;

    } else if (tipo === 'usuario') {
        const ini = ((obj.nombre || '?')[0] + (obj.apellido || '?')[0]).toUpperCase();
        const rolBadge    = `<span class="badge-rol rol-${String(obj.rol || '').toLowerCase()}">${esc(obj.rol || '–')}</span>`;
        const estadoBadge = mdBadge(obj.estado || 'activo');

        html = `
        <div class="md-card">
            <div class="md-header">
                ${mdAvatar(ini)}
                <div class="md-header-info">
                    <div class="md-name">${esc(obj.nombre)} ${esc(obj.apellido)}</div>
                    <div class="md-sub">${esc(obj.correo || '–')}</div>
                    <div class="md-badges">${rolBadge}${estadoBadge}</div>
                </div>
            </div>
            ${mdSection('Identidad',
                mdRow('Nombre',   `${esc(obj.nombre)} ${esc(obj.apellido)}`) +
                mdRow('Correo',   obj.correo) +
                mdRow('Cédula',   obj.cedula)
            )}
            ${mdSection('Académico',
                mdRow('Rol',      rolBadge, true) +
                mdRow('Programa', obj.programa) +
                mdRow('Semestre', obj.semestre)
            )}
            ${mdSection('Cuenta',
                mdRow('Estado',         estadoBadge, true) +
                mdRow('Fecha creación', obj.fecha_creacion?.slice(0, 10))
            )}
        </div>`;

    } else if (tipo === 'rol') {
        const ini = (obj.nombre_rol || obj.nombre || 'RL')[0].toUpperCase();
        html = `
        <div class="md-card">
            <div class="md-header">
                ${mdAvatar(ini)}
                <div class="md-header-info">
                    <div class="md-name">${esc(obj.nombre_rol || obj.nombre || '–')}</div>
                    <div class="md-sub">Rol del sistema</div>
                </div>
            </div>
            ${mdSection('Detalles',
                mdRow('Nombre', obj.nombre_rol || obj.nombre)
            )}
            ${mdSection('Descripción',
                `<div class="md-desc">${esc(obj.descripcion || 'Sin descripción')}</div>`
            )}
        </div>`;

    } else if (tipo === 'tipo') {
        const ini = (obj.nombre || 'TP')[0].toUpperCase();
        const reqBadge = obj.requiere_documento
            ? `<span class="badge badge-aprobada">Sí</span>`
            : `<span class="badge badge-cancelada">No</span>`;

        html = `
        <div class="md-card">
            <div class="md-header">
                ${mdAvatar(ini)}
                <div class="md-header-info">
                    <div class="md-name">${esc(obj.nombre || '–')}</div>
                    <div class="md-sub">Tipo de solicitud</div>
                    <div class="md-badges">${reqBadge}</div>
                </div>
            </div>
            ${mdSection('Detalles',
                mdRow('Nombre', obj.nombre) +
                mdRow('Requiere documento', reqBadge, true)
            )}
            ${mdSection('Descripción',
                `<div class="md-desc">${esc(obj.descripcion || 'Sin descripción')}</div>`
            )}
        </div>`;

    } else if (tipo === 'revision') {
        const est = obj.estudiante || '?';
        const ini = est.trim().split(' ').map(p => p[0] || '').join('').slice(0, 2).toUpperCase() || 'RV';
        const revBadge    = mdBadge(obj.estado_revision || '–');
        const actBadge    = mdBadge(obj.estado_actual   || '–');

        html = `
        <div class="md-card">
            <div class="md-header">
                ${mdAvatar(ini)}
                <div class="md-header-info">
                    <div class="md-name">${esc(obj.estudiante || '–')}</div>
                    <div class="md-sub">${esc(obj.tipo_solicitud || '–')} · ${esc(obj.revisor || '–')}</div>
                    <div class="md-badges">${revBadge}${actBadge}</div>
                </div>
            </div>
            ${mdSection('Revisión',
                mdRow('Estado revisión',       revBadge, true) +
                mdRow('Estado actual sol.',    actBadge, true) +
                mdRow('Revisor',               obj.revisor) +
                mdRow('Fecha',                 obj.fecha_creacion?.slice(0, 10))
            )}
            ${mdSection('Comentario',
                `<div class="md-desc">${esc(obj.comentario || 'Sin comentario')}</div>`
            )}
        </div>`;

    } else {
        // Fallback genérico: tabla clave/valor
        const filas = Object.entries(obj).map(([k, v]) =>
            mdRow(k, v)
        ).join('');
        html = `<div class="md-card">${mdSection('Datos', filas)}</div>`;
    }

    content.innerHTML = html;
    document.getElementById('modal-json').classList.add('show');
}

// Compatibilidad con llamadas antiguas sin tipo
function verJson(jsonString) {
    try {
        const datos = JSON.parse(jsonString);
        document.getElementById('modal-json-title').textContent = 'JSON';
        document.getElementById('modal-json-content').textContent = JSON.stringify(datos, null, 2);
        document.getElementById('modal-json').classList.add('show');
    } catch { /* silenciar */ }
}


/* ============================================================
   VER DOCUMENTOS DE UNA SOLICITUD
   Reutiliza #modal-json con diseño md-card
============================================================ */
async function verDocumentosSolicitud(idSolicitud) {
    const modal = document.getElementById('modal-json');
    const title = document.getElementById('modal-json-title');
    const content = document.getElementById('modal-json-content');
    const sol = listaSolicitudes.find(s => s.id_solicitud === idSolicitud);

    title.textContent = 'Documentos de la solicitud';

    let documentos = [];
    try {
        const resp = await api.obtenerDocumentosPorSolicitud(idSolicitud);
        documentos = normalizarRespuesta(resp);
    } catch {
        documentos = [];
    }

    function tipoLabel(tipo) {
        if (!tipo) return 'Archivo';
        if (tipo.includes('pdf')) return 'PDF';
        if (tipo.includes('image')) return 'Imagen';
        return 'Archivo';
    }

    const esc = v => String(v ?? '–').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let htmlDocs = '';
    if (!documentos.length) {
        htmlDocs = '<div class="md-doc-empty">Sin documentos adjuntos</div>';
    } else {
        htmlDocs = documentos.map(doc => {

            const tipo = (doc.tipo_archivo || '').toLowerCase();

            let icono = '<span class="doc-tag doc-file">FILE</span>';
            if (tipo.includes('pdf')) {
                icono = '<span class="doc-tag doc-pdf">PDF</span>';
            } else if (tipo.includes('image')) {
                icono = '<span class="doc-tag doc-img">IMG</span>';
            }

            const estado = (doc.estado || '').toLowerCase();
            let badgeEstado = '';

            if (estado === 'valido') {
                badgeEstado = '<span class="badge badge-success">● válido</span>';
            } else if (estado === 'pendiente') {
                badgeEstado = '<span class="badge badge-warning">● pendiente</span>';
            }

            return `
                <div class="md-doc-item">
                    <div class="md-doc-left">
                        <span class="md-doc-icon">${icono}</span>
                        <span class="md-doc-name">${esc(doc.nombre_archivo)}</span>
                    </div>

                    <div class="md-doc-right">
                        <span class="md-doc-type">${tipoLabel(doc.tipo_archivo)}</span>
                        <span class="md-doc-date">${(doc.fecha_subida || '').slice(0,10)}</span>
                        ${badgeEstado}
                    </div>
                </div>
            `;
        }).join('');
    }

    content.innerHTML = `
        <div class="md-card">
            <div class="md-header">
                <div class="md-avatar">${esc((sol?.nombre || '?')[0] + (sol?.apellido || '?')[0])}</div>
                <div class="md-header-info">
                    <div class="md-name">${esc(sol?.nombre)} ${esc(sol?.apellido)}</div>
                    <div class="md-sub">Solicitud #${idSolicitud} · ${esc(sol?.tipo || sol?.nombre_tipo)}</div>
                </div>
            </div>
            <div class="md-section">
                <div class="md-section-title">Documentos adjuntos</div>
                <div class="md-docs">${htmlDocs}</div>
            </div>
        </div>
    `;

    modal.classList.add('show');
}


/* ============================================================
   BUSCAR USUARIO POR CÉDULA (formulario solicitud admin)
============================================================ */

async function buscarPorCedulaAdmin() {
    const cedula = document.getElementById('cf-cedula')?.value;
    if (!cedula) { toast('Ingrese una cédula para buscar', 'error'); return; }

    try {
        const raw = await api.obtenerUsuarioPorCedula(cedula);
        const datosUser = raw.resultado || raw;

        document.getElementById('admin-nombre-usuario').textContent = `${datosUser.nombre} ${datosUser.apellido}`;
        document.getElementById('admin-usuario-encontrado').style.display = 'block';
        document.getElementById('admin-usuario-no-encontrado').style.display = 'none';
        crudState.id_usuario_encontrado = datosUser.id_usuario;
    } catch {
        document.getElementById('admin-usuario-encontrado').style.display = 'none';
        document.getElementById('admin-usuario-no-encontrado').style.display = 'block';
        crudState.id_usuario_encontrado = null;
    }
}


/* ============================================================
   HELPERS PRIVADOS
============================================================ */

function _setBadge(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}


/* ============================================================
   INICIALIZACIÓN
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar correo en topbar
    const topbarUser = document.getElementById('topbar-user');
    if (topbarUser && usuarioPortal.correo) topbarUser.textContent = usuarioPortal.correo;

    // Carga inicial
    try {
        await Promise.all([cargarUsuarios(), cargarSolicitudes()]);
        actualizarOverview();
    } catch (e) {
        console.error('Error en carga inicial:', e);
    }
    loadRoles();
    loadTipos();
    loadRevisiones();

    // ── Binding de eventos ──
    const bind = (id, evt, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(evt, fn);
    };

    // Usuarios
    bind('btn-crud-usuario-create', 'click', () => openCrud('usuario', 'create'));
    bind('btn-load-usuarios', 'click', loadUsuarios);
    bind('input-filter-usuarios', 'input', e => filterTable('usuarios', e.target.value));

    // Roles
    bind('btn-crud-rol-create', 'click', () => openCrud('rol', 'create'));
    bind('btn-load-roles', 'click', loadRoles);

    // Solicitudes
    bind('btn-crud-solicitud-create', 'click', () => openCrud('solicitud', 'create'));
    bind('filter-estado', 'change', filterByEstado);
    bind('btn-load-solicitudes', 'click', loadSolicitudes);
    bind('input-filter-solicitudes', 'input', e => filterTable('solicitudes', e.target.value));

    // Tipos
    bind('btn-crud-tipo-create', 'click', () => openCrud('tipo', 'create'));
    bind('btn-load-tipos', 'click', loadTipos);

    // Documentos
    bind('btn-crud-doc-create', 'click', () => openCrud('documento', 'create'));
    bind('btn-consultar-doc', 'click', consultarDocumentos);
    const inpDoc = document.getElementById('input-cedula-doc');
    if (inpDoc) inpDoc.addEventListener('keydown', e => { if (e.key === 'Enter') consultarDocumentos(); });

    // Revisiones
    bind('btn-crud-rev-create', 'click', () => openCrud('revision', 'create'));
    bind('btn-load-rev', 'click', loadRevisiones);
    const revDoc = document.getElementById('rev-solicitud-id');
    if (revDoc) revDoc.addEventListener('keydown', e => { if (e.key === 'Enter') loadRevisiones(); });

    // Modal CRUD
    bind('btn-save-crud', 'click', saveCrud);
    document.querySelectorAll('[data-action="close-crud"]')
        .forEach(btn => btn.addEventListener('click', () => closeModal('modal-crud')));

    // Modal JSON
    bind('btn-copy-json', 'click', copyJsonModal);
    document.querySelectorAll('[data-action="close-json"]')
        .forEach(btn => btn.addEventListener('click', () => closeModal('modal-json')));

    // Toggle tabla / JSON
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () =>
            setView(btn.getAttribute('data-entity'), btn.getAttribute('data-view'), btn)
        );
    });

    // Backdrop modales
    initModalBackdrop();

    // Auto-refresh cada 60 s - DESACTIVADO para mejorar UX
    // setInterval(refreshAll, 60000);
});
