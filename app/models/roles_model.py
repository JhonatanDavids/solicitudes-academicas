from pydantic import BaseModel
from typing import Optional

class Rol(BaseModel):
    id_rol: int | None = None
    nombre_rol: str
    descripcion: Optional[str] = None