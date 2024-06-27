@echo off

echo Installing yt-dlp...

:: Define the installation directory
set INSTALL_DIR=%~dp0
set YT_DLP_DIR=%INSTALL_DIR%yt-dlp
set YT_DLP_EXE=%YT_DLP_DIR%\yt-dlp.exe

:: Check if yt-dlp directory exists
if not exist "%YT_DLP_DIR%" (
    mkdir "%YT_DLP_DIR%"
)

:: Check if yt-dlp executable already exists
if exist "%YT_DLP_EXE%" (
    echo yt-dlp is already installed
    echo YT_DLP_PATH: %YT_DLP_EXE%
    goto :check_path
)

:: Function to download yt-dlp if not already present
:download_yt_dlp
echo Downloading yt-dlp...
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', '%YT_DLP_EXE%')"

:: Check if download was successful
if not exist "%YT_DLP_EXE%" (
    echo Failed to download yt-dlp.
    exit /b 1
)

:: Check if yt-dlp is already in PATH
:check_path
echo %PATH% | findstr /i /c:"%YT_DLP_DIR%" > nul
if %errorlevel% neq 0 (
    setx PATH "%YT_DLP_DIR%;%PATH%"
    echo Added yt-dlp to PATH environment variable.
) else (
    echo yt-dlp already exists in PATH.
)

:: Display final message with variable
echo.
echo yt-dlp installation completed successfully.
echo YT_DLP_PATH: %YT_DLP_DIR%
echo.

:: Exit script after installation
exit /b 0