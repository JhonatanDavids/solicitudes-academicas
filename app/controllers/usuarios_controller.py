import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.usuarios_model import Usuario
from fastapi.encoders import jsonable_encoder
from app.controllers.auth_controller import hash_password


class UsuarioController:
    def create_usuario(self, usuario: Usuario):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # ── Determinar rol para validar campos ──
            cursor.execute("SELECT nombre_rol FROM roles WHERE id_rol = %s", (usuario.id_rol,))
            rol_row = cursor.fetchone()
            rol_nombre = rol_row[0].lower() if rol_row else ""

            # ── Estudiantes requieren programa y semestre ──
            if rol_nombre == "estudiante":
                if not usuario.programa or not usuario.semestre or usuario.semestre < 1:
                    raise HTTPException(
                        status_code=400,
                        detail="Programa y semestre son obligatorios para estudiantes"
                    )

            # ── Normalizar valores NULL para no-estudiantes ──
            programa_val = usuario.programa if usuario.programa else None
            semestre_val = usuario.semestre if usuario.semestre else None

            hashed_pw = hash_password(usuario.contrasena)
            cursor.execute(
                """INSERT INTO usuarios (nombre, apellido, correo, contrasena, cedula, programa, semestre, estado, id_rol) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    usuario.nombre,
                    usuario.apellido,
                    usuario.correo,
                    hashed_pw,
                    usuario.cedula,
                    programa_val,
                    semestre_val,
                    usuario.estado,
                    usuario.id_rol,
                ),
            )
            conn.commit()

            # ── NOTIFICACIÓN POR CORREO: bienvenida ──
            try:
                rol_display = rol_row[0] if rol_row else "Usuario"
                from app.services.email_service import notificar_usuario_creado
                notificar_usuario_creado(usuario.correo, usuario.nombre, usuario.apellido, rol_display)
            except Exception:
                pass  # El correo no debe bloquear la creación del usuario

            return {"resultado": "Usuario creado exitosamente"}
        except HTTPException:
            if conn:
                conn.rollback()
            raise
        except psycopg2.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail="Error al crear el usuario")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def get_usuario(self, id_usuario: int):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT u.id_usuario, u.nombre, u.apellido, u.correo,
                       u.cedula, u.programa, u.semestre, u.estado,
                       u.fecha_creacion, u.fecha_actualizacion, r.nombre_rol
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.id_usuario = %s
            """,
                (id_usuario,),
            )
            result = cursor.fetchone()
            if result:
                content = {
                    "id_usuario": result[0],
                    "nombre": result[1],
                    "apellido": result[2],
                    "correo": result[3],
                    "cedula": result[4],
                    "programa": result[5],
                    "semestre": result[6],
                    "estado": result[7],
                    "fecha_creacion": str(result[8]) if result[8] else None,
                    "fecha_actualizacion": str(result[9]) if result[9] else None,
                    "rol": result[10],
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
        except psycopg2.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener el usuario")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def get_usuarios(self):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.id_usuario, u.nombre, u.apellido, u.correo,
                       u.cedula, u.programa, u.semestre, u.estado,
                       u.fecha_creacion, u.fecha_actualizacion, r.nombre_rol
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                ORDER BY u.nombre
            """)
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    "id_usuario": data[0],
                    "nombre": data[1],
                    "apellido": data[2],
                    "correo": data[3],
                    "cedula": data[4],
                    "programa": data[5],
                    "semestre": data[6],
                    "estado": data[7],
                    "fecha_creacion": str(data[8]) if data[8] else None,
                    "fecha_actualizacion": str(data[9]) if data[9] else None,
                    "rol": data[10],
                }
                payload.append(content)
            return {"resultado": jsonable_encoder(payload)}
        except psycopg2.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener los usuarios")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def get_usuario_by_cedula(self, cedula: str):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT u.id_usuario, u.nombre, u.apellido, u.correo,
                       u.cedula, u.programa, u.semestre, u.estado,
                       u.fecha_creacion, u.fecha_actualizacion, r.nombre_rol
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.cedula = %s
            """,
                (cedula,),
            )
            result = cursor.fetchone()
            if result:
                content = {
                    "id_usuario": result[0],
                    "nombre": result[1],
                    "apellido": result[2],
                    "correo": result[3],
                    "cedula": result[4],
                    "programa": result[5],
                    "semestre": result[6],
                    "estado": result[7],
                    "fecha_creacion": str(result[8]) if result[8] else None,
                    "fecha_actualizacion": str(result[9]) if result[9] else None,
                    "rol": result[10],
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
        except psycopg2.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail="Error al buscar el usuario")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def update_estado_usuario(self, id_usuario: int, nuevo_estado: str):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE usuarios SET estado = %s WHERE id_usuario = %s",
                (nuevo_estado, id_usuario),
            )
            conn.commit()
            return {"resultado": "Estado actualizado correctamente"}
        except psycopg2.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail="Error al actualizar el estado")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def delete_usuario(self, id_usuario: int):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM usuarios WHERE id_usuario = %s", (id_usuario,))
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            return {"resultado": "Usuario eliminado"}
        except psycopg2.errors.ForeignKeyViolation:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=409, detail="No se puede eliminar el usuario porque tiene información asociada en el sistema.")
        except psycopg2.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail="Error al eliminar el usuario")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def get_usuarios_by_rol(self, id_rol: int):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT u.id_usuario, u.nombre, u.apellido, u.correo,
                       u.cedula, u.programa, u.semestre, u.estado,
                       u.fecha_creacion, u.fecha_actualizacion, r.nombre_rol
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.id_rol = %s
                ORDER BY u.nombre
            """,
                (id_rol,),
            )
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    "id_usuario": data[0],
                    "nombre": data[1],
                    "apellido": data[2],
                    "correo": data[3],
                    "cedula": data[4],
                    "programa": data[5],
                    "semestre": data[6],
                    "estado": data[7],
                    "fecha_creacion": str(data[8]) if data[8] else None,
                    "fecha_actualizacion": str(data[9]) if data[9] else None,
                    "rol": data[10],
                }
                payload.append(content)
            if result:
                return {"resultado": jsonable_encoder(payload)}
            else:
                raise HTTPException(
                    status_code=404, detail="No hay usuarios con ese rol"
                )
        except psycopg2.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener los usuarios")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def update_usuario(self, id_usuario: int, usuario: Usuario):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # ── Determinar rol para validar campos ──
            cursor.execute("SELECT nombre_rol FROM roles WHERE id_rol = %s", (usuario.id_rol,))
            rol_row = cursor.fetchone()
            rol_nombre = rol_row[0].lower() if rol_row else ""

            # ── Estudiantes requieren programa y semestre ──
            if rol_nombre == "estudiante":
                if not usuario.programa or not usuario.semestre or usuario.semestre < 1:
                    raise HTTPException(
                        status_code=400,
                        detail="Programa y semestre son obligatorios para estudiantes"
                    )

            # ── Normalizar valores NULL para no-estudiantes ──
            programa_val = usuario.programa if usuario.programa else None
            semestre_val = usuario.semestre if usuario.semestre else None

            cursor.execute(
                """
                UPDATE usuarios
                SET nombre = %s, apellido = %s, correo = %s,
                    cedula = %s, programa = %s, semestre = %s,
                    id_rol = %s, estado = %s
                WHERE id_usuario = %s
            """,
                (
                    usuario.nombre,
                    usuario.apellido,
                    usuario.correo,
                    usuario.cedula,
                    programa_val,
                    semestre_val,
                    usuario.id_rol,
                    usuario.estado,
                    id_usuario,
                ),
            )
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            return {"resultado": "Usuario actualizado"}
        except HTTPException:
            if conn:
                conn.rollback()
            raise
        except psycopg2.errors.UniqueViolation:
            if conn:
                conn.rollback()
            raise HTTPException(
                status_code=409,
                detail="El correo o la cédula ya están registrados en otro usuario"
            )
        except psycopg2.errors.ForeignKeyViolation:
            if conn:
                conn.rollback()
            raise HTTPException(
                status_code=409,
                detail="El rol seleccionado no existe o no es válido"
            )
        except psycopg2.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(
                status_code=500, detail="Error al actualizar el usuario"
            )
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
