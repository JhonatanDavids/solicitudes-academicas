# Sistema de Solicitudes Académicas — CUL

Sistema de gestión de solicitudes académicas para la Corporación Universitaria Latinoamericana (CUL). Permite a estudiantes solicitar certificados, homologaciones y otros trámites académicos, con un flujo completo de revisión, aprobación y generación documental automatizada.

---

## Tecnologías

**Frontend**
- HTML5
- CSS3
- JavaScript (vanilla)

**Backend**
- FastAPI
- Python 3.10+
- PostgreSQL (Neon)

**Otros**
- JWT (python-jose)
- WeasyPrint (generación de PDFs)
- Brevo SMTP (envío de correos)
- Jinja2 (templates HTML)

---

## Arquitectura

El frontend (HTML/CSS/JS) se comunica con el backend REST API (FastAPI) mediante peticiones HTTP con autenticación JWT. El backend gestiona la base de datos PostgreSQL, genera documentos PDF y envía correos electrónicos automáticos.

```
Frontend (HTML/CSS/JS)  ──HTTP/JSON──►  Backend (FastAPI)  ──►  PostgreSQL
                                              │
                                              ├── WeasyPrint → PDFs
                                              └── Brevo SMTP → Correos
```

---

## Roles del sistema

| Rol | Permisos |
|---|---|
| **Administrador** | Control total: CRUD de usuarios, roles, tipos, solicitudes, documentos |
| **Coordinador** | Aprobar o rechazar solicitudes |
| **Funcionario** | Revisar solicitudes y enviarlas a revisión |
| **Estudiante** | Crear y consultar sus propias solicitudes |

---

## Funcionalidades

- CRUD completo de usuarios, roles, tipos de solicitud y documentos
- Gestión de solicitudes académicas con flujo de aprobación
- Revisión académica con historial de estados
- Generación automática de PDFs (certificados de estudio, récords académicos)
- Correos electrónicos automáticos con adjuntos PDF
- Dashboard administrativo con estadísticas
- Reportes y analítica
- Autenticación JWT con roles

---

## Instalación

### Backend

```bash
# Crear entorno virtual
python -m venv myvenv

# Activar (Windows)
myvenv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
# Copiar app/.env.example a app/.env y completar los valores

# Ejecutar servidor
uvicorn app.main:app --reload
```

### Frontend

Abrir `frontend/html/login.html` en un navegador o usar Live Server / cualquier servidor local.

---

## Variables de entorno

Archivo: `app/.env`

```env
# ── Base de datos ──
DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_SSLMODE=require

# ── JWT ──
JWT_SECRET=

# ── Correo (Brevo SMTP) ──
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=Sistema de Solicitudes Académicas CUL
```

---

## Cómo ejecutar

### Backend

```bash
uvicorn app.main:app --reload
```

La API estará disponible en `http://localhost:8000`.

### Frontend

Abrir `frontend/html/login.html` en un navegador.

---

## Flujo del sistema

```
1. Estudiante crea solicitud
        │
2. Funcionario revisa y envía a revisión
        │
3. Coordinador aprueba o rechaza
        │
   ┌────┴────┐
   │         │
 Aprobada  Rechazada
   │         │
   ▼         ▼
4. Genera PDF    5. Envía correo con motivo
5. Envía correo con PDF adjunto
6. Registra documento en BD
```

---

## Estado del proyecto

Proyecto académico funcional.
