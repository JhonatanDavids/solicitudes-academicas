from pydantic import BaseModel
from typing import Optional

class PasoAprobacion(BaseModel):
    id_paso: int | None = None
    id_tipo_solicitud: int
    orden: int
    id_rol_encargado: int
    es_obligatorio: bool = True
    descripcion_paso: str | None = None