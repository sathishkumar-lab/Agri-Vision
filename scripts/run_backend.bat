@echo off
echo ============================================================
echo Starting Agri-Vision Backend Service (FastAPI)
echo ============================================================

cd ..\backend

if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else if exist ..\.venv\Scripts\activate.bat (
    call ..\.venv\Scripts\activate.bat
)

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
