import sqlite3

# Conectar a la nueva base de datos recién creada
conn = sqlite3.connect("saimbe.db")
cursor = conn.cursor()

# Lista de usuarios de prueba (Admin, Operador, Civil) con contraseña '123456'
usuarios_prueba = [
    ('Nick Calderón', 'nick.calderon@saimbe.com', 'Valeryjuliana1.', 'Administrador'),
    ('Santiago Gaitan', 'santiago.gaitan@saimbe.com', 'Thiago23092003', 'Administrador'),
    ('Sebastian Faciolince', 'sebastian.faciolince@saimbe.com', 'Seba$2004', 'Administrador')
]

# Insertarlos en la tabla de usuarios
cursor.executemany(
    "INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)",
    usuarios_prueba
)

conn.commit()
conn.close()

print("¡Usuarios de prueba creados exitosamente en el nuevo saimbe.db!")