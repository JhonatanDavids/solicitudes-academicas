from fastapi import APIRouter, Depends
from app.controllers.resgistro_sistema_controller import RegistroSistemaController
from app.models.registro_sistema_model import RegistroSistemaCreate
from app.controllers.auth_controller import TokenData, staff_o_superior

router = APIRouter(prefix="/registros-sistema", tags=["Registros Sistema"])

registro_controller = RegistroSistemaController()

@router.post("/create")
async def create_registro(registro: RegistroSistemaCreate, usuario: TokenData = Depends(staff_o_superior)):
    return registro_controller.create_registro(registro)

@router.get("/get/{registro_id}")
async def get_registro(registro_id: int, usuario: TokenData = Depends(staff_o_superior)):
    return registro_controller.get_registro(registro_id)

@router.get("/get_all")
async def get_registros(usuario: TokenData = Depends(staff_o_superior)):
    return registro_controller.get_registros()

@router.get("/by_usuario/{id_usuario}")
async def get_registros_by_usuario(id_usuario: int, usuario: TokenData = Depends(staff_o_superior)):
    return registro_controller.get_registros_by_usuario(id_usuario)

