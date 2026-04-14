from fastapi import APIRouter, Depends
from app.controllers.solicitudes_controller import SolicitudController
from app.models.solicitudes_model import Solicitud
from app.controllers.auth_controller import (
    TokenData,
    solo_admin,
    admin_o_coordinador,
    staff_o_superior,
    cualquier_rol
)

router = APIRouter(prefix="/solicitudes", tags=["Solicitudes"])
solicitud_ctrl = SolicitudController()


# CREAR SOLICITUD 
# Cualquier usuario autenticado puede crear su propia solicitud
@router.post("/create")
async def create_solicitud(solicitud: Solicitud, usuario: TokenData = Depends(cualquier_rol)):
    """
    Crea una nueva solicitud académica.
    El estudiante solo puede crear solicitudes para sí mismo.
    """
    # Validacion: estudiantes solo pueden crear solicitudes propias
    if usuario.rol == "estudiante" and solicitud.id_usuario != usuario.id_usuario:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403, 
            detail="Solo puedes crear solicitudes para tu propia cuenta"
        )
    
    # Forzar estado inicial — ignorar cualquier valor enviado desde el frontend
    solicitud.estado_actual = "pendiente"
    
    return solicitud_ctrl.create_solicitud(solicitud)


# OBTENER TODAS LAS SOLICITUDES 
# Solo staff (funcionario, coordinador, admin) puede ver todas
@router.get("/get_all")
async def get_solicitudes(usuario: TokenData = Depends(staff_o_superior)):
    """
    Retorna todas las solicitudes del sistema.
    Requiere: funcionario, coordinador o admin.
    """
    return solicitud_ctrl.get_solicitudes()


# OBTENER SOLICITUD POR ID 
# Cualquier usuario autenticado, pero solo ve las suyas si es estudiante
@router.get("/get/{id_solicitud}")
async def get_solicitud(id_solicitud: int, usuario: TokenData = Depends(cualquier_rol)):
    """
    Obtiene una solicitud específica por ID.
    Los estudiantes solo pueden ver sus propias solicitudes.
    """
    solicitud = solicitud_ctrl.get_solicitud(id_solicitud)
    
    # Validación: estudiantes solo ven sus propias solicitudes
    if usuario.rol == "estudiante" and solicitud["id_usuario"] != usuario.id_usuario:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para ver esta solicitud"
        )
    
    return solicitud


# SOLICITUDES POR USUARIO 
# Cualquier usuario, pero estudiantes solo ven las suyas
@router.get("/by_usuario/{id_usuario}")
async def get_solicitudes_by_usuario(id_usuario: int, usuario: TokenData = Depends(cualquier_rol)):
    """
    Obtiene todas las solicitudes de un usuario específico.
    Los estudiantes solo pueden consultar sus propias solicitudes.
    """
    # Validación: estudiantes solo consultan sus propias solicitudes
    if usuario.rol == "estudiante" and id_usuario != usuario.id_usuario:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403, 
            detail="Solo puedes consultar tus propias solicitudes"
        )
    
    return solicitud_ctrl.get_solicitudes_by_usuario(id_usuario)


# SOLICITUDES POR ESTADO 
# Solo staff puede filtrar por estado
@router.get("/by_estado/{estado}")
async def get_solicitudes_by_estado(estado: str, usuario: TokenData = Depends(staff_o_superior)):
    """
    Filtra solicitudes por estado.
    Requiere: funcionario, coordinador o admin.
    """
    return solicitud_ctrl.get_solicitudes_by_estado(estado)


# ACTUALIZAR ESTADO 
# Funcionario, coordinador o admin pueden cambiar estados según sus permisos definidos
@router.put("/update_estado/{id_solicitud}")
async def update_estado_solicitud(
    id_solicitud: int, 
    nuevo_estado: str, 
    usuario: TokenData = Depends(staff_o_superior)
):
    """
    Actualiza el estado de una solicitud.
    Funcionario: solo 'en_revision'.
    Coordinador: solo 'aprobada', 'rechazada'.
    Admin: acceso total.
    """
    from fastapi import HTTPException
    
    if usuario.rol == "funcionario":
        if nuevo_estado != "en_revision":
            raise HTTPException(status_code=403, detail="Funcionario solo puede enviar a revisión")
    
    elif usuario.rol == "coordinador":
        if nuevo_estado not in ["aprobada", "rechazada"]:
            raise HTTPException(status_code=403, detail="Coordinador solo puede aprobar o rechazar")
            
    elif usuario.rol == "admin":
        pass  # acceso total
        
    return solicitud_ctrl.update_estado_solicitud(id_solicitud, nuevo_estado)


# ACTUALIZAR SOLICITUD COMPLETA 
# Solo admin puede editar solicitudes completas
@router.put("/update/{id_solicitud}")
async def update_solicitud(
    id_solicitud: int, 
    solicitud: Solicitud, 
    usuario: TokenData = Depends(solo_admin)
):
    """
    Actualiza todos los campos de una solicitud.
    Requiere: admin.
    """
    return solicitud_ctrl.update_solicitud(id_solicitud, solicitud)


# ELIMINAR SOLICITUD 
# Solo admin puede eliminar solicitudes
@router.delete("/delete/{id_solicitud}")
async def delete_solicitud(id_solicitud: int, usuario: TokenData = Depends(solo_admin)):
    """
    Elimina una solicitud del sistema.
    Requiere: admin.
    """
    return solicitud_ctrl.delete_solicitud(id_solicitud)