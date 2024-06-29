/**
 * LICENSE MIT
 * Copyright (c) 2024 rn0x
 * github: https://github.com/rn0x
 * telegram: https://t.me/F93ii
 * repository: https://github.com/rn0x/downib
 */

// setupYtDlp.js
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

/**
 * Download a file from a URL and save it to a specified path if it doesn't already exist.
 * @param {string} url - The URL of the file to download.
 * @param {string} outputPath - The path to save the downloaded file.
 * @param {boolean} log - Whether to print log messages.
 * @param {string} platform - Returns a string identifying the operating system platform.
 * @returns {string} The path to the downloaded file.
 */
const downloadFile = (url, outputPath, log, platform) => {
    if (fs.existsSync(outputPath)) {
        if (log) console.log(`File ${outputPath} already exists. Skipping download.`);
        return outputPath; // Return outputPath if file exists
    }

    if (log) console.log(`Downloading ${url}`);
    const command = `curl -L ${url} -o ${outputPath}`;
    execSync(command);
    if (log) console.log(`Downloaded to ${outputPath}`);

    // Set executable permissions for Linux
    if (platform === 'linux') {
        fs.chmodSync(outputPath, 0o755); // Make the file executable
    }
    return outputPath; // Return outputPath after download
};

/**
 * Extract a tar.gz archive to a specified directory.
 * @param {string} filePath - The path of the tar.gz archive.
 * @param {string} outputPath - The directory to extract the archive to.
 * @param {boolean} log - Whether to print log messages.
 */
const extractTarGz = (filePath, outputPath, log) => {
    if (log) console.log(`Extracting ${filePath}`);
    const command = `tar -xzf ${filePath} -C ${outputPath}`;
    execSync(command);
    if (log) console.log(`Extracted to ${outputPath}`);
};

/**
 * Extract a zip archive to a specified directory.
 * @param {string} filePath - The path of the zip archive.
 * @param {string} outputPath - The directory to extract the archive to.
 * @param {boolean} log - Whether to print log messages.
 */
const extractZip = (filePath, outputPath, log) => {
    if (log) console.log(`Extracting ${filePath}`);
    const platform = os.platform();

    if (platform === 'win32') {
        const command = `powershell -command "Expand-Archive -Path '${filePath}' -DestinationPath '${outputPath}'"`;
        execSync(command);
    } else {
        const command = `unzip -o ${filePath} -d ${outputPath}`;
        execSync(command);
    }

    if (log) console.log(`Extracted to ${outputPath}`);
};

/**
 * Set up yt-dlp by downloading the appropriate version based on the OS and architecture, 
 * extracting it if necessary, and returning the path to the executable.
 * @param {string} outputDir - The directory to save the downloaded files.
 * @param {Object} options - Optional settings.
 * @param {boolean} [options.log=true] - Whether to print log messages.
 * @returns {Promise<Object>} The paths of the yt-dlp executables.
 */
const setupYtDlp = async (outputDir, options = {}) => {
    const { log = true } = options;

    const arch = os.arch();
    const platform = os.platform();
    let ytDlpUrl;

    if (platform === 'linux') {
        if (arch === 'x64') {
            ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
        } else if (arch === 'arm64') {
            ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64';
        } else if (arch === 'arm') {
            ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_armv7l';
        } else {
            throw new Error('Unsupported architecture for Linux');
        }
    } else if (platform === 'win32') {
        ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    } else if (platform === 'darwin') {
        ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    } else {
        throw new Error('Unsupported platform');
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const ytDlpPath = path.join(outputDir, path.basename(ytDlpUrl));
    const downloadedPath = downloadFile(ytDlpUrl, ytDlpPath, log, platform);

    if (ytDlpUrl.endsWith('.tar.gz')) {
        extractTarGz(downloadedPath, outputDir, log);
        fs.unlinkSync(downloadedPath); // Delete the tar.gz archive after extraction
    } else if (ytDlpUrl.endsWith('.zip')) {
        extractZip(downloadedPath, outputDir, log);
        fs.unlinkSync(downloadedPath); // Delete the zip archive after extraction
    }

    return {
        ytDlpPath: ytDlpPath
    };
};

export default setupYtDlp;