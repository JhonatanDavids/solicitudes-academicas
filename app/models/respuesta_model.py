from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class RespuestaBase(BaseModel):
    id_solicitud:      int
    id_usuario:        int
    numero_resolucion: Optional[str]  = None
    motivo:            str
    fecha_vigencia:    Optional[date] = None
    observaciones:     Optional[str]  = None
    archivo_pdf:       Optional[str]  = None

class RespuestaCreate(RespuestaBase):
    pass

class Respuesta(RespuestaBase):
    id_respuesta:    int
    fecha_respuesta: datetime

    class Config:
        from_attributes = True