from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class EstadoSolicitudEnum(str, Enum):
    pendiente            = "pendiente"
    en_revision          = "en_revision"
    aprobada             = "aprobada"
    rechazada            = "rechazada"
    cancelada            = "cancelada"
    en_espera_documentos = "en_espera_documentos"

class HistorialEstadoBase(BaseModel):
    id_solicitud:    int
    estado_anterior: Optional[EstadoSolicitudEnum] = None
    estado_nuevo:    EstadoSolicitudEnum
    id_usuario:      Optional[int] = None
    comentario:      Optional[str] = None

class HistorialEstadoCreate(HistorialEstadoBase):
    pass

class HistorialEstado(HistorialEstadoBase):
    id_historial: int
    fecha_cambio: datetime

    class Config:
        from_attributes = True