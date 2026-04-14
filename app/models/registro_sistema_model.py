from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RegistroSistemaBase(BaseModel):
    accion:      str
    descripcion: Optional[str] = None
    id_usuario:  Optional[int] = None

class RegistroSistemaCreate(RegistroSistemaBase):
    pass

class RegistroSistema(RegistroSistemaBase):
    id_registro: int
    fecha:       datetime

    class Config:
        from_attributes = True