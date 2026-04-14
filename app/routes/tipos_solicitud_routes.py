from fastapi import APIRouter, Depends
from app.controllers.tipos_solicitud_controller import TipoSolicitudController
from app.models.tipos_solicitud_model import TipoSolicitud
from app.controllers.auth_controller import (
    TokenData,
    solo_admin,
    cualquier_rol
)

router = APIRouter(prefix="/tipos", tags=["Tipos de Solicitud"])
tipo_ctrl = TipoSolicitudController()


# CREAR TIPO DE SOLICITUD
# Solo admin puede crear nuevos tipos
@router.post("/create")
async def create_tipo(tipo: TipoSolicitud, usuario: TokenData = Depends(solo_admin)):
    """
    Crea un nuevo tipo de solicitud.
    Requiere: admin.
    """
    return tipo_ctrl.create_tipo(tipo)


# OBTENER TODOS LOS TIPOS 
# Cualquier usuario autenticado puede ver los tipos disponibles
@router.get("/get_all")
async def get_tipos(usuario: TokenData = Depends(cualquier_rol)):
    """
    Lista todos los tipos de solicitud disponibles.
    Disponible para cualquier usuario autenticado.
    """
    return tipo_ctrl.get_tipos()


# OBTENER TIPO POR ID 
# Cualquier usuario autenticado
@router.get("/get/{id_tipo}")
async def get_tipo(id_tipo: int, usuario: TokenData = Depends(cualquier_rol)):
    """
    Obtiene un tipo de solicitud específico por ID.
    """
    return tipo_ctrl.get_tipo(id_tipo)


# ACTUALIZAR TIPO 
# Solo admin puede modificar tipos
@router.put("/update/{id_tipo}")
async def update_tipo(id_tipo: int, tipo: TipoSolicitud, usuario: TokenData = Depends(solo_admin)):
    """
    Actualiza un tipo de solicitud existente.
    Requiere: admin.
    """
    return tipo_ctrl.update_tipo(id_tipo, tipo)


# ELIMINAR TIPO
# Solo admin puede eliminar tipos
@router.delete("/delete/{id_tipo}")
async def delete_tipo(id_tipo: int, usuario: TokenData = Depends(solo_admin)):
    """
    Elimina un tipo de solicitud del sistema.
    Requiere: admin.
    ⚠️ Cuidado: No eliminar tipos con solicitudes activas.
    """
    return tipo_ctrl.delete_tipo(id_tipo)