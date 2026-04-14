from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.solicitudes_routes import router as solicitudes_routes
from app.routes.documentos_routes import router as documentos_router
from app.routes.pasos_aprobacion_routes import router as pasos_aprobacion_routes
from app.routes.historial_estado_routes import router as historial_estado_routes
from app.routes.registro_sistema_routes import router as registro_sistema_routes
from app.routes.respuesta_routes import router as respuesta_routes
from app.routes.revisiones_routes import router as revisiones_routes
from app.routes.roles_routes import router as roles_routes
from app.routes.usuarios_routes import router as usuarios_routes
from app.routes.tipos_solicitud_routes import router as tipos_solicitud_routes
from app.routes.auth_routes import router as auth_routes

app = FastAPI(title="Sistema de Gestión de Solicitudes Académicas — CUL")

@app.get("/")
def root():
    return {"message": "API funcionando 🚀"}

# CORS — permite peticiones desde Live Server (:5500) y otros puertos locales
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes)            # POST /auth/login  GET /auth/me
app.include_router(solicitudes_routes)
app.include_router(documentos_router)
app.include_router(pasos_aprobacion_routes)
app.include_router(historial_estado_routes)
app.include_router(registro_sistema_routes)
app.include_router(respuesta_routes)
app.include_router(revisiones_routes)
app.include_router(roles_routes)
app.include_router(usuarios_routes)
app.include_router(tipos_solicitud_routes)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
