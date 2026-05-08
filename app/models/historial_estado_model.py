from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import EstadoSolicitud

class HistorialEstadoBase(BaseModel):
    id_solicitud:    int
    estado_anterior: Optional[EstadoSolicitud] = None
    estado_nuevo:    EstadoSolicitud
    id_usuario:      Optional[int] = None
    comentario:      Optional[str] = None

class HistorialEstadoCreate(HistorialEstadoBase):
    pass

class HistorialEstadoResponse(HistorialEstadoBase):
    id_historial: int
    fecha_cambio: datetime
    model_config = ConfigDict(from_attributes=True)

HistorialEstado = HistorialEstadoResponse