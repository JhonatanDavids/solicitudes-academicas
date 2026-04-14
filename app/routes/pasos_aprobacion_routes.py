from fastapi import APIRouter
from app.controllers.pasos_aprobacion_controller import PasoAProbacionController
from app.models.pasos_aprobacion_model import PasoAprobacion

router = APIRouter(prefix="/pasos", tags=["Pasos Aprobacion"])

paso_ctrl = PasoAProbacionController()

@router.post("/create")
async def create_paso(paso: PasoAprobacion):
    return paso_ctrl.create_paso(paso)

@router.get("/get/{id_paso}")
async def get_paso(id_paso: int):
    return paso_ctrl.get_paso(id_paso)

@router.get("/by_tipo/{id_tipo_solicitud}")
async def get_pasos(id_tipo_solicitud: int):
    return paso_ctrl.get_pasos_by_tipo(id_tipo_solicitud)

@router.delete("/delete/{id_paso}")
async def delete_paso(id_paso: int):
    return paso_ctrl.delete_paso(id_paso)