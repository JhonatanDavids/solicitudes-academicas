from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class RolBase(BaseModel):
    nombre_rol: str
    descripcion: Optional[str] = None

class RolCreate(RolBase):
    pass

class RolResponse(RolBase):
    id_rol: Optional[int] = None
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

Rol = RolResponse