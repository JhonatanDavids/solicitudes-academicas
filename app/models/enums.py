from enum import Enum

class EstadoUsuario(str, Enum):
    activo = "activo"
    inactivo = "inactivo"

class EstadoSolicitud(str, Enum):
    pendiente = "pendiente"
    aprobada = "aprobada"
    rechazada = "rechazada"
    en_revision = "en_revision"

class PrioridadSolicitud(str, Enum):
    baja = "baja"
    media = "media"
    alta = "alta"
    urgente = "urgente"

class DecisionRevision(str, Enum):
    aprobado = "aprobado"
    rechazado = "rechazado"
    observado = "observado"