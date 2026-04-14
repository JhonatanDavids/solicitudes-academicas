import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.tipos_solicitud_model import TipoSolicitud
from fastapi.encoders import jsonable_encoder


class TipoSolicitudController:
    def create_tipo(self, tipo: TipoSolicitud):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO tipos_solicitud (nombre, descripcion, requiere_documento) VALUES (%s, %s, %s)",
                (tipo.nombre, tipo.descripcion, tipo.requiere_documento),
            )
            conn.commit()
            return {"resultado": "Tipo de solicitud creado exitosamente"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(
                status_code=500, detail="Error al crear el tipo de solicitud"
            )
        finally:
            cursor.close()
            conn.close()

    def get_tipo(self, id_tipo_solicitud: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id_tipo_solicitud, nombre, descripcion, requiere_documento,
                       fecha_creacion, fecha_actualizacion
                FROM tipos_solicitud
                WHERE id_tipo_solicitud = %s
            """,
                (id_tipo_solicitud,),
            )
            result = cursor.fetchone()
            if result:
                content = {
                    "id_tipo_solicitud": result[0],
                    "nombre": result[1],
                    "descripcion": result[2],
                    "requiere_documento": result[3],
                    "fecha_creacion": str(result[4]) if result[4] else None,
                    "fecha_actualizacion": str(result[5]) if result[5] else None,
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(
                    status_code=404, detail="Tipo de solicitud no encontrado"
                )
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(
                status_code=500, detail="Error al obtener el tipo de solicitud"
            )
        finally:
            cursor.close()
            conn.close()

    def get_tipos(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id_tipo_solicitud, nombre, descripcion, requiere_documento,
                       fecha_creacion, fecha_actualizacion
                FROM tipos_solicitud
            """)
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    "id_tipo_solicitud": data[0],
                    "nombre": data[1],
                    "descripcion": data[2],
                    "requiere_documento": data[3],
                    "fecha_creacion": str(data[4]) if data[4] else None,
                    "fecha_actualizacion": str(data[5]) if data[5] else None,
                }
                payload.append(content)
            return {"resultado": jsonable_encoder(payload)}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(
                status_code=500, detail="Error al obtener los tipos de solicitud"
            )
        finally:
            cursor.close()
            conn.close()

    def delete_tipo(self, id_tipo_solicitud: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM tipos_solicitud WHERE id_tipo_solicitud = %s",
                (id_tipo_solicitud,),
            )
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404, detail="Tipo de solicitud no encontrado"
                )
            return {"resultado": "Tipo de solicitud eliminado"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(
                status_code=500, detail="Error al eliminar el tipo de solicitud"
            )
        finally:
            cursor.close()
            conn.close()

    def update_tipo(self, id_tipo_solicitud: int, tipo: TipoSolicitud):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE tipos_solicitud
                SET nombre = %s, descripcion = %s, requiere_documento = %s
                WHERE id_tipo_solicitud = %s
            """,
                (
                    tipo.nombre,
                    tipo.descripcion,
                    tipo.requiere_documento,
                    id_tipo_solicitud,
                ),
            )
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Tipo no encontrado")
            return {"resultado": "Tipo de solicitud actualizado"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al actualizar el tipo")
        finally:
            cursor.close()
            conn.close()
