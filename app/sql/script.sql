
--  TIPOS ENUM
--  Los ENUM son tipos de datos personalizados que le dicen a
--  PostgreSQL qué valores exactos acepta un campo si se intenta
--  ingresar un valor diferente la base de datos lo rechaza
--  automáticamente sin necesidad de validarlo en el backend

--el ON DELETE CASCADE en documentos signfica q si se borra una solicitud todos sus documentos se borran automicamente
--sin este metodo habria q borrar los documentos manualmente

--los indices aceleran las busquedas con indice va directo ya que se crean en campos q se consultan 
--frecuentemente como correos, estados fechas y llaves foraneas

-- Estado del usuario en el sistema
CREATE TYPE estado_usuario_enum AS ENUM (
    'activo',
    'inactivo',
    'suspendido'
);

-- Estado de avance de una solicitud
CREATE TYPE estado_solicitud_enum AS ENUM (
    'pendiente',
    'en_revision',
    'aprobada',
    'rechazada',
    'cancelada',
    'en_espera_documentos'
)

-- Nivel de urgencia de una solicitud
CREATE TYPE prioridad_enum AS ENUM (
    'baja',
    'media',
    'alta',
    'urgente'
);

-- Decisión tomada por un revisor sobre una solicitud
CREATE TYPE decision_enum AS ENUM (
    'aprobado',
    'rechazado',
    'devuelto',
    'en_revision'
);

--  TABLA: roles
--  Define los tipos de usuario que existen en el sistema
--  UNIQUE en nombre_rol evita que se creen roles duplicados
CREATE TABLE roles(
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE, -- no pueden existir dos roles con el mismo nombre
    descripcion TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP
);

INSERT INTO roles (nombre_rol, descripcion) VALUES
    ('estudiante',  'Usuario estudiante que genera solicitudes'),
    ('funcionario', 'Funcionario administrativo que revisa solicitudes'),
    ('coordinador', 'Coordinador académico con aprobación final'),
    ('admin',       'Administrador del sistema');

--  TABLA: usuarios
--  Almacena la información de todos los usuarios del sistema
--  cedula UNIQUE → no pueden existir dos personas con la misma cédula se usa como identificador 
--  de búsqueda en el frontend en lugar del ID interno.
--  semestre CHECK → solo acepta valores entre 1 y 12.
--  estado ENUM → la BD controla los valores válidos.
CREATE TABLE usuarios (
    id_usuario  SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) UNIQUE,
    correo VARCHAR(150) NOT NULL UNIQUE, 
    contrasena VARCHAR(255) NOT NULL,          
    programa VARCHAR(100),                  
    semestre INTEGER CHECK (semestre BETWEEN 1 AND 12), 
    estado estado_usuario_enum NOT NULL DEFAULT 'activo',
    id_rol INTEGER NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  
    fecha_actualizacion TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

--indice para busquedas frecuentes
CREATE INDEX idx_usuarios_cedula ON usuarios(cedula); -- búsqueda principal del frontend
CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_usuarios_rol    ON usuarios(id_rol);

--tipos de solicitudes que se pueden generar
CREATE TABLE tipos_solicitud (
    id_tipo_solicitud SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE, 
    descripcion TEXT,
    requiere_documento BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP
);

INSERT INTO tipos_solicitud (nombre, descripcion, requiere_documento) VALUES
    ('Homologación', 'Solicitud de homologación de materias', TRUE),
    ('Certificado',  'Solicitud de certificado académico', FALSE),
    ('Cancelación',  'Cancelación de materias o semestre', FALSE),
    ('Paz y salvo',  'Solicitud de paz y salvo institucional', FALSE),
    ('Recurso',      'Recurso de apelación sobre una nota o decisión', TRUE),
    ('Transferencia', 'Solicitud de transferencia entre programas', TRUE),
    ('Reintegro', 'Solicitud de reintegro al programa académico', TRUE),
    ('Doble titulación', 'Solicitud para optar por doble titulación', TRUE),
    ('Validación', 'Solicitud de validación de conocimientos', FALSE),
    ('Reserva de cupo', 'Solicitud de reserva de cupo por semestre', FALSE);

