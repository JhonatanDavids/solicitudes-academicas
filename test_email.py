"""
Prueba mínima de envío de correos con Brevo SMTP.

Uso:
    1. Configurar SMTP_PASSWORD en app/.env
    2. Configurar DESTINATARIO en este archivo
    3. Ejecutar: python test_email.py

Prueba los 4 eventos del sistema:
    - nueva solicitud
    - solicitud aprobada (sin PDF)
    - solicitud rechazada
    - usuario creado
"""

import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.DEBUG, format="%(levelname)s %(message)s")

sys.path.insert(0, str(Path(__file__).parent))

# ── Cargar .env ──
from dotenv import load_dotenv
load_dotenv("app/.env")

import os

if not os.getenv("SMTP_PASSWORD"):
    print("ERROR: SMTP_PASSWORD no configurada en app/.env")
    sys.exit(1)

DESTINATARIO = "jhonatan2000j@gmail.com"  # ← Cambiar por email real

from app.services.email_service import (
    notificar_nueva_solicitud,
    notificar_solicitud_aprobada,
    notificar_solicitud_rechazada,
    notificar_usuario_creado,
)

print(f"Enviando pruebas a: {DESTINATARIO}\n")

# 1. Nueva solicitud
print("[1/4] Nueva solicitud...")
notificar_nueva_solicitud(
    nombre_estudiante="Juan Pérez",
    id_solicitud=9999,
    tipo_solicitud="Certificado de Notas",
    prioridad="normal",
)

# 2. Solicitud aprobada (sin PDF)
print("[2/4] Solicitud aprobada...")
notificar_solicitud_aprobada(
    correo_estudiante=DESTINATARIO,
    nombre_estudiante="Juan Pérez",
    id_solicitud=9999,
    tipo_solicitud="Certificado de Notas",
    pdf_path=None,
)

# 3. Solicitud rechazada
print("[3/4] Solicitud rechazada...")
notificar_solicitud_rechazada(
    correo_estudiante=DESTINATARIO,
    nombre_estudiante="Juan Pérez",
    id_solicitud=9999,
    tipo_solicitud="Certificado de Notas",
    motivo="Documentación incompleta",
)

# 4. Usuario creado
print("[4/4] Usuario creado...")
notificar_usuario_creado(
    correo_usuario=DESTINATARIO,
    nombre="Juan",
    apellido="Pérez",
    rol="estudiante",
)

print("\nPruebas completadas. Revisar bandeja de entrada.")
