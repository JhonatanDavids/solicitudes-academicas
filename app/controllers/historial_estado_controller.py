import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.historial_estado_model import HistorialEstadoCreate
from fastapi.encoders import jsonable_encoder

class HistorialEstadoController:

    def create_historial(self, historial: HistorialEstadoCreate):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO historial_estados (id_solicitud, estado_anterior, estado_nuevo)
                VALUES (%s, %s, %s)
            """, (
                historial.id_solicitud,
                historial.estado_anterior,
                historial.estado_nuevo
            ))
            conn.commit()
            return {"resultado": "Historial de estado registrado"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al registrar el historial de estado")
        finally:
            cursor.close()
            conn.close()

    def get_historial(self, historial_id: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM historial_estados WHERE id_historial = %s", (historial_id,))
            result = cursor.fetchone()
            if result:
                content = {
                    'id_historial':    result[0],
                    'id_solicitud':    result[1],
                    'estado_anterior': result[2],
                    'estado_nuevo':    result[3],
                    'fecha_cambio':    str(result[4])
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="Historial no encontrado")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener el historial")
        finally:
            cursor.close()
            conn.close()

    def get_historiales(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM historial_estados ORDER BY fecha_cambio DESC")
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    'id_historial':    data[0],
                    'id_solicitud':    data[1],
                    'estado_anterior': data[2],
                    'estado_nuevo':    data[3],
                    'fecha_cambio':    str(data[4])
                }
                payload.append(content)
            if result:
                return {"resultado": jsonable_encoder(payload)}
            else:
                raise HTTPException(status_code=404, detail="No hay historiales registrados")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener los historiales")
        finally:
            cursor.close()
            conn.close()

    def get_historial_by_solicitud(self, id_solicitud: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM historial_estados
                WHERE id_solicitud = %s
                ORDER BY fecha_cambio DESC
            """, (id_solicitud,))
            result = cursor.fetchall()
            if not result:
                raise HTTPException(status_code=404, detail="No hay historial para esta solicitud")
            payload = []
            for data in result:
                content = {
                    'id_historial':    data[0],
                    'id_solicitud':    data[1],
                    'estado_anterior': data[2],
                    'estado_nuevo':    data[3],
                    'fecha_cambio':    str(data[4])
                }
                payload.append(content)
            return {"resultado": jsonable_encoder(payload)}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener el historial")
        finally:
            cursor.close()
            conn.close()