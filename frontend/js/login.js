// ══════════════════════════════════════════════════════════════
//  LOGIN — Autenticación con correo y contraseña via /auth/login
//  El rol viene del backend (JWT), NO se selecciona en el frontend.
// ══════════════════════════════════════════════════════════════

function getRoleIconSVG(rol) {
    switch (rol) {
        case 'admin':
            return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0D1B3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
        case 'estudiante':
            return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0D1B3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"></path><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"></path></svg>`;
        case 'coordinador':
            return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0D1B3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`;
        case 'funcionario':
            return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0D1B3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18"></path><path d="M5 10v10"></path><path d="M19 10v10"></path><path d="M9 10v10"></path><path d="M15 10v10"></path><path d="M2 10l10-6 10 6"></path></svg>`;
        default:
            return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0D1B3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    }
}

async function iniciarSesion() {
    const correo = document.getElementById('f-correo').value.trim();
    const contrasena = document.getElementById('f-contrasena').value;
    const error = document.getElementById('error-login');
    const textoError = document.getElementById('texto-error-login');
    const btnTexto = document.getElementById('btn-login-texto');
    const btnSpinner = document.getElementById('btn-login-spinner');
    const btnLogin = document.getElementById('btn-login');

    if (!correo || !contrasena) {
        textoError.textContent = 'Completa todos los campos';
        error.classList.add('visible');
        return;
    }

    if (!correo.includes('@')) {
        textoError.textContent = 'Ingresa un correo válido';
        error.classList.add('visible');
        return;
    }

    error.classList.remove('visible');
    btnTexto.textContent = 'Ingresando...';
    btnSpinner.style.display = 'inline-block';
    btnLogin.disabled = true;

    try {
        const respuesta = await fetch(`${DIRECCION_API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasena })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            textoError.textContent = datos.detail || `Error ${respuesta.status}`;
            error.classList.add('visible');
            restaurarBoton();
            return;
        }

        sessionStorage.setItem('token', datos.access_token);
        sessionStorage.setItem('portalUser', JSON.stringify({
            nombre: datos.nombre,
            apellido: datos.apellido,
            rol: datos.rol,
            correo: datos.correo,
            id_usuario: datos.id_usuario
        }));

        mostrarRedireccion(datos);

    } catch (err) {
        textoError.textContent = err.message || 'Error de conexión con el servidor';
        error.classList.add('visible');
        restaurarBoton();
    }
}

function restaurarBoton() {
    document.getElementById('btn-login-texto').textContent = 'Ingresar';
    document.getElementById('btn-login-spinner').style.display = 'none';
    document.getElementById('btn-login').disabled = false;
}

const rutasPorRol = {
    estudiante: 'estudiante.html',
    admin: 'admin-panel.html',
    funcionario: 'funcionario.html',
    coordinador: 'coordinador.html'
};

const subtextoPorRol = {
    estudiante: 'Cargando módulo estudiante...',
    admin: 'Cargando panel de administración...',
    funcionario: 'Cargando panel de funcionario...',
    coordinador: 'Cargando panel de coordinador...'
};

function mostrarRedireccion(datos) {
    document.getElementById('formulario-login').style.display = 'none';
    document.getElementById('pantalla-exito').style.display = 'block';

    document.getElementById('icono-redireccion').innerHTML = getRoleIconSVG(datos.rol);
    document.getElementById('texto-redireccion').textContent = `Bienvenido/a, ${datos.nombre}`;
    document.getElementById('subtexto-redireccion').textContent = subtextoPorRol[datos.rol] || '// Cargando...';

    setTimeout(() => {
        document.getElementById('relleno-barra').style.width = '100%';
    }, 100);

    setTimeout(() => {
        window.location.href = rutasPorRol[datos.rol] || 'admin-panel.html';
    }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-toggle-password').addEventListener('click', function () {
        const campo = document.getElementById('f-contrasena');
        const icono = document.getElementById('icono-ojo');
        if (campo.type === 'password') {
            campo.type = 'text';
            icono.textContent = '🙈';
        } else {
            campo.type = 'password';
            icono.textContent = '👁';
        }
    });
});

document.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Enter') return;
    const formulario = document.getElementById('formulario-login');
    if (formulario && formulario.style.display !== 'none') {
        iniciarSesion();
    }
});
