// ══════════════════════════════════════════════════════════════
//  LOGIN — Autenticación con correo y contraseña via /auth/login
//  El rol viene del backend (JWT), NO se selecciona en el frontend.
// ══════════════════════════════════════════════════════════════

const iconosPorRol = {
    estudiante: '🎓',
    admin: '⚡',
    funcionario: '🏛️',
    coordinador: '📋'
};

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
    estudiante: 'html/estudiante.html',
    admin: 'html/admin-panel.html',
    funcionario: 'html/funcionario.html',
    coordinador: 'html/coordinador.html'
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

    document.getElementById('icono-redireccion').textContent = iconosPorRol[datos.rol] || '✅';
    document.getElementById('texto-redireccion').textContent = `Bienvenido/a, ${datos.nombre}`;
    document.getElementById('subtexto-redireccion').textContent = subtextoPorRol[datos.rol] || '// Cargando...';

    setTimeout(() => {
        document.getElementById('relleno-barra').style.width = '100%';
    }, 100);

    setTimeout(() => {
        window.location.href = rutasPorRol[datos.rol] || 'html/admin-panel.html';
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