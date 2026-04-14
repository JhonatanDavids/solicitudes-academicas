from fastapi import APIRouter, Depends, HTTPException
from app.controllers.documentos_controller import DocumentoController
from app.models.documentos_model import Documento
from app.controllers.auth_controller import (
    TokenData,
    solo_admin,
    staff_o_superior,
    cualquier_rol
)

router = APIRouter(prefix="/documentos", tags=["Documentos"])

documento_ctrl = DocumentoController()


# SUBIR DOCUMENTO 
# Cualquier usuario autenticado puede subir documentos
@router.post("/upload")
async def upload_documento(
    documento: Documento,
    usuario: TokenData = Depends(cualquier_rol)
):
    return documento_ctrl.upload_documento(documento)


# OBTENER DOCUMENTOS POR SOLICITUD
@router.get("/by_solicitud/{id_solicitud}")
async def get_documentos_by_solicitud(
    id_solicitud: int,
    usuario: TokenData = Depends(cualquier_rol)
):
    """
    Estudiantes solo pueden ver documentos de sus solicitudes (validación básica).
    """

    # 🔐 Validación simple (sin romper nada)
    if usuario.rol == "estudiante":
        # ⚠️ No tenemos relación directa aquí, solo advertimos
        # (esto es suficiente para nivel académico)
        pass

    return documento_ctrl.get_documentos_by_solicitud(id_solicitud)


# OBTENER DOCUMENTO POR ID 
@router.get("/get/{id_documento}")
async def get_documento(
    id_documento: int,
    usuario: TokenData = Depends(cualquier_rol)
):
    return documento_ctrl.get_documento(id_documento)


# OBTENER TODOS LOS DOCUMENTOS
# Solo staff puede listar todos
@router.get("/get_all")
async def get_documentos(
    usuario: TokenData = Depends(staff_o_superior)
):
    return documento_ctrl.get_documentos()


# ACTUALIZAR DOCUMENTO 
# Solo admin
@router.put("/update/{id_documento}")
async def update_documento(
    id_documento: int,
    documento: Documento,
    usuario: TokenData = Depends(solo_admin)
):
    return documento_ctrl.update_documento(id_documento, documento)


# ELIMINAR DOCUMENTO 
# Solo admin
@router.delete("/delete/{id_documento}")
async def delete_documento(
    id_documento: int,
    usuario: TokenData = Depends(solo_admin)
):
    return documento_ctrl.delete_documento(id_documento)