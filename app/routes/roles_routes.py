from fastapi import APIRouter, Depends
from app.controllers.roles_controller import RolController
from app.models.roles_model import Rol
from app.controllers.auth_controller import (
    TokenData,
    solo_admin,
    staff_o_superior,
    cualquier_rol
)

router = APIRouter(prefix="/roles", tags=["Roles"])
rol_ctrl = RolController()


# CREAR ROL 
# Solo admin puede crear nuevos roles
@router.post("/create")
async def create_rol(rol: Rol, usuario: TokenData = Depends(solo_admin)):
    """
    Crea un nuevo rol en el sistema.
    Requiere: admin.
    """
    return rol_ctrl.create_rol(rol)


# OBTENER TODOS LOS ROLES ─
# Cualquier usuario autenticado puede ver los roles disponibles
@router.get("/get_all")
async def get_roles(usuario: TokenData = Depends(cualquier_rol)):
    """
    Lista todos los roles del sistema.
    Disponible para cualquier usuario autenticado.
    """
    return rol_ctrl.get_roles()


# OBTENER ROL POR ID 
# Cualquier usuario autenticado
@router.get("/get/{id_rol}")
async def get_rol(id_rol: int, usuario: TokenData = Depends(cualquier_rol)):
    """
    Obtiene un rol específico por ID.
    """
    return rol_ctrl.get_rol(id_rol)


# ACTUALIZAR ROL 
# Solo admin puede modificar roles
@router.put("/update/{id_rol}")
async def update_rol(id_rol: int, rol: Rol, usuario: TokenData = Depends(solo_admin)):
    """
    Actualiza un rol existente.
    Requiere: admin.
    """
    return rol_ctrl.update_rol(id_rol, rol)


# ELIMINAR ROL 
# Solo admin puede eliminar roles
@router.delete("/delete/{id_rol}")
async def delete_rol(id_rol: int, usuario: TokenData = Depends(solo_admin)):
    """
    Elimina un rol del sistema.
    Requiere: admin.
    ⚠️ Cuidado: No eliminar roles con usuarios asignados.
    """
    return rol_ctrl.delete_rol(id_rol)