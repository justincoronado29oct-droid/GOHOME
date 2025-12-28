@echo off
REM run_notifier.bat — ejecuta el notificador desde la carpeta del proyecto
REM Coloca este archivo en la raíz del repositorio (misma carpeta que desktop_notifier.py)

cd /d "%~dp0"
REM si hay un virtualenv local, activar
if exist ".venv\Scripts\activate.bat" (
  call ".venv\Scripts\activate.bat"
)

REM ejecutar python (fallback: si no hay venv, usar python en PATH)
python "%~dp0\desktop_notifier.py"
exit /b %ERRORLEVEL%