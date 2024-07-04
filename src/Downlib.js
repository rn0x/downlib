/**
 * LICENSE MIT
 * Copyright (c) 2024 rn0x
 * github: https://github.com/rn0x
 * telegram: https://t.me/F93ii
 * repository: https://github.com/rn0x/downib
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fileTypeFromBuffer } from 'file-type';
import setupYtDlp from './setupYtDlp.js';
import axios from 'axios';
import tiktokdl from './tiktok-dl.js';
import instagramGetUrl from './instagramGetUrl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
* Retrieve yt-dlp executable path asynchronously.
* @returns {Promise<string|boolean>} Resolves with the yt-dlp executable path.
*/
async function getYtDlpPath() {
    try {
        const ytDlpDir = path.resolve(__dirname, 'yt-dlp');
        const ytDlp = await setupYtDlp(ytDlpDir, { log: false });
        return ytDlp?.ytDlpPath ? ytDlp.ytDlpPath : undefined;
    } catch (error) {
        console.error("Error in getYtDlpPath:", error);
        return undefined
    }
}

/**
 * Generates a unique ID consisting of alphanumeric characters.
 * @param {number} length - The length of the unique ID to be generated.
 * @returns {string} - The generated unique ID.
 */
function generateUniqueId(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < length; i++) {
        randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return randomString;
}

/**
 * Ensure directory exists by creating it if it doesn't.
 * @param {string} dirPath - Directory path to check/create.
 * @returns {Promise<void>} - Promise resolved once the directory is ensured.
 */
