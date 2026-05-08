from typing import Optional
from pydantic import BaseModel, ConfigDict

class PasoAprobacionBase(BaseModel):
    id_tipo_solicitud: int
    orden: int
    id_rol_encargado: int
    es_obligatorio: bool = True
    descripcion_paso: Optional[str] = None

class PasoAprobacionCreate(PasoAprobacionBase):
    pass

class PasoAprobacionResponse(PasoAprobacionBase):
    id_paso: int
    model_config = ConfigDict(from_attributes=True)

PasoAprobacion = PasoAprobacionResponse