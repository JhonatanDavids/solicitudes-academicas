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

    // Render con avatar, nombre jerarquico e ID sub via buildFilaUsuario (ui.js)
    lista.forEach(u => {
        tbody.appendChild(buildFilaUsuario(u, _buildAccionesUsuario));
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

function _buildAccionesUsuario(u) {
    const td = crearNodo('td', { className: 'td-actions' });
    const acciones = crearNodo('div', { className: 'ad-actions' });

    const btnEdit = crearNodo('button', { className: 'btn-sm btn-edit', title: 'Editar Usuario' });
    btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i> Editar';
    btnEdit.addEventListener('click', () => openCrud('usuario', 'edit', u.id_usuario));

    const btnVer = crearNodo('button', { className: 'btn-sm btn-json', title: 'Ver Detalle' }, ['👁 Detalle']);
    btnVer.addEventListener('click', () => verJsonObj(u.id_usuario, 'usuario'));

    const btnDel = crearNodo('button', { className: 'btn-sm btn-danger btn-icon-sm', title: 'Eliminar Usuario' });
    btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
    btnDel.addEventListener('click', () => eliminarUsuario(u.id_usuario));

    acciones.appendChild(btnEdit);
    acciones.appendChild(btnVer);
    acciones.appendChild(btnDel);
    
    td.appendChild(acciones);
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
    const acciones = crearNodo('div', { className: 'ad-actions' });

    // Acción principal (verde)
    const btnReview = crearNodo('button', { className: 'btn-sm btn-success btn-icon-sm', title: 'Revisar Solicitud' });
    btnReview.innerHTML = '<i class="fa-solid fa-check"></i>';
    btnReview.addEventListener('click', () => openCrud('revision', 'create', sol.id_solicitud));

    // Acción secundaria (amarillo)
    const btnEdit = crearNodo('button', { className: 'btn-sm btn-edit btn-icon-sm', title: 'Editar Estado' });
    btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i>';
    btnEdit.addEventListener('click', () => openCrud('solicitud', 'edit', sol.id_solicitud));

    // Otras acciones
    const btnDocs = crearNodo('button', { className: 'btn-sm btn-info btn-icon-sm', title: 'Ver Documentos' });
    btnDocs.innerHTML = '<i class="fa-solid fa-file-lines"></i>';
    btnDocs.addEventListener('click', () => verDocumentosSolicitud(sol.id_solicitud));

    const btnVer = crearNodo('button', { className: 'btn-sm btn-json', title: 'Ver Detalle' }, ['👁 Detalle']);
    btnVer.addEventListener('click', () => verJsonObj(sol.id_solicitud, 'solicitud'));

    const btnDel = crearNodo('button', { className: 'btn-sm btn-danger btn-icon-sm', title: 'Eliminar' });
    btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
    btnDel.addEventListener('click', () => eliminarSolicitud(sol.id_solicitud));

    acciones.appendChild(btnReview);
    acciones.appendChild(btnEdit);
    acciones.appendChild(btnDocs);
    acciones.appendChild(btnVer);
    acciones.appendChild(btnDel);
    
    td.appendChild(acciones);
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

    const { tabla, tbody } = crearTabla(['Nombre', 'Descripción', 'Usuarios', 'Acciones']);

    listaRoles.forEach(r => {
        const tr = crearNodo('tr', { dataset: { id: r.id_rol } });
        const rolNombre = r.nombre_rol || r.nombre || '–';
        const rc = getRolConfig(rolNombre);

        const badge = crearNodo('span', { className: `badge-rol ${rc.clase}` },
            [`${rc.icon} ${rolNombre}`]);
        tr.appendChild(crearNodo('td', {}, [badge]));

        const descripcionesSaaS = {
            'Administrador': 'Administrador del sistema con control total',
            'Estudiante': 'Usuario estudiante que genera solicitudes académicas',
            'Funcionario': 'Funcionario administrativo que revisa solicitudes',
            'Coordinador': 'Coordinador académico con aprobación final de solicitudes'
        };
        const textoDesc = descripcionesSaaS[rolNombre] || r.descripcion || '–';
        tr.appendChild(crearNodo('td', { className: 'td-muted' }, [textoDesc]));

        let userCount = 0;
        if (typeof listaUsuarios !== 'undefined' && listaUsuarios.length > 0) {
            const rNormalizado = rolNombre.toLowerCase();
            userCount = listaUsuarios.filter(u => 
                u.id_rol === r.id_rol || (u.rol && u.rol.toLowerCase() === rNormalizado)
            ).length;
        }
        tr.appendChild(crearNodo('td', { className: 'td-count' }, [userCount]));

        tr.appendChild(_buildAccionesRol(r));
        tbody.appendChild(tr);
    });

    contenedor.appendChild(tabla);
    initDataTable(tabla);
}

function _buildAccionesRol(r) {
    const td = crearNodo('td', { className: 'td-actions' });
    const acciones = crearNodo('div', { className: 'ad-actions' });

    const btnEdit = crearNodo('button', { className: 'btn-sm btn-edit', title: 'Editar Rol' });
    btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i> Editar';
    btnEdit.addEventListener('click', () => openCrud('rol', 'edit', r.id_rol));

    const btnVer = crearNodo('button', { className: 'btn-sm btn-json', title: 'Ver Detalle' }, ['👁 Detalle']);
    btnVer.addEventListener('click', () => verJsonObj(r.id_rol, 'rol'));

    const btnDel = crearNodo('button', { className: 'btn-sm btn-danger btn-icon-sm', title: 'Eliminar Rol' });
    btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
    btnDel.addEventListener('click', () => eliminarRol(r.id_rol));

    acciones.appendChild(btnEdit);
    acciones.appendChild(btnVer);
    acciones.appendChild(btnDel);
    
    td.appendChild(acciones);
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
    const acciones = crearNodo('div', { className: 'ad-actions' });

    const btnEdit = crearNodo('button', { className: 'btn-sm btn-edit', title: 'Editar Tipo' });
    btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i> Editar';
    btnEdit.addEventListener('click', () => openCrud('tipo', 'edit', id));

    const btnVer = crearNodo('button', { className: 'btn-sm btn-json', title: 'Ver Detalle' }, ['👁 Detalle']);
    btnVer.addEventListener('click', () => verJsonObj(id, 'tipo'));

    const btnDel = crearNodo('button', { className: 'btn-sm btn-danger btn-icon-sm', title: 'Eliminar Tipo' });
    btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
    btnDel.addEventListener('click', () => eliminarTipo(id));

    acciones.appendChild(btnEdit);
    acciones.appendChild(btnVer);
    acciones.appendChild(btnDel);
    
    td.appendChild(acciones);
    return td;
}


/* ============================================================
   DOCUMENTOS (placeholder — datos mock mientras backend pendiente)
============================================================ */

function consultarDocumentos() {
    const cedulaInput = document.getElementById('input-cedula-doc');
    const tablaContainer = document.getElementById('tabla-documentos');
    if (!cedulaInput || !tablaContainer) return;

    const cedula = cedulaInput.value.trim();

    // Validar y crear contenedor de cards una sola vez
    let cardsContainer = document.getElementById('documentos-cards');
    if (!cardsContainer) {
        cardsContainer = crearNodo('div', { id: 'documentos-cards', className: 'docs-grid' });
        tablaContainer.parentNode.insertBefore(cardsContainer, tablaContainer);
    }

    // Ocultar visualmente la tabla, pero mantener paginador y buscador de DataTables
    tablaContainer.classList.add('docs-hidden-table');

    tablaContainer.textContent = '';
    cardsContainer.innerHTML = '';

    if (!cedula) {
        cardsContainer.innerHTML = '<p class="empty-hint" style="grid-column: 1/-1;">Ingrese una cédula</p>';
        return;
    }

    const resultados = documentosMock.filter(doc => doc.cedula === cedula);

    if (!resultados.length) {
        cardsContainer.innerHTML = '<p class="empty-hint" style="grid-column: 1/-1;">No hay documentos para esta cédula</p>';
        return;
    }

    // Construir tabla invisible para procesar en DataTables
    const { tabla: tbl, tbody } = crearTabla(['Nombre', 'Tipo', 'Fecha', 'Estado']);
    resultados.forEach(doc => {
        const tr = crearNodo('tr');
        tr.appendChild(crearNodo('td', {}, [doc.nombre]));
        tr.appendChild(crearNodo('td', {}, [doc.tipo]));
        tr.appendChild(crearNodo('td', {}, [doc.fecha]));
        tr.appendChild(crearNodo('td', {}, [doc.estado]));
        tbody.appendChild(tr);
    });
    tablaContainer.appendChild(tbl);

    // Inicializar DataTables y sincronizar el dibujado a nuestras Cards
    initDataTable(tbl, {
        initComplete: function(settings, json) {
            const dtApi = this.api();
            dtApi.off('draw.dt').on('draw.dt', function() {
                renderDocumentCards(dtApi);
            });
            // Forzar render inicial
            renderDocumentCards(dtApi);
        }
    });
}

function renderDocumentCards(dt) {
    const container = document.getElementById('documentos-cards');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Obtener SOLO la página actual con búsquedas/filtros aplicados
    const data = dt.rows({ search: 'applied', page: 'current' }).data().toArray();
    
    if (data.length === 0) {
        container.innerHTML = '<p class="empty-hint" style="grid-column: 1/-1; text-align: center;">No hay documentos consistentes con la búsqueda.</p>';
        return;
    }

    data.forEach(row => {
        const nombre = row[0];
        const tipo = row[1];
        const fecha = row[2];
        const estado = row[3];
        
        let iconType = 'fa-file';
        let iconColor = 'var(--ad-text-3)';
        
        const tipoStr = String(tipo).toLowerCase();
        if (tipoStr.includes('pdf')) {
            iconType = 'fa-file-pdf';
            iconColor = 'var(--ad-red)';
        } else if (tipoStr.includes('imagen') || tipoStr.includes('png') || tipoStr.includes('jpg')) {
            iconType = 'fa-file-image';
            iconColor = 'var(--ad-blue)';
        }

        const eStr = String(estado).toLowerCase();
        const badgeClass = eStr.includes('válido') ? 'badge-aprobada' : (eStr.includes('pendiente') ? 'badge-pendiente' : 'badge-cancelada');

        const card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = `
            <div class="doc-card-header">
                <i class="fa-solid ${iconType}" style="color: ${iconColor}; font-size: 30px; line-height: 1;"></i>
                <div class="doc-card-titles">
                    <h4>${nombre}</h4>
                    <p>${tipo} • ${fecha}</p>
                </div>
            </div>
            <div class="doc-card-body">
                <span class="badge ${badgeClass}">
                    <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;margin-right:4px;"></span>
                    ${estado.charAt(0).toUpperCase() + estado.slice(1)}
                </span>
            </div>
            <div class="doc-card-footer ad-actions" style="justify-content: flex-end; width: 100%; border-top: 1px solid var(--ad-border); padding-top: 12px;">
                <button class="btn-sm btn-info"><i class="fa-solid fa-eye"></i> Ver</button>
                <button class="btn-sm btn-danger btn-icon-sm" title="Eliminar Documento"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
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
        tr.appendChild(crearNodo('td', { className: 'td-tipo' }, [rev.tipo_solicitud || '–']));

        const estado = rev.estado_revision || '–';
        const estadoActual = rev.estado_actual || '–';
        const tdEstado = crearNodo('td');
        tdEstado.appendChild(crearBadgeEstado(estado));
        tdEstado.appendChild(
            crearNodo('small', {
                className: 'td-muted rev-final',
                style: 'display:block; opacity:0.6; margin-top: 3px; font-family: var(--ad-mono); font-size: 0.72rem; text-transform: lowercase;'
            }, [estadoActual])
        );
        tr.appendChild(tdEstado);

        const comentarioStr = rev.comentario || 'Sin comentario...';
        const divComentario = crearNodo('div', { className: 'rev-comment-box' }, [comentarioStr]);
        tr.appendChild(crearNodo('td', {}, [divComentario]));

        const revisor = rev.revisor || '–';
        let revisorTd;
        if (revisor !== '–') {
            const parts = revisor.trim().split(' ');
            const nom = parts[0] || 'U';
            const ape = parts[1] || 'U';
            const initials = (nom[0] + ape[0]).toUpperCase();
            const avatarNum = (nom.charCodeAt(0) + ape.charCodeAt(0)) % 8;
            
            const avatarEl = crearNodo('div', { className: `td-avatar td-avatar-${avatarNum}` }, [initials]);
            const nameEl = crearNodo('div', { className: 'td-user-name' }, [revisor]);
            const cellWrap = crearNodo('div', { className: 'td-user-cell' }, [avatarEl, nameEl]);
            
            revisorTd = crearNodo('td', {}, [cellWrap]);
        } else {
            revisorTd = crearNodo('td', { className: 'td-muted' }, [revisor]);
        }
        tr.appendChild(revisorTd);

        const fecha = rev.fecha_creacion
            ? new Date(rev.fecha_creacion).toLocaleString('es-CO', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})
            : '–';
        tr.appendChild(crearNodo('td', { className: 'td-fecha', style: 'font-size: 12px;' }, [fecha]));

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
    const estado = document.getElementById('filter-estado')?.value || '';
    const $tabla = $('#data-solicitudes table');
    if ($tabla.length && $.fn.DataTable.isDataTable($tabla)) {
        const dt = $tabla.DataTable();
        let colIdx = -1;
        dt.columns().every(function() {
            if (this.header().textContent.trim().toLowerCase() === 'estado') {
                colIdx = this.index();
            }
        });
        if (colIdx !== -1) {
            dt.column(colIdx).search(estado, false, false).draw();
        }
    }
}

/**
 * Actualiza el texto del contador de registros para una tabla
 * @param {DataTables.Api} dt - instancia de DataTables
 * @param {string} counterId - ID del elemento DOM donde se mostrará el texto
 */
function _updateCounter(dt, counterId) {
    const info = dt.page.info();
    const counter = document.getElementById(counterId);
    if (counter) {
        counter.textContent = `${info.recordsDisplay} de ${info.recordsTotal} registros`;
    }
}

/**
 * Oculta la paginacion de DataTables cuando los resultados filtrados
 * caben en una sola pagina. Evita mostrar controles de pagina vacios.
 * @param {DataTables.Api} dt - instancia de DataTables
 */
function _togglePaginate(dt) {
    const total   = dt.rows({ filter: 'applied' }).count();
    const pageLen = dt.page.len();
    const $pag    = $(dt.table().container()).find('.dataTables_paginate');
    $pag.toggle(total > pageLen);
}

/**
 * Resalta el texto buscado dentro de las celdas visibles de la tabla.
 * Inserta etiquetas <mark> alrededor de cada coincidencia (regex, case-insensitive)
 * y las elimina antes de aplicar un nuevo resaltado.
 * @param {DataTables.Api} dt - instancia de DataTables
 */
function _highlightSearch(dt) {
    const body   = $(dt.table().body());
    const search = dt.search();

    // Limpiar highlights anteriores preservando el HTML interno
    body.find('mark').each(function () {
        $(this).replaceWith(this.childNodes);
    });

    if (!search) return;

    const escSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // (?![^<]*>) garantiza que no estemos dentro de una etiqueta HTML < ... >
    const regex = new RegExp(`(${escSearch})(?![^<]*>)`, 'gi');

    body.find('td').each(function () {
        const html = $(this).html();
        $(this).html(html.replace(regex, '<mark>$1</mark>'));
    });
}

/**
 * Filtra la tabla de usuarios por el rol de la columna 3.
 * Búsqueda simple (sin regex, permite coincidencias parciales).
 * Pasar valor vacío limpia el filtro de columna.
 * @param {DataTables.Api} dt
 * @param {string} valor - nombre del rol o "" para mostrar todos
 */
function _filterByRol(dt, valor) {
    const map = {
        "Administrador": "admin",
        "Coordinador": "coordinador",
        "Estudiante": "estudiante",
        "Funcionario": "funcionario"
    };

    const searchValue = map[valor] || "";
    
    let colIdx = -1;
    dt.columns().every(function() {
        if (this.header().textContent.trim().toLowerCase() === 'rol') {
            colIdx = this.index();
        }
    });

    if (colIdx !== -1) {
        dt.column(colIdx).search(searchValue, false, false).draw();
    }
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

    const mapaRender = {
        usuarios: () => renderUsuarios(listaUsuarios),
        solicitudes: () => renderSolicitudes(listaSolicitudes),
        roles: renderRoles,
        tipos: renderTipos,
        revisiones: () => renderRevisiones(listaRevisiones),
    };
    mapaRender[seccion]?.();
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
   MODAL DETALLE
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
    bind('input-filter-usuarios', 'input', e => { const dt = $('#data-usuarios table').DataTable(); dt.search(e.target.value).draw(); });

    // Enlazar los chips de roles para usuarios
    document.querySelectorAll('#section-usuarios .ad-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('#section-usuarios .ad-chip').forEach(c => c.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            const sel = document.getElementById('filter-rol');
            if (sel) {
                sel.value = target.dataset.rol;
                const $tabla = $('#data-usuarios table');
                if ($tabla.length && $.fn.DataTable.isDataTable($tabla)) {
                    _filterByRol($tabla.DataTable(), sel.value);
                }
            }
        });
    });

    // Roles
    bind('btn-crud-rol-create', 'click', () => openCrud('rol', 'create'));
    bind('btn-load-roles', 'click', loadRoles);
    bind('input-filter-roles', 'input', e => { const dt = $('#data-roles table').DataTable(); dt.search(e.target.value).draw(); });

    // Solicitudes
    bind('btn-crud-solicitud-create', 'click', () => openCrud('solicitud', 'create'));
    // Enlazar los chips de estados para solicitudes
    document.querySelectorAll('#section-solicitudes .ad-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('#section-solicitudes .ad-chip').forEach(c => c.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            
            const sel = document.getElementById('filter-estado');
            if (sel) sel.value = target.dataset.estado;
            
            filterByEstado();
        });
    });
    bind('filter-estado', 'change', filterByEstado);
    bind('btn-load-solicitudes', 'click', loadSolicitudes);
    bind('input-filter-solicitudes', 'input', e => { const dt = $('#data-solicitudes table').DataTable(); dt.search(e.target.value).draw(); });

    // Tipos
    bind('btn-crud-tipo-create', 'click', () => openCrud('tipo', 'create'));
    bind('btn-load-tipos', 'click', loadTipos);
    bind('input-filter-tipos', 'input', e => { const dt = $('#data-tipos table').DataTable(); dt.search(e.target.value).draw(); });

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

    // Modal Detalle
    bind('btn-copy-json', 'click', copyJsonModal);
    document.querySelectorAll('[data-action="close-json"]')
        .forEach(btn => btn.addEventListener('click', () => closeModal('modal-json')));

    // Paginación y contadores locales por sección en cada redraw
    const setupTableEvents = (containerId, counterId) => {
        $(`#${containerId}`).on('draw.dt', 'table', function () { 
            if (!$.fn.DataTable.isDataTable(this)) return;
            const dt = $(this).DataTable(); 
            _togglePaginate(dt); 
            _highlightSearch(dt); 
            _updateCounter(dt, counterId);
        });
    };

    setupTableEvents('data-usuarios', 'usuarios-counter');
    setupTableEvents('data-roles', 'roles-counter');
    setupTableEvents('data-solicitudes', 'sol-counter');
    setupTableEvents('data-tipos', 'tipos-counter');
    setupTableEvents('data-revisiones', 'revisiones-counter');
    // Para documentos, como su wrapper podría llamarse tabla-documentos, se asegura:
    setupTableEvents('tabla-documentos', 'documentos-counter');

    initModalBackdrop();

    // Auto-refresh cada 60 s - DESACTIVADO para mejorar UX
    // setInterval(refreshAll, 60000);
});
