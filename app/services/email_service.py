"""
Servicio de notificaciones por correo — Sistema Académico CUL.

Usa Brevo SMTP + Jinja2 para templates HTML.
Diseño defensivo: si SMTP no está configurado o falla,
las operaciones principales del sistema NO se ven afectadas.
"""

import logging
import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

# ── Rutas ──
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates" / "emails"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=True,
    trim_blocks=True,
    lstrip_blocks=True,
)


# ═══════════════════════════════════════════════════════════════════════════
#  CONFIGURACIÓN SMTP (Brevo)
# ═══════════════════════════════════════════════════════════════════════════

def _get_smtp_config() -> dict:
    return {
        "host": os.getenv("SMTP_HOST", "smtp-relay.brevo.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_email": os.getenv("SMTP_FROM_EMAIL", ""),
        "from_name": os.getenv("SMTP_FROM_NAME", "Sistema de Solicitudes Académicas CUL"),
    }


def _esta_configurado() -> bool:
    """Verifica que las credenciales SMTP estén definidas."""
    cfg = _get_smtp_config()
    return bool(cfg["user"] and cfg["password"] and cfg["from_email"])


# ═══════════════════════════════════════════════════════════════════════════
#  FUNCIÓN BASE DE ENVÍO
# ═══════════════════════════════════════════════════════════════════════════

def _enviar_correo(
    destinatario: str,
    asunto: str,
    html: str,
    adjuntos: Optional[list] = None,
):
    """
    Envía un correo HTML vía Brevo SMTP (STARTTLS).

    adjuntos: lista de tuplas (nombre_archivo, bytes_contenido)
    Si SMTP no está configurado, se omite silenciosamente.
    """
    if not _esta_configurado():
        logger.warning("SMTP no configurado — correo omitido: '%s' → %s", asunto, destinatario)
        return

    cfg = _get_smtp_config()

    msg = MIMEMultipart()
    msg["From"] = f"{cfg['from_name']} <{cfg['from_email']}>"
    msg["To"] = destinatario
    msg["Subject"] = asunto
    msg.attach(MIMEText(html, "html", "utf-8"))

    if adjuntos:
        for nombre, contenido in adjuntos:
            part = MIMEApplication(contenido, Name=nombre)
            part["Content-Disposition"] = f'attachment; filename="{nombre}"'
            msg.attach(part)

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=30) as server:
            server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.send_message(msg)
        logger.info("Correo enviado: '%s' → %s", asunto, destinatario)
    except Exception as exc:
        logger.error("Error al enviar correo a %s: %s", destinatario, exc)


# ═══════════════════════════════════════════════════════════════════════════
#  NOTIFICACIONES PÚBLICAS
# ═══════════════════════════════════════════════════════════════════════════

def notificar_solicitud_aprobada(
    correo_estudiante: str,
    nombre_estudiante: str,
    id_solicitud: int,
    tipo_solicitud: str,
    pdf_path: Optional[Path] = None,
):
    """Notifica al estudiante que su solicitud fue aprobada (con PDF adjunto si existe)."""
    try:
        template = _jinja_env.get_template("solicitud_aprobada.html")
        html = template.render(
            nombre=nombre_estudiante,
            id_solicitud=id_solicitud,
            tipo=tipo_solicitud,
            tiene_pdf=pdf_path is not None and pdf_path.is_file(),
        )

        adjuntos = None
        if pdf_path and pdf_path.is_file():
            adjuntos = [(pdf_path.name, pdf_path.read_bytes())]

        _enviar_correo(
            correo_estudiante,
            f"Solicitud #{id_solicitud} Aprobada — CUL",
            html,
            adjuntos,
        )
    except Exception as exc:
        logger.error("Error en notificación de aprobación: %s", exc)


def notificar_solicitud_rechazada(
    correo_estudiante: str,
    nombre_estudiante: str,
    id_solicitud: int,
    tipo_solicitud: str,
    motivo: str = "",
):
    """Notifica al estudiante que su solicitud fue rechazada con el motivo."""
    try:
        template = _jinja_env.get_template("solicitud_rechazada.html")
        html = template.render(
            nombre=nombre_estudiante,
            id_solicitud=id_solicitud,
            tipo=tipo_solicitud,
            motivo=motivo or "No se proporcionó un motivo específico.",
        )

        _enviar_correo(
            correo_estudiante,
            f"Solicitud #{id_solicitud} Rechazada — CUL",
            html,
        )
    except Exception as exc:
        logger.error("Error en notificación de rechazo: %s", exc)


