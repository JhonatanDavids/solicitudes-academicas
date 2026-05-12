# Sistema de Correos Electrónicos y Generación de PDFs — CUL

**Proyecto:** Sistema de Solicitudes Académicas — Corporación Universitaria Latinoamericana
**Fecha:** Mayo 2026
**Versión:** 1.0

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Arquitectura General](#2-arquitectura-general)
3. [Sistema de Correos Electrónicos](#3-sistema-de-correos-electrónicos)
4. [Evolución del Proveedor de Correo](#4-evolución-del-proveedor-de-correo)
5. [Librerías y Dependencias](#5-librerías-y-dependencias)
6. [Protocolo SMTP y Configuración](#6-protocolo-smtp-y-configuración)
7. [Templates Jinja2 — Correos](#7-templates-jinja2--correos)
8. [Generación de PDFs](#8-generación-de-pdfs)
9. [WeasyPrint — Motor de Renderizado](#9-weasyprint--motor-de-renderizado)
10. [Dispatch por Tipo de Documento](#10-dispatch-por-tipo-de-documento)
11. [Certificados Institucionales](#11-certificados-institucionales)
12. [Flujo Completo del Sistema](#12-flujo-completo-del-sistema)
13. [Seguridad y Diseño Defensivo](#13-seguridad-y-diseño-defensivo)
14. [Conclusiones](#14-conclusiones)

---

## 1. Introducción

El **Sistema de Solicitudes Académicas** de la Corporación Universitaria Latinoamericana (CUL) es una plataforma web que permite a estudiantes, funcionarios, coordinadores y administradores gestionar trámites académicos de forma digital. Dos subsistemas son críticos para la operación del sistema:

1. **Sistema de Correos Electrónicos:** Notificaciones automáticas a estudiantes y funcionarios sobre el estado de las solicitudes (creación, aprobación, rechazo).
2. **Generación de PDFs:** Producción de documentos institucionales (certificados de estudio, récords académicos) a partir de datos reales de la base de datos.

Este documento describe la arquitectura, implementación y evolución de ambos subsistemas con base en el código fuente real del proyecto.

---

## 2. Arquitectura General

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (HTML/CSS/JS)                       │
│  login.html │ dashboard.html │ solicitudes.html │ admin.html        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP/JSON + JWT
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI)                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Routes     │  │ Controllers  │  │       Services           │  │
│  │              │  │              │  │                          │  │
│  │ solicitudes_ │  │ solicitudes_ │  │ email_service.py         │  │
│  │ routes.py    │──│ controller.py│──│ document_generator.py    │  │
│  │ usuarios_    │  │ usuarios_    │  │                          │  │
│  │ routes.py    │  │ controller.py│  │                          │  │
│  │ auth_routes  │  │ auth_        │  │                          │  │
│  │ .py          │  │ controller.py│  │                          │  │
│  └──────────────┘  └──────────────┘  └────────┬─────────────────┘  │
│                                                │                    │
└────────────────────────────────────────────────┼────────────────────┘
                                                 │
                    ┌────────────────────────────┼──────────────────┐
                    │                            │                  │
                    ▼                            ▼                  ▼
          ┌─────────────────┐       ┌──────────────────┐  ┌───────────────┐
          │  PostgreSQL     │       │  WeasyPrint      │  │  Brevo SMTP   │
          │  (Neon DB)      │       │  (HTML → PDF)    │  │  (STARTTLS)   │
          │                 │       │                  │  │               │
          │  usuarios       │       │  Jinja2 templates│  │  smtp-relay   │
          │  solicitudes    │       │  CSS institucional│  │  .brevo.com   │
          │  documentos     │       │  Logo base64     │  │               │
          │  respuestas     │       │                  │  │               │
          │  historial_     │       └──────────────────┘  └───────────────┘
          │  estados        │
          └─────────────────┘
```

### 2.2 Capas del Backend

El backend sigue una arquitectura de tres capas:

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| **Routes** | `app/routes/` | Endpoints HTTP, validación de roles JWT, despacho a controllers |
| **Controllers** | `app/controllers/` | Lógica de negocio, consultas SQL, transacciones |
| **Services** | `app/services/` | Funciones transversales (correo, PDFs) independientes de la lógica de negocio |

### 2.3 Flujo de Datos

```
Cliente → Route (valida JWT) → Controller (SQL) → Service (correo/PDF) → Externo (SMTP/WeasyPrint)
```

---

## 3. Sistema de Correos Electrónicos

### 3.1 Archivo Principal

**Ruta:** `app/services/email_service.py`

El servicio de correo es un módulo Python que encapsula toda la lógica de envío de notificaciones. Utiliza la librería estándar `smtplib` combinada con `jinja2` para el renderizado de templates HTML.

### 3.2 Estructura del Módulo

```
email_service.py
├── Configuración SMTP
│   ├── _get_smtp_config()        → Lee variables de entorno
│   └── _esta_configurado()       → Valida credenciales
│
├── Función Base
│   └── _enviar_correo()          → Envío SMTP con adjuntos
│
├── Notificaciones Públicas
│   ├── notificar_solicitud_aprobada()
│   ├── notificar_solicitud_rechazada()
│   ├── notificar_nueva_solicitud()
│   └── notificar_usuario_creado()
│
└── Helper Unificado
    └── notificar_cambio_estado_solicitud()
        ├── Consulta BD (estudiante + tipo)
        ├── Genera PDF si es aprobada
        ├── Registra documento en BD
        └── Envía correo correspondiente
```

### 3.3 Configuración SMTP

```python
def _get_smtp_config() -> dict:
    return {
        "host": os.getenv("SMTP_HOST", "smtp-relay.brevo.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_email": os.getenv("SMTP_FROM_EMAIL", ""),
        "from_name": os.getenv("SMTP_FROM_NAME", "Sistema de Solicitudes Académicas CUL"),
    }
```

Las credenciales se leen exclusivamente de variables de entorno. Los valores por defecto apuntan a Brevo SMTP pero sin credenciales válidas, lo que hace que el sistema omita el envío silenciosamente.

### 3.4 Función Base de Envío

```python
def _enviar_correo(
    destinatario: str,
    asunto: str,
    html: str,
    adjuntos: Optional[list] = None,
):
```

**Características:**

- Usa `MIMEMultipart` para construir el correo con cabeceras `From`, `To`, `Subject`.
- Adjunta el cuerpo HTML con `MIMEText(html, "html", "utf-8")`.
- Soporta adjuntos binarios mediante `MIMEApplication`.
- Conexión vía `smtplib.SMTP` con `starttls()` (STARTTLS en puerto 587).
- Timeout de 30 segundos para evitar bloqueos prolongados.
- Si SMTP no está configurado, registra un warning y retorna sin error.
- Si la conexión falla, registra el error y retorna sin propagar la excepción.

### 3.5 Notificaciones Implementadas

#### 3.5.1 `notificar_solicitud_aprobada()`

**Disparador:** Coordinador aprueba una solicitud.

**Parámetros:**
- `correo_estudiante`: Email del estudiante solicitante.
- `nombre_estudiante`: Nombre completo.
- `id_solicitud`: ID numérico de la solicitud.
- `tipo_solicitud`: Nombre del tipo (ej. "Certificado de Estudio").
- `pdf_path`: Ruta al PDF generado (opcional).

**Comportamiento:**
1. Renderiza el template `solicitud_aprobada.html`.
2. Si `pdf_path` existe y es un archivo válido, lo adjunta al correo.
3. Asunto: `Solicitud #{id} Aprobada — CUL`.

#### 3.5.2 `notificar_solicitud_rechazada()`

**Disparador:** Coordinador rechaza una solicitud.

**Parámetros:**
- `correo_estudiante`, `nombre_estudiante`, `id_solicitud`, `tipo_solicitud` (igual que arriba).
- `motivo`: Razón del rechazo (obligatoria en el route, con fallback por defecto).

**Comportamiento:**
1. Renderiza el template `solicitud_rechazada.html`.
2. Incluye el motivo del rechazo en un bloque destacado.
3. Asunto: `Solicitud #{id} Rechazada — CUL`.

#### 3.5.3 `notificar_nueva_solicitud()`

**Disparador:** Estudiante crea una nueva solicitud.

**Comportamiento:**
1. Consulta la base de datos para obtener los correos de todos los funcionarios activos:
   ```sql
   SELECT u.correo FROM usuarios u
   JOIN roles r ON u.id_rol = r.id_rol
   WHERE LOWER(r.nombre_rol) = 'funcionario' AND u.estado = 'activo'
   ```
2. Renderiza el template `nueva_solicitud.html`.
3. Envía un correo individual a cada funcionario.
4. Asunto: `Nueva solicitud #{id} pendiente — CUL`.

#### 3.5.4 `notificar_usuario_creado()`

**Disparador:** Administrador crea un nuevo usuario.

**Parámetros:**
- `correo_usuario`, `nombre`, `apellido`, `rol`.

**Comportamiento:**
1. Renderiza el template `usuario_creado.html`.
2. Informa al usuario su rol asignado.
3. Asunto: `Bienvenido al Sistema Académico — CUL`.

### 3.6 Helper Unificado: `notificar_cambio_estado_solicitud()`

Esta función es el punto de integración principal entre el controller de solicitudes y el servicio de correo. Se invoca desde `SolicitudController.update_estado()`.

**Flujo interno:**

```
notificar_cambio_estado_solicitud(id, estado, comentario)
    │
    ├── Si estado NO es 'aprobada' ni 'rechazada' → retorna inmediatamente
    │
    ├── Consulta BD: correo, nombre, apellido, tipo_solicitud
    │
    ├── Si estado == 'aprobada':
    │   ├── Genera PDF vía generar_certificado_desde_solicitud()
    │   ├── Registra documento en tabla 'documentos':
    │   │   INSERT INTO documentos (id_solicitud, nombre_archivo, tipo_archivo, ruta_archivo)
    │   └── Llama notificar_solicitud_aprobada(con PDF adjunto)
    │
    └── Si estado == 'rechazada':
        └── Llama notificar_solicitud_rechazada(con motivo)
```

**Integración con el Controller:**

```python
# app/controllers/solicitudes_controller.py — update_estado()
# Después de commit exitoso:
try:
    from app.services.email_service import notificar_cambio_estado_solicitud
    notificar_cambio_estado_solicitud(id_solicitud, nuevo_estado, comentario)
except Exception:
    pass  # El correo no debe bloquear la operación principal
```

---

## 4. Evolución del Proveedor de Correo

El sistema ha pasado por tres proveedores de correo electrónico durante su desarrollo:

### 4.1 Fase 1: Gmail SMTP (Desarrollo Inicial)

- **Proveedor:** SMTP de Gmail (`smtp.gmail.com`, puerto 587).
- **Limitaciones:**
  - Requiere "App Passwords" desde que Google eliminó el acceso de apps menos seguras.
  - Límite de envío: ~500 correos/día para cuentas personales.
  - Riesgo de bloqueo de cuenta si se detecta actividad automatizada.
- **Uso:** Pruebas locales y desarrollo temprano.

### 4.2 Fase 2: Resend API (Transición)

- **Proveedor:** Resend (`resend.com`) vía API REST.
- **Ventajas:**
  - API moderna con SDK Python (`resend`).
  - 100 correos/día gratuitos.
  - Mejor deliverability que Gmail.
- **Limitaciones:**
  - Requiere dependencia externa adicional (`pip install resend`).
  - Sandbox domain limitado (solo envía a emails verificados).
  - Dependencia de conexión HTTP externa.
- **Uso:** Pruebas en entorno de staging.

### 4.3 Fase 3: Brevo SMTP (Producción Actual)

- **Proveedor:** Brevo (`smtp-relay.brevo.com`, puerto 587).
- **Ventajas:**
  - **Cero dependencias externas:** usa `smtplib` de la librería estándar de Python.
  - 300 correos/día gratuitos (plan Forever Free).
  - No requiere dominio verificado para pruebas iniciales.
  - STARTTLS con autenticación por credenciales.
  - Compatible con la misma estructura de código que Gmail SMTP (solo cambian las credenciales).
- **Configuración actual:**
  ```env
  SMTP_HOST=smtp-relay.brevo.com
  SMTP_PORT=587
  SMTP_USER=<brevo_smtp_login>
  SMTP_PASSWORD=<brevo_api_key>
  SMTP_FROM_EMAIL=<verified_sender@domain.com>
  SMTP_FROM_NAME=Sistema de Solicitudes Académicas CUL
  ```

### 4.4 Comparativa de Proveedores

| Característica | Gmail SMTP | Resend API | Brevo SMTP |
|---|---|---|---|
| **Dependencias** | `smtplib` (stdlib) | `resend` (pip) | `smtplib` (stdlib) |
| **Límite gratuito** | ~500/día | 100/día | 300/día |
| **Dominio requerido** | Cuenta Gmail | Sandbox → verificado | Verificado recomendado |
| **Protocolo** | SMTP | REST API | SMTP |
| **Complejidad de migración** | — | Media (cambio de librería) | Baja (solo credenciales) |
| **Estado en el proyecto** | Eliminado | Eliminado | **Activo** |

---

## 5. Librerías y Dependencias

### 5.1 Librerías del Sistema de Correo

| Librería | Versión | Uso |
|---|---|---|
| `smtplib` | Python stdlib | Conexión SMTP y envío de correos |
| `email.mime.*` | Python stdlib | Construcción de mensajes MIME (multipart, HTML, adjuntos) |
| `jinja2` | 3.1.6 | Renderizado de templates HTML para correos |
| `logging` | Python stdlib | Registro de eventos y errores |
| `pathlib` | Python stdlib | Manejo de rutas de archivos y templates |

### 5.2 Librerías del Sistema de PDF

| Librería | Versión | Uso |
|---|---|---|
| `weasyprint` | >= 61.0 | Motor de renderizado HTML/CSS → PDF |
| `jinja2` | 3.1.6 | Renderizado de templates HTML para documentos |
| `Pillow` | >= 10.0 | Procesamiento del logo institucional (resize, conversión a base64) |
| `base64` | Python stdlib | Codificación del logo para incrustación en HTML |
| `uuid` | Python stdlib | Generación de códigos de verificación únicos |

### 5.3 Dependencias del Proyecto (relevantes)

```
fastapi==0.132.0
python-jose[cryptography]==3.3.0
psycopg2-binary==2.9.11
jinja2==3.1.6
weasyprint>=61.0
pillow>=10.0
bcrypt==3.2.0
python-dotenv==1.2.1
```

---

## 6. Protocolo SMTP y Configuración

### 6.1 Flujo de Conexión

```
1. Crear conexión TCP al host:puerto (smtp-relay.brevo.com:587)
2. Negociar STARTTLS (upgrade a conexión cifrada TLS)
3. Autenticar con LOGIN (user + password)
4. Enviar mensaje MIME (From, To, Subject, Body HTML, Adjuntos)
5. Cerrar conexión
```

### 6.2 Implementación en Código

```python
with smtplib.SMTP(cfg["host"], cfg["port"], timeout=30) as server:
    server.starttls()                          # Paso 2: Cifrado
    server.login(cfg["user"], cfg["password"]) # Paso 3: Autenticación
    server.send_message(msg)                   # Paso 4: Envío
```

### 6.3 Variables de Entorno

Archivo: `app/.env`

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu_login_smtp
SMTP_PASSWORD=tu_api_key_brevo
SMTP_FROM_EMAIL=notificaciones@tudominio.com
SMTP_FROM_NAME=Sistema de Solicitudes Académicas CUL
```

### 6.4 Validación de Configuración

```python
def _esta_configurado() -> bool:
    cfg = _get_smtp_config()
    return bool(cfg["user"] and cfg["password"] and cfg["from_email"])
```

Si esta función retorna `False`, todos los envíos se omiten silenciosamente con un log de advertencia. Esto permite que el sistema funcione en desarrollo sin un servidor SMTP configurado.

---

## 7. Templates Jinja2 — Correos

### 7.1 Estructura de Directorios

```
app/templates/emails/
├── base_email.html           # Layout base (header, footer, estilos inline)
├── solicitud_aprobada.html   # Notificación de aprobación
├── solicitud_rechazada.html  # Notificación de rechazo
├── nueva_solicitud.html      # Alerta a funcionarios
└── usuario_creado.html       # Bienvenida a nuevos usuarios
```

### 7.2 Template Base: `base_email.html`

El template base define la estructura visual común de todos los correos:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" ...>
    <!-- HEADER: Fondo azul institucional #1a3c6e -->
    <tr>
      <td style="background-color:#1a3c6e; padding:24px 32px; text-align:center;">
        <h1>🎓 Sistema Académico — CUL</h1>
        <p>Corporación Universitaria Latinoamericana</p>
      </td>
    </tr>

    <!-- CONTENT: Bloque Jinja2 -->
    <tr>
      <td style="padding:32px;">
        {% block content %}{% endblock %}
      </td>
    </tr>

    <!-- FOOTER: Texto legal institucional -->
    <tr>
      <td style="background-color:#f8f9fa; padding:20px 32px; border-top:1px solid #e9ecef;">
        <p>Correo automático del Sistema de Gestión de Solicitudes Académicas.</p>
        <p>CUL — Barranquilla, Colombia</p>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Características del diseño:**

- **Tabla-based layout:** Compatible con clientes de correo que no soportan CSS moderno (Outlook, Gmail web).
- **Estilos inline:** Todos los estilos están directamente en los atributos `style` para máxima compatibilidad.
- **Ancho fijo de 600px:** Estándar de la industria para emails responsivos.
- **Header institucional:** Color `#1a3c6e` (azul CUL) con texto blanco.
- **Footer legal:** Aviso de correo automático + ubicación institucional.

### 7.3 Template: `solicitud_aprobada.html`

```jinja2
{% extends "base_email.html" %}
{% block content %}
<h2 style="color:#2b8a3e;">✅ ¡Solicitud Aprobada!</h2>
<p>Hola <strong>{{ nombre }}</strong>,</p>
<p>Tu solicitud ha sido <strong style="color:#2b8a3e;">aprobada</strong>.</p>

<!-- Tabla de datos -->
<table ...>
  <tr><td>N.° Solicitud:</td><td>#{{ id_solicitud }}</td></tr>
  <tr><td>Tipo:</td><td>{{ tipo }}</td></tr>
  <tr><td>Estado:</td><td><span style="background:#2b8a3e;">APROBADA</span></td></tr>
</table>

{% if tiene_pdf %}
<p>📎 <strong>Se adjunta tu certificado en formato PDF.</strong></p>
{% endif %}
{% endblock %}
```

**Variables Jinja2:**
- `nombre`: Nombre del estudiante.
- `id_solicitud`: ID numérico.
- `tipo`: Tipo de solicitud (ej. "Certificado de Estudio").
- `tiene_pdf`: Booleano que controla la visualización del aviso de adjunto.

### 7.4 Template: `solicitud_rechazada.html`

```jinja2
{% extends "base_email.html" %}
{% block content %}
<h2 style="color:#c92a2a;">❌ Solicitud Rechazada</h2>
<p>Hola <strong>{{ nombre }}</strong>,</p>
<p>Tu solicitud ha sido <strong style="color:#c92a2a;">rechazada</strong>.</p>

<!-- Tabla de datos con fondo rojo claro -->
<table style="background-color:#fff5f5;">
  <tr><td>N.° Solicitud:</td><td>#{{ id_solicitud }}</td></tr>
  <tr><td>Tipo:</td><td>{{ tipo }}</td></tr>
  <tr><td>Estado:</td><td><span style="background:#c92a2a;">RECHAZADA</span></td></tr>
</table>

<!-- Motivo del rechazo con borde lateral rojo -->
<table style="border-left:4px solid #c92a2a;">
  <p><strong>Motivo del rechazo</strong></p>
  <p>{{ motivo }}</p>
</table>
{% endblock %}
```

**Variables Jinja2:**
- `nombre`, `id_solicitud`, `tipo`: Igual que aprobación.
- `motivo`: Texto explicativo del rechazo.

### 7.5 Template: `nueva_solicitud.html`

```jinja2
{% extends "base_email.html" %}
{% block content %}
<h2 style="color:#1864ab;">📋 Nueva Solicitud Pendiente</h2>
<p>Se ha registrado una nueva solicitud académica que requiere tu atención.</p>

<table style="background-color:#e7f5ff;">
  <tr><td>N.° Solicitud:</td><td>#{{ id_solicitud }}</td></tr>
  <tr><td>Estudiante:</td><td>{{ nombre_estudiante }}</td></tr>
  <tr><td>Tipo:</td><td>{{ tipo }}</td></tr>
  <tr><td>Prioridad:</td><td><span style="background:#1864ab;">{{ prioridad | upper }}</span></td></tr>
</table>
{% endblock %}
```

**Variables Jinja2:**
- `nombre_estudiante`: Nombre del estudiante solicitante.
- `id_solicitud`, `tipo`: Datos de la solicitud.
- `prioridad`: Nivel de prioridad (baja, media, alta) — se convierte a mayúsculas con el filtro `| upper`.

### 7.6 Template: `usuario_creado.html`

```jinja2
{% extends "base_email.html" %}
{% block content %}
<h2 style="color:#1a3c6e;">🎓 ¡Bienvenido(a) al Sistema Académico!</h2>
<p>Hola <strong>{{ nombre }} {{ apellido }}</strong>,</p>
<p>Tu cuenta ha sido creada exitosamente.</p>

<table style="background-color:#e7f5ff;">
  <tr><td>Nombre:</td><td>{{ nombre }} {{ apellido }}</td></tr>
  <tr><td>Rol asignado:</td><td><span style="background:#1a3c6e;">{{ rol | upper }}</span></td></tr>
</table>
{% endblock %}
```

**Variables Jinja2:**
- `nombre`, `apellido`: Datos del nuevo usuario.
- `rol`: Rol asignado (Admin, Coordinador, Funcionario, Estudiante).

---

## 8. Generación de PDFs

### 8.1 Archivo Principal

**Ruta:** `app/services/document_generator.py`

El generador de documentos convierte templates HTML+CSS en archivos PDF profesionales usando WeasyPrint como motor de renderizado.

### 8.2 Estructura del Módulo

```
document_generator.py
├── Configuración de Rutas
│   ├── TEMPLATES_DIR   → app/templates/documents/
│   ├── STATIC_DIR      → app/static/
│   ├── CSS_DIR         → app/static/css/
│   ├── OUTPUT_DIR      → app/static/generated_docs/
│   └── LOGO_CUL_PATH   → frontend/assets/img/logo-cul.jpg
│
├── Helpers Internos
│   ├── _ensure_output_dir()    → Crea directorio de salida
│   ├── _leer_css(nombre)       → Lee archivo CSS
│   ├── _logo_base64()          → Convierte logo a base64 (cacheado)
│   ├── _html_a_pdf(html, path) → Renderiza PDF con WeasyPrint
│   └── _generar_codigo_verificacion() → UUID hex[:12]
│
├── Generadores Públicos
│   ├── generar_certificado_estudio()
│   ├── generar_record_academico()
│   ├── generar_certificado_desde_solicitud()  ← Punto de entrada principal
│   ├── generar_certificado_demo()
│   └── generar_record_academico_demo()
│
└── Dispatch por Tipo
    └── _MAPEO_TIPO_DOCUMENTO  → Diccionario tipo → generador
```

### 8.3 Rutas del Sistema

```
app/
├── services/
│   └── document_generator.py
├── templates/
│   └── documents/
│       ├── certificado_estudio.html
│       └── record_academico.html
├── static/
│   ├── css/
│   │   └── document_style.css
│   └── generated_docs/          ← PDFs generados
│       ├── certificado_123_1010202030.pdf
│       └── notas_456_1010202030.pdf
└── ...

frontend/
└── assets/
    └── img/
        └── logo-cul.jpg         ← Logo institucional
```

### 8.4 Logo Institucional en Base64

El logo se procesa una sola vez y se cachea en memoria para evitar reprocesamiento:

```python
@lru_cache(maxsize=1)
def _logo_base64() -> str:
    from PIL import Image

    if not LOGO_CUL_PATH.is_file():
        return ""

    img = Image.open(LOGO_CUL_PATH).convert("RGBA")
    img_resized = img.resize((160, 160), Image.LANCZOS)
    buf = io.BytesIO()
    img_resized.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"
```

**Características:**
- `@lru_cache(maxsize=1)`: El logo se procesa una sola vez por ejecución del servidor.
- Conversión a RGBA para transparencia.
- Redimensionado a 160x160 con filtro LANCZOS (alta calidad).
- Formato PNG optimizado.
- Si el archivo no existe, retorna string vacío (fallback textual en el template).

---

## 9. WeasyPrint — Motor de Renderizado

### 9.1 ¿Qué es WeasyPrint?

WeasyPrint es un motor de renderizado HTML/CSS que genera documentos PDF de alta calidad. A diferencia de herramientas basadas en Chromium (como Puppeteer), WeasyPrint es una librería Python pura que no requiere un navegador headless.

### 9.2 Función de Conversión

```python
def _html_a_pdf(html: str, ruta_salida: Path) -> Path:
    from weasyprint import HTML

    _ensure_output_dir()
    HTML(string=html).write_pdf(str(ruta_salida))
    logger.info("PDF generado: %s (%d bytes)", ruta_salida, ruta_salida.stat().st_size)
    return ruta_salida
```

### 9.3 CSS Institucional

**Ruta:** `app/static/css/document_style.css`

El CSS está diseñado específicamente para WeasyPrint con las siguientes características:

#### Página

```css
@page {
    size: A4 portrait;
    margin: 18mm 16mm 16mm 16mm;
}
```

- Formato A4 vertical.
- Márgenes: 18mm superior, 16mm lateral e inferior.

#### Tipografía

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&display=swap');

html {
    font-family: 'Merriweather', 'Georgia', 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1e293b;
}
```

- **Merriweather** (serif) para cuerpo de texto.
- **Inter** (sans-serif) para encabezados, etiquetas y datos estructurados.
- Fallbacks a Georgia/Times New Roman y Helvetica Neue/Arial.

#### Colores Institucionales

```css
:root {
    --cul-navy:        #0a1f44;
    --cul-navy-light:  #142d5e;
    --cul-gold:        #c8a44e;
    --cul-gold-light:  #efe0b3;
    --cul-white:       #ffffff;
    --cul-gray-50:     #f8fafc;
    /* ... más variaciones de gris ... */
}
```

#### Header Institucional

```css
.cul-header {
    background: var(--cul-navy);
    color: var(--cul-white);
    padding: 16pt 24pt;
    margin-bottom: 20pt;
}

.cul-header::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 4pt;
    height: 100%;
    background: var(--cul-gold);
}
```

- Fondo azul navy con barra lateral dorada de 4pt.
- Logo + texto institucional en layout flex.
- Línea decorativa dorada al final del header.

#### Tabla Académica (Récord de Notas)

```css
.cul-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
}

.cul-table thead th {
    background: var(--cul-navy);
    color: var(--cul-white);
    text-transform: uppercase;
    letter-spacing: 0.3pt;
}

.cul-table tbody tr:nth-child(even) {
    background: var(--cul-gray-50);
}
```

- Encabezado navy con texto blanco en mayúsculas.
- Filas alternadas (zebra striping) para legibilidad.
- Badges de estado con colores semánticos:
  - **Aprobado:** verde (`#dcfce7` / `#166534`)
  - **Reprobado:** rojo (`#fee2e2` / `#991b1b`)
  - **En curso:** amarillo (`#fde68a` / `#78350f`)

#### Firmas

```css
.signature-block {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20pt;
}

.signature .line {
    width: 100%;
    height: 0.5pt;
    background: var(--cul-gray-400);
}
```

- Dos columnas para firmas institucionales.
- Línea de firma + nombre + cargo + institución.

#### Footer Documental

```css
.doc-footer {
    border-top: 0.5pt solid var(--cul-gray-200);
    display: flex;
    justify-content: space-between;
}

.doc-footer .verification {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    background: var(--cul-gray-100);
    padding: 2pt 5pt;
}
```

- Código de verificación en fuente monoespaciada.
- Texto legal de validez electrónica.

---

## 10. Dispatch por Tipo de Documento

### 10.1 Mapeo de Tipos

El sistema determina automáticamente qué generador usar según el tipo de solicitud:

```python
_MAPEO_TIPO_DOCUMENTO = {
    "certificado de notas":         "record",
    "certificado de calificaciones": "record",
    "récord académico":             "record",
    "record academico":             "record",
    "certificado de estudio":       "estudio",
    "certificado de estudiante":    "estudio",
    "certificado de buen nombre":   "estudio",
    "paz y salvo":                  "estudio",
}
```

### 10.2 Lógica de Selección

```python
tipo_normalizado = (tipo_solicitud or "").lower().strip()
generador = _MAPEO_TIPO_DOCUMENTO.get(tipo_normalizado, "estudio")
```

- Se normaliza el tipo a minúsculas y se eliminan espacios.
- Se busca en el diccionario; si no existe, se usa `"estudio"` como fallback.
- `"record"` → `generar_record_academico()` (tabla de notas).
- `"estudio"` → `generar_certificado_estudio()` (certificado de estudiante regular).

### 10.3 Flujo de Decisión

```
Tipo de solicitud
    │
    ├── "certificado de notas" ────────────────┐
    ├── "certificado de calificaciones" ───────┤
    ├── "récord académico" ────────────────────┤→ record → generar_record_academico()
    ├── "record academico" ────────────────────┤
    │                                          │
    ├── "certificado de estudio" ──────────────┤
    ├── "certificado de estudiante" ───────────┤→ estudio → generar_certificado_estudio()
    ├── "certificado de buen nombre" ──────────┤
    ├── "paz y salvo" ─────────────────────────┤
    │                                          │
    └── Cualquier otro tipo ───────────────────┘→ estudio (fallback)
```

---

## 11. Certificados Institucionales

### 11.1 Certificado de Estudio

**Template:** `app/templates/documents/certificado_estudio.html`

**Generador:** `generar_certificado_estudio()`

**Estructura del documento:**

```
┌─────────────────────────────────────────────────────────┐
│  [LOGO]  CORPORACIÓN UNIVERSITARIA LATINOAMERICANA      │
│          Personería Jurídica 9916 de 1976 · NIT ...     │
│  ─────────────────────────────────────────────          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              CERTIFICADO DE ESTUDIO                     │
│              ─────────────────                          │
│                                                         │
│  El suscrito Secretario Académico de la CUL,            │
│  en ejercicio de sus funciones legales y estatutarias,  │
│                                                         │
│  CERTIFICA:                                             │
│                                                         │
│  Que el(la) estudiante María García López,              │
│  identificado(a) con documento de identidad             │
│  No. 1010202030, se encuentra matriculado(a) en el      │
│  programa académico de Ingeniería de Sistemas,          │
│  nivel Pregrado, jornada Diurna, para el período        │
│  académico 2026-1.                                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Estudiante:        María García López            │   │
│  │ Documento:         1010202030                    │   │
│  │ Programa:          Ingeniería de Sistemas        │   │
│  │ Nivel/Jornada:     Pregrado — Diurna             │   │
│  │ Período Ingreso:   2024-1                        │   │
│  │ Período Actual:    2026-1                        │   │
│  │ Promedio Acumulado: 4.3 / 5.0                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Se expide el presente certificado a solicitud del(a)   │
│  interesado(a), en Barranquilla, a los 12 de Mayo de    │
│  2026.                                                  │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │ ___________________ │  │ ___________________ │     │
│  │ Dr. Carlos E. M.    │  │ Dra. Ana L. R.      │     │
│  │ Secretario Académico│  │ Dir. Registro y Ctrl│     │
│  └─────────────────────┘  └─────────────────────┘     │
│                                                         │
│  ─────────────────────────────────────────────────     │
│  A1B2C3D4E5F6           Documento generado             │
│  Código de verificación electrónicamente               │
└─────────────────────────────────────────────────────────┘
```

**Parámetros del generador:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `nombre_estudiante` | str | Nombre completo |
| `documento_id` | str | Cédula de identidad |
| `programa` | str | Programa académico |
| `nivel` | str | Pregrado / Postgrado |
| `jornada` | str | Diurna / Nocturna |
| `periodo_ingreso` | str | Período de ingreso (ej. "2024-1") |
| `periodo_actual` | str | Período actual |
| `promedio` | str | Promedio acumulado |
| `fecha_expedicion` | str | Fecha formateada |
| `ciudad` | str | Ciudad de expedición |
| `nombre_archivo` | str | Nombre del archivo PDF |

### 11.2 Récord Académico (Certificado de Notas)

**Template:** `app/templates/documents/record_academico.html`

**Generador:** `generar_record_academico()`

**Estructura del documento:**

```
┌─────────────────────────────────────────────────────────┐
│  [LOGO]  CORPORACIÓN UNIVERSITARIA LATINOAMERICANA      │
│  ─────────────────────────────────────────────          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              CERTIFICADO DE NOTAS                       │
│              ─────────────────                          │
│                                                         │
│  Estudiante: María García López    Período: 2026-1     │
│  Documento:  1010202030            Programa: Ing. Sist.│
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Código  │ Asignatura              │ Créd │ Nota │  │ │
│  ├─────────┼─────────────────────────┼──────┼──────┤  │ │
│  │ MAT-101 │ Cálculo Diferencial     │   4  │ 4.2  │  │ │
│  │ MAT-102 │ Álgebra Lineal          │   3  │ 3.8  │  │ │
│  │ PRO-101 │ Programación I          │   4  │ 4.5  │  │ │
│  │ FIS-101 │ Física Mecánica         │   3  │ 3.5  │  │ │
│  │ HUM-101 │ Ética y Ciudadanía      │   2  │ 4.0  │  │ │
│  │ MAT-201 │ Cálculo Integral        │   4  │ 3.9  │  │ │
│  │ PRO-201 │ Programación II         │   4  │ 4.3  │  │ │
│  │ BD-101  │ Base de Datos I         │   3  │ 4.1  │  │ │
│  │ PRO-301 │ Ing. de Software        │   4  │ 4.4  │  │ │
│  │ PRO-302 │ Desarrollo Web          │   3  │  —   │  │ │
│  ├─────────┼─────────────────────────┼──────┼──────┤  │ │
│  │ Totales del período             │  34  │ 4.05 │  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │ ___________________ │  │ ___________________ │     │
│  │ Dr. Carlos E. M.    │  │ Dr. Jorge E. P.     │     │
│  │ Secretario Académico│  │ Director de Programa│     │
│  └─────────────────────┘  └─────────────────────┘     │
│                                                         │
│  A1B2C3D4E5F6           Documento generado             │
│  Código de verificación electrónicamente               │
└─────────────────────────────────────────────────────────┘
```

**Parámetros del generador:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `nombre_estudiante` | str | Nombre completo |
| `documento_id` | str | Cédula de identidad |
| `programa` | str | Programa académico |
| `periodo` | str | Período académico |
| `asignaturas` | list[dict] | Lista de materias con código, nombre, créditos, nota, estado |
| `fecha_expedicion` | str | Fecha formateada |
| `ciudad` | str | Ciudad de expedición |
| `nombre_archivo` | str | Nombre del archivo PDF |

**Estructura de cada asignatura:**

```python
{
    "codigo": "PRO-101",
    "nombre": "Programación I",
    "creditos": 4,
    "nota": 4.5,
    "estado": "APROBADO"  # | "REPROBADO" | "EN CURSO"
}
```

### 11.3 Datos Mock para Récords Académicos

Dado que el sistema no tiene una tabla de calificaciones en la base de datos, se genera un récord académico con datos simulados basados en el semestre del estudiante:

```python
def _generar_asignaturas_mock(programa: str, semestre: int) -> list[dict]:
```

**Lógica por semestre:**

| Semestre | Asignaturas incluidas | Total aprox. |
|---|---|---|
| 1 | Cálculo Diferencial, Álgebra Lineal, Programación I, Física Mecánica, Ética | 5 materias |
| 2+ | + Cálculo Integral, Programación II, Base de Datos I, Estadística | 9 materias |
| 4+ | + Ing. de Software, Redes, Sistemas Operativos, Desarrollo Web (EN CURSO) | 13 materias |
| 6+ | + Arquitectura de Software, IA, Trabajo de Grado (EN CURSO) | 16 materias |

**Cálculo del promedio:**

```python
notas_validas = [
    a["nota"] for a in asignaturas
    if a.get("nota") is not None and a.get("estado") != "EN CURSO"
]
promedio = sum(notas_validas) / len(notas_validas)
```

Solo se incluyen notas numéricas de materias aprobadas o reprobadas. Las materias "EN CURSO" (nota `None`) se excluyen del cálculo.

### 11.4 Código de Verificación

Cada documento genera un código único de 12 caracteres hexadecimales:

```python
def _generar_codigo_verificacion() -> str:
    import uuid
    return uuid.uuid4().hex[:12].upper()
```

Ejemplo: `A1B2C3D4E5F6`

Este código se muestra en el footer del PDF y permite verificar la autenticidad del documento.

---

## 12. Flujo Completo del Sistema

### 12.1 Diagrama de Flujo: Aprobación de Solicitud

```
┌─────────────┐
│ Estudiante  │
│ crea        │
│ solicitud   │
└──────┬──────┘
       │ POST /solicitudes/create
       ▼
┌──────────────────────────────────────────────────┐
│ solicitudes_routes.py: create_solicitud()        │
│                                                  │
│ 1. Valida que estudiante cree solicitud propia   │
│ 2. Fuerza estado_actual = "pendiente"            │
│ 3. Llama controller.create_solicitud()           │
│ 4. Notifica a funcionarios (email)               │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ solicitudes_controller.py: create_solicitud()    │
│                                                  │
│ INSERT INTO solicitudes (...) VALUES (...)       │
│ RETURNING id_solicitud                           │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ email_service.py: notificar_nueva_solicitud()    │
│                                                  │
│ SELECT correo FROM usuarios                      │
│ WHERE rol = 'funcionario' AND estado = 'activo'  │
│                                                  │
│ → Envía email a cada funcionario                 │
└──────────────────────────────────────────────────┘

       ... tiempo pasa ...

┌─────────────┐
│ Funcionario │
│ envía a     │
│ revisión    │
└──────┬──────┘
       │ PUT /solicitudes/update_estado/{id}
       │   nuevo_estado = "en_revision"
       ▼
┌──────────────────────────────────────────────────┐
│ solicitudes_routes.py: update_estado_solicitud() │
│                                                  │
│ Valida: funcionario solo puede "en_revision"     │
│ Llama controller.update_estado()                 │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ solicitudes_controller.py: update_estado()       │
│                                                  │
│ 1. SELECT ... FOR UPDATE (evita race condition)  │
│ 2. Valida estado final / duplicado               │
│ 3. UPDATE solicitudes SET estado_actual = ...    │
│ 4. INSERT INTO historial_estados (...)           │
│ 5. COMMIT                                        │
│ 6. notificar_cambio_estado_solicitud()           │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ Coordinador │
│ aprueba     │
│ solicitud   │
└──────┬──────┘
       │ PUT /solicitudes/update_estado/{id}
       │   nuevo_estado = "aprobada"
       ▼
┌──────────────────────────────────────────────────┐
│ solicitudes_routes.py: update_estado_solicitud() │
│                                                  │
│ Valida: coordinador solo "aprobada"/"rechazada"  │
│ Llama controller.update_estado()                 │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ solicitudes_controller.py: update_estado()       │
│                                                  │
│ 1. SELECT ... FOR UPDATE                         │
│ 2. UPDATE solicitudes                            │
│ 3. INSERT INTO historial_estados                 │
│ 4. COMMIT                                        │
│ 5. notificar_cambio_estado_solicitud()           │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ email_service.py: notificar_cambio_estado_       │
│ solicitud()                                      │
│                                                  │
│ 1. Consulta BD: estudiante + tipo                │
│ 2. Genera PDF (document_generator.py)            │
│ 3. INSERT INTO documentos                        │
│ 4. notificar_solicitud_aprobada(con PDF adjunto) │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ document_generator.py: generar_certificado_      │
│ desde_solicitud()                                │
│                                                  │
│ 1. SELECT datos estudiante + tipo solicitud      │
│ 2. Determina generador por _MAPEO_TIPO_DOCUMENTO │
│ 3. Si "record": genera asignaturas mock          │
│ 4. Renderiza template Jinja2 + CSS               │
│ 5. WeasyPrint → PDF                              │
│ 6. Retorna Path del archivo                      │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ email_service.py: _enviar_correo()               │
│                                                  │
│ 1. Construye MIMEMultipart                       │
│ 2. Adjunta PDF (MIMEApplication)                 │
│ 3. SMTP STARTTLS → Brevo                         │
│ 4. Envía al estudiante                           │
└──────────────────────────────────────────────────┘
```

### 12.2 Flujo Alternativo: Rechazo

```
Coordinador rechaza
    │
    ▼
update_estado(nuevo_estado="rechazada", comentario="Motivo del rechazo")
    │
    ▼
notificar_cambio_estado_solicitud(id, "rechazada", comentario)
    │
    ├── Consulta BD: correo, nombre, tipo
    │
    └── notificar_solicitud_rechazada(correo, nombre, id, tipo, motivo)
            │
            ├── Renderiza solicitud_rechazada.html
            │
            └── _enviar_correo(sin adjuntos)
                    │
                    └── SMTP → Brevo → Estudiante
```

### 12.3 Registro en Base de Datos

Cuando se aprueba una solicitud, el sistema registra el documento generado:

```sql
INSERT INTO documentos (id_solicitud, nombre_archivo, tipo_archivo, ruta_archivo)
VALUES (
    123,
    'certificado_123_1010202030.pdf',
    'application/pdf',
    'C:\SOLICITUDES-ACADEMICAS-2\app\static\generated_docs\certificado_123_1010202030.pdf'
)
```

Además, cada cambio de estado se registra en el historial:

```sql
INSERT INTO historial_estados (
    id_solicitud, estado_anterior, estado_nuevo, id_usuario, comentario, fecha_cambio
) VALUES (
    123, 'en_revision', 'aprobada', 5, NULL, NOW()
)
```

---

## 13. Seguridad y Diseño Defensivo

### 13.1 Principio de No Bloqueo

El sistema de correo está diseñado para **nunca interrumpir** el flujo principal de negocio:

```python
# En routes:
try:
    notificar_nueva_solicitud(...)
except Exception:
    pass  # El correo no debe bloquear la creación de la solicitud

# En controllers:
try:
    notificar_cambio_estado_solicitud(...)
except Exception:
    pass  # El correo no debe bloquear la operación principal
```

**Razón:** Si el servidor SMTP está caído, las credenciales son incorrectas, o hay un error de red, la solicitud se crea/actualiza correctamente. El correo es un efecto secundario no crítico.

### 13.2 Validación de Configuración SMTP

Antes de intentar cualquier envío:

```python
if not _esta_configurado():
    logger.warning("SMTP no configurado — correo omitido: '%s' → %s", asunto, destinatario)
    return
```

Esto permite que el sistema funcione en desarrollo sin variables de entorno SMTP configuradas.

### 13.3 Try/Except en Cada Notificación

Cada función de notificación pública tiene su propio bloque try/except:

```python
def notificar_solicitud_aprobada(...):
    try:
        template = _jinja_env.get_template("solicitud_aprobada.html")
        html = template.render(...)
        _enviar_correo(...)
    except Exception as exc:
        logger.error("Error en notificación de aprobación: %s", exc)
```

Esto asegura que un error en el renderizado del template o en el envío no propague la excepción al caller.

### 13.4 Autenticación JWT y Roles

Los endpoints de solicitudes están protegidos por roles:

| Endpoint | Roles Permitidos |
|---|---|
| `POST /solicitudes/create` | Cualquier rol autenticado |
| `GET /solicitudes/get_all` | Funcionario, Coordinador, Admin |
| `GET /solicitudes/get/{id}` | Cualquier rol (estudiantes solo ven las suyas) |
| `PUT /solicitudes/update_estado/{id}` | Funcionario (solo `en_revision`), Coordinador (solo `aprobada`/`rechazada`), Admin (total) |
| `DELETE /solicitudes/delete/{id}` | Solo Admin |

### 13.5 Prevención de Race Conditions

El controller usa `SELECT ... FOR UPDATE` para bloquear la fila durante la transacción:

```python
cursor.execute(
    "SELECT estado_actual FROM solicitudes WHERE id_solicitud = %s FOR UPDATE",
    (id_solicitud,),
)
```

Esto evita que dos coordinadores aprueben/rechacen la misma solicitud simultáneamente.

### 13.6 Validación de Estados Finales

```python
ESTADOS_FINALES = {"aprobada", "rechazada", "cancelada"}

if estado_anterior in ESTADOS_FINALES:
    raise HTTPException(
        status_code=403,
        detail=f"La solicitud ya está en estado final '{estado_anterior}' y no puede modificarse"
    )
```

Una solicitud en estado final no puede ser modificada.

### 13.7 Sanitización de Templates Jinja2

Los templates de correo usan `autoescape=True`:

```python
_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=True,  # Previene XSS en correos
    trim_blocks=True,
    lstrip_blocks=True,
)
```

Los templates de PDF usan `autoescape=False` porque el contenido proviene de la base de datos (datos controlados) y el output es PDF, no HTML renderizado en navegador.

### 13.8 Credenciales en Variables de Entorno

Las credenciales SMTP nunca están hardcodeadas:

```python
os.getenv("SMTP_USER", "")
os.getenv("SMTP_PASSWORD", "")
```

El archivo `.env` está excluido del repositorio (`.gitignore`).

---

## 14. Conclusiones

### 14.1 Logros del Sistema

1. **Proveedor de correo estable:** La migración a Brevo SMTP eliminó dependencias externas innecesarias y proporcionó un servicio confiable con 300 correos/día gratuitos.

2. **Diseño defensivo robusto:** El principio de "el correo nunca bloquea la operación principal" garantiza que el sistema funcione incluso cuando el servicio de correo está caído.

3. **Generación documental profesional:** Los PDFs generados con WeasyPrint + Jinja2 + CSS institucional tienen una calidad visual comparable a documentos generados por sistemas empresariales.

4. **Dispatch inteligente:** El mapeo automático de tipos de solicitud a generadores permite extender el sistema sin modificar el flujo de aprobación.

5. **Templates reutilizables:** El sistema de herencia de Jinja2 (`base_email.html`) permite mantener consistencia visual en todos los correos con mínimo código duplicado.

### 14.2 Decisiones Técnicas Clave

| Decisión | Alternativa | Razón |
|---|---|---|
| Brevo SMTP | Resend API | Cero dependencias, misma interfaz que Gmail |
| `smtplib` | `resend` SDK | Librería estándar, menos puntos de fallo |
| WeasyPrint | Puppeteer/Playwright | Sin navegador headless, más ligero |
| Jinja2 | f-strings | Separación clara de lógica y presentación |
| Logo base64 cacheado | Releer en cada PDF | Rendimiento (PIL es costoso) |
| Datos mock para récords | Tabla de notas en BD | Pragmatismo: no existe la tabla aún |

### 14.3 Arquitectura de Archivos

```
app/
├── services/
│   ├── email_service.py          ← 311 líneas: SMTP + Jinja2 + notificaciones
│   └── document_generator.py     ← 416 líneas: WeasyPrint + Jinja2 + dispatch
│
├── templates/
│   ├── emails/                   ← 5 templates HTML para correos
│   │   ├── base_email.html       ← Layout base (header/footer)
│   │   ├── solicitud_aprobada.html
│   │   ├── solicitud_rechazada.html
│   │   ├── nueva_solicitud.html
│   │   └── usuario_creado.html
│   │
│   └── documents/                ← 2 templates HTML para PDFs
│       ├── certificado_estudio.html
│       └── record_academico.html
│
├── static/
│   ├── css/
│   │   └── document_style.css    ← 453 líneas: CSS institucional para PDFs
│   └── generated_docs/           ← PDFs generados dinámicamente
│
└── controllers/
    └── solicitudes_controller.py ← Integración con email_service
```

### 14.4 Métricas del Proyecto

| Métrica | Valor |
|---|---|
| Líneas de `email_service.py` | 311 |
| Líneas de `document_generator.py` | 416 |
| Líneas de `document_style.css` | 453 |
| Templates de correo | 5 |
| Templates de PDF | 2 |
| Proveedores de correo usados | 3 (Gmail → Resend → Brevo) |
| Tipos de notificación | 4 |
| Tipos de documento generable | 2 (estudio + récord) |
| Tipos mapeados en dispatch | 8 |
| Dependencias externas para correo/PDF | 3 (weasyprint, pillow, jinja2) |

---

*Documento generado con base en el código fuente real del proyecto Sistema de Solicitudes Académicas — CUL. Mayo 2026.*