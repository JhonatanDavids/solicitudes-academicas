import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.solicitudes_model import Solicitud
from app.models.historial_estado_model import EstadoSolicitudEnum
from fastapi.encoders import jsonable_encoder


class SolicitudController:
    def create_solicitud(self, solicitud: Solicitud):
        try:
            estado = solicitud.estado_actual or "pendiente"
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO solicitudes 
                (id_usuario, id_tipo_solicitud, descripcion, prioridad, estado_actual)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id_solicitud
            """,
                (
                    solicitud.id_usuario,
                    solicitud.id_tipo_solicitud,
                    solicitud.descripcion,
                    solicitud.prioridad,
                    estado,
                ),
            )

            id_nuevo = cursor.fetchone()[0]
            conn.commit()

            return {"id_solicitud": id_nuevo}

        except psycopg2.Error:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al crear solicitud")

        finally:
            cursor.close()
            conn.close()

    def get_solicitud(self, id_solicitud: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT s.id_solicitud, u.nombre, u.apellido, u.cedula,
                       ts.nombre AS tipo, s.estado_actual, s.prioridad,
                       s.fecha_creacion, s.fecha_actualizacion, s.descripcion
                FROM solicitudes s
                JOIN usuarios u ON s.id_usuario = u.id_usuario
                JOIN tipos_solicitud ts ON s.id_tipo_solicitud = ts.id_tipo_solicitud
                WHERE s.id_solicitud = %s
            """,
                (id_solicitud,),
            )

            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")

            content = {
                "id_solicitud": result[0],
                "nombre": result[1],
                "apellido": result[2],
                "cedula": result[3],
                "tipo": result[4],
                "estado_actual": result[5],
                "prioridad": result[6],
                "fecha_creacion": str(result[7]),
                "fecha_actualizacion": str(result[8]) if result[8] else None,
                "descripcion": result[9],
            }

            return jsonable_encoder(content)

        except psycopg2.Error:
            raise HTTPException(status_code=500, detail="Error al obtener la solicitud")

        finally:
            cursor.close()
            conn.close()

    def get_solicitudes(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.id_solicitud, u.nombre, u.apellido, u.cedula,
                       ts.nombre AS tipo, s.estado_actual, s.prioridad,
                       s.fecha_creacion, s.fecha_actualizacion, s.descripcion
                FROM solicitudes s
                JOIN usuarios u ON s.id_usuario = u.id_usuario
                JOIN tipos_solicitud ts ON s.id_tipo_solicitud = ts.id_tipo_solicitud
                ORDER BY s.fecha_creacion DESC
            """)

            result = cursor.fetchall()

            if not result:
                raise HTTPException(
                    status_code=404, detail="No hay solicitudes registradas"
                )

            payload = []
            for data in result:
                payload.append(
                    {
                        "id_solicitud": data[0],
                        "nombre": data[1],
                        "apellido": data[2],
                        "cedula": data[3],
                        "tipo": data[4],
                        "estado_actual": data[5],
                        "prioridad": data[6],
                        "fecha_creacion": str(data[7]),
                        "fecha_actualizacion": str(data[8]) if data[8] else None,
                        "descripcion": data[9],
                    }
                )

            return {"resultado": jsonable_encoder(payload)}

        except psycopg2.Error:
            raise HTTPException(
                status_code=500, detail="Error al obtener las solicitudes"
            )

        finally:
            cursor.close()
            conn.close()

    def update_estado(self, id_solicitud: int, nuevo_estado: str):
        try:
            if nuevo_estado not in [e.value for e in EstadoSolicitudEnum]:
                raise HTTPException(status_code=400, detail="Estado no válido")
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE solicitudes
                SET estado_actual = %s
                WHERE id_solicitud = %s
                RETURNING id_solicitud
            """,
                (nuevo_estado, id_solicitud),
            )

            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")

            conn.commit()

            return {"resultado": "Estado actualizado correctamente"}

        except HTTPException as http_err:
            raise http_err

        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))

        finally:
            cursor.close()
            conn.close()

    def update_estado_solicitud(self, id_solicitud: int, nuevo_estado: str):
        """
        Alias para compatibilidad con solicitudes_routes.py
        """
        return self.update_estado(id_solicitud, nuevo_estado)

    def delete_solicitud(self, id_solicitud: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM solicitudes WHERE id_solicitud = %s", (id_solicitud,)
            )
            conn.commit()

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")

            return {"resultado": "Solicitud eliminada"}

        except psycopg2.Error:
            conn.rollback()
            raise HTTPException(
                status_code=500, detail="Error al eliminar la solicitud"
            )

        finally:
            cursor.close()
            conn.close()

    def get_solicitudes_by_usuario(self, id_usuario: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT s.id_solicitud, u.nombre, u.apellido, u.cedula,
                       ts.nombre AS tipo, s.estado_actual, s.prioridad,
                       s.fecha_creacion, s.fecha_actualizacion, s.descripcion
                FROM solicitudes s
                JOIN usuarios u ON s.id_usuario = u.id_usuario
                JOIN tipos_solicitud ts ON s.id_tipo_solicitud = ts.id_tipo_solicitud
                WHERE s.id_usuario = %s
                ORDER BY s.fecha_creacion DESC
            """,
                (id_usuario,),
            )

            result = cursor.fetchall()

            if not result:
                raise HTTPException(
                    status_code=404, detail="No hay solicitudes para este usuario"
                )

            payload = []
            for data in result:
                payload.append(
                    {
                        "id_solicitud": data[0],
                        "nombre": data[1],
                        "apellido": data[2],
                        "cedula": data[3],
                        "tipo": data[4],
                        "estado_actual": data[5],
                        "prioridad": data[6],
                        "fecha_creacion": str(data[7]),
                        "fecha_actualizacion": str(data[8]) if data[8] else None,
                        "descripcion": data[9],
                    }
                )

            return {"resultado": jsonable_encoder(payload)}

        except psycopg2.Error:
            raise HTTPException(
                status_code=500, detail="Error al obtener las solicitudes"
            )

        finally:
            cursor.close()
            conn.close()

    def get_solicitudes_by_estado(self, estado: str):
        try:
            if estado not in [e.value for e in EstadoSolicitudEnum]:
                raise HTTPException(status_code=400, detail="Estado no válido")
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT s.id_solicitud, u.nombre, u.apellido, u.cedula,
                       ts.nombre AS tipo, s.estado_actual, s.prioridad,
                       s.fecha_creacion, s.fecha_actualizacion, s.descripcion
                FROM solicitudes s
                JOIN usuarios u ON s.id_usuario = u.id_usuario
                JOIN tipos_solicitud ts ON s.id_tipo_solicitud = ts.id_tipo_solicitud
                WHERE s.estado_actual = %s
                ORDER BY s.fecha_creacion DESC
            """,
                (estado,),
            )

            result = cursor.fetchall()

            if not result:
                raise HTTPException(
                    status_code=404, detail="No hay solicitudes con ese estado"
                )

            payload = []
            for data in result:
                payload.append(
                    {
                        "id_solicitud": data[0],
                        "nombre": data[1],
                        "apellido": data[2],
                        "cedula": data[3],
                        "tipo": data[4],
                        "estado_actual": data[5],
                        "prioridad": data[6],
                        "fecha_creacion": str(data[7]),
                        "fecha_actualizacion": str(data[8]) if data[8] else None,
                        "descripcion": data[9],
                    }
                )

            return {"resultado": jsonable_encoder(payload)}

        except psycopg2.Error:
            raise HTTPException(
                status_code=500, detail="Error al obtener las solicitudes"
            )

        finally:
            cursor.close()
            conn.close()

    def update_solicitud(self, id_solicitud: int, solicitud: Solicitud):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE solicitudes
                SET descripcion = %s, prioridad = %s
                WHERE id_solicitud = %s
            """,
                (solicitud.descripcion, solicitud.prioridad, id_solicitud),
            )

            conn.commit()

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")

            return {"resultado": "Solicitud actualizada"}

        except psycopg2.Error:
            conn.rollback()
            raise HTTPException(
                status_code=500, detail="Error al actualizar la solicitud"
            )

        finally:
            cursor.close()
            conn.close()