def notificar_nueva_solicitud(
    nombre_estudiante: str,
    id_solicitud: int,
    tipo_solicitud: str,
    prioridad: str,
):
    """Notifica a los funcionarios activos que hay una nueva solicitud pendiente."""
    try:
        from app.config.db_config import get_db_connection

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.correo
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            WHERE LOWER(r.nombre_rol) = 'funcionario' AND u.estado = 'activo'
        """)
        funcionarios = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()

        if not funcionarios:
            logger.warning("No hay funcionarios activos para notificar")
            return

        template = _jinja_env.get_template("nueva_solicitud.html")
        html = template.render(
            nombre_estudiante=nombre_estudiante,
            id_solicitud=id_solicitud,
            tipo=tipo_solicitud,
            prioridad=prioridad,
        )

        for correo in funcionarios:
            _enviar_correo(
                correo,
                f"Nueva solicitud #{id_solicitud} pendiente — CUL",
                html,
            )
    except Exception as exc:
        logger.error("Error en notificación de nueva solicitud: %s", exc)


def notificar_usuario_creado(
    correo_usuario: str,
    nombre: str,
    apellido: str,
    rol: str,
):
    """Envía correo de bienvenida al usuario recién creado con su rol asignado."""
    try:
        template = _jinja_env.get_template("usuario_creado.html")
        html = template.render(
            nombre=nombre,
            apellido=apellido,
            rol=rol,
        )

        _enviar_correo(
            correo_usuario,
            "Bienvenido al Sistema Académico — CUL",
            html,
        )
    except Exception as exc:
        logger.error("Error en notificación de bienvenida: %s", exc)


# ═══════════════════════════════════════════════════════════════════════════
#  HELPER PARA CONTROLLERS — Cambio de estado aprobada/rechazada
# ═══════════════════════════════════════════════════════════════════════════

def notificar_cambio_estado_solicitud(
    id_solicitud: int,
    nuevo_estado: str,
    comentario: Optional[str] = None,
):
    """
    Helper unificado que se llama desde los controllers cuando cambia
    el estado de una solicitud. Solo envía correo si el estado final
    es 'aprobada' o 'rechazada'.
    """
    if nuevo_estado not in ("aprobada", "rechazada"):
        return

    try:
        from app.config.db_config import get_db_connection

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.correo, u.nombre, u.apellido,
                   ts.nombre AS tipo_solicitud
            FROM solicitudes s
            JOIN usuarios u ON s.id_usuario = u.id_usuario
            JOIN tipos_solicitud ts ON s.id_tipo_solicitud = ts.id_tipo_solicitud
            WHERE s.id_solicitud = %s
        """, (id_solicitud,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            logger.warning("Solicitud %s no encontrada para enviar correo", id_solicitud)
            return

        correo, nombre, apellido, tipo_solicitud = row
        nombre_completo = f"{nombre} {apellido}"

        if nuevo_estado == "aprobada":
            pdf_path = None
            try:
                from app.services.document_generator import generar_certificado_desde_solicitud
                conn2 = get_db_connection()
                pdf_path = generar_certificado_desde_solicitud(conn2, id_solicitud)
                conn2.close()
            except Exception as exc:
                logger.warning("No se pudo generar PDF para adjuntar al correo: %s", exc)

            if pdf_path and pdf_path.is_file():
                try:
                    conn3 = get_db_connection()
                    cursor3 = conn3.cursor()
                    cursor3.execute(
                        """INSERT INTO documentos (id_solicitud, nombre_archivo, tipo_archivo, ruta_archivo)
                           VALUES (%s, %s, %s, %s)""",
                        (id_solicitud, pdf_path.name, "application/pdf", str(pdf_path))
                    )
                    conn3.commit()
                    cursor3.close()
                    conn3.close()
                    logger.info("Documento registrado en BD: solicitud=%s | archivo=%s", id_solicitud, pdf_path.name)
                except Exception as exc:
                    logger.warning("No se pudo registrar documento en BD: %s", exc)
                    try:
                        cursor3.close()
                        conn3.close()
                    except Exception:
                        pass

            notificar_solicitud_aprobada(
                correo, nombre_completo, id_solicitud, tipo_solicitud, pdf_path
            )

        elif nuevo_estado == "rechazada":
            notificar_solicitud_rechazada(
                correo, nombre_completo, id_solicitud, tipo_solicitud,
                comentario or "",
            )

    except Exception as exc:
        logger.error("Error en notificar_cambio_estado_solicitud: %s", exc)
