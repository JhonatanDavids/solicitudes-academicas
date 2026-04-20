import os
import bcrypt
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config.db_config import get_db_connection
from app.models.auth_model import LoginRequest, TokenResponse, TokenData

load_dotenv()

CLAVE_SECRETA = os.getenv("JWT_SECRET", "fallback_dev_only_change_in_production")
ALGORITMO      = "HS256"
MINUTOS_EXPIRA = 480

esquema_bearer = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def _is_bcrypt_hash(s: str) -> bool:
    return s.startswith("$2b$") or s.startswith("$2a$") or s.startswith("$2y$")


def _migrate_password(id_usuario: int, plain_password: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        new_hash = hash_password(plain_password)
        cursor.execute(
            "UPDATE usuarios SET contrasena = %s WHERE id_usuario = %s",
            (new_hash, id_usuario)
        )
        conn.commit()
    except Exception:
        pass
    finally:
        if cursor: cursor.close()
        if conn:   conn.close()


def generar_token(datos: dict) -> str:
    """Crea un JWT firmado con los datos del usuario y fecha de expiración."""
    payload = datos.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=MINUTOS_EXPIRA)
    return jwt.encode(payload, CLAVE_SECRETA, algorithm=ALGORITMO)

def verificar_token(token: str) -> TokenData:
    """Decodifica el JWT y retorna los datos del usuario. Lanza 401 si es inválido."""
    try:
        payload    = jwt.decode(token, CLAVE_SECRETA, algorithms=[ALGORITMO])
        id_usuario = payload.get("id_usuario")
        correo     = payload.get("correo")
        rol        = payload.get("rol")
        if id_usuario is None or correo is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return TokenData(id_usuario=id_usuario, correo=correo, rol=rol)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(esquema_bearer)
) -> TokenData:
    """
    Dependencia inyectable en cualquier ruta protegida.
    Extrae y verifica el token del header Authorization.

    Uso en una ruta:
        @router.get("/ruta")
        def ruta(usuario = Depends(obtener_usuario_actual)):
            return {"rol": usuario.rol}
    """
    return verificar_token(credenciales.credentials)


#  Dependencias por rol 
def solo_admin(usuario: TokenData = Depends(obtener_usuario_actual)) -> TokenData:
    """Solo admin puede acceder."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso restringido — se requiere rol admin")
    return usuario

def admin_o_coordinador(usuario: TokenData = Depends(obtener_usuario_actual)) -> TokenData:
    """Admin y coordinador pueden acceder."""
    if usuario.rol not in ("admin", "coordinador"):
        raise HTTPException(status_code=403, detail="Acceso restringido — se requiere coordinador o admin")
    return usuario

def staff_o_superior(usuario: TokenData = Depends(obtener_usuario_actual)) -> TokenData:
    """Funcionario, coordinador y admin pueden acceder."""
    if usuario.rol not in ("funcionario", "coordinador", "admin"):
        raise HTTPException(status_code=403, detail="Acceso restringido — se requiere personal administrativo")
    return usuario

def cualquier_rol(usuario: TokenData = Depends(obtener_usuario_actual)) -> TokenData:
    """Cualquier usuario autenticado puede acceder."""
    return usuario

class AuthController:

    def login(self, datos: LoginRequest) -> TokenResponse:
        """
        Verifica correo y contraseña contra la BD.
        Si son correctos genera y retorna un JWT.
        El frontend lo guarda en sessionStorage y lo incluye en
        cada petición como: Authorization: Bearer {token}
        """
        conn   = None
        cursor = None
        try:
            conn   = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT u.id_usuario, u.nombre, u.apellido, u.correo,
                       u.contrasena, u.estado, r.nombre_rol
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.correo = %s
            """, (datos.correo,))

            resultado = cursor.fetchone()

            if not resultado:
                raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

            id_usuario, nombre, apellido, correo, contrasena_bd, estado, rol = resultado

            if estado != "activo":
                raise HTTPException(status_code=403, detail="La cuenta está inactiva o suspendida")

            valid = False
            if _is_bcrypt_hash(contrasena_bd) and verify_password(datos.contrasena, contrasena_bd):
                valid = True
            elif datos.contrasena == contrasena_bd:
                valid = True
                _migrate_password(id_usuario, datos.contrasena)

            if not valid:
                raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

            token = generar_token({
                "id_usuario": id_usuario,
                "correo":     correo,
                "rol":        rol
            })

            return TokenResponse(
                access_token = token,
                id_usuario   = id_usuario,
                nombre       = nombre,
                apellido     = apellido,
                rol          = rol,
                correo       = correo
            )

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Error interno al iniciar sesión")
        finally:
            if cursor: cursor.close()
            if conn:   conn.close()