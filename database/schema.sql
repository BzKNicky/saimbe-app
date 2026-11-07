-- TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT CHECK(rol IN ('Administrador', 'Operador', 'Civil')) NOT NULL,
    estado TEXT DEFAULT 'Activo',
    telefono TEXT DEFAULT '',
    notificaciones TEXT DEFAULT 'activado'
);

-- TABLA DE EMERGENCIAS
CREATE TABLE IF NOT EXISTS emergencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    ubicacion TEXT NOT NULL,
    descripcion TEXT,
    gravedad TEXT CHECK(gravedad IN ('Baja', 'Media', 'Alta', 'Crítica')),
    estado TEXT CHECK(estado IN ('Pendiente', 'En proceso', 'Finalizada')) DEFAULT 'Pendiente',
    recurso_asignado TEXT DEFAULT 'Sin Asignar',
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER,
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
);

-- TABLA DE RECURSOS
CREATE TABLE IF NOT EXISTS recursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    estado TEXT CHECK(estado IN ('Disponible', 'En servicio', 'Mantenimiento')) DEFAULT 'Disponible'
);

-- TABLA DE LOGS DE AUDITORÍA
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    accion TEXT NOT NULL,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);