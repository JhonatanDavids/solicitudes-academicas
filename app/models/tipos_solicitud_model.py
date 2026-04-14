from pydantic import BaseModel
from typing import Optional

class TipoSolicitud(BaseModel):
    id_tipo_solicitud: int | None = None
    nombre: str
    descripcion: Optional[str] = None
    requiere_documento: bool = False