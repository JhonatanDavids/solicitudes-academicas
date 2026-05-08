from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class RegistroSistemaBase(BaseModel):
    accion:      str
    descripcion: Optional[str] = None
    id_usuario:  Optional[int] = None

class RegistroSistemaCreate(RegistroSistemaBase):
    pass

class RegistroSistemaResponse(RegistroSistemaBase):
    id_registro: int
    fecha:       datetime
    model_config = ConfigDict(from_attributes=True)

RegistroSistema = RegistroSistemaResponse