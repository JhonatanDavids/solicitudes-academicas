"""
Generador de documentos institucionales - CUL.

Usa WeasyPrint (HTML+CSS -> PDF) con templates Jinja2.
Soporte UTF-8 completo. Diseno universitario profesional.
"""

import base64
import io
import logging
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
TEMPLATES_DIR = BASE_DIR / "templates" / "documents"
STATIC_DIR = BASE_DIR / "static"
CSS_DIR = STATIC_DIR / "css"
OUTPUT_DIR = STATIC_DIR / "generated_docs"
LOGO_CUL_PATH = PROJECT_ROOT / "frontend" / "assets" / "img" / "logo-cul.jpg"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=False,
    trim_blocks=True,
    lstrip_blocks=True,
)


def _ensure_output_dir():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _leer_css(nombre: str) -> str:
    ruta = CSS_DIR / nombre
    if ruta.is_file():
        return ruta.read_text(encoding="utf-8")
    logger.warning("CSS no encontrado: %s", ruta)
    return ""


@lru_cache(maxsize=1)
def _logo_base64() -> str:
    from PIL import Image

    if not LOGO_CUL_PATH.is_file():
        logger.warning("Logo no encontrado en %s", LOGO_CUL_PATH)
        return ""

    try:
        img = Image.open(LOGO_CUL_PATH).convert("RGBA")
        img_resized = img.resize((160, 160), Image.LANCZOS)
        buf = io.BytesIO()
        img_resized.save(buf, format="PNG", optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode()
        logger.info("Logo cargado y cacheado (%d bytes base64)", len(b64))
        return f"data:image/png;base64,{b64}"
    except Exception as exc:
        logger.exception("Error al procesar logo: %s", exc)
        return ""


def _html_a_pdf(html: str, ruta_salida: Path) -> Path:
    from weasyprint import HTML

    _ensure_output_dir()
    HTML(string=html).write_pdf(str(ruta_salida))
    logger.info("PDF generado: %s (%d bytes)", ruta_salida, ruta_salida.stat().st_size)
    return ruta_salida


def generar_certificado_estudio(
    *,
    nombre_estudiante: str,
    documento_id: str,
    programa: str,
    nivel: str = "Pregrado",
    jornada: str = "Diurna",
    periodo_ingreso: str = "",
    periodo_actual: str = "",
    promedio: str = "",
    fecha_expedicion: Optional[str] = None,
    ciudad: str = "Barranquilla",
    nombre_archivo: Optional[str] = None,
) -> Path:
    if fecha_expedicion is None:
        fecha_expedicion = date.today().strftime("%d de %B de %Y")

    contexto = {
        "institucion": "Corporación Universitaria Latinoamericana",
        "siglas": "CUL",
        "nit": "890.104.530-1",
        "ciudad": ciudad,
        "logo_base64": _logo_base64(),
        "nombre_estudiante": nombre_estudiante,
        "documento_id": documento_id,
        "programa": programa,
        "nivel": nivel,
        "jornada": jornada,
        "periodo_ingreso": periodo_ingreso,
        "periodo_actual": periodo_actual,
        "promedio": promedio,
        "fecha_expedicion": fecha_expedicion,
        "codigo_verificacion": _generar_codigo_verificacion(),
    }

    template = _jinja_env.get_template("certificado_estudio.html")
    css = _leer_css("document_style.css")
    html = template.render(css=css, **contexto)

    if nombre_archivo is None:
        nombre_archivo = f"certificado_{documento_id}.pdf"
    ruta_salida = OUTPUT_DIR / nombre_archivo

    return _html_a_pdf(html, ruta_salida)


def generar_certificado_demo() -> Path:
    return generar_certificado_estudio(
        nombre_estudiante="María García López",
        documento_id="1010202030",
        programa="Ingeniería de Sistemas",
        nivel="Pregrado",
        jornada="Diurna",
        periodo_ingreso="2024-1",
        periodo_actual="2026-1",
        promedio="4.3",
        fecha_expedicion=date.today().strftime("%d de %B de %Y"),
        nombre_archivo="certificado_demo.pdf",
    )


def _generar_codigo_verificacion() -> str:
    import uuid
    return uuid.uuid4().hex[:12].upper()
