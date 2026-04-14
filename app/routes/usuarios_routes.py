from fastapi import APIRouter, Depends
from app.controllers.usuarios_controller import UsuarioController
from app.models.usuarios_model import Usuario
from app.controllers.auth_controller import (
    solo_admin,
    admin_o_coordinador,
    staff_o_superior,
    cualquier_rol
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

usuario_ctrl = UsuarioController()

# SOLO ADMIN
@router.post("/create")
async def create_usuario(usuario: Usuario, user=Depends(solo_admin)):
    return usuario_ctrl.create_usuario(usuario)

# ADMIN O COORDINADOR
@router.get("/get/{id_usuario}")
async def get_usuario(id_usuario: int, user=Depends(admin_o_coordinador)):
    return usuario_ctrl.get_usuario(id_usuario)

# SOLO ADMIN
@router.get("/get_all")
async def get_usuarios(user=Depends(solo_admin)):
    return usuario_ctrl.get_usuarios()

# SOLO ADMIN
@router.get("/by_rol/{id_rol}")
async def get_usuarios_by_rol(id_rol: int, user=Depends(solo_admin)):
    return usuario_ctrl.get_usuarios_by_rol(id_rol)

# STAFF (funcionario, coordinador, admin)
@router.get("/by_cedula/{cedula}")
async def get_usuario_by_cedula(cedula: str, user=Depends(staff_o_superior)):
    return usuario_ctrl.get_usuario_by_cedula(cedula)

# SOLO ADMIN
@router.put("/update_estado/{id_usuario}")
async def update_estado_usuario(id_usuario: int, nuevo_estado: str, user=Depends(solo_admin)):
    return usuario_ctrl.update_estado_usuario(id_usuario, nuevo_estado)

# SOLO ADMIN
@router.put("/update/{id_usuario}")
async def update_usuario(id_usuario: int, usuario: Usuario, user=Depends(solo_admin)):
    return usuario_ctrl.update_usuario(id_usuario, usuario)

# SOLO ADMIN
@router.delete("/delete/{id_usuario}")
async def delete_usuario(id_usuario: int, user=Depends(solo_admin)):
    return usuario_ctrl.delete_usuario(id_usuario)