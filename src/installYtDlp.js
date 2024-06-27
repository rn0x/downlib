// Import required modules
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import which from 'which';

// Determine current script directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Function to install yt-dlp silently
async function installYtDlp() {
    try {
        console.log('Starting installation process...');
        // Check installation status
        const ytDlpPath = checkInstallation();
        if (ytDlpPath) {
            console.log('yt-dlp is already installed at:', ytDlpPath);
        } else {
            console.log('yt-dlp is not installed. Proceeding with installation...');
            // Determine OS platform and script name
            const osType = process.platform;
            let scriptName = getScriptName(osType);

            console.log('OS Type:', osType);
            console.log('Script Name:', scriptName);

            // Run the installation script based on OS
            let installProcess = startInstallationProcess(osType, scriptName);

            // Capture and print script output
            captureOutput(installProcess);

            // Wait for installation to complete
            await waitForInstallation(installProcess);

            console.log('yt-dlp installation completed.');
        }
    } catch (error) {
        console.error('Error installing yt-dlp:', error.message);
    }
}

// Helper function to get script name based on OS
function getScriptName(osType) {
    switch (osType) {
        case 'win32':
            return 'install_yt-dlp.bat';
        case 'darwin':
        case 'linux':
            return 'install_yt-dlp.sh';
        default:
            throw new Error('Unsupported OS.');
    }
}

// Helper function to start the installation process
function startInstallationProcess(osType, scriptName) {
    if (osType === 'win32') {
        return spawn('cmd.exe', ['/c', join(__dirname, scriptName)], { shell: true });
    } else {
        return spawn('bash', [join(__dirname, scriptName)]);
    }
}

// Helper function to capture and print stdout and stderr
function captureOutput(installProcess) {
    installProcess.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    installProcess.stderr.on('data', (data) => {
        console.error(data.toString());
    });
}

// Helper function to wait for installation process to complete
function waitForInstallation(installProcess) {
    return new Promise((resolve, reject) => {
        installProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Installation process exited with code ${code}.`));
            }
        });
    });
}

// Helper function to check yt-dlp installation status
function checkInstallation() {
    try {
        const ytDlpPath = which.sync('yt-dlp');
        return ytDlpPath || null;
    } catch (error) {
        return null;
    }
}

// Run the installation function
installYtDlp();