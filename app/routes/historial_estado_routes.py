from fastapi import APIRouter, Depends
from app.controllers.historial_estado_controller import HistorialEstadoController
from app.models.historial_estado_model import HistorialEstadoCreate
from app.controllers.auth_controller import TokenData, staff_o_superior

router = APIRouter(prefix="/historial", tags=["Historial Estados"])

historial_ctrl = HistorialEstadoController()

@router.post("/create")
async def create_historial(historial: HistorialEstadoCreate, usuario: TokenData = Depends(staff_o_superior)):
    return historial_ctrl.create_historial(historial)

@router.get("/get/{historial_id}")
async def get_historial(historial_id: int, usuario: TokenData = Depends(staff_o_superior)):
    return historial_ctrl.get_historial(historial_id)

@router.get("/get_all")
async def get_historiales(usuario: TokenData = Depends(staff_o_superior)):
    return historial_ctrl.get_historiales()

@router.get("/by_solicitud/{id_solicitud}")
async def get_historial_by_solicitud(id_solicitud: int, usuario: TokenData = Depends(staff_o_superior)):
    return historial_ctrl.get_historial_by_solicitud(id_solicitud)