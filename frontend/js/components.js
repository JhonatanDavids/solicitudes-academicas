/* ============================================================
   COMPONENTS.JS — Web Components personalizados
   PASO 9: Los <style> se eliminaron del innerHTML de cada componente.
   Los estilos ahora viven en global.css bajo las clases:
   .nb-*, .sb-*, .sc-*, .av, .ls-*, .cm-*
   Esto evita que cada instancia inyecte un bloque <style> duplicado.
============================================================ */


/* ══════════════════════════════════════════════════════════════
   <app-navbar>
══════════════════════════════════════════════════════════════ */
class AppNavbar extends HTMLElement {
    connectedCallback() {
        const title = this.getAttribute('title') || 'PANEL';
        const usuarioPortal = JSON.parse(sessionStorage.getItem('portalUser') || '{}');
        const correo = usuarioPortal.correo || 'usuario@universidad.edu.co';
        const inicial = (correo.charAt(0) || 'U').toUpperCase();

        this.style.display = 'block';
        this.innerHTML = `
            <div class="nb-wrap">
                <div class="nb-title">
                    <img src="../assets/img/logo-cul.jpg" alt="Logo" class="nb-logo">
                    <div class="nb-separator"></div>
                    <div class="nb-breadcrumb">
                        <span class="nb-crumb-root">Panel</span>
                        <span class="nb-crumb-sep">/</span>
                        <span class="nb-crumb-current" id="topbar-section-name">${title}</span>
                    </div>
                </div>
                <div class="nb-right">
                    <div class="nb-search">
                        <span class="nb-search-icon">🔍</span>
                        <input type="text" placeholder="Buscar...">
                    </div>
                    <button class="nb-notif-btn" id="nb-refresh-btn" title="Actualizar datos">⟳</button>
                    <div class="nb-user-pill">
                        <div class="nb-user-av">${inicial}</div>
                        <span class="nb-user-email" id="topbar-user">${correo}</span>
                    </div>
                    <button class="nb-btn nb-btn--danger" id="nb-logout-btn">Salir</button>
                </div>
            </div>
        `;

        this.querySelector('#nb-refresh-btn').addEventListener('click', () => {
            if (typeof refreshAll === 'function') refreshAll();
        });

        this.querySelector('#nb-logout-btn').addEventListener('click', () => {
            if (typeof doLogout === 'function') doLogout();
            else { sessionStorage.clear(); window.location.href = '../index.html'; }
        });
    }
}
customElements.define('app-navbar', AppNavbar);


