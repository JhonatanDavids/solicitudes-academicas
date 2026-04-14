from pydantic import BaseModel
from typing import Optional

class Documento(BaseModel):
    id_documento: int | None = None
    id_solicitud: int
    nombre_archivo: str
    tipo_archivo: str
    ruta_archivo: str 