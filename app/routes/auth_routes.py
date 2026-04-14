from fastapi import APIRouter, Depends
from app.models.auth_model import LoginRequest, TokenResponse, TokenData
from app.controllers.auth_controller import AuthController, obtener_usuario_actual

router    = APIRouter(prefix="/auth", tags=["Autenticación"])
auth_ctrl = AuthController()


@router.post("/login", response_model=TokenResponse)
async def login(datos: LoginRequest):
    """
    Inicia sesión con correo y contraseña.
    Retorna un token JWT + datos del usuario (nombre, rol, id).
    El frontend guarda el token en sessionStorage y lo envía
    en cada petición como: Authorization: Bearer {token}
    """
    return auth_ctrl.login(datos)


@router.get("/me", response_model=TokenData)
async def obtener_perfil(usuario: TokenData = Depends(obtener_usuario_actual)):
    """
    Retorna los datos del usuario autenticado a partir del token.
    El frontend puede llamar esto para verificar si la sesion sigue activa.
    """
    return usuario