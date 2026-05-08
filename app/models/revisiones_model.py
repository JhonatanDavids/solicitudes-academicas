from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import DecisionRevision

class RevisionBase(BaseModel):
    id_solicitud: int
    id_usuario: int
    id_paso: Optional[int] = None
    decision: DecisionRevision
    comentario: Optional[str] = None
    estado_revision: str

class RevisionCreate(RevisionBase):
    pass

class RevisionResponse(RevisionBase):
    id_revision: int
    fecha_revision: Optional[datetime] = None
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

Revision = RevisionResponse