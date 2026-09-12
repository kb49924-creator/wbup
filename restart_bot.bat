@echo off
cd /d "c:\Users\snezh\OneDrive\Desktop\wb _channe_chatgptl"
echo Killing old bot processes...
wmic process where "commandline like '%%run_bot.py%%' and name='python.exe'" delete 2>nul
timeout /t 2 /nobreak >nul
echo Starting bot...
start /B python scripts/run_bot.py
echo Bot restarted.