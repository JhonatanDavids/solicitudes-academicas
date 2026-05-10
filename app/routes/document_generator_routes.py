"""
Endpoint aislado de generación documental — DEMO.

NO modifica rutas existentes. NO toca controladores de BD.
Solo expone un endpoint de prueba para WeasyPrint.

USO:
    GET /documentos/generar-demo
    → genera PDF demo y devuelve JSON con ruta.
"""

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services.document_generator import (
    generar_certificado_demo,
    generar_record_academico_demo,
    generar_certificado_desde_solicitud,
    OUTPUT_DIR,
)
from app.config.db_config import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documentos", tags=["Generación Documental"])


@router.get("/generar-demo")
async def endpoint_generar_demo():
    """
    Genera un certificado de estudio DEMO con WeasyPrint.

    Retorna el PDF generado para descarga directa.
    No requiere autenticación — es endpoint de desarrollo.
    """
    try:
        ruta_pdf: Path = generar_certificado_demo()
        logger.info("Demo generado exitosamente: %s", ruta_pdf.name)
        return FileResponse(
            path=str(ruta_pdf),
            media_type="application/pdf",
            filename=ruta_pdf.name,
            headers={
                "X-Generated-By": "CUL-Document-Engine/1.0",
                "X-File-Path": str(ruta_pdf),
            },
        )
    except ImportError as e:
        logger.error("WeasyPrint no instalado: %s", e)
        raise HTTPException(
            status_code=501,
            detail=(
                "WeasyPrint no está instalado en este servidor. "
                "Ejecute: pip install weasyprint Pillow"
            ),
        )
    except Exception as e:
        logger.exception("Error al generar el documento demo")
        raise HTTPException(
            status_code=503,
            detail=f"Error interno del motor documental: {e}",
        )


@router.get("/generar-demo/info")
async def endpoint_generar_demo_info():
    """
    Verifica el estado del motor documental sin generar PDF.

    Retorna información de diagnóstico:
    - Si WeasyPrint está disponible
    - Directorios configurados
    - Templates disponibles
    """
    info = {
        "motor": "WeasyPrint + Jinja2",
        "version": "1.0.0",
        "weasyprint_disponible": False,
        "directorios": {
            "output": str(OUTPUT_DIR),
        },
    }

    try:
        import weasyprint
        info["weasyprint_disponible"] = True
        info["weasyprint_version"] = weasyprint.__version__
    except ImportError:
        pass

    return info


@router.get("/generar-record-demo")
async def endpoint_generar_record_demo():
    """
    Genera un RÉCORD ACADÉMICO DEMO con WeasyPrint.

    Retorna el PDF generado con tabla de notas,
    promedio ponderado y total de créditos.
    No requiere autenticación — es endpoint de desarrollo.
    """
    try:
        ruta_pdf: Path = generar_record_academico_demo()
        logger.info("Récord académico demo generado: %s", ruta_pdf.name)
        return FileResponse(
            path=str(ruta_pdf),
            media_type="application/pdf",
            filename=ruta_pdf.name,
            headers={
                "X-Generated-By": "CUL-Document-Engine/1.0",
                "X-File-Path": str(ruta_pdf),
            },
        )
    except ImportError as e:
        logger.error("WeasyPrint no instalado: %s", e)
        raise HTTPException(
            status_code=501,
            detail=(
                "WeasyPrint no está instalado en este servidor. "
                "Ejecute: pip install weasyprint Pillow"
            ),
        )
    except Exception as e:
        logger.exception("Error al generar el récord académico demo")
        raise HTTPException(
            status_code=503,
            detail=f"Error interno del motor documental: {e}",
        )


@router.get("/certificado-real/{id_solicitud}")
async def endpoint_certificado_real(id_solicitud: int):
    """
    Genera un certificado de estudio con datos REALES desde NeonDB.

    Consulta la solicitud por ID y obtiene los datos del estudiante
    desde las tablas usuarios + solicitudes + tipos_solicitud + respuestas.

    Retorna PDF institucional con datos reales.
    No requiere autenticación — es endpoint de desarrollo.
    """
    conn = None
    try:
        conn = get_db_connection()
        ruta_pdf: Path = generar_certificado_desde_solicitud(conn, id_solicitud)
        logger.info(
            "Certificado real generado: solicitud=%s | archivo=%s",
            id_solicitud,
            ruta_pdf.name,
        )
        return FileResponse(
            path=str(ruta_pdf),
            media_type="application/pdf",
            filename=ruta_pdf.name,
            headers={
                "X-Generated-By": "CUL-Document-Engine/1.0",
                "X-Solicitud-ID": str(id_solicitud),
                "X-File-Path": str(ruta_pdf),
            },
        )
    except ValueError as e:
        logger.warning("Solicitud no encontrada: %s", e)
        raise HTTPException(status_code=404, detail=str(e))
    except ImportError as e:
        logger.error("WeasyPrint no instalado: %s", e)
        raise HTTPException(
            status_code=501,
            detail=(
                "WeasyPrint no está instalado en este servidor. "
                "Ejecute: pip install weasyprint Pillow"
            ),
        )
    except Exception as e:
        logger.exception("Error al generar certificado real")
        raise HTTPException(
            status_code=503,
            detail=f"Error interno del motor documental: {e}",
        )
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
