import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.respuesta_model import RespuestaCreate
from fastapi.encoders import jsonable_encoder

class RespuestaController:

    def create_respuesta(self, respuesta: RespuestaCreate):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO respuestas
                (id_solicitud, id_usuario, numero_resolucion,
                 motivo, fecha_vigencia, observaciones, archivo_pdf)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                respuesta.id_solicitud,
                respuesta.id_usuario,
                respuesta.numero_resolucion,
                respuesta.motivo,
                respuesta.fecha_vigencia,
                respuesta.observaciones,
                respuesta.archivo_pdf
            ))
            conn.commit()
            return {"resultado": "Respuesta registrada exitosamente"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al registrar la respuesta")
        finally:
            cursor.close()
            conn.close()

    def get_respuesta(self, respuesta_id: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM respuestas WHERE id_respuesta = %s", (respuesta_id,))
            result = cursor.fetchone()
            if result:
                content = {
                    'id_respuesta':      result[0],
                    'id_solicitud':      result[1],
                    'id_usuario':        result[2],
                    'numero_resolucion': result[3],
                    'motivo':            result[4],
                    'fecha_respuesta':   str(result[5]),
                    'fecha_vigencia':    str(result[6]) if result[6] else None,
                    'observaciones':     result[7],
                    'archivo_pdf':       result[8]
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="Respuesta no encontrada")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener la respuesta")
        finally:
            cursor.close()
            conn.close()

    def get_respuesta_by_solicitud(self, id_solicitud: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM respuestas WHERE id_solicitud = %s", (id_solicitud,))
            result = cursor.fetchone()
            if result:
                content = {
                    'id_respuesta':      result[0],
                    'id_solicitud':      result[1],
                    'id_usuario':        result[2],
                    'numero_resolucion': result[3],
                    'motivo':            result[4],
                    'fecha_respuesta':   str(result[5]),
                    'fecha_vigencia':    str(result[6]) if result[6] else None,
                    'observaciones':     result[7],
                    'archivo_pdf':       result[8]
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="No existe respuesta para esta solicitud")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener la respuesta")
        finally:
            cursor.close()
            conn.close()

    def get_respuestas(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM respuestas ORDER BY fecha_respuesta DESC")
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    'id_respuesta':      data[0],
                    'id_solicitud':      data[1],
                    'id_usuario':        data[2],
                    'numero_resolucion': data[3],
                    'motivo':            data[4],
                    'fecha_respuesta':   str(data[5]),
                    'fecha_vigencia':    str(data[6]) if data[6] else None,
                    'observaciones':     data[7],
                    'archivo_pdf':       data[8]
                }
                payload.append(content)
            if result:
                return {"resultado": jsonable_encoder(payload)}
            else:
                raise HTTPException(status_code=404, detail="No hay respuestas registradas")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener las respuestas")
        finally:
            cursor.close()
            conn.close()