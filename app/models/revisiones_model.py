from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class EstadoRevisionEnum(str, Enum):
    aprobado = "aprobado"
    rechazado = "rechazado"
    observado = "observado"


class RevisionCreate(BaseModel):
    id_solicitud: int
    comentario: Optional[str] = None
    estado_revision: EstadoRevisionEnum


class Revision(BaseModel):
    id_revision: int
    id_solicitud: int
    id_usuario: int
    comentario: Optional[str] = None
    estado_revision: EstadoRevisionEnum
    fecha_creacion: datetime
