from pydantic import BaseModel
from typing import Optional

class Solicitud(BaseModel):
    id_solicitud: int | None = None
    id_usuario: int
    id_tipo_solicitud: int
    descripcion: Optional[str] = None
    prioridad: Optional[str] = "media"          #baja, media, alta y urgente 
    estado_actual: Optional[str] = "pendiente"