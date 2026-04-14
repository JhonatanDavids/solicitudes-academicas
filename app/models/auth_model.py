from pydantic import BaseModel
from typing import Optional

# Lo que el usuario envia para iniciar sesion
class LoginRequest(BaseModel):
    correo:     str
    contrasena: str

# Lo que el servidor retorna al hacer login exitoso
class TokenResponse(BaseModel):
    access_token: str        # JWT que el frontend guarda en sessionStorage
    token_type:   str = "bearer"
    id_usuario:   int
    nombre:       str
    apellido:     str
    rol:          str        # estudiante | funcionario | coordinador | admin
    correo:       str

# Datos que viajan dentro del token (payload decodificado)
class TokenData(BaseModel):
    id_usuario: Optional[int] = None
    correo:     Optional[str] = None
    rol:        Optional[str] = None