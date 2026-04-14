from fastapi import APIRouter, Depends
from app.controllers.respuesta_controller import RespuestaController
from app.models.respuesta_model import Respuesta
from app.controllers.auth_controller import (
    TokenData,
    solo_admin,
    admin_o_coordinador,
    staff_o_superior,
    cualquier_rol
)

router = APIRouter(prefix="/respuestas", tags=["Respuestas"])
respuesta_ctrl = RespuestaController()


# CREAR RESPUESTA 
# Solo coordinador o admin puede crear respuestas oficiales
@router.post("/create")
async def create_respuesta(respuesta: Respuesta, usuario: TokenData = Depends(admin_o_coordinador)):
    """
    Crea una respuesta oficial para una solicitud.
    Requiere: coordinador o admin.
    """
    return respuesta_ctrl.create_respuesta(respuesta)


# OBTENER RESPUESTA POR SOLICITUD 
# Cualquier usuario autenticado puede ver respuestas
@router.get("/by_solicitud/{id_solicitud}")
async def get_respuesta_by_solicitud(id_solicitud: int, usuario: TokenData = Depends(cualquier_rol)):
    """
    Obtiene la respuesta de una solicitud.
    Los estudiantes pueden ver las respuestas de sus solicitudes.
    """
    return respuesta_ctrl.get_respuesta_by_solicitud(id_solicitud)


# OBTENER RESPUESTA POR ID 
# Cualquier usuario autenticado
@router.get("/get/{id_respuesta}")
async def get_respuesta(id_respuesta: int, usuario: TokenData = Depends(cualquier_rol)):
    """
    Obtiene una respuesta específica por ID.
    """
    return respuesta_ctrl.get_respuesta(id_respuesta)


# OBTENER TODAS LAS RESPUESTAS
# Solo staff puede listar todas
@router.get("/get_all")
async def get_respuestas(usuario: TokenData = Depends(staff_o_superior)):
    """
    Lista todas las respuestas del sistema.
    Requiere: funcionario, coordinador o admin.
    """
    return respuesta_ctrl.get_respuestas()


# ACTUALIZAR RESPUESTA 
# Solo coordinador o admin puede actualizar respuestas
@router.put("/update/{id_respuesta}")
async def update_respuesta(
    id_respuesta: int, 
    respuesta: Respuesta, 
    usuario: TokenData = Depends(admin_o_coordinador)
):
    """
    Actualiza una respuesta existente.
    Requiere: coordinador o admin.
    """
    return respuesta_ctrl.update_respuesta(id_respuesta, respuesta)


# ELIMINAR RESPUESTA 
# Solo admin puede eliminar respuestas
@router.delete("/delete/{id_respuesta}")
async def delete_respuesta(id_respuesta: int, usuario: TokenData = Depends(solo_admin)):
    """
    Elimina una respuesta del sistema.
    Requiere: admin.
    """
    return respuesta_ctrl.delete_respuesta(id_respuesta)