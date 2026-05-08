from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class DocumentoBase(BaseModel):
    id_solicitud: int
    nombre_archivo: str
    tipo_archivo: str
    ruta_archivo: str

class DocumentoCreate(DocumentoBase):
    pass

class DocumentoResponse(DocumentoBase):
    id_documento: int
    fecha_subida: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

Documento = DocumentoResponse