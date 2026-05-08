from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class TipoSolicitudBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    requiere_documento: bool = False

class TipoSolicitudCreate(TipoSolicitudBase):
    pass

class TipoSolicitudResponse(TipoSolicitudBase):
    id_tipo_solicitud: int
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

TipoSolicitud = TipoSolicitudResponse