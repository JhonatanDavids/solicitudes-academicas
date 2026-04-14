from fastapi import APIRouter, Depends, HTTPException

from app.controllers.auth_controller import TokenData, cualquier_rol, staff_o_superior
from app.controllers.revisiones_controller import RevisionController
from app.models.revisiones_model import RevisionCreate

router = APIRouter(prefix="/revisiones", tags=["Revisiones"])
revision_ctrl = RevisionController()


@router.get("/get_all")
async def get_revisiones(usuario: TokenData = Depends(staff_o_superior)):
    return revision_ctrl.get_revisiones()


@router.get("/by_solicitud/{id_solicitud}")
async def get_revisiones_by_solicitud(
    id_solicitud: int,
    usuario: TokenData = Depends(cualquier_rol),
):
    return revision_ctrl.get_revisiones_by_solicitud(id_solicitud)


@router.post("/create")
async def create_revision(
    revision: RevisionCreate,
    usuario: TokenData = Depends(staff_o_superior),
):
    if usuario.id_usuario is None:
        raise HTTPException(status_code=401, detail="Token inválido")
    return revision_ctrl.create_revision(revision, usuario.id_usuario)
