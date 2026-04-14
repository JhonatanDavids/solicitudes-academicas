import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.registro_sistema_model import RegistroSistemaCreate
from fastapi.encoders import jsonable_encoder

class RegistroSistemaController:

    def create_registro(self, registro: RegistroSistemaCreate):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO registros_sistema (accion, descripcion, id_usuario)
                VALUES (%s, %s, %s)
            """, (
                registro.accion,
                registro.descripcion,
                registro.id_usuario
            ))
            conn.commit()
            return {"resultado": "Registro del sistema creado"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al crear el registro del sistema")
        finally:
            cursor.close()
            conn.close()

    def get_registro(self, registro_id: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM registros_sistema WHERE id_registro = %s", (registro_id,))
            result = cursor.fetchone()
            if result:
                content = {
                    'id_registro': result[0],
                    'accion':      result[1],
                    'descripcion': result[2],
                    'id_usuario':  result[3],
                    'fecha':       str(result[4])
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="Registro no encontrado")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener el registro")
        finally:
            cursor.close()
            conn.close()

    def get_registros(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM registros_sistema ORDER BY fecha DESC")
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    'id_registro': data[0],
                    'accion':      data[1],
                    'descripcion': data[2],
                    'id_usuario':  data[3],
                    'fecha':       str(data[4])
                }
                payload.append(content)
            if result:
                return {"resultado": jsonable_encoder(payload)}
            else:
                raise HTTPException(status_code=404, detail="No hay registros")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener los registros del sistema")
        finally:
            cursor.close()
            conn.close()

    def get_registros_by_usuario(self, id_usuario: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM registros_sistema
                WHERE id_usuario = %s
                ORDER BY fecha DESC
            """, (id_usuario,))
            result = cursor.fetchall()
            if not result:
                raise HTTPException(status_code=404, detail="No hay registros para este usuario")
            payload = []
            for data in result:
                content = {
                    'id_registro': data[0],
                    'accion':      data[1],
                    'descripcion': data[2],
                    'id_usuario':  data[3],
                    'fecha':       str(data[4])
                }
                payload.append(content)
            return {"resultado": jsonable_encoder(payload)}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener los registros")
        finally:
            cursor.close()
            conn.close()