/* ══════════════════════════════════════════════════════════════
   <app-sidebar>
══════════════════════════════════════════════════════════════ */
class AppSidebar extends HTMLElement {
    connectedCallback() {
        const rol = this.getAttribute('rol') || 'admin';
        const seccionActiva = this.getAttribute('seccion') || 'overview';
        const usuarioPortal = JSON.parse(sessionStorage.getItem('portalUser') || '{}');
        const nombre = (usuarioPortal.nombre || usuarioPortal.correo || 'U').split(' ')[0];
        const avatarInicial = nombre.charAt(0).toUpperCase();

        const navAdmin = [
            { id: 'overview', icon: '◈', label: 'Overview', badge: null },
            { id: 'analitica', icon: '📊', label: 'Analítica', badge: null },
        ];
        const navCrud = [
            { id: 'usuarios', icon: '👤', label: 'Usuarios', badge: 'badge-usuarios' },
            { id: 'roles', icon: '🏷️', label: 'Roles', badge: 'badge-roles' },
            { id: 'solicitudes', icon: '📋', label: 'Solicitudes', badge: 'badge-solicitudes' },
            { id: 'tipos', icon: '🔖', label: 'Tipos', badge: 'badge-tipos' },
            { id: 'documentos', icon: '📁', label: 'Documentos', badge: null },
            { id: 'revisiones', icon: '✅', label: 'Revisiones', badge: null },
            { id: 'reportes', icon: '📊', label: 'Reportes', badge: null },
        ];
        const navFuncionario = [
            { id: 'overview', icon: '◈', label: 'Overview', badge: null },
            { id: 'solicitudes', icon: '📋', label: 'Solicitudes', badge: 'badge-solicitudes' },
        ];
        const navCoordinador = [
            { id: 'overview', icon: '◈', label: 'Overview', badge: null },
            { id: 'solicitudes', icon: '📋', label: 'Aprobaciones', badge: 'badge-solicitudes' },
        ];

        const rolConfig = {
            admin: { label: 'Administrador', colorVar: 'var(--danger)', nav1: navAdmin, nav2: navCrud },
            funcionario: { label: 'Funcionario', colorVar: 'var(--success)', nav1: navFuncionario, nav2: [] },
            coordinador: { label: 'Coordinador', colorVar: 'var(--purple)', nav1: navCoordinador, nav2: [] },
        };
        const cfg = rolConfig[rol] || rolConfig.admin;

        const buildNavItem = (item) => {
            const isActive = item.id === seccionActiva;
            const badgeHtml = item.badge
                ? `<span id="${item.badge}" class="sb-badge">–</span>`
                : '';
            return `
                <a href="#" class="sb-item${isActive ? ' active' : ''}" data-section="${item.id}">
                    <span class="sb-icon">${item.icon}</span>
                    <span class="sb-label">${item.label}</span>
                    ${badgeHtml}
                </a>
            `;
        };

        const nav1Html = cfg.nav1.map(buildNavItem).join('');
        const nav2Html = cfg.nav2.length
            ? `<div class="sb-section-label">Gestión CRUD</div>${cfg.nav2.map(buildNavItem).join('')}`
            : '';

        this.style.display = 'block';
        this.innerHTML = `
            <div class="sb-wrap">
                <div class="sb-brand">
                    <img src="../assets/img/logo-cul.jpg" alt="Logo Universidad" class="sb-brand-logo">
                    <div class="sb-brand-text">
                        <span class="sb-brand-name">Admin Panel</span>
                        <span class="sb-brand-sub">Solicitudes Académicas</span>
                    </div>
                </div>
                <div class="sb-user">
                    <div class="sb-avatar">${avatarInicial}</div>
                    <div class="sb-user-info">
                        <div class="sb-user-name">${nombre}</div>
                        <span class="sb-rol-pill" style="color:${cfg.colorVar};background:color-mix(in srgb,${cfg.colorVar} 12%,transparent)">
                            ${cfg.label}
                        </span>
                    </div>
                </div>
                <nav class="sb-nav">
                    <div class="sb-section-label">Dashboard</div>
                    ${nav1Html}
                    ${nav2Html}
                </nav>
                <div class="sb-bottom">
                    <a href="#" class="sb-bottom-item">
                        <span>⚙️</span><span>Configuración</span>
                    </a>
                    <a href="#" class="sb-bottom-item danger" id="sb-logout-bottom">
                        <span>⬡</span><span>Cerrar sesión</span>
                    </a>
                </div>
            </div>
        `;

        // Navegación
        this.querySelectorAll('.sb-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const seccion = item.getAttribute('data-section');
                if (!seccion) return;

                this.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                if (typeof showSection === 'function') showSection(seccion, item);
            });
        });

        // Logout bottom
        const logoutBottom = this.querySelector('#sb-logout-bottom');
        if (logoutBottom) {
            logoutBottom.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof doLogout === 'function') doLogout();
                else { sessionStorage.clear(); window.location.href = '../index.html'; }
            });
        }
    }
}
customElements.define('app-sidebar', AppSidebar);


/* ══════════════════════════════════════════════════════════════
   <estado-badge>
══════════════════════════════════════════════════════════════ */
class EstadoBadge extends HTMLElement {
    static get observedAttributes() { return ['valor']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }

