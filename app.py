import math
import os
import sqlite3
from datetime import datetime

from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(
    __name__,
    template_folder="frontend/templates",
    static_folder="frontend/static",
)

app.secret_key = "saimbe_secret_key_madrid_2026"
DB_PATH = os.path.join(os.path.dirname(__file__), "saimbe.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def calcular_distancia_haversine(lat1, lon1, lat2, lon2):
    """Calcula la distancia en kilómetros entre dos puntos GPS usando la fórmula de Haversine."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    try:
        R = 6371.0  # Radio de la Tierra en km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except Exception:
        return float('inf')


def determinar_rol_por_recurso(conn, recurso_asignado, rol_por_defecto="Civil"):
    """Determina el rol operativo exacto de forma persistente basándose en el vehículo o recurso asignado."""
    if not recurso_asignado or recurso_asignado == "Sin Asignar":
        return rol_por_defecto
    try:
        rec_info = conn.execute(
            "SELECT tipo FROM recursos_disponibles WHERE nombre_recurso = ? OR placa_codigo = ?",
            (recurso_asignado, recurso_asignado)
        ).fetchone()
        if rec_info:
            tipo_db = str(rec_info["tipo"]).strip().lower()
            if "policía" in tipo_db or "policia" in tipo_db:
                return "Policía"
            elif "bomber" in tipo_db:
                return "Bombero"
            elif "tránsito" in tipo_db or "transito" in tipo_db:
                return "Agente de tránsito"
            elif "defensa" in tipo_db:
                return "Defensa civil"
            elif "ambulancia" in tipo_db or "salud" in tipo_db:
                return "Paramédico"
    except Exception:
        pass
    return rol_por_defecto


def verificar_estructura_db():
    """
    Crea y verifica todas las tablas y columnas necesarias en la base de datos 
    al iniciar la aplicación, previniendo errores de tablas o columnas inexistentes.
    """
    conn = get_db_connection()
    
    # 1. Crear la tabla de usuarios (con soporte para estado y recurso asignado)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            correo TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT DEFAULT 'Civil',
            telefono TEXT,
            notificaciones TEXT DEFAULT 'activado',
            estado TEXT DEFAULT 'Activo'
        )
    """)

    # 2. Crear la tabla de emergencias (Incluyendo soporte para datos laborales / ARL y GPS dual)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS emergencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            ubicacion TEXT NOT NULL,
            gravedad TEXT DEFAULT 'Por definir',
            descripcion TEXT,
            estado TEXT DEFAULT 'Pendiente',
            recurso_asignado TEXT DEFAULT 'Sin Asignar',
            es_laboral TEXT DEFAULT 'no',
            empresa_laboral TEXT,
            arl_laboral TEXT,
            latitud REAL,
            longitud REAL,
            reporter_lat REAL,
            reporter_lng REAL,
            usuario_id INTEGER,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    """)

    # 3. Crear la tabla de logs de auditoría
    conn.execute("""
        CREATE TABLE IF NOT EXISTS logs_auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            accion TEXT,
            fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 4. ⚙️ Crear la tabla de Parámetros del Sistema
    conn.execute("""
        CREATE TABLE IF NOT EXISTS parametros_sistema (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            descripcion TEXT
        )
    """)

    # 5. 🚑 Crear la tabla de Recursos Disponibles (Con placa_codigo UNIQUE para evitar duplicados)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS recursos_disponibles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_recurso TEXT NOT NULL,
            tipo TEXT NOT NULL,
            placa_codigo TEXT UNIQUE,
            estado TEXT DEFAULT 'Disponible',
            ubicacion_actual TEXT DEFAULT 'Base Central Madrid',
            latitud REAL,
            longitud REAL
        )
    """)

    # Insertar valores por defecto para los parámetros si no existen
    conn.execute("INSERT OR IGNORE INTO parametros_sistema (clave, valor, descripcion) VALUES ('niveles_gravedad', '4 Niveles (Baja, Media, Alta, Crítica)', 'Niveles de clasificación habilitados')")
    conn.execute("INSERT OR IGNORE INTO parametros_sistema (clave, valor, descripcion) VALUES ('radio_despacho', '5.0', 'Radio de despacho automático en km')")
    conn.execute("INSERT OR IGNORE INTO parametros_sistema (clave, valor, descripcion) VALUES ('tiempo_max_alerta', '10', 'Tiempo máximo de alerta en minutos')")
    conn.execute("INSERT OR IGNORE INTO parametros_sistema (clave, valor, descripcion) VALUES ('estado_servidor', 'Operativo 100%', 'Estado general del sistema SAIMBE')")

    # 🚑 Ampliar la lista inicial a los 20 recursos exactos (Sin nombres duplicados ni repetidos)
    recursos_iniciales = [
        # --- 8 Unidades de Salud / Ambulancias ---
        ("Ambulancia TAB-01", "Ambulancia", "AMB-01", "Disponible", "Base Central Madrid", 4.7350, -74.2630),
        ("Ambulancia TAB-02", "Ambulancia", "AMB-02", "Disponible", "Calle 6 #2-44", 4.7340, -74.2620),
        ("Ambulancia TAB-03", "Ambulancia", "AMB-03", "Disponible", "Hospital Santa Matilda", 4.7358, -74.2625),
        ("Ambulancia TAB-04", "Ambulancia", "AMB-04", "Disponible", "CAMU Sosiego", 4.7290, -74.2580),
        ("Ambulancia Meditar-01", "Ambulancia", "AMB-05", "Disponible", "Sector Lorencita", 4.7370, -74.2600),
        ("Ambulancia Vital-02", "Ambulancia", "AMB-06", "Disponible", "Vía Funza - Madrid", 4.7400, -74.2550),
        ("Ambulancia Urgencias-07", "Ambulancia", "AMB-07", "Disponible", "Barrio San Francisco", 4.7305, -74.2640),
        ("Ambulancia Avanzada-08", "Ambulancia", "AMB-08", "Disponible", "Zona Industrial Occidente", 4.7250, -74.2700),
        
        # --- 4 Vehículos de Bomberos ---
        ("Máquina Extintora 01", "Bomberos", "BOM-01", "Disponible", "Estación de Bomberos Central", 4.7320, -74.2670),
        ("Máquina Rescate 02", "Bomberos", "BOM-02", "Disponible", "Subestación Madrid Norte", 4.7420, -74.2610),
        ("Carro Tanque 03", "Bomberos", "BOM-03", "Disponible", "Estación de Bomberos Central", 4.7325, -74.2675),
        ("Unidad Forestal 04", "Bomberos", "BOM-04", "Disponible", "Vereda Potrerito", 4.7500, -74.2750),
        
        # --- 8 Patrullas de Policía y Socorro ---
        ("Patrulla Cuadrante 01", "Policía", "POL-01", "Disponible", "Estación de Policía", 4.7342, -74.2648),
        ("Patrulla Cuadrante 02", "Policía", "POL-02", "Disponible", "Cra. 4 #8-12", 4.7330, -74.2650),
        ("Patrulla Tránsito 03", "Policía", "POL-03", "Disponible", "Calle 11 Principal", 4.7380, -74.2635),
        ("Patrulla Reacción 04", "Policía", "POL-04", "Disponible", "Parque Principal Madrid", 4.7335, -74.2638),
        ("Patrulla Vial 05", "Policía", "POL-05", "Disponible", "Glorieta Cartagenita", 4.7200, -74.2800),
        ("Patrulla Cuadrante 06", "Policía", "POL-06", "Disponible", "Barrio Los Almendros", 4.7450, -74.2590),
        ("Unidad de Rescate 01", "Defensa Civil", "DEF-01", "Disponible", "Seccional Madrid", 4.7380, -74.2610),
        ("Unidad Logística 02", "Defensa Civil", "DEF-02", "Disponible", "Base Operativa Sur", 4.7280, -74.2650)
    ]

    for r in recursos_iniciales:
        conn.execute("""
            INSERT OR IGNORE INTO recursos_disponibles (nombre_recurso, tipo, placa_codigo, estado, ubicacion_actual, latitud, longitud)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, r)

    try:
        conn.execute("ALTER TABLE usuarios ADD COLUMN estado TEXT DEFAULT 'Activo'")
    except sqlite3.OperationalError:
        pass

    try:
        conn.execute("ALTER TABLE usuarios ADD COLUMN recurso_asignado TEXT DEFAULT 'Sin Asignar'")
    except sqlite3.OperationalError:
        pass

    for col_nombre, col_tipo in [("latitud", "REAL"), ("longitud", "REAL")]:
        try:
            conn.execute(f"ALTER TABLE recursos_disponibles ADD COLUMN {col_nombre} {col_tipo}")
        except sqlite3.OperationalError:
            pass

    columnas_a_verificar = [
        ("gravedad", "TEXT DEFAULT 'Por definir'"),
        ("recurso_asignado", "TEXT DEFAULT 'Sin Asignar'"),
        ("usuario_id", "INTEGER"),
        ("estado", "TEXT DEFAULT 'Pendiente'"),
        ("es_laboral", "TEXT DEFAULT 'no'"),
        ("empresa_laboral", "TEXT"),
        ("arl_laboral", "TEXT"),
        ("latitud", "REAL"),
        ("longitud", "REAL"),
        ("reporter_lat", "REAL"),
        ("reporter_lng", "REAL")
    ]

    for col_nombre, col_tipo in columnas_a_verificar:
        try:
            conn.execute(f"ALTER TABLE emergencias ADD COLUMN {col_nombre} {col_tipo}")
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()


