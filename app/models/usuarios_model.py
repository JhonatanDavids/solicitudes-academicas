from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.enums import EstadoUsuario

class UsuarioBase(BaseModel):
    nombre: str
    apellido: str
    cedula: Optional[str] = None
    correo: EmailStr
    programa: Optional[str] = None
    semestre: Optional[int] = None
    estado: EstadoUsuario = EstadoUsuario.activo
    id_rol: int

class UsuarioCreate(UsuarioBase):
    contrasena: str

class UsuarioResponse(UsuarioBase):
    id_usuario: int
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

Usuario = UsuarioResponse