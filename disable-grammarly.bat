@echo off
echo Disabling Grammarly extension...

REM Get Chrome extension path
set "EXT_PATH=%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\efaidnbmnnnibpcajpcglclefindmkaj"

REM Rename extension folder to disable it
if exist "%EXT_PATH%" (
    ren "%EXT_PATH%" "efaidnbmnnnibpcajpcglclefindmkaj_DISABLED"
    echo Grammarly extension has been DISABLED
) else (
    echo Extension folder not found - may already be disabled or using different profile
)

REM Also try to disable via Chrome settings registry
reg add "HKCU\Software\Google\Chrome\Extensions\efaidnbmnnnibpcajpcglclefindmkaj" /v "state" /t REG_DWORD /d 1 /f 2>nul

echo Done. Please restart Chrome if it was running.
pause