verificar_estructura_db()


# 🛡️ VALIDACIÓN EN TIEMPO REAL: Chequeo automático de baneo / cuenta inactiva antes de cada petición
@app.before_request
def verificar_estado_usuario_activo():
    if "user_id" in session:
        if request.endpoint in ["login", "registro", "inicio", "logout", "static"]:
            return
            
        conn = get_db_connection()
        try:
            user_db = conn.execute("SELECT estado FROM usuarios WHERE id = ?", (session["user_id"],)).fetchone()
            if user_db:
                estado = str(user_db["estado"]).strip().capitalize()
                if estado == "Inactivo":
                    session.clear()
                    flash("⚠️ Tu cuenta ha sido suspendida o inactiva por el administrador del sistema.", "danger")
                    return redirect(url_for("login"))
        except Exception:
            pass
        finally:
            conn.close()


def obtener_parametros_actuales():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT clave, valor FROM parametros_sistema").fetchall()
        return {r["clave"]: r["valor"] for r in rows}
    except Exception:
        return {
            "radio_despacho": "5.0",
            "tiempo_max_alerta": "10",
            "estado_servidor": "Operativo 100%"
        }
    finally:
        conn.close()


@app.context_processor
def inject_global_vars():
    return {"endpoints": list(app.url_map._rules_by_endpoint.keys())}


@app.route("/")
def inicio():
    return render_template("index.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        identificador = (
            request.form.get("username") or request.form.get("correo") or ""
        ).strip()
        password = request.form.get("password", "").strip()

        conn = get_db_connection()
        usuario = conn.execute(
            "SELECT * FROM usuarios WHERE LOWER(correo) = LOWER(?) OR LOWER(nombre) = LOWER(?)",
            (identificador, identificador),
        ).fetchone()
        conn.close()

        if usuario:
            hash_guardado = str(usuario["password"]).strip()
            es_valida = False

            try:
                if check_password_hash(hash_guardado, password):
                    es_valida = True
            except Exception as e:
                print(f"--> Aviso en check_password_hash: {e}")

            if not es_valida and hash_guardado == password:
                es_valida = True

            if es_valida:
                estado_usuario = str(usuario["estado"]).strip().capitalize() if "estado" in usuario.keys() and usuario["estado"] else "Activo"
                if estado_usuario == "Inactivo":
                    flash("⚠️ Tu cuenta se encuentra inactiva o suspendida. Comunícate con el administrador del sistema.", "danger")
                    return render_template("login.html")

                session["user_id"] = usuario["id"]
                session["nombre"] = usuario["nombre"]
                session["rol"] = usuario["rol"]
                session["recurso_asignado"] = usuario["recurso_asignado"] if "recurso_asignado" in usuario.keys() else "Sin Asignar"

                rol = str(usuario["rol"]).strip().capitalize()

                if rol == "Administrador":
                    return redirect(url_for("dashboard"))
                elif rol == "Operador":
                    return redirect(url_for("operador"))
                elif rol in ["Respondiente", "Paramédico", "Policía", "Bombero", "Defensa civil", "Agente de tránsito"]:
                    return redirect(url_for("respondiente"))
                else:
                    return redirect(url_for("civil"))

        flash("Correo o contraseña incorrectos", "danger")

    return render_template("login.html")