async function ensureDirExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Directory created: ${dirPath}`);
        }
    } catch (error) {
        console.error(`Error creating directory: ${dirPath} `, error);
    }
}

/**
 * Delete a file from the file system.
 * @param {string} filepath - The file path to delete.
 * @returns {Promise<void>} - A promise to delete the file.
 */
async function deleteFile(filepath) {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    } catch (error) {
        console.error(`Error deleting file: ${filepath}`, error);
    }
}

/**
* Check if the given text represents a valid URL.
* @param {string} url - The text to check.
* @returns {boolean} - true if the text represents a valid URL, false otherwise.
*/
function isValidUrl(url) {
    let valid = false;
    try {
        const parsedUrl = new URL(url);
        valid = ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch (error) {
        return false
    }
    return valid;
}

/**
 * Download media from supported platforms using yt-dlp.
 * @param {string} ytDlpPath - URL of the media to download.
 * @param {string} url - URL of the media to download.
 * @param {string} saveDir - Directory to save the downloaded media.
 * @param {string[]} additionalArgs - Additional arguments for yt-dlp.
 * @returns {Promise<object>} - Promise resolving to JSON object with video metadata.
 */
async function downloadMedia(ytDlpPath, url, saveDir, additionalArgs = []) {
    try {
        // Ensure save directory exists
        await ensureDirExists(saveDir);

        // Generate random filename
        const fileName = generateUniqueId(25);
        const fileNameInfo = `${fileName}.info.json`;
        const FilePath = path.join(saveDir, `${fileName}.%(ext)s`);

        // Define yt-dlp arguments
        const args = [
            url,
            '--write-info-json',       // Write video metadata to a JSON file
            '--output', FilePath,      // Specify output filename with random string
            ...additionalArgs         // Additional arguments provided by user
        ];

        // Spawn yt-dlp process
        const ytDlpProcess = spawn(ytDlpPath, args);

        return new Promise((resolve, reject) => {
            let stdout = '';

            ytDlpProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytDlpProcess.on('close', async (code) => {
                if (code !== 0) {
                    resolve({ success: false, error: `yt-dlp process exited with code ${code}` });
                } else {
                    try {
                        const infoJsonPath = path.join(saveDir, fileNameInfo);
                        const jsonData = fs.readFileSync(infoJsonPath, 'utf-8') || {};
                        const parsedData = JSON.parse(jsonData);
                        resolve({ success: true, json: parsedData, filename: fileName, stdout });
                    } catch (err) {
                        resolve({ success: false, error: `Failed to read or parse JSON: ${err?.message}` });
                    }
                }
            });

            ytDlpProcess.on('error', (err) => {
                resolve({ success: false, error: `Failed to spawn yt-dlp process: ${err?.message}` });
            });
        });
    } catch (error) {
        console.error('Error in downloadMedia: ', error);
        return { success: false, error: `Error in downloadMedia: ${error}` };
    }
}


/**
 * @class Downlib
 * @classdesc A class for downloading content from popular websites.
 */
class Downlib {

    /**
     * Create a Downlib instance.
     * @param {object} options - Options for Downlib.
     * @param {string} [options.ytDlpPath='./src/yt-dlp/yt-dlp'] - Path to the yt-dlp executable.
     * @param {boolean} [options.deleteAfterDownload=true] - Delete files After Download (default: true).
     */
    constructor(options = {}) {
        const { ytDlpPath = path.join(__dirname, 'yt-dlp/yt-dlp'), deleteAfterDownload = true } = options;
        this.ytDlpPath = ytDlpPath;
        this.deleteAfterDownload = deleteAfterDownload;
    }

    /**
     * Download image or video from Instagram.
     * @param {string} url - Instagram URL.
     * @param {string} saveDir - Directory to save media.
     * @returns {Promise<Object>} - Downloaded media content.
     */
    async downloadFromInstagram(url, saveDir) {
        try {
            const decodedUrl = decodeURIComponent(url);
            if (!decodedUrl.includes('instagram.com') && !decodedUrl.includes('instagr.am')) {
                return { success: false, error: 'Invalid Instagram URL.' };
            }
            const links = await instagramGetUrl(decodedUrl);
            if (!links || !links.url_list || links.url_list.length === 0) {
                return { success: false, error: 'Failed to retrieve media URL from Instagram.' };
            }
            const mediaPromises = links.url_list.map(async (mediaUrl) => {
                try {
                    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                    if (!response.data) {
                        throw new Error('Failed to download media from Instagram.');
                    }
                    const fileType = await fileTypeFromBuffer(response.data);
                    const extension = fileType ? `.${fileType.ext}` : '.bin';
                    const filename = `${generateUniqueId(20)}_${extension}`;
                    const filepath = path.join(saveDir, filename);
                    fs.writeFileSync(filepath, response.data);
                    return {
                        success: true,
                        link: decodedUrl,
                        extension: extension,
                        filename: filename,
                        filepath: filepath,
                        buffer: response.data
                    };
                } catch (err) {
                    return { success: false, error: err.message };
                }
            });
            const results = await Promise.all(mediaPromises);
            if (this.deleteAfterDownload) {
                await Promise.all(results.map(async (result) => {
                    if (result.success) {
                        await deleteFile(result.filepath);
                    }
                }));
            }
            return { success: true, results };
        } catch (error) {
            return { success: false, error: `Failed to download from Instagram: ${error.message}` };
        }
    }

    /**
     * Download a video from TikTok.
     * @returns {Promise<Object>} - The downloaded video.
     */
    async downloadFromTikTok(url) {
        const decodedUrl = decodeURIComponent(url);
        if (!decodedUrl.match(/^https:\/\/[a-zA-Z0-9]+\.tiktok.com\/[^\?]+/)) {
            return { error: `Not a TikTok URL?: \`${decodedUrl}\`` };
        }
        try {
            const result = await tiktokdl(decodedUrl);
            if (result && result.media && result.media.length > 0) {
                return { success: true, result };
            } else {
                return { success: false, error: 'No media found to download' };
            }
        } catch (error) {
            return { success: false, error: `Error in downloadFromTikTok: ${error}` };
        }
    }

    /**
     * Download a video or playlist from YouTube.
     * @param {string} url - YouTube link.
     * @param {string} saveDir - The directory to save the videos.
     * @param {Object} options - Download options.
     * @param {boolean} options.audioOnly - If true, download audio only.
     * @returns {Promise<Array>} - List of downloaded video information.
     */
    async downloadFromYouTube(url, saveDir, options = { audioOnly: false }) {
        try {
            const decodedUrl = decodeURIComponent(url);
            if (!decodedUrl.match(/^(https:\/\/(www\.)?youtube\.com\/(watch\?v=|playlist\?list=|shorts\/)|https:\/\/youtu\.be\/)/)) {
                return { success: false, error: `Not a YouTube URL?: \`${decodedUrl}\`` };
            }

            const additionalArguments = [
                '--no-playlist', // Confirm downloading playlist
            ];
            if (options.audioOnly) {
                additionalArguments.push('--extract-audio', '--audio-format', 'mp3'); // Download audio only
            }

            const getYtDlp = await getYtDlpPath();
            const ytDlpApp = getYtDlp ? getYtDlp : this.ytDlpPath ? this.ytDlpPath : 'yt-dlp';
            const result = await downloadMedia(ytDlpApp, url, saveDir, additionalArguments);

            if (result?.success && this.deleteAfterDownload) {
                const filePath = path.join(saveDir, `${result.filename}.${options.audioOnly ? 'mp3' : result.json.ext}`);
                const fileInfoJsonPath = path.join(saveDir, `${result.filename}.info.json`);
                await deleteFile(filePath);
                await deleteFile(fileInfoJsonPath);
            }

            return result;

        } catch (error) {
            return { success: false, error: `Error in downloadFromYouTube: ${error}` };
        }
    }

    /**
     * Download a video from Facebook.
     * @param {string} url - The Facebook link.
     * @param {string} saveDir - The directory to save the videos.
     * @param {boolean} options.audioOnly - If true, download audio only.
     * @returns {Promise<Object>} - The downloaded video and its information.
     */
    async downloadFromFacebook(url, saveDir, options = { audioOnly: false }) {
        try {
            const decodedUrl = decodeURIComponent(url);
            if (!decodedUrl.match(/^https:\/\/(?:www\.)?facebook\.com\/.*\/videos\/.*/)) {
                return { success: false, error: `Not a valid Facebook video URL?: \`${decodedUrl}\`` };
            }

            const additionalArguments = [];
            if (options.audioOnly) {
                additionalArguments.push('--extract-audio', '--audio-format', 'mp3'); // Download audio only
            }

            const getYtDlp = await getYtDlpPath();
            const ytDlpApp = getYtDlp ? getYtDlp : this.ytDlpPath ? this.ytDlpPath : 'yt-dlp';
            const result = await downloadMedia(ytDlpApp, url, saveDir, additionalArguments);

            if (result?.success && this.deleteAfterDownload) {
                const filePath = path.join(saveDir, `${result.filename}.${options.audioOnly ? 'mp3' : result.json.ext}`);
                const fileInfoJsonPath = path.join(saveDir, `${result.filename}.info.json`);
                await deleteFile(filePath);
                await deleteFile(fileInfoJsonPath);
            }

            return result;

        } catch (error) {
            return { success: false, error: `Error in downloadFromFacebook: ${error}` };
        }
    }

    /**
     * Download a video from Twitch.
     * @param {string} url - The Twitch link.
     * @param {string} saveDir - The directory to save the videos.
     * @param {boolean} options.audioOnly - If true, download audio only.
     * @returns {Promise<Object>} - The downloaded video and its information.
     */
    async downloadFromTwitch(url, saveDir, options = { audioOnly: false }) {
        try {
            const decodedUrl = decodeURIComponent(url);
            if (!url.match(/^https:\/\/(?:www\.)?twitch\.tv\/.*/)) {
                return { success: false, error: `Not a valid Twitch URL?: \`${decodedUrl}\`` };
            }

            const additionalArguments = [];
            if (options.audioOnly) {
                additionalArguments.push('--extract-audio', '--audio-format', 'mp3'); // Download audio only
            }

            const getYtDlp = await getYtDlpPath();
            const ytDlpApp = getYtDlp ? getYtDlp : this.ytDlpPath ? this.ytDlpPath : 'yt-dlp';
            const result = await downloadMedia(ytDlpApp, url, saveDir, additionalArguments);

            if (result?.success && this.deleteAfterDownload) {
                const filePath = path.join(saveDir, `${result.filename}.${options.audioOnly ? 'mp3' : result.json.ext}`);
                const fileInfoJsonPath = path.join(saveDir, `${result.filename}.info.json`);
                await deleteFile(filePath);
                await deleteFile(fileInfoJsonPath);
            }

            return result;

        } catch (error) {
            return { success: false, error: `Error in downloadFromTwitch: ${error}` };
        }
    }

    /**
    * Download a video from Dailymotion.
    * @param {string} url - The Dailymotion link.
    * @param {string} saveDir - The directory to save the videos.
    * @param {boolean} options.audioOnly - If true, download audio only.
    * @returns {Promise<Object>} - The downloaded video and its information.
    */
    async downloadFromDailymotion(url, saveDir, options = { audioOnly: false }) {
        try {
            const decodedUrl = decodeURIComponent(url);
            if (!url.match(/^https:\/\/(?:www\.)?dailymotion\.com\/video\/.*/)) {
                return { success: false, error: `Not a valid Dailymotion video URL?: \`${decodedUrl}\`` };
            }

            const additionalArguments = [];
            if (options.audioOnly) {
                additionalArguments.push('--extract-audio', '--audio-format', 'mp3'); // Download audio only
            }

            const getYtDlp = await getYtDlpPath();
            const ytDlpApp = getYtDlp ? getYtDlp : this.ytDlpPath ? this.ytDlpPath : 'yt-dlp';
            const result = await downloadMedia(ytDlpApp, url, saveDir, additionalArguments);

            if (result?.success && this.deleteAfterDownload) {
                const filePath = path.join(saveDir, `${result.filename}.${options.audioOnly ? 'mp3' : result.json.ext}`);
                const fileInfoJsonPath = path.join(saveDir, `${result.filename}.info.json`);
                await deleteFile(filePath);
                await deleteFile(fileInfoJsonPath);
            }

            return result;

        } catch (error) {
            return { success: false, error: `Error in downloadFromDailymotion: ${error}` };
        }
    }


    /**
     * Download an audio track from SoundCloud.
     * @param {string} url - The SoundCloud link.
     * @param {string} saveDir - The directory to save the audio files.
     * @returns {Promise<Object>} - The downloaded audio file and its information.
     */
    async downloadFromSoundCloud(url, saveDir) {
        try {
            const decodedUrl = decodeURIComponent(url);
            const cleanedUrl = decodedUrl.split('?')[0];

            // Determine if the URL is for a playlist or a single track
            const isPlaylist = cleanedUrl.includes("/sets/");
            if (isPlaylist) {
                return { error: `Playlists are not supported: \`${cleanedUrl}\`` };
            }

            // Regular expression pattern for valid SoundCloud URLs
            const soundCloudUrlPattern = /^(https:\/\/(soundcloud\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+|on\.soundcloud\.com\/[a-zA-Z0-9]+))$/;
            // Check if the URL matches the pattern
            if (!soundCloudUrlPattern.test(cleanedUrl)) {
                return { success: false, error: `Invalid SoundCloud URL format: \`${cleanedUrl}\`` };
            }

            const additionalArguments = ['--extract-audio', '--audio-format', 'mp3'];
            const getYtDlp = await getYtDlpPath();
            const ytDlpApp = getYtDlp ? getYtDlp : this.ytDlpPath ? this.ytDlpPath : 'yt-dlp';
            const result = await downloadMedia(ytDlpApp, url, saveDir, additionalArguments);

            if (result?.success && this.deleteAfterDownload) {
                const filePath = path.join(saveDir, `${result.filename}.mp3`);
                const fileInfoJsonPath = path.join(saveDir, `${result.filename}.info.json`);
                await deleteFile(filePath);
                await deleteFile(fileInfoJsonPath);
            }

            return result;

        } catch (error) {
            return { success: false, error: `Error in downloadFromSoundCloud: ${error}` };
        }
    }

    /**
    * Download a video from Reddit.
    * @param {string} url - The Reddit link.
    * @param {string} saveDir - The directory to save the videos.
    * @param {boolean} options.audioOnly - If true, download audio only.
    * @returns {Promise<Object>} - The downloaded video and its information.
    */
    async downloadFromReddit(url, saveDir, options = { audioOnly: false }) {
        try {
            const decodedUrl = decodeURIComponent(url);
            if (!url.match(/^https?:\/\/(?:www\.)?(reddit\.com|redd\.it)\/.*/)) {
                return { success: false, error: `Not a valid Reddit URL?: \`${decodedUrl}\`` };

            }
            const additionalArguments = [];
            if (options.audioOnly) {
                additionalArguments.push('--extract-audio', '--audio-format', 'mp3'); // Download audio only
            }

            const getYtDlp = await getYtDlpPath();
            const ytDlpApp = getYtDlp ? getYtDlp : this.ytDlpPath ? this.ytDlpPath : 'yt-dlp';
            const result = await downloadMedia(ytDlpApp, url, saveDir, additionalArguments);

            if (result?.success && this.deleteAfterDownload) {
                const filePath = path.join(saveDir, `${result.filename}.${options.audioOnly ? 'mp3' : result.json.ext}`);
                const fileInfoJsonPath = path.join(saveDir, `${result.filename}.info.json`);
                await deleteFile(filePath);
                await deleteFile(fileInfoJsonPath);
            }

            return result;

        } catch (error) {
            return { success: false, error: `Error in downloadFromDailymotion: ${error}` };
        }
    }

    /**
     * Check the type of the URL.
     * @param {string} url - The URL to check.
     * @returns {string} - The type of the website (YouTube, Instagram, TikTok, Facebook, Twitter, Reddit, SoundCloud, Dailymotion, Twitch).
     */
    checkUrlType(url) {
        if (!isValidUrl(url)) {
            return 'Invalid URL';
        }
        const patterns = {
            'YouTube': /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/?.*$/,
            'Instagram': /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/?.*$/,
            'TikTok': /^(https?:\/\/)?(www\.)?(tiktok\.com|vt\.tiktok\.com)\/?.*$/,
            'Facebook': /^(https?:\/\/)?(www\.)?facebook\.com\/?.*$/,
            'Twitter': /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/?.*$/,
            'Reddit': /^(https?:\/\/)?(www\.)?(redd\.it|reddit\.com)\/?.*$/,
            'SoundCloud': /^(https?:\/\/)?(www\.)?(soundcloud\.com|on\.soundcloud\.com)\/?.*$/,
            'Dailymotion': /^(https?:\/\/)?(www\.)?dailymotion\.com\/?.*$/,
            'Twitch': /^(https?:\/\/)?(www\.)?twitch\.tv\/?.*$/,
            'Telegram': /^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\/?.*$/,
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(url)) {
                return type;
            }
        }
        return 'Unknown';
    }

}

export default Downlib;