    render() {
        const valor = this.getAttribute('valor') || '';
        // Las clases badge-* están definidas en global.css
        this.innerHTML = `<span class="badge badge-${valor || 'cancelada'}">${valor || '–'}</span>`;
    }
}
customElements.define('estado-badge', EstadoBadge);


/* ══════════════════════════════════════════════════════════════
   <prioridad-pill>
══════════════════════════════════════════════════════════════ */
class PrioBadge extends HTMLElement {
    static get observedAttributes() { return ['valor']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }

    render() {
        const valor = this.getAttribute('valor') || '';
        // Las clases prio-* están definidas en global.css
        this.innerHTML = `<span class="badge-prio prio-${valor || 'baja'}">${valor || '–'}</span>`;
    }
}
customElements.define('prioridad-pill', PrioBadge);


/* ══════════════════════════════════════════════════════════════
   <solicitud-card>  — Panel estudiante
   PASO 9: estilos movidos a estudiante.css bajo .sc-*
══════════════════════════════════════════════════════════════ */
class SolicitudCard extends HTMLElement {
    connectedCallback() { this.render(); }

    set datos(valor) { this._datos = valor; this.render(); }
    get datos() { return this._datos; }

    render() {
        const sol = this._datos;
        if (!sol) return;

        const estado = sol.estado_actual || 'pendiente';
        const estadoClass = sanitizarClase(estado);
        const prio = sol.prioridad || 'baja';

        const tipoIconos = {
            'Homologación': '📚',
            'Validación': '✔',
            'Cancelación': '✕',
            'Certificado': '📄',
            'Reintegro': '🔄',
            'Transferencia': '➡',
            'Recurso': '📋',
            'Reserva de cupo': '🔖',
            'Paz y salvo': '📑',
            'Doble titulación': '🎓'
        };

        const icono = tipoIconos[sol.tipo] || '📋';

        const iconBgMap = {
            'Homologación': 'var(--amber-bg)',
            'Validación': 'var(--blue-bg)'
        };

        this.innerHTML = `
            <div class="req-card st-${estadoClass}" data-status="${estadoClass}">
                <div class="req-card-inner">

                    <div class="req-card-top">
                        <div class="req-left">

                            <div class="req-type-icon" style="background:${iconBgMap[sol.tipo] || 'var(--surface-2)'}">
                                ${icono}
                            </div>

                            <div>
                                <div class="req-title">${sol.tipo || 'Sin tipo'}</div>
                                <div class="req-desc">${sol.descripcion || 'Sin descripción'}</div>
                            </div>

                        </div>

                        <span class="req-status-badge status-${estadoClass}">
                            ${estado.toUpperCase()}
                        </span>
                    </div>

                </div>

                <div class="req-card-footer">

                    <div class="req-meta">
                        <div class="req-meta-item">
                            📅 <strong>${this._formatFecha(sol.fecha_creacion)}</strong>
                        </div>

                        <span class="priority priority-${prio}">
                            ${prio.toUpperCase()}
                        </span>
                    </div>

                    <div class="req-actions">
                        <button class="btn btn-outline btn-sm sc-btn-view">
                            👁 Ver detalle
                        </button>

                        <button class="btn btn-danger btn-sm sc-btn-delete">
                            ✕ Eliminar
                        </button>
                    </div>

                </div>
            </div>
        `;

        // EVENTOS (mantener)
        this.querySelector('.sc-btn-view').onclick = () =>
            this.dispatchEvent(new CustomEvent('ver-detalle', { bubbles: true, detail: sol }));

        this.querySelector('.sc-btn-delete').onclick = () =>
            this.dispatchEvent(new CustomEvent('eliminar-sol', { bubbles: true, detail: sol }));
    }

    _formatFecha(fecha) {
        if (!fecha) return '–';
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }
}
customElements.define('solicitud-card', SolicitudCard);


