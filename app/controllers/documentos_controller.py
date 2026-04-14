import psycopg2
from fastapi import HTTPException
from app.config.db_config import get_db_connection
from app.models.documentos_model import Documento
from fastapi.encoders import jsonable_encoder

class DocumentoController:
    def create_documento(self, documento: Documento):   
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO documentos (id_solicitud, nombre_archivo, tipo_archivo, ruta_archivo) VALUES (%s, %s, %s, %s )", 
                (
                    documento.id_solicitud,
                    documento.nombre_archivo,
                    documento.tipo_archivo,
                    documento.ruta_archivo
                )
            )
            conn.commit()
            return {"resultado": "Documento registrado exitosamente"}
        except psycopg2.Error as err:
            # Si falla el INSERT, los datos no quedan guardados parcialmente en la base de datos
            # Se usa para deshacer los cambios de la transacción activa cuando ocurre un error en el try.
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al registrar el documento")
        finally:
            cursor.close()
            conn.close()

    def get_documentos_by_solicitud(self, id_solicitud: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documentos WHERE id_solicitud = %s", (id_solicitud,))
            result = cursor.fetchall()
            payload = []
            for data in result:
                content = {
                    'id_documento': data[0],
                    'id_solicitud': data[1],
                    'nombre_archivo': data[2],
                    'tipo_archivo': data[3],
                    'ruta_archivo': data[4],
                    'fecha_subida': str(data[5])
                }
                payload.append(content)

            if result:
                return {"resultado": jsonable_encoder(payload)}
            else:
                raise HTTPException(status_code=404, detail="No hay documentos para esta solicitud")
        except psycopg2.Error as err :
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener los documentos")
        finally:
            cursor.close()
            conn.close()


    def delete_documento(self, id_documento: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM documentos WHERE id_documento = %s", (id_documento,))
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Documento no encontrado")
            return {"resultado": "Documento eliminado"}
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al eliminar el documento")
        finally:
            cursor.close()
            conn.close()

    def get_documento(self, id_documento: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documentos WHERE id_documento = %s", (id_documento,))
            result = cursor.fetchone()
            if result:
                content = {
                    'id_documento': result[0],
                    'id_solicitud': result[1],
                    'nombre_archivo': result[2],
                    'tipo_archivo': result[3],
                    'ruta_archivo': result[4],
                    'fecha_subida': str(result[5])
                }
                return jsonable_encoder(content)
            else:
                raise HTTPException(status_code=404, detail="Documento no encontrado")
        except psycopg2.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Error al obtener el documento")
        finally:
            cursor.close()
            conn.close()