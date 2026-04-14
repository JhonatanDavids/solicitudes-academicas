from pydantic import BaseModel
from typing import Optional

class Usuario(BaseModel):
    id_usuario: int | None = None
    nombre: str
    apellido: str
    correo: str
    contrasena: str
    cedula: Optional[str] = None
    programa: Optional[str] = None
    semestre: Optional[int] = None
    estado: Optional[str] = "activo"        #activo, inactivo y suspendido
    id_rol: int


