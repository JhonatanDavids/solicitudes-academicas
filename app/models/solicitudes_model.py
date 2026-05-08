from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import EstadoSolicitud, PrioridadSolicitud

class SolicitudBase(BaseModel):
    id_usuario: int
    id_tipo_solicitud: int
    descripcion: Optional[str] = None
    prioridad: PrioridadSolicitud = PrioridadSolicitud.media
    estado_actual: EstadoSolicitud = EstadoSolicitud.pendiente

class SolicitudCreate(SolicitudBase):
    pass

class SolicitudResponse(SolicitudBase):
    id_solicitud: int
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

Solicitud = SolicitudResponse