@app.route("/registro", methods=["GET", "POST"])
def registro():
    if request.method == "POST":
        nombre_input = request.form.get("nombre", "").strip()
        apellido_input = request.form.get("apellido", "").strip()

        nombre_completo = (
            f"{nombre_input} {apellido_input}".strip()
            if apellido_input
            else nombre_input
        )

        correo = request.form.get("correo", "").strip()
        password = request.form.get("password", "").strip()
        confirm_password = request.form.get("confirm_password", "").strip()
        rol = request.form.get("rol", "Civil").strip().capitalize()

        if password != confirm_password:
            flash(
                "Las contraseñas no coinciden. Revisa e intenta de nuevo.",
                "danger",
            )
            return render_template("registro.html")

        if not nombre_completo or not correo or not password:
            flash("Por favor completa todos los campos obligatorios.", "warning")
            return render_template("registro.html")

        conn = get_db_connection()

        usuario_existente = conn.execute(
            "SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(?)", (correo,)
        ).fetchone()

        if usuario_existente:
            conn.close()
            flash(
                "El correo electrónico ya se encuentra registrado en SAIMBE.",
                "danger",
            )
            return render_template("registro.html")

        try:
            hashed_password = generate_password_hash(password)
            conn.execute(
                "INSERT INTO usuarios (nombre, correo, password, rol, estado, recurso_asignado) VALUES (?, ?, ?, ?, 'Activo', 'Sin Asignar')",
                (nombre_completo, correo, hashed_password, rol),
            )

            usuario_actual = session.get("nombre", "Sistema")
            conn.execute(
                "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
                (
                    usuario_actual,
                    f"Registró un nuevo usuario: {nombre_completo} ({rol})",
                ),
            )

            conn.commit()
            flash(
                "Usuario creado con éxito. Ya puedes iniciar sesión.", "success"
            )
        except sqlite3.IntegrityError:
            flash("El correo electrónico ya se encuentra registrado.", "danger")
            return render_template("registro.html")
        finally:
            conn.close()

        if session.get("rol") == "Administrador":
            return redirect(url_for("dashboard"))

        return redirect(url_for("login"))

    return render_template("registro.html")


@app.route("/dashboard")
def dashboard():
    if not session.get("user_id"):
        return redirect(url_for("login"))

    rol = str(session.get("rol", "")).strip().capitalize()
    if rol != "Administrador":
        flash("Acceso denegado. Se requieren permisos de Administrador.", "danger")
        return redirect(url_for("login"))

    conn = get_db_connection()
    usuarios = conn.execute(
        "SELECT * FROM usuarios ORDER BY id DESC"
    ).fetchall()
    logs = conn.execute(
        "SELECT * FROM logs_auditoria ORDER BY fecha_hora DESC LIMIT 5"
    ).fetchall()

    parametros_db = conn.execute("SELECT * FROM parametros_sistema").fetchall()
    parametros = {p["clave"]: p["valor"] for p in parametros_db}

    recursos_count_row = conn.execute("SELECT COUNT(*) FROM recursos_disponibles WHERE estado = 'Disponible'").fetchone()
    recursos_disponibles_count = recursos_count_row[0] if recursos_count_row else 20

    registros_emergencias = conn.execute(
        """
        SELECT 
            e.id, 
            e.tipo, 
            e.ubicacion, 
            e.descripcion, 
            COALESCE(e.gravedad, 'Por definir') AS gravedad,
            e.estado, 
            COALESCE(e.recurso_asignado, 'Sin Asignar') AS recurso_asignado,
            e.latitud,
            e.longitud,
            e.reporter_lat,
            e.reporter_lng,
            COALESCE(u.nombre, 'Ciudadano') AS reportado_por
        FROM emergencias e
        LEFT JOIN usuarios u ON e.usuario_id = u.id
        ORDER BY e.id DESC
        """
    ).fetchall()
    conn.close()

    emergencias = []
    for r in registros_emergencias:
        item = dict(r)
        desc = item.get("descripcion", "")
        if desc.startswith("[") and "]" in desc:
            item["fecha"] = desc[1 : desc.index("]")]
            item["descripcion_limpia"] = desc[desc.index("]") + 1 :].strip()
        else:
            item["fecha"] = "Sin fecha"
            item["descripcion_limpia"] = desc

        emergencias.append(item)

    return render_template(
        "dashboard.html",
        usuarios=usuarios,
        logs=logs,
        emergencias=emergencias,
        parametros=parametros,
        recursos_disponibles_count=recursos_disponibles_count,
    )


@app.route("/operador")
def operador():
    if not session.get("user_id"):
        flash("Debes iniciar sesión para acceder.", "warning")
        return redirect(url_for("login"))

    rol = str(session.get("rol", "")).strip().capitalize()
    if rol not in ["Operador", "Administrador"]:
        flash("Acceso denegado. Se requieren permisos de Operador.", "danger")
        return redirect(url_for("login"))

    conn = get_db_connection()
    registros_emergencias = conn.execute(
        """
        SELECT 
            e.id, 
            e.tipo, 
            e.ubicacion, 
            e.descripcion, 
            COALESCE(e.gravedad, 'Por definir') AS gravedad,
            e.estado, 
            COALESCE(e.recurso_asignado, 'Sin Asignar') AS recurso_asignado,
            COALESCE(e.es_laboral, 'no') AS es_laboral,
            COALESCE(e.empresa_laboral, '') AS empresa_laboral,
            COALESCE(e.arl_laboral, '') AS arl_laboral,
            e.latitud,
            e.longitud,
            e.reporter_lat,
            e.reporter_lng,
            COALESCE(u.nombre, 'Ciudadano') AS reportado_por
        FROM emergencias e
        LEFT JOIN usuarios u ON e.usuario_id = u.id
        ORDER BY e.id DESC
        """
    ).fetchall()
    conn.close()

    emergencias = []
    for r in registros_emergencias:
        item = dict(r)
        desc = item.get("descripcion", "")
        if desc.startswith("[") and "]" in desc:
            item["fecha"] = desc[1 : desc.index("]")]
            item["descripcion_limpia"] = desc[desc.index("]") + 1 :].strip()
        else:
            item["fecha"] = "Sin fecha"
            item["descripcion_limpia"] = desc

        emergencias.append(item)

    return render_template("operador.html", emergencias=emergencias)


