import os
import sqlite3
from werkzeug.security import generate_password_hash

# Ruta del archivo saimbe.db en la raíz del proyecto
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'saimbe.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    
    # 1. Ejecutar el esquema base
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        conn.executescript(f.read())
    
    cursor = conn.cursor()
    
    # 2. Migración: Intentar agregar las columnas si la base de datos ya existía sin ellas
    try:
        cursor.execute("ALTER TABLE usuarios ADD COLUMN telefono TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass  # La columna ya existe

    try:
        cursor.execute("ALTER TABLE usuarios ADD COLUMN notificaciones TEXT DEFAULT 'activado'")
    except sqlite3.OperationalError:
        pass  # La columna ya existe

    try:
        cursor.execute("ALTER TABLE emergencias ADD COLUMN recurso_asignado TEXT DEFAULT 'Sin Asignar'")
    except sqlite3.OperationalError:
        pass  # La columna ya existe

    # Migración de estados antiguos en emergencias
    try:
        cursor.execute("UPDATE emergencias SET estado = 'Pendiente' WHERE estado = 'En curso'")
    except sqlite3.OperationalError:
        pass

    # 3. Crear usuarios iniciales si la tabla está vacía
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    if cursor.fetchone()[0] == 0:
        pass_admin = generate_password_hash("admin123")
        pass_operador = generate_password_hash("operador123")
        pass_civil = generate_password_hash("civil123")
        
        cursor.execute(
            "INSERT INTO usuarios (nombre, correo, password, rol, telefono, notificaciones) VALUES (?, ?, ?, ?, ?, ?)",
            ('Carlos Mendoza', 'carlos.admin@saimbe.gov.co', pass_admin, 'Administrador', '3001234567', 'activado')
        )
        cursor.execute(
            "INSERT INTO usuarios (nombre, correo, password, rol, telefono, notificaciones) VALUES (?, ?, ?, ?, ?, ?)",
            ('Marta Gómez', 'marta.operador@saimbe.gov.co', pass_operador, 'Operador', '3109876543', 'activado')
        )
        cursor.execute(
            "INSERT INTO usuarios (nombre, correo, password, rol, telefono, notificaciones) VALUES (?, ?, ?, ?, ?, ?)",
            ('Juan Pérez', 'juan.perez@gmail.com', pass_civil, 'Civil', '3205551234', 'activado')
        )
        
        # Log inicial
        cursor.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            ('Sistema', 'Inicialización de la base de datos SAIMBE (Usuarios).')
        )

    # 4. Crear recursos operativos iniciales si la tabla está vacía
    cursor.execute("SELECT COUNT(*) FROM recursos")
    if cursor.fetchone()[0] == 0:
        recursos_iniciales = [
            ('Ambulancia BÁSICA-01', 'Salud', 'Disponible'),
            ('Ambulancia TAB-02', 'Salud', 'Disponible'),
            ('Máquina Extintora M-01', 'Socorro', 'Disponible'),
            ('Patrulla Policía P-10', 'Seguridad', 'Disponible'),
            ('Unidad de Rescate R-01', 'Socorro', 'Disponible')
        ]
        cursor.executemany(
            "INSERT INTO recursos (nombre, tipo, estado) VALUES (?, ?, ?)",
            recursos_iniciales
        )
        
        cursor.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            ('Sistema', 'Carga inicial de recursos operativos de Madrid, Cundinamarca.')
        )

    conn.commit()
    conn.close()
    print("Base de datos verificada, migrada e inicializada correctamente.")

if __name__ == '__main__':
    init_db()