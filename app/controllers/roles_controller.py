import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.roles_model import Rol
from fastapi.encoders import jsonable_encoder


class RolController:
    def create_rol(self, rol: Rol):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO roles (nombre_rol, descripcion) VALUES (%s, %s )",
                (rol.nombre_rol, rol.descripcion),
            )
            conn.commit()  # guarda los cambios en la base de datos
            return {"resultado": "Rol creado exitosamente"}
        except psycopg2.Error as err:
            # Si falla el INSERT, los datos no quedan guardados parcialmente en la base de datos
            # Se usa para deshacer los cambios de la transacción activa cuando ocurre un error en el try.
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al crear el rol")
        finally:
            cursor.close()
            conn.close()

    def get_rol(self, id_rol: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id_rol, nombre_rol, descripcion, fecha_creacion, fecha_actualizacion
                FROM roles
                WHERE id_rol = %s
            """,
                (id_rol,),
            )
            result = cursor.fetchone()
            if result:
                content = {
                    "id_rol": result[0],
                    "nombre_rol": result[1],
                    "descripcion": result[2],
                    "fecha_creacion": str(result[3]) if result[3] else None,
                    "fecha_actualizacion": str(result[4]) if result[4] else None,
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="Rol no encontrado")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener el rol")
        finally:
            cursor.close()
            conn.close()

    def get_roles(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id_rol, nombre_rol, descripcion, fecha_creacion, fecha_actualizacion
                FROM roles
            """)
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    "id_rol": data[0],
                    "nombre_rol": data[1],
                    "descripcion": data[2],
                    "fecha_creacion": str(data[3]) if data[3] else None,
                    "fecha_actualizacion": str(data[4]) if data[4] else None,
                }
                payload.append(content)
            # Devolver siempre una lista, incluso si está vacía, para evitar errores de parseo en el frontend
            return {"resultado": jsonable_encoder(payload)}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener los roles")
        finally:
            cursor.close()
            conn.close()

    def delete_rol(self, id_rol: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM roles WHERE id_rol = %s", (id_rol,))
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Rol no encontrado")
            return {"resultado": "Rol eliminado"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            cursor.close()
            conn.close()

    def update_rol(self, id_rol: int, rol: Rol):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE roles SET nombre_rol = %s, descripcion = %s WHERE id_rol = %s",
                (rol.nombre_rol, rol.descripcion, id_rol),
            )
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Rol no encontrado")
            return {"resultado": "Rol actualizado"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al actualizar el rol")
        finally:
            cursor.close()
            conn.close()