@app.route("/respondiente")
def respondiente():
    """Ruta protegida para el panel de respondientes con sincronización estricta de rol, vehículo y filtrado."""
    if not session.get("user_id"):
        flash("Debes iniciar sesión para acceder al panel de respondientes.", "warning")
        return redirect(url_for("login"))

    usuario_id = session.get("user_id")

    conn = get_db_connection()
    try:
        # Obtener el recurso asignado real y el rol guardado en la BD
        user_db = conn.execute("SELECT recurso_asignado, nombre, rol FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()
        recurso_sesion = str(user_db["recurso_asignado"] if user_db else "Sin Asignar").strip()
        
        # 🎯 Determinar el tipo de recurso exacto para sincronizar el rol/organismo automáticamente
        tipo_organismo = "Paramédico"
        estado_operativo = "Disponible"
        
        if recurso_sesion and recurso_sesion != "Sin Asignar":
            rec_info = conn.execute(
                "SELECT tipo, estado FROM recursos_disponibles WHERE nombre_recurso = ? OR placa_codigo = ?",
                (recurso_sesion, recurso_sesion)
            ).fetchone()
            if rec_info:
                tipo_db = str(rec_info["tipo"]).strip().lower()
                if "policía" in tipo_db or "policia" in tipo_db:
                    tipo_organismo = "Policía"
                elif "bomber" in tipo_db:
                    tipo_organismo = "Bombero"
                elif "tránsito" in tipo_db or "transito" in tipo_db:
                    tipo_organismo = "Agente de tránsito"
                elif "defensa" in tipo_db:
                    tipo_organismo = "Defensa civil"
                else:
                    tipo_organismo = "Paramédico"
                
                if rec_info["estado"]:
                    estado_operativo = rec_info["estado"]
        else:
            if user_db and user_db["rol"]:
                tipo_organismo = str(user_db["rol"]).strip().capitalize()

        # 🔄 Actualizar el rol en la base de datos y en la sesión para evitar desincronización
        if user_db and user_db["rol"] != tipo_organismo:
            conn.execute("UPDATE usuarios SET rol = ? WHERE id = ?", (tipo_organismo, usuario_id))
            conn.commit()

        session["rol"] = tipo_organismo

        # 🎯 FILTRADO ESTRICTO: Solo las emergencias con el recurso asignado exacto o su placa
        if tipo_organismo in ["Administrador", "Operador"]:
            registros = conn.execute("SELECT * FROM emergencias ORDER BY id DESC").fetchall()
        else:
            registros = conn.execute(
                "SELECT * FROM emergencias WHERE recurso_asignado = ? OR recurso_asignado LIKE ? ORDER BY id DESC",
                (recurso_sesion, f"%({recurso_sesion})%")
            ).fetchall()

        emergencias = []
        for r in registros:
            item = dict(r)
            desc = item.get("descripcion", "")
            if desc.startswith("[") and "]" in desc:
                item["fecha"] = desc[1 : desc.index("]")]
                item["descripcion_limpia"] = desc[desc.index("]") + 1 :].strip()
            else:
                item["fecha"] = "Sin fecha"
                item["descripcion_limpia"] = desc
            emergencias.append(item)

    except Exception as e:
        print(f"Error cargando emergencias de respondiente: {e}")
        emergencias = []
        tipo_organismo = "Paramédico"
        estado_operativo = "Disponible"
        recurso_sesion = "Sin Asignar"
    finally:
        conn.close()

    return render_template(
        "respondientes.html", 
        emergencias=emergencias, 
        rol_usuario=tipo_organismo, 
        recurso_unidad=recurso_sesion if recurso_sesion else "Sin Unidad",
        estado_operativo=estado_operativo
    )


@app.route("/api/respondiente/actualizar_estado", methods=["POST"])
def api_actualizar_estado_respondiente():
    """Permite al respondiente cambiar el estado de su unidad asignada de forma manual."""
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "No autorizado"}), 403
    
    data = request.get_json() if request.is_json else request.form
    nuevo_estado = data.get("estado", "").strip()
    recurso_asignado = str(session.get("recurso_asignado", "")).strip()
    
    if not recurso_asignado or recurso_asignado == "Sin Asignar":
        return jsonify({"success": False, "message": "No tienes una unidad o vehículo asignado en el sistema."}), 400
        
    conn = get_db_connection()
    try:
        # Actualizar en la tabla global de recursos disponibles
        conn.execute(
            "UPDATE recursos_disponibles SET estado = ? WHERE nombre_recurso LIKE ? OR placa_codigo LIKE ?",
            (nuevo_estado, f"%{recurso_asignado}%", f"%{recurso_asignado}%")
        )
        
        # Registrar en la auditoría del sistema
        usuario_nombre = session.get("nombre", "Respondiente")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (usuario_nombre, f"Actualizó su estado operativo manual a '{nuevo_estado}' en la unidad '{recurso_asignado}'")
        )
        conn.commit()
        return jsonify({"success": True, "message": f"Estado cambiado a '{nuevo_estado}' correctamente."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error interno: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/civil")
def civil():
    usuario_id = session.get("user_id")

    if not usuario_id:
        flash("Debes iniciar sesión para acceder al panel.", "warning")
        return redirect(url_for("login"))

    rol = str(session.get("rol", "")).strip().capitalize()
    if rol == "Administrador":
        return redirect(url_for("dashboard"))
    elif rol == "Operador":
        return redirect(url_for("operador"))

    conn = get_db_connection()

    usuario = conn.execute(
        "SELECT * FROM usuarios WHERE id = ?", (usuario_id,)
    ).fetchone()

    registros = conn.execute(
        """
        SELECT * FROM emergencias 
        WHERE usuario_id = ? 
        AND DATE(SUBSTR(descripcion, 2, 10)) = DATE('now', 'localtime')
        ORDER BY id DESC
        """,
        (usuario_id,),
    ).fetchall()

    conn.close()

    emergencias = []
    for r in registros:
        item = dict(r)
        desc = item.get("descripcion", "")
        if desc.startswith("[") and "]" in desc:
            item["fecha"] = desc[1 : desc.index("]")]
        else:
            item["fecha"] = "Sin fecha"

        emergencias.append(item)

    return render_template(
        "civil.html",
        emergencias=emergencias,
        usuario=usuario,
        nombre_usuario=session.get("nombre", "Civil"),
        endpoints=app.url_map._rules_by_endpoint.keys(),
    )


@app.route("/api/centros", methods=["GET"])
def obtener_centros_api():
    conn = get_db_connection()
    try:
        centros_db = conn.execute("SELECT * FROM centros_atencion").fetchall()
        centros = [dict(c) for c in centros_db]
    except sqlite3.OperationalError:
        centros = [
            {"id": 1, "nombre": "E.S.E. Hospital Santa Matilda", "municipio": "Madrid", "tipo": "Salud", "lat": 4.7358, "lng": -74.2625, "direccion": "Cl. 6 #2-44, Madrid", "telefono": "(601) 8250000"},
            {"id": 2, "nombre": "Estación de Bomberos Madrid", "municipio": "Madrid", "tipo": "Socorro", "lat": 4.7320, "lng": -74.2670, "direccion": "Cr. 4 #8-12, Madrid", "telefono": "(601) 8251111"},
            {"id": 3, "nombre": "Estación de Policía Madrid", "municipio": "Madrid", "tipo": "Seguridad", "lat": 4.7342, "lng": -74.2648, "direccion": "Cl. 7 #4-20, Madrid", "telefono": "(601) 8252222"},
            {"id": 4, "nombre": "Defensa Civil Seccional Madrid", "municipio": "Madrid", "tipo": "Socorro", "lat": 4.7380, "lng": -74.2610, "direccion": "Tv. 3 #5-18, Madrid", "telefono": "(601) 8253333"},
            {"id": 5, "nombre": "CAMU Sosiego", "municipio": "Madrid", "tipo": "Salud", "lat": 4.7290, "lng": -74.2580, "direccion": "Barrio El Sosiego, Madrid", "telefono": "(601) 8254444"}
        ]
    finally:
        conn.close()

    return jsonify({"success": True, "centros": centros})


@app.route("/api/obtener_logs", methods=["GET"])
def obtener_logs_api():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Sesión no iniciada."}), 401

    rol_sesion = str(session.get("rol", "")).strip().capitalize()
    if rol_sesion != "Administrador":
        return jsonify({"success": False, "message": "Acceso denegado."}), 403

    conn = get_db_connection()
    try:
        logs_db = conn.execute(
            "SELECT id, usuario, accion, fecha_hora FROM logs_auditoria ORDER BY id DESC"
        ).fetchall()
        logs = [dict(log) for log in logs_db]
        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error al consultar logs: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/api/obtener_recursos", methods=["GET"])
def obtener_recursos_api():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Sesión no iniciada."}), 401

    conn = get_db_connection()
    try:
        recursos_db = conn.execute("SELECT * FROM recursos_disponibles ORDER BY id DESC").fetchall()
        recursos = [dict(r) for r in recursos_db]
        return jsonify({"success": True, "recursos": recursos})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error al consultar recursos: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/api/actualizar_estado_recurso", methods=["POST"])
def actualizar_estado_recurso():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Sesión no iniciada."}), 401

    rol_sesion = str(session.get("rol", "")).strip().capitalize()
    if rol_sesion not in ["Administrador", "Operador"]:
        return jsonify({"success": False, "message": "Acceso denegado."}), 403

    data = request.get_json() if request.is_json else request.form
    recurso_id = data.get("id")
    nuevo_estado = data.get("estado", "").strip()

    if not recurso_id or not nuevo_estado:
        return jsonify({"success": False, "message": "Faltan datos obligatorios."}), 400

    conn = get_db_connection()
    try:
        conn.execute("UPDATE recursos_disponibles SET estado = ? WHERE id = ?", (nuevo_estado, recurso_id))
        
        usuario_nombre = session.get("nombre", "Operador")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (usuario_nombre, f"Actualizó el estado del recurso ID #{recurso_id} a '{nuevo_estado}'")
        )
        conn.commit()
        return jsonify({"success": True, "message": "Estado del recurso actualizado correctamente."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error interno: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/api/actualizar_gps_recurso", methods=["POST"])
def actualizar_gps_recurso():
    data = request.get_json() if request.is_json else request.form
    recurso_id = data.get("id") or data.get("recurso_id")
    lat = data.get("latitud") or data.get("lat")
    lon = data.get("longitud") or data.get("lng")

    if not recurso_id or lat is None or lon is None:
        return jsonify({"success": False, "message": "Faltan datos de ID o coordenadas GPS."}), 400

    conn = get_db_connection()
    try:
        conn.execute(
            "UPDATE recursos_disponibles SET latitud = ?, longitud = ? WHERE id = ?",
            (float(lat), float(lon), recurso_id)
        )
        conn.commit()
        return jsonify({"success": True, "message": "Posición GPS actualizada correctamente."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error al actualizar GPS: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/api/crear_recurso", methods=["POST"])
def crear_recurso_api():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Sesión no iniciada."}), 401

    rol_sesion = str(session.get("rol", "")).strip().capitalize()
    if rol_sesion not in ["Administrador", "Operador"]:
        return jsonify({"success": False, "message": "Acceso denegado."}), 403

    data = request.get_json() if request.is_json else request.form
    nombre_recurso = data.get("nombre_recurso", "").strip()
    tipo = data.get("tipo", "").strip()
    placa_codigo = data.get("placa_codigo", "").strip()
    ubicacion_actual = data.get("ubicacion_actual", "Base Central Madrid").strip()
    lat = data.get("latitud") or 4.7331
    lon = data.get("longitud") or -74.2642

    if not nombre_recurso or not tipo:
        return jsonify({"success": False, "message": "El nombre y el tipo de recurso son obligatorios."}), 400

    conn = get_db_connection()
    try:
        conn.execute(
            """INSERT INTO recursos_disponibles (nombre_recurso, tipo, placa_codigo, estado, ubicacion_actual, latitud, longitud)
               VALUES (?, ?, ?, 'Disponible', ?, ?, ?)""",
            (nombre_recurso, tipo, placa_codigo or 'N/A', ubicacion_actual, float(lat), float(lon))
        )

        usuario_nombre = session.get("nombre", "Operador")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (usuario_nombre, f"Registró una nueva unidad de recurso: {nombre_recurso} ({tipo})")
        )
        conn.commit()
        return jsonify({"success": True, "message": "Nueva unidad o servicio registrado correctamente."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error interno: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/api/reportar_emergencia", methods=["POST"])
def api_reportar_emergencia():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Sesión no iniciada."}), 401

    # 🛡️ Validación estricta de baneo en tiempo real al reportar
    conn = get_db_connection()
    try:
        user_check = conn.execute("SELECT estado FROM usuarios WHERE id = ?", (session["user_id"],)).fetchone()
        if user_check and str(user_check["estado"]).strip().capitalize() == "Inactivo":
            session.clear()
            conn.close()
            return jsonify({"success": False, "message": "Tu cuenta se encuentra inactiva o suspendida."}), 403
    except Exception:
        pass

    params = obtener_parametros_actuales()
    estado_servidor = params.get("estado_servidor", "Operativo 100%")
    radio_actual = params.get("radio_despacho", "5.0")

    data = request.get_json() if request.is_json else request.form

    tipo = data.get("tipo", "").strip()
    otro_tipo = data.get("otro_tipo", "").strip()
    descripcion = data.get("descripcion", "").strip()
    
    latitud = data.get("latitud")
    longitud = data.get("longitud")
    reporter_lat = data.get("reporter_lat") or data.get("user_lat")
    reporter_lng = data.get("reporter_lng") or data.get("user_lng")
    
    es_laboral = "si" if data.get("es_laboral") in ["si", "true", "on", True] else "no"
    empresa_laboral = data.get("empresa_laboral", "").strip() if es_laboral == "si" else ""
    arl_laboral = data.get("arl_laboral", "").strip() if es_laboral == "si" else ""

    if not descripcion:
        conn.close()
        return jsonify({"success": False, "message": "La descripción detallada de la emergencia es obligatoria."}), 400

    if tipo == "Otro" and otro_tipo:
        tipo = f"Otro ({otro_tipo})"

    ubicacion_ingresada = data.get("ubicacion", "").strip()
    
    if ubicacion_ingresada:
        ubicacion = ubicacion_ingresada
    elif latitud and longitud:
        ubicacion = f"Lat: {latitud}, Lng: {longitud} (Madrid)"
    else:
        ubicacion = "Madrid, Cundinamarca"

    usuario_id = session.get("user_id")
    nombre_usuario = session.get("nombre", "Ciudadano")
    fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M")

    if es_laboral == "si":
        prefijo_laboral = f"[ACCIDENTE LABORAL | Empresa: {empresa_laboral or 'No especificada'} | ARL: {arl_laboral or 'No especificada'}] "
        descripcion_final = f"[{fecha_actual}] {prefijo_laboral}{descripcion}"
    else:
        descripcion_final = f"[{fecha_actual}] {descripcion}"

    try:
        conn.execute(
            """INSERT INTO emergencias (tipo, ubicacion, gravedad, descripcion, estado, es_laboral, empresa_laboral, arl_laboral, latitud, longitud, reporter_lat, reporter_lng, usuario_id) 
               VALUES (?, ?, 'Por definir', ?, 'Pendiente', ?, ?, ?, ?, ?, ?, ?, ?)""",
            (tipo, ubicacion, descripcion_final, es_laboral, empresa_laboral, arl_laboral, latitud, longitud, reporter_lat, reporter_lng, usuario_id),
        )

        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (
                nombre_usuario,
                f"Reportó una emergencia de {tipo} en {ubicacion} {'(Laboral)' if es_laboral == 'si' else ''} [Radio de despacho: {radio_actual}km]",
            ),
        )
        conn.commit()
        return jsonify({
            "success": True, 
            "message": "Emergencia reportada exitosamente. Las interfaces operativas han sido sincronizadas."
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Error al guardar el reporte: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/crear_usuario_ajax", methods=["POST"])
def crear_usuario_ajax():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Sesión no iniciada."}), 401

    rol_sesion = str(session.get("rol", "")).strip().capitalize()
    if rol_sesion != "Administrador":
        return jsonify({"success": False, "message": "No tienes permisos de Administrador."}), 403

    data = request.get_json() if request.is_json else request.form

    nombre = data.get("nombre", "").strip()
    correo = (data.get("correo") or data.get("email") or "").strip()
    password = data.get("password", "").strip()
    rol_input = (data.get("rol") or "Operador").strip().capitalize()
    recurso_asignado = data.get("recurso_asignado", "Sin Asignar").strip()

    if not nombre or not correo or not password:
        return jsonify({"success": False, "message": "Por favor completa todos los campos requeridos."}), 400

    conn = get_db_connection()
    try:
        existente = conn.execute(
            "SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(?)", (correo,)
        ).fetchone()
        if existente:
            return jsonify({"success": False, "message": "El correo ya está registrado en SAIMBE."}), 400

        # 🎯 Asignar rol definitivo basado en el recurso seleccionado
        rol_definitivo = determinar_rol_por_recurso(conn, recurso_asignado, rol_input)

        hashed_password = generate_password_hash(password)
        conn.execute(
            "INSERT INTO usuarios (nombre, correo, password, rol, estado, recurso_asignado) VALUES (?, ?, ?, ?, 'Activo', ?)",
            (nombre, correo, hashed_password, rol_definitivo, recurso_asignado),
        )

        admin_nombre = session.get("nombre", "Administrador")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (admin_nombre, f"Creó al usuario: {nombre} con el rol '{rol_definitivo}' y recurso '{recurso_asignado}'"),
        )

        conn.commit()
        return jsonify({"success": True, "message": "Usuario creado exitosamente."})

    except Exception as e:
        print(f"Error en crear_usuario_ajax: {e}")
        return jsonify({"success": False, "message": "Error interno en el servidor al crear usuario."}), 500
    finally:
        conn.close()


@app.route("/editar_usuario_ajax", methods=["POST"])
def editar_usuario_ajax():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Sesión no iniciada."}), 401

    rol_sesion = str(session.get("rol", "")).strip().capitalize()
    if rol_sesion != "Administrador":
        return jsonify({"success": False, "message": "No tienes permisos de Administrador."}), 403

    data = request.get_json() if request.is_json else request.form

    usuario_id = data.get("id")
    nombre = data.get("nombre", "").strip()
    correo = data.get("correo", "").strip()
    rol_input = data.get("rol", "Civil").strip().capitalize()
    estado = data.get("estado", "Activo").strip().capitalize()
    recurso_asignado = data.get("recurso_asignado", "Sin Asignar").strip()

    if not usuario_id or not nombre or not correo:
        return jsonify({"success": False, "message": "Faltan campos obligatorios para actualizar."}), 400

    conn = get_db_connection()
    try:
        # 🎯 Sincronizar y fijar el rol definitivo de manera persistente según el recurso asignado
        rol_definitivo = determinar_rol_por_recurso(conn, recurso_asignado, rol_input)

        conn.execute(
            "UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, estado = ?, recurso_asignado = ? WHERE id = ?",
            (nombre, correo, rol_definitivo, estado, recurso_asignado, usuario_id)
        )

        admin_nombre = session.get("nombre", "Administrador")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (admin_nombre, f"Actualizó el usuario ID #{usuario_id}: {nombre} ({rol_definitivo}) - Recurso: {recurso_asignado} - Estado: {estado}"),
        )
        conn.commit()
        return jsonify({"success": True, "message": f"Usuario #{usuario_id} actualizado correctamente."})
    except Exception as e:
        print(f"Error en editar_usuario_ajax: {e}")
        return jsonify({"success": False, "message": f"Error interno al actualizar usuario: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/api/actualizar_parametros", methods=["POST"])
def actualizar_parametros():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Sesión no iniciada."}), 401

    rol_sesion = str(session.get("rol", "")).strip().capitalize()
    if rol_sesion != "Administrador":
        return jsonify({"success": False, "message": "No tienes permisos de Administrador."}), 403

    data = request.get_json() if request.is_json else request.form
    conn = get_db_connection()
    try:
        radio = data.get("radio_despacho", "").strip()
        tiempo = data.get("tiempo_max_alerta", "").strip()
        estado = data.get("estado_servidor", "").strip()

        if radio:
            conn.execute("UPDATE parametros_sistema SET valor = ? WHERE clave = 'radio_despacho'", (radio,))
        if tiempo:
            conn.execute("UPDATE parametros_sistema SET valor = ? WHERE clave = 'tiempo_max_alerta'", (tiempo,))
        if estado:
            conn.execute("UPDATE parametros_sistema SET valor = ? WHERE clave = 'estado_servidor'", (estado,))

        admin_nombre = session.get("nombre", "Administrador")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (admin_nombre, "Actualizó los parámetros globales del sistema SAIMBE")
        )
        conn.commit()
        return jsonify({"success": True, "message": "Parámetros del sistema actualizados correctamente."})
    except Exception as e:
        print(f"Error actualizando parámetros: {e}")
        return jsonify({"success": False, "message": f"Error interno: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/guardar_configuracion", methods=["POST"])
def guardar_configuracion():
    if not session.get("user_id"):
        return redirect(url_for("login"))

    usuario_id = session.get("user_id")
    telefono = request.form.get("telefono", "").strip()
    notificaciones = request.form.get("notificaciones", "activado").strip()
    
    password_actual = request.form.get("password_actual", "").strip()
    nuevo_password = request.form.get("nuevo_password", "").strip()
    confirm_password = request.form.get("confirm_password", "").strip()

    conn = get_db_connection()
    try:
        # Si intenta cambiar la contraseña, aplicamos validaciones estrictas
        if nuevo_password or confirm_password or password_actual:
            if not password_actual:
                flash("⚠️ Debes escribir tu contraseña actual para poder cambiarla.", "danger")
                conn.close()
                return redirect(url_for("civil"))

            if nuevo_password != confirm_password:
                flash("⚠️ Las nuevas contraseñas no coinciden. Por favor revísalas.", "danger")
                conn.close()
                return redirect(url_for("civil"))

            usuario_db = conn.execute("SELECT password FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()
            if usuario_db:
                hash_guardado = str(usuario_db["password"]).strip()
                es_valida = False
                try:
                    if check_password_hash(hash_guardado, password_actual):
                        es_valida = True
                except Exception:
                    pass

                if not es_valida and hash_guardado == password_actual:
                    es_valida = True

                if not es_valida:
                    flash("⚠️ La contraseña actual es incorrecta.", "danger")
                    conn.close()
                    return redirect(url_for("civil"))

            hashed_password = generate_password_hash(nuevo_password)
            conn.execute(
                "UPDATE usuarios SET telefono = ?, notificaciones = ?, password = ? WHERE id = ?",
                (telefono, notificaciones, hashed_password, usuario_id),
            )
        else:
            conn.execute(
                "UPDATE usuarios SET telefono = ?, notificaciones = ? WHERE id = ?",
                (telefono, notificaciones, usuario_id),
            )

        nombre_usuario = session.get("nombre", "Usuario")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (nombre_usuario, "Actualizó su configuración de perfil y contraseña"),
        )
        conn.commit()
        flash("Configuración y perfil actualizados correctamente.", "success")
    except Exception as e:
        print(f"Error al guardar configuración de civil: {e}")
        flash("Ocurrió un error al actualizar la configuración.", "danger")
    finally:
        conn.close()

    return redirect(url_for("civil"))


@app.route("/guardar_configuracion_operador", methods=["POST"])
def guardar_configuracion_operador():
    if not session.get("user_id"):
        return redirect(url_for("login"))

    rol_sesion = str(session.get("rol", "")).strip().capitalize()
    if rol_sesion not in ["Operador", "Administrador"]:
        flash("Acceso denegado.", "danger")
        return redirect(url_for("login"))

    usuario_id = session.get("user_id")
    telefono = request.form.get("telefono", "").strip()
    notificaciones = request.form.get("notificaciones", "activado").strip()
    
    password_actual = request.form.get("password_actual", "").strip()
    nuevo_password = request.form.get("nuevo_password", "").strip()
    confirm_password = request.form.get("confirm_password", "").strip()

    conn = get_db_connection()
    try:
        # Si intenta cambiar la contraseña, aplicamos validaciones estrictas
        if nuevo_password or confirm_password or password_actual:
            if not password_actual:
                flash("⚠️ Debes escribir tu contraseña actual para poder cambiarla.", "danger")
                conn.close()
                return redirect(url_for("operador"))

            if nuevo_password != confirm_password:
                flash("⚠️ Las nuevas contraseñas no coinciden. Por favor revísalas.", "danger")
                conn.close()
                return redirect(url_for("operador"))

            usuario_db = conn.execute("SELECT password FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()
            if usuario_db:
                hash_guardado = str(usuario_db["password"]).strip()
                es_valida = False
                try:
                    if check_password_hash(hash_guardado, password_actual):
                        es_valida = True
                except Exception:
                    pass

                if not es_valida and hash_guardado == password_actual:
                    es_valida = True

                if not es_valida:
                    flash("⚠️ La contraseña actual es incorrecta.", "danger")
                    conn.close()
                    return redirect(url_for("operador"))

            hashed_password = generate_password_hash(nuevo_password)
            conn.execute(
                "UPDATE usuarios SET telefono = ?, notificaciones = ?, password = ? WHERE id = ?",
                (telefono, notificaciones, hashed_password, usuario_id),
            )
        else:
            conn.execute(
                "UPDATE usuarios SET telefono = ?, notificaciones = ? WHERE id = ?",
                (telefono, notificaciones, usuario_id),
            )

        nombre_usuario = session.get("nombre", "Operador")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (nombre_usuario, "Actualizó su configuración de perfil y preferencias operativas"),
        )
        conn.commit()
        flash("Configuración de operador guardada exitosamente.", "success")
    except Exception as e:
        print(f"Error al guardar configuración de operador: {e}")
        flash("Ocurrió un error al actualizar la configuración.", "danger")
    finally:
        conn.close()

    return redirect(url_for("operador"))


@app.route("/registrar_emergencia", methods=["GET", "POST"])
def registrar_emergencia():
    if not session.get("user_id"):
        return redirect(url_for("login"))

    if request.method == "POST":
        params = obtener_parametros_actuales()
        radio_actual = params.get("radio_despacho", "5.0")

        tipo = request.form.get("tipo")
        otro_tipo = request.form.get("otro_tipo")
        descripcion = request.form.get("descripcion", "").strip()
        
        es_laboral = "si" if request.form.get("es_laboral") in ["si", "true", "on", True] else "no"
        empresa_laboral = request.form.get("empresa_laboral", "").strip() if es_laboral == "si" else ""
        arl_laboral = request.form.get("arl_laboral", "").strip() if es_laboral == "si" else ""

        if not descripcion:
            flash("La descripción detallada de la emergencia es obligatoria.", "danger")
            return redirect(url_for("civil"))

        if tipo == "Otro" and otro_tipo:
            tipo = f"Otro ({otro_tipo.strip()})"

        ubicacion_ingresada = request.form.get("ubicacion", "").strip()
        latitud = request.form.get("latitud")
        longitud = request.form.get("longitud")
        reporter_lat = request.form.get("reporter_lat") or request.form.get("user_lat")
        reporter_lng = request.form.get("reporter_lng") or request.form.get("user_lng")

        if ubicacion_ingresada:
            ubicacion = ubicacion_ingresada
        elif latitud and longitud:
            ubicacion = f"Lat: {latitud}, Lng: {longitud} (Madrid)"
        else:
            ubicacion = "Madrid, Cundinamarca"

        usuario_id = session.get("user_id")
        nombre_usuario = session.get("nombre", "Ciudadano")

        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        if es_laboral == "si":
            prefijo_laboral = f"[ACCIDENTE LABORAL | Empresa: {empresa_laboral or 'No especificada'} | ARL: {arl_laboral or 'No especificada'}] "
            descripcion_final = f"[{fecha_actual}] {prefijo_laboral}{descripcion}"
        else:
            descripcion_final = f"[{fecha_actual}] {descripcion}"

        conn = get_db_connection()

        conn.execute(
            """INSERT INTO emergencias (tipo, ubicacion, gravedad, descripcion, estado, es_laboral, empresa_laboral, arl_laboral, latitud, longitud, reporter_lat, reporter_lng, usuario_id) 
               VALUES (?, ?, 'Por definir', ?, 'Pendiente', ?, ?, ?, ?, ?, ?, ?, ?)""",
            (tipo, ubicacion, descripcion_final, es_laboral, empresa_laboral, arl_laboral, latitud, longitud, reporter_lat, reporter_lng, usuario_id),
        )

        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (
                nombre_usuario,
                f"Reportó una emergencia de {tipo} en {ubicacion} {'(Laboral)' if es_laboral == 'si' else ''} [Radio de despacho: {radio_actual}km]",
            ),
        )

        conn.commit()
        conn.close()

        flash("Emergencia reportada exitosamente. Las interfaces han sido sincronizadas.", "success")
        return redirect(url_for("civil"))

    return redirect(url_for("civil"))


@app.route("/clasificar_emergencia", methods=["POST"])
def clasificar_emergencia():
    if not session.get("user_id"):
        return redirect(url_for("login"))

    rol = str(session.get("rol", "")).strip().capitalize()
    if rol not in ["Operador", "Administrador"]:
        flash("No tienes permisos para realizar esta acción.", "danger")
        return redirect(url_for("login"))

    emergencia_id = request.form.get("emergencia_id")
    gravedad = request.form.get("gravedad", "").strip()
    recurso_seleccionado = request.form.get("recurso", "").strip()
    nuevo_estado = request.form.get("estado", "Pendiente").strip()

    redirect_url = url_for("dashboard") if rol == "Administrador" else url_for("operador")

    if not emergencia_id:
        flash("ID de emergencia no válido.", "danger")
        return redirect(redirect_url)

    if not gravedad or gravedad == "Por definir" or not recurso_seleccionado or recurso_seleccionado == "Sin Asignar":
        flash("⚠️ Error: Para procesar y guardar la emergencia, es OBLIGATORIO seleccionar una Prioridad / Gravedad y un Recurso válido.", "danger")
        return redirect(redirect_url)

    if nuevo_estado == "Pendiente" and rol == "Operador":
        nuevo_estado = "En proceso"

    conn = get_db_connection()
    try:
        emergencia = conn.execute(
            "SELECT latitud, longitud, tipo FROM emergencias WHERE id = ?", (emergencia_id,)
        ).fetchone()

        lat_emergencia = emergencia["latitud"] if emergencia and "latitud" in emergencia.keys() else None
        lon_emergencia = emergencia["longitud"] if emergencia and "longitud" in emergencia.keys() else None

        if lat_emergencia is None or lon_emergencia is None:
            lat_emergencia, lon_emergencia = 4.7331, -74.2642

        tipo_filtro_db = None
        recurso_lower = recurso_seleccionado.lower()
        if "ambulancia" in recurso_lower:
            tipo_filtro_db = "Ambulancia"
        elif "policía" in recurso_lower or "policia" in recurso_lower or "tránsito" in recurso_lower:
            tipo_filtro_db = "Policía"
        elif "bomberos" in recurso_lower or "extintor" in recurso_lower:
            tipo_filtro_db = "Bomberos"
        elif "defensa" in recurso_lower:
            tipo_filtro_db = "Defensa Civil"

        recurso_final_asignado = recurso_seleccionado
        unidad_id_asignada = None

        if tipo_filtro_db:
            recursos_disponibles = conn.execute(
                "SELECT * FROM recursos_disponibles WHERE estado = 'Disponible' AND tipo LIKE ?",
                (f"%{tipo_filtro_db}%",)
            ).fetchall()

            if recursos_disponibles:
                mejor_unidad = None
                menor_distancia = float('inf')

                for unidad in recursos_disponibles:
                    unidad_lat = unidad["latitud"] if "latitud" in unidad.keys() and unidad["latitud"] is not None else lat_emergencia
                    unidad_lon = unidad["longitud"] if "longitud" in unidad.keys() and unidad["longitud"] is not None else lon_emergencia
                    
                    distancia = calcular_distancia_haversine(lat_emergencia, lon_emergencia, unidad_lat, unidad_lon)
                    if distancia < menor_distancia:
                        menor_distancia = distancia
                        mejor_unidad = unidad

                if mejor_unidad:
                    unidad_id_asignada = mejor_unidad["id"]
                    recurso_final_asignado = f"{mejor_unidad['nombre_recurso']} ({mejor_unidad['placa_codigo']})"
                    
                    conn.execute(
                        "UPDATE recursos_disponibles SET estado = 'En servicio', ubicacion_actual = ? WHERE id = ?",
                        (f"Asignado a Incidente #{emergencia_id}", unidad_id_asignada)
                    )

        conn.execute(
            """UPDATE emergencias 
               SET gravedad = ?, recurso_asignado = ?, estado = ? 
               WHERE id = ?""",
            (gravedad, recurso_final_asignado, nuevo_estado, emergencia_id)
        )

        nombre_usuario = session.get("nombre", rol)
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (
                nombre_usuario,
                f"Actualizó emergencia #{emergencia_id}: Gravedad='{gravedad}', Recurso Asignado (Más cercano GPS)='{recurso_final_asignado}', Estado='{nuevo_estado}'",
            ),
        )
        conn.commit()
        flash(f"Emergencia #{emergencia_id} actualizada y recurso más cercano asignado correctamente mediante GPS.", "success")
    except Exception as e:
        print(f"Error al clasificar emergencia con despacho cercano GPS: {e}")
        flash("Ocurrió un error al guardar los cambios en la base de datos.", "danger")
    finally:
        conn.close()

    return redirect(redirect_url)


@app.route("/cambiar_estado_emergencia", methods=["POST"])
def cambiar_estado_emergencia():
    if not session.get("user_id"):
        return redirect(url_for("login"))

    rol = str(session.get("rol", "")).strip().capitalize()
    if rol not in ["Administrador", "Operador"]:
        flash("No tienes permisos para realizar esta acción.", "danger")
        return redirect(url_for("login"))

    emergencia_id = request.form.get("emergencia_id")
    nuevo_estado = request.form.get("estado")

    estados_validos = ["Pendiente", "En proceso", "Finalizada"]
    if nuevo_estado in estados_validos and emergencia_id:
        conn = get_db_connection()
        
        conn.execute(
            "UPDATE emergencias SET estado = ? WHERE id = ?",
            (nuevo_estado, emergencia_id),
        )

        if nuevo_estado == "Finalizada":
            conn.execute(
                """UPDATE recursos_disponibles 
                   SET estado = 'Disponible', ubicacion_actual = 'Base Central Madrid' 
                   WHERE ubicacion_actual LIKE ?""",
                (f"%Incidente #{emergencia_id}%",)
            )

        nombre_usuario = session.get("nombre", "Operador")
        conn.execute(
            "INSERT INTO logs_auditoria (usuario, accion) VALUES (?, ?)",
            (
                nombre_usuario,
                f"Cambió el estado de la emergencia #{emergencia_id} a '{nuevo_estado}' {'(Recurso asignado liberado a Disponible)' if nuevo_estado == 'Finalizada' else ''}",
            ),
        )
        conn.commit()
        conn.close()
        flash(
            f"Estado de la emergencia #{emergencia_id} actualizado a '{nuevo_estado}'.",
            "success",
        )

    if rol == "Administrador":
        return redirect(url_for("dashboard"))
    return redirect(url_for("operador"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=True)