import psycopg2
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from typing import Set

from app.config.db_config import get_db_connection
from app.models.revisiones_model import RevisionCreate


class RevisionController:
    _ESTADOS_REVISION_VALIDOS = {"aprobado", "rechazado", "observado"}
    _MAPEO_ESTADO_SOLICITUD = {
        "aprobado": "aprobada",
        "rechazado": "rechazada",
        "observado": "en_revision",
    }

    def _obtener_columnas_revisiones(self, cursor) -> Set[str]:
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'revisiones'
            """
        )
        return {row[0] for row in cursor.fetchall()}

    def _asegurar_tabla_revisiones(self, cursor):
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS revisiones (
                id_revision SERIAL PRIMARY KEY,
                id_solicitud INTEGER NOT NULL REFERENCES solicitudes(id_solicitud),
                id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
                comentario TEXT,
                estado_revision VARCHAR(20) NOT NULL,
                fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        columnas = self._obtener_columnas_revisiones(cursor)

        if "estado_revision" not in columnas:
            cursor.execute(
                "ALTER TABLE revisiones ADD COLUMN estado_revision VARCHAR(20)"
            )

        if "decision" in columnas:
            cursor.execute(
                """
                UPDATE revisiones
                SET estado_revision = CASE
                    WHEN decision::text IN ('aprobado', 'rechazado') THEN decision::text
                    ELSE 'observado'
                END
                WHERE estado_revision IS NULL
                """
            )

        cursor.execute(
            """
            UPDATE revisiones
            SET estado_revision = 'observado'
            WHERE estado_revision IS NULL
               OR estado_revision NOT IN ('aprobado', 'rechazado', 'observado')
            """
        )

        columnas = self._obtener_columnas_revisiones(cursor)
        if "fecha_creacion" not in columnas:
            cursor.execute("ALTER TABLE revisiones ADD COLUMN fecha_creacion TIMESTAMP")

        if "fecha_revision" in columnas:
            cursor.execute(
                """
                UPDATE revisiones
                SET fecha_creacion = COALESCE(fecha_creacion, fecha_revision, CURRENT_TIMESTAMP)
                """
            )
        else:
            cursor.execute(
                "UPDATE revisiones SET fecha_creacion = COALESCE(fecha_creacion, CURRENT_TIMESTAMP)"
            )

        cursor.execute(
            """
            ALTER TABLE revisiones
            ALTER COLUMN fecha_creacion SET DEFAULT CURRENT_TIMESTAMP
            """
        )
        cursor.execute(
            """
            ALTER TABLE revisiones
            ALTER COLUMN fecha_creacion SET NOT NULL
            """
        )
        cursor.execute(
            """
            ALTER TABLE revisiones
            ALTER COLUMN estado_revision SET NOT NULL
            """
        )

        cursor.execute(
            """
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_revisiones_estado_revision'
            """
        )
        if not cursor.fetchone():
            cursor.execute(
                """
                ALTER TABLE revisiones
                ADD CONSTRAINT chk_revisiones_estado_revision
                CHECK (estado_revision IN ('aprobado', 'rechazado', 'observado'))
                """
            )

        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_revisiones_solicitud ON revisiones(id_solicitud)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_revisiones_usuario ON revisiones(id_usuario)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_revisiones_fecha_creacion ON revisiones(fecha_creacion DESC)"
        )

    def _serializar_revision(self, row):
        return {
            "id_revision": row[0],
            "id_solicitud": row[1],
            "estado_revision": row[2],
            "comentario": row[3],
            "fecha_creacion": str(row[4]) if row[4] else None,
            "estado_actual": row[5],
            "tipo_solicitud": row[6],
            "estudiante": f"{row[7] or ''} {row[8] or ''}".strip(),
            "revisor": f"{row[9] or ''} {row[10] or ''}".strip(),
            "id_usuario": row[11],
        }

    def create_revision(self, revision: RevisionCreate, id_usuario: int):
        conn = None
        cursor = None
        try:
            estado_revision = revision.estado_revision.value
            if estado_revision not in self._ESTADOS_REVISION_VALIDOS:
                raise HTTPException(
                    status_code=400, detail="Estado de revisión no válido"
                )

            conn = get_db_connection()
            cursor = conn.cursor()
            self._asegurar_tabla_revisiones(cursor)
            conn.commit()

            cursor.execute(
                "SELECT id_solicitud FROM solicitudes WHERE id_solicitud = %s",
                (revision.id_solicitud,),
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")

            cursor.execute(
                """
                INSERT INTO revisiones (id_solicitud, id_usuario, comentario, estado_revision)
                VALUES (%s, %s, %s, %s)
                RETURNING id_revision
                """,
                (
                    revision.id_solicitud,
                    id_usuario,
                    revision.comentario,
                    estado_revision,
                ),
            )
            id_revision = cursor.fetchone()[0]

            nuevo_estado_solicitud = self._MAPEO_ESTADO_SOLICITUD[estado_revision]
            cursor.execute(
                """
                UPDATE solicitudes
                SET estado_actual = %s
                WHERE id_solicitud = %s
                """,
                (nuevo_estado_solicitud, revision.id_solicitud),
            )

            conn.commit()
            return {
                "resultado": "Revisión creada correctamente",
                "id_revision": id_revision,
                "estado_solicitud": nuevo_estado_solicitud,
            }

        except HTTPException:
            if conn:
                conn.rollback()
            raise
        except psycopg2.Error:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail="Error al crear la revisión")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def get_revisiones(self):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            self._asegurar_tabla_revisiones(cursor)
            conn.commit()

            cursor.execute(
                """
                SELECT
                    r.id_revision,
                    r.id_solicitud,
                    r.estado_revision,
                    r.comentario,
                    r.fecha_creacion,
                    s.estado_actual,
                    ts.nombre AS tipo_solicitud,
                    ue.nombre AS estudiante_nombre,
                    ue.apellido AS estudiante_apellido,
                    ur.nombre AS revisor_nombre,
                    ur.apellido AS revisor_apellido,
                    r.id_usuario
                FROM revisiones r
                JOIN solicitudes s ON s.id_solicitud = r.id_solicitud
                JOIN tipos_solicitud ts ON ts.id_tipo_solicitud = s.id_tipo_solicitud
                JOIN usuarios ue ON ue.id_usuario = s.id_usuario
                JOIN usuarios ur ON ur.id_usuario = r.id_usuario
                ORDER BY r.fecha_creacion DESC, r.id_revision DESC
                """
            )

            payload = [self._serializar_revision(row) for row in cursor.fetchall()]
            return {"resultado": jsonable_encoder(payload)}

        except psycopg2.Error:
            raise HTTPException(
                status_code=500, detail="Error al obtener las revisiones"
            )
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def get_revisiones_by_solicitud(self, id_solicitud: int):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            self._asegurar_tabla_revisiones(cursor)
            conn.commit()

            cursor.execute(
                """
                SELECT
                    r.id_revision,
                    r.id_solicitud,
                    r.estado_revision,
                    r.comentario,
                    r.fecha_creacion,
                    s.estado_actual,
                    ts.nombre AS tipo_solicitud,
                    ue.nombre AS estudiante_nombre,
                    ue.apellido AS estudiante_apellido,
                    ur.nombre AS revisor_nombre,
                    ur.apellido AS revisor_apellido,
                    r.id_usuario
                FROM revisiones r
                JOIN solicitudes s ON s.id_solicitud = r.id_solicitud
                JOIN tipos_solicitud ts ON ts.id_tipo_solicitud = s.id_tipo_solicitud
                JOIN usuarios ue ON ue.id_usuario = s.id_usuario
                JOIN usuarios ur ON ur.id_usuario = r.id_usuario
                WHERE r.id_solicitud = %s
                ORDER BY r.fecha_creacion DESC, r.id_revision DESC
                """,
                (id_solicitud,),
            )

            payload = [self._serializar_revision(row) for row in cursor.fetchall()]
            return {"resultado": jsonable_encoder(payload)}

        except psycopg2.Error:
            raise HTTPException(
                status_code=500, detail="Error al obtener las revisiones"
            )
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
