import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.pasos_aprobacion_model import PasoAprobacion
from fastapi.encoders import jsonable_encoder

class PasoAProbacionController:
    def create_paso(self, paso: PasoAprobacion):   
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO pasos_aprobacion (id_tipo_solicitud, orden, id_rol_encargado, es_obligatorio, descripcion_paso)
                VALUES (%s, %s, %s, %s, %s )""", 
                (
                    paso.id_tipo_solicitud,
                    paso.orden,
                    paso.id_rol_encargado,
                    paso.es_obligatorio,
                    paso.descripcion_paso
                )
            )
            conn.commit()
            return {"resultado": "Paso de aprobación creado"}
        except psycopg2.Error as err:
            # Si falla el INSERT, los datos no quedan guardados parcialmente en la base de datos
            # Se usa para deshacer los cambios de la transacción activa cuando ocurre un error en el try.
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al crear el paso de aprobación")
        finally:
            cursor.close()
            conn.close()

    def get_pasos_by_tipo(self, id_tipo_solicitud: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.id_paso, p.orden, r.nombre_rol, p.descripcion_paso, p.es_obligatorio
                FROM pasos_aprobacion p
                JOIN roles r ON p.id_rol_encargado = r.id_rol
                WHERE p.id_tipo_solicitud = %s
                ORDER BY p.orden
            """, (id_tipo_solicitud,))
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    'id_paso': data[0],
                    'orden': data[1],
                    'rol_encargado': data[2],
                    'descripcion_paso': data[3],
                    'es_obligatorio': data[4]
                }
                payload.append(content)

            if result:
                return {"resultado": jsonable_encoder(payload)}
            else:
                raise HTTPException(status_code=404, detail="No hay pasos registrados para este tipo de solicitud")
        except psycopg2.Error as err :
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener los pasos de aprobación")
        finally:
            cursor.close()
            conn.close()


    def delete_paso(self, id_paso: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM pasos_aprobacion WHERE id_paso = %s", (id_paso,))
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Paso no encontrado")
            return {"resultado": "Paso eliminado"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al eliminar el paso")
        finally:
            cursor.close()
            conn.close()

    def get_paso(self, id_paso: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.id_paso, p.orden, r.nombre_rol,
                    p.descripcion_paso, p.es_obligatorio
                FROM pasos_aprobacion p
                JOIN roles r ON p.id_rol_encargado = r.id_rol
                WHERE p.id_paso = %s
            """, (id_paso,))
            result = cursor.fetchone()
            if result:
                content = {
                    'id_paso': result[0],
                    'orden': result[1],
                    'rol_encargado': result[2],
                    'descripcion_paso': result[3],
                    'es_obligatorio': result[4]
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="Paso no encontrado")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener el paso")
        finally:
            cursor.close()
            conn.close()