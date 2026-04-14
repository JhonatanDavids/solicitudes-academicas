from fastapi import APIRouter
from app.controllers.resgistro_sistema_controller import RegistroSistemaController
from app.models.registro_sistema_model import RegistroSistemaCreate

router = APIRouter(prefix="/registros-sistema", tags=["Registros Sistema"])

registro_controller = RegistroSistemaController()

@router.post("/create")
async def create_registro(registro: RegistroSistemaCreate):
    return registro_controller.create_registro(registro)

@router.get("/get/{registro_id}")
async def get_registro(registro_id: int):
    return registro_controller.get_registro(registro_id)

@router.get("/get_all")
async def get_registros():
    return registro_controller.get_registros()

@router.get("/by_usuario/{id_usuario}")
async def get_registros_by_usuario(id_usuario: int):
    return registro_controller.get_registros_by_usuario(id_usuario)