-- Registra cada solicitud creada por un estudiante.
CREATE TABLE solicitudes (
    id_solicitud SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_tipo_solicitud INTEGER NOT NULL,
    descripcion TEXT,
    prioridad prioridad_enum NOT NULL DEFAULT 'media',
    estado_actual estado_solicitud_enum NOT NULL DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_tipo_solicitud) REFERENCES tipos_solicitud(id_tipo_solicitud)
);

CREATE INDEX idx_solicitudes_usuario ON solicitudes(id_usuario);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado_actual);
CREATE INDEX idx_solictudes_fecha ON solicitudes(fecha_creacion);

--Archivos adjuntos vinculados a una solicitud.
--  ON DELETE CASCADE: si se elimina una solicitud todos sus
--  documentos se eliminan automáticamente sin esto habría que
--  borrarlos manualmente o quedarían huérfanos en la tabl
CREATE TABLE documentos (
    id_documento SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL,
    nombre_archivo VARCHAR(200) NOT NULL,
    tipo_archivo VARCHAR(50) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE 
);

CREATE INDEX idx_documentos_solicitud ON documentos(id_solicitud);

--pasos de aprobacion para cada tipo de solicitud
CREATE TABLE pasos_aprobacion (
    id_paso SERIAL PRIMARY KEY,
    id_tipo_solicitud INTEGER NOT NULL,
    orden INTEGER NOT NULL CHECK (orden > 0),
    descripcion_paso  VARCHAR(200),
    es_obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_tipo_solicitud, orden),
    FOREIGN KEY (id_tipo_solicitud) REFERENCES tipos_solicitud(id_tipo_solicitud)
);


--Registra las revisiones hechas sobre cada solicitud
CREATE TABLE revisiones (
    id_revision SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    comentario TEXT,
    estado_revision VARCHAR(20) NOT NULL CHECK (estado_revision IN ('aprobado', 'rechazado', 'observado')),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud),
    FOREIGN KEY (id_usuario)   REFERENCES usuarios(id_usuario)
);

CREATE INDEX idx_revisiones_solicitud ON revisiones(id_solicitud);
CREATE INDEX idx_revisiones_usuario ON revisiones(id_usuario);

--Guarda el historial de cambios de estado de cada solicitud
CREATE TABLE historial_estados (
    id_historial SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL,
    estado_anterior estado_solicitud_enum NULL,
    estado_nuevo estado_solicitud_enum NOT NULL,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud)
);

CREATE INDEX idx_historial_solicitud ON historial_estados(id_solicitud);

--Registra acciones generales del sistema
CREATE TABLE registros_sistema (
    id_registro SERIAL PRIMARY KEY,
    accion      VARCHAR(100) NOT NULL,  -- 'LOGIN', 'CREAR_USUARIO', 'ELIMINAR_DOC'
    descripcion TEXT,
    id_usuario  INTEGER,
    fecha       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE INDEX idx_registros_usuario ON registros_sistema(id_usuario);
CREATE INDEX idx_registros_fecha   ON registros_sistema(fecha);


CREATE TABLE respuestas (
    id_respuesta SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL UNIQUE,
    id_usuario INTEGER NOT NULL,
    numero_resolucion VARCHAR(100),
    motivo TEXT NOT NULL,
    fecha_respuesta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vigencia DATE,
    observaciones TEXT,
    archivo_pdf TEXT,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- TRIGGERS AUTOMÁTICOS
-- ================================

CREATE OR REPLACE FUNCTION trigger_update_fecha()
RETURNS TRIGGER AS $$
BEGIN
NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_update_roles
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION trigger_update_fecha();

CREATE TRIGGER t_update_usuarios
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION trigger_update_fecha();

CREATE TRIGGER t_update_tipos
BEFORE UPDATE ON tipos_solicitud
FOR EACH ROW EXECUTE FUNCTION trigger_update_fecha();

CREATE TRIGGER t_update_solicitudes
BEFORE UPDATE ON solicitudes
FOR EACH ROW EXECUTE FUNCTION trigger_update_fecha();

-- ================================
-- DATOS INICIALES (OPCIONAL)
-- ================================

UPDATE solicitudes SET fecha_actualizacion = fecha_creacion;
UPDATE usuarios SET fecha_actualizacion = fecha_creacion;
UPDATE roles SET fecha_actualizacion = CURRENT_TIMESTAMP;
UPDATE tipos_solicitud SET fecha_actualizacion = CURRENT_TIMESTAMP;