/* ══════════════════════════════════════════════════════════════
   <rol-badge>
══════════════════════════════════════════════════════════════ */
class RolBadge extends HTMLElement {
    static get observedAttributes() { return ['valor']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }

    render() {
        const valor = this.getAttribute('valor') || '';
        // Clase .badge-rol definida en global.css
        this.innerHTML = `<span class="badge-rol rol-${valor || 'otro'}">${valor || '–'}</span>`;
    }
}
customElements.define('rol-badge', RolBadge);


/* ══════════════════════════════════════════════════════════════
   <user-avatar>
══════════════════════════════════════════════════════════════ */
class UserAvatar extends HTMLElement {
    connectedCallback() {
        const nombre = this.getAttribute('nombre') || 'U';
        const inicial = nombre.charAt(0).toUpperCase();
        // Clase .av definida en global.css
        this.innerHTML = `<div class="av">${inicial}</div>`;
    }
}
customElements.define('user-avatar', UserAvatar);


/* ══════════════════════════════════════════════════════════════
   <fecha-formateada>
══════════════════════════════════════════════════════════════ */
class FechaFormateada extends HTMLElement {
    static get observedAttributes() { return ['valor']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }

    render() {
        const valor = this.getAttribute('valor');
        const txt = valor
            ? new Date(valor).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
            : '–';
        this.innerHTML = `<span class="fecha-txt">${txt}</span>`;
    }
}
customElements.define('fecha-formateada', FechaFormateada);


/* ══════════════════════════════════════════════════════════════
   <action-button>
══════════════════════════════════════════════════════════════ */
class ActionButton extends HTMLElement {
    connectedCallback() {
        const tipo = this.getAttribute('tipo') || 'json';
        const label = this.getAttribute('label') || '';
        const iconos = { edit: '✎', json: '👁 Ver', delete: '✕', estado: '✎' };
        // Clases btn-sm.* definidas en global.css
        const claseVariante = { edit: 'yellow', json: 'blue', delete: 'red', estado: 'yellow' };

        this.innerHTML = `
            <button class="btn-sm ${claseVariante[tipo] || 'blue'}">
                ${iconos[tipo] || '👁 Ver'} ${label}
            </button>
        `;
    }
}
customElements.define('action-button', ActionButton);


/* ══════════════════════════════════════════════════════════════
   <loading-spinner>
══════════════════════════════════════════════════════════════ */
class LoadingSpinner extends HTMLElement {
    connectedCallback() {
        // Clases .ls-* definidas en global.css
        this.innerHTML = `
            <div class="ls-wrap">
                <div class="ls-ring"></div>
                Cargando datos...
            </div>
        `;
    }
}
customElements.define('loading-spinner', LoadingSpinner);


/* ══════════════════════════════════════════════════════════════
   <confirm-modal>
══════════════════════════════════════════════════════════════ */
class ConfirmModal extends HTMLElement {
    connectedCallback() {
        // Clases .cm-* definidas en global.css
        this.innerHTML = `
            <div class="cm-overlay" id="cm-overlay">
                <div class="cm-box">
                    <div class="cm-icon">⚠️</div>
                    <div class="cm-title">¿Confirmar eliminación?</div>
                    <div class="cm-msg" id="cm-msg">Esta acción no se puede deshacer.</div>
                    <div class="cm-btns">
                        <button class="cm-cancel" id="cm-cancel">Cancelar</button>
                        <button class="cm-ok"     id="cm-ok">✕ Eliminar</button>
                    </div>
                </div>
            </div>
        `;
        this.querySelector('#cm-cancel').onclick = () => this.hide();
    }

    show(message, onConfirm) {
        this.querySelector('#cm-msg').textContent = message;
        this.querySelector('#cm-ok').onclick = async () => { await onConfirm(); this.hide(); };
        this.querySelector('#cm-overlay').classList.add('show');
    }

    hide() {
        this.querySelector('#cm-overlay').classList.remove('show');
    }
}
customElements.define('confirm-modal', ConfirmModal);