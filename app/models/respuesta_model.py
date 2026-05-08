from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

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

class RespuestaResponse(RespuestaBase):
    id_respuesta:    int
    fecha_respuesta: datetime
    model_config = ConfigDict(from_attributes=True)

Respuesta = RespuestaResponse