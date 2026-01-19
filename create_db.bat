@echo off
set MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe

echo Creando base de datos gohome_db...

"%MYSQL_PATH%" -h 127.0.0.1 -u root -pF9!qZ7@M#2sLxW8$ < "c:\Users\justi\GOHOME\create_db.sql"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================
    echo Base de datos creada exitosamente
    echo ========================================
    echo.
    echo Host: 127.0.0.1
    echo Puerto: 3306
    echo Usuario: root
    echo Contrasena: F9!qZ7@M#2sLxW8$
    echo Base de datos: gohome_db
) else (
    echo.
    echo ❌ Error al crear la base de datos
    echo Verifica que MySQL esté corriendo
)

pause
