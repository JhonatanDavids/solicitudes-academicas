from fastapi import APIRouter
from app.controllers.historial_estado_controller import HistorialEstadoController
from app.models.historial_estado_model import HistorialEstadoCreate

router = APIRouter(prefix="/historial", tags=["Historial Estados"])

historial_ctrl = HistorialEstadoController()

@router.post("/create")
async def create_historial(historial: HistorialEstadoCreate):
    return historial_ctrl.create_historial(historial)

@router.get("/get/{historial_id}")
async def get_historial(historial_id: int):
    return historial_ctrl.get_historial(historial_id)

@router.get("/get_all")
async def get_historiales():
    return historial_ctrl.get_historiales()

@router.get("/by_solicitud/{id_solicitud}")
async def get_historial_by_solicitud(id_solicitud: int):
    return historial_ctrl.get_historial_by_solicitud(id_solicitud)