/**
 * LICENSE MIT
 * Copyright (c) 2024 rn0x
 * github: https://github.com/rn0x
 * telegram: https://t.me/F93ii
 * repository: https://github.com/rn0x/downib
 */

import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import instagramGetUrl from './instagramGetUrl.js';
import { fileTypeFromBuffer } from 'file-type';
import { fileURLToPath } from 'url';
import tiktokdl from './tiktok-dl.js';
import setupYtDlp from './setupYtDlp.js';


/**
 * @class Downlib
 * @classdesc A class for downloading content from popular websites.
 */
class Downlib {
    /**
     * @constructor
     * @param {object} options - An object containing settings.
     */
    constructor(options) {
        this.options = options;
        this.deleteAfterDownload = options?.deleteAfterDownload;
        this.__dirname = path.dirname(fileURLToPath(import.meta.url));
        this.Split_issue = " please report this issue on  https://github.com/yt-dlp/yt-dlp/issues?q= , filling out the appropriate issue template. Confirm you are on the latest version using  yt-dlp -U\n";

        // Bind the method to ensure correct context
        this.downloadFromYouTube = this.downloadFromYouTube.bind(this);
    }

    /**
     * Retrieve yt-dlp executable path asynchronously.
     * @returns {Promise<string>} Resolves with the yt-dlp executable path.
     */
    async getYtDlpPath() {
        try {
            const ytDlpDir = path.resolve(this.__dirname, 'yt-dlp');
            const ytDlp = await setupYtDlp(ytDlpDir, { log: false });
            return ytDlp.ytDlpPath || this.options?.ytApp ? this.options.ytApp : "yt-dlp";
        } catch (error) {
            console.error("Error setting up ytDlp:", error);
            return "yt-dlp";
        }
    }

    /**
     * Check if a directory exists and create it if it doesn't.
     * @param {string} dirPath - The path of the directory.
     * @returns {void}
     * @throws {Error} - If failed to create the directory.
     */
    ensureDirectoryExists(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`Directory created: ${dirPath}`);
            }
        } catch (error) {
            return { error: `Error creating directory: ${dirPath} ${error}` };
        }
    }

    /**
     * Delete a file from the file system.
     * @param {string} filepath - The file path to delete.
     * @returns {Promise<void>} - A promise to delete the file.
     */
    async deleteFile(filepath) {
        return new Promise((resolve, reject) => {
            fs.access(filepath, fs.constants.F_OK, (err) => {
                if (err) {
                    // console.error(`File not found: ${filepath}`);
                    return resolve(); // If file doesn't exist, resolve without error
                }
                fs.unlink(filepath, (err) => {
                    if (err) {
                        console.error(`Error deleting file: ${filepath}`, err);
                        return reject(err);
                    }
                    // console.log(`File deleted: ${filepath}`);
                    resolve();
                });
            });
        });
    }
    /**
     * Extracts the file extension from a given filename.
     * @param {string} filename - The name of the file.
     * @returns {string} - The file extension, or an error message if invalid.
     */
    getFileExtension(filename) {
        try {
            // Regular expression to match the file extension
            const extensionPattern = /\.([0-9a-zA-Z]+)$/i;
            const match = filename.match(extensionPattern);

            if (match && match[1]) {
                return match[1];
            } else {
                throw new Error('Invalid filename format');
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
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
                return { error: 'Invalid Instagram URL.' };
            }

            this.ensureDirectoryExists(saveDir);

            let links = await instagramGetUrl(decodedUrl);

            if (!links || !links.url_list || links.url_list.length === 0) {
                return { error: 'Failed to retrieve media URL from Instagram.' };
            }

            const mediaPromises = links.url_list.map(async (mediaUrl) => {
                const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                if (!response.data) {
                    return { error: 'Failed to download media from Instagram.' };
                }

                const fileType = await fileTypeFromBuffer(response.data);
                const extension = fileType ? `.${fileType.ext}` : '.bin';
                const filename = `${this.generateUniqueId(20)}_${extension}`;
                const filepath = path.join(saveDir, filename);

                fs.writeFileSync(filepath, response.data);

                return {
                    link: decodedUrl,
                    extension: extension,
                    filename: filename,
                    buffer: response.data
                };
            });

            const results = await Promise.all(mediaPromises);

            if (this.deleteAfterDownload) {
                await Promise.all(results.map(async (result) => {
                    await this.deleteFile(path.join(saveDir, result.filename));
                }));
            }

            return { results };
        } catch (error) {
            return { error: `Failed to download from Instagram: ${error.message}` };
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
        const decodedUrl = decodeURIComponent(url);
        if (!decodedUrl.match(/^(https:\/\/(www\.)?youtube\.com\/(watch\?v=|playlist\?list=|shorts\/)|https:\/\/youtu\.be\/)/)) {
            return Promise.reject({ error: `Not a YouTube URL?: \`${decodedUrl}\`` });
        }

        this.ensureDirectoryExists(saveDir);
        const args = [
            '--print-json',
            '--write-info-json',
            '--merge-output-format', 'mp4',
            '--output', `${path.join(saveDir, '%(id)s.%(ext)s')}`
        ];

        if (!options.audioOnly) {
            args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
        }

        args.push(decodedUrl);

        const ytDlpPath = await this.getYtDlpPath();
        const ytdlp = spawn(ytDlpPath, args);
        const command = `${ytDlpPath} ${args.join(' ')}`;
        let rawData = '';

        ytdlp.stdout.on('data', (data) => {
            rawData += data.toString();
        });

        ytdlp.stderr.on('error', (data) => {
            const message = data.toString().replace(this.Split_issue, '');
            reject({ command, error: `yt-dlp error: ${message}` });
        });

        return new Promise((resolve, reject) => {
            ytdlp.on('close', async (code) => {
                try {
                    const results = [];

                    // Process each downloaded video information
                    const lines = rawData.split('\n');
                    for (const line of lines) {
                        if (line.trim() === '') {
                            continue; // Skip empty lines
                        }
                        try {
                            const json = JSON.parse(line);

                            // Check if JSON parsing was successful
                            if (!json || typeof json !== 'object') {
                                throw new Error(`Invalid JSON data: ${line}`);
                            }

                            const videoId = json.id;
                            const videoFileName = `${videoId}.mp4`;
                            const infoFileName = `${videoId}.info.json`;
                            const videoFilePath = path.join(saveDir, videoFileName);
                            const infoFilePath = path.join(saveDir, infoFileName);

                            // Read video file buffer
                            const fileBuffer = fs.readFileSync(videoFilePath);

                            // Prepare result object
                            const result = { ...json, buffer: fileBuffer };

                            // Remove formats key from result
                            delete result.formats;

                            // Push result into results array
                            results.push(result);

                            // Optionally delete files after download
                            if (this.deleteAfterDownload) {
                                await this.deleteFile(videoFilePath);
                                await this.deleteFile(infoFilePath);
                            }
                        } catch (error) {
                            reject({ command, error: `Error processing JSON line: ${error}` });
                        }
                    }

                    // Resolve with command and results
                    resolve({ command, videos: results });
                } catch (error) {
                    reject({ command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * Download a video from TikTok.
     * @returns {Promise<Object>} - The downloaded video.
     */
    async downloadFromTikTok(url, saveDir) {
        const decodedUrl = decodeURIComponent(url);
        if (!decodedUrl.match(/^https:\/\/[a-zA-Z0-9]+\.tiktok.com\/[^\?]+/)) {
            return { error: `Not a TikTok URL?: \`${decodedUrl}\`` };
        }
        try {
            const result = await tiktokdl(decodedUrl);
            if (result && result.media && result.media.length > 0) {
                return result;
            } else {
                return { error: 'No media found to download' };
            }
        } catch (error) {
            return { error: `Error in downloadFromTikTok: ${error}` };
        }
    }

    /**
     * Download a video from Twitter.
     * @param {string} url - The Twitter link.
     * @param {string} saveDir - The directory to save the videos.
     * @returns {Promise<Object>} - The downloaded video and its information.
     */
    async downloadFromTwitter(url, saveDir) {
        return new Promise(async (resolve, reject) => {
            const decodedUrl = decodeURIComponent(url);
            if (!decodedUrl.match(/^https?:\/\/(?:twitter\.com|x\.com|t\.co)\/.*/)) {
                return reject({ error: `Not a valid x platform (Twitter) URL?: \`${decodedUrl}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(id)s.%(ext)s')}`, decodedUrl];

            const ytDlpPath = await this.getYtDlpPath();
            const ytdlp = spawn(ytDlpPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                reject({ command: command, error: `yt-dlp: ${message}` });
            });

            ytdlp.on('close', async (code) => {
                try {
                    if (rawData.length === 0) return;
                    const jsonResult = JSON.parse(rawData);
                    const filename = jsonResult._filename;
                    const filenameJson = path.join(saveDir, jsonResult.title + ".info.json");
                    const fileBuffer = fs.readFileSync(filename);
                    delete jsonResult.formats;
                    let buffer = fileBuffer;
                    resolve({ command: command, ...jsonResult, buffer: buffer });
                    if (this.deleteAfterDownload) {
                        await this.deleteFile(filename);
                        await this.deleteFile(filenameJson);
                    }

                } catch (error) {
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * Download a video from Facebook.
     * @param {string} url - The Facebook link.
     * @param {string} saveDir - The directory to save the videos.
     * @returns {Promise<Object>} - The downloaded video and its information.
     */
    async downloadFromFacebook(url, saveDir) {
        return new Promise(async (resolve, reject) => {
            const decodedUrl = decodeURIComponent(url);
            if (!decodedUrl.match(/^https:\/\/(?:www\.)?facebook\.com\/.*\/videos\/.*/)) {
                return reject({ error: `Not a valid Facebook video URL?: \`${decodedUrl}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(id)s.%(ext)s')}`, decodedUrl];

            const ytDlpPath = await this.getYtDlpPath();
            const ytdlp = spawn(ytDlpPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                reject({ command: command, error: `yt-dlp: ${message}` });
            });

            ytdlp.on('close', async (code) => {
                try {
                    if (rawData.length === 0) return;
                    const jsonResult = JSON.parse(rawData);
                    const filename = jsonResult._filename;
                    const filenameJson = path.join(saveDir, jsonResult.title + ".info.json");
                    const fileBuffer = fs.readFileSync(filename);
                    delete jsonResult.formats;
                    let buffer = fileBuffer;
                    resolve({ command: command, ...jsonResult, buffer: buffer });
                    if (this.deleteAfterDownload) {
                        await this.deleteFile(filename);
                        await this.deleteFile(filenameJson);
                    }
                } catch (error) {
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }

            });
        });
    }

    /**
     * Download a video from Twitch.
     * @param {string} url - The Twitch link.
     * @param {string} saveDir - The directory to save the videos.
     * @returns {Promise<Object>} - The downloaded video and its information.
     */
    async downloadFromTwitch(url, saveDir) {
        return new Promise(async (resolve, reject) => {
            const decodedUrl = decodeURIComponent(url);
            if (!url.match(/^https:\/\/(?:www\.)?twitch\.tv\/.*/)) {
                return reject({ error: `Not a valid Twitch URL: \`${decodedUrl}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(id)s.%(ext)s')}`, decodedUrl];

            const ytDlpPath = await this.getYtDlpPath();
            const ytdlp = spawn(ytDlpPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                reject({ command: command, error: `yt-dlp: ${message}` });
            });

            ytdlp.on('close', async (code) => {
                try {
                    if (rawData.length === 0) return;
                    const jsonResult = JSON.parse(rawData);
                    const filename = jsonResult._filename;
                    const filenameJson = path.join(saveDir, jsonResult.title + ".info.json");
                    const fileBuffer = fs.readFileSync(filename);
                    delete jsonResult.formats;
                    let buffer = fileBuffer;
                    resolve({ command: command, ...jsonResult, buffer: buffer });
                    if (this.deleteAfterDownload) {
                        await this.deleteFile(filename);
                        await this.deleteFile(filenameJson);
                    }
                } catch (error) {
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
    * Download a video from Dailymotion.
    * @param {string} url - The Dailymotion link.
    * @param {string} saveDir - The directory to save the videos.
    * @returns {Promise<Object>} - The downloaded video and its information.
    */
    async downloadFromDailymotion(url, saveDir) {
        const decodedUrl = decodeURIComponent(url);
        return new Promise(async (resolve, reject) => {
            if (!url.match(/^https:\/\/(?:www\.)?dailymotion\.com\/video\/.*/)) {
                return reject({ error: `Not a valid Dailymotion video URL?: \`${decodedUrl}\`` });
            }

            this.ensureDirectoryExists(saveDir);
            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(id)s.%(ext)s')}`, decodedUrl];

            const ytDlpPath = await this.getYtDlpPath();
            const ytdlp = spawn(ytDlpPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                reject({ command: command, error: `yt-dlp: ${message}` });
            });

            ytdlp.on('close', async (code) => {
                try {
                    if (rawData.length === 0) return;
                    const jsonResult = JSON.parse(rawData);
                    const filename = jsonResult._filename;
                    const filenameJson = path.join(saveDir, jsonResult.title + ".info.json");
                    const fileBuffer = fs.readFileSync(filename);
                    delete jsonResult.formats;
                    let buffer = fileBuffer;
                    resolve({ command: command, ...jsonResult, buffer: buffer });
                    if (this.deleteAfterDownload) {
                        await this.deleteFile(filename);
                        await this.deleteFile(filenameJson);
                    }
                } catch (error) {
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * Download an audio track from SoundCloud.
     * @param {string} url - The SoundCloud link.
     * @param {string} saveDir - The directory to save the audio files.
     * @returns {Promise<Object>} - The downloaded audio file and its information.
     */
    async downloadFromSoundCloud(url, saveDir) {
        const decodedUrl = decodeURIComponent(url);
        const cleanedUrl = decodedUrl.split('?')[0];
        return new Promise(async (resolve, reject) => {

            // Determine if the URL is for a playlist or a single track
            const isPlaylist = cleanedUrl.includes("/sets/");
            if (isPlaylist) {
                return reject({ error: `Playlists are not supported: \`${cleanedUrl}\`` });
            }

            // Regular expression pattern for valid SoundCloud URLs
            const soundCloudUrlPattern = /^(https:\/\/(soundcloud\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+|on\.soundcloud\.com\/[a-zA-Z0-9]+))$/;
            // Check if the URL matches the pattern
            if (!soundCloudUrlPattern.test(cleanedUrl)) {
                return reject({ error: `Invalid SoundCloud URL format: \`${cleanedUrl}\`` });
            }


            this.ensureDirectoryExists(saveDir);
            const UniqueId = this.generateUniqueId(20);
            const filename = path.join(saveDir, `${UniqueId}_.mp3`);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--extract-audio', '--audio-format', 'mp3', '--output', `${filename}`, cleanedUrl];

            const ytDlpPath = await this.getYtDlpPath();
            const ytdlp = spawn(ytDlpPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                reject({ command: command, error: `yt-dlp: ${message}` });
            });

            ytdlp.on('close', async (code) => {
                try {
                    if (rawData.length === 0) return
                    const jsonResult = JSON.parse(rawData);
                    const filenameJson = path.join(saveDir, `${UniqueId}_.info.json`);
                    const filenameJsonMp3 = path.join(saveDir, `${UniqueId}_.mp3.info.json`);
                    const fileBuffer = fs.readFileSync(filename);
                    delete jsonResult.formats;
                    let buffer = fileBuffer;
                    resolve({ command: command, ...jsonResult, buffer: buffer });
                    if (this.deleteAfterDownload) {
                        await this.deleteFile(filename);
                        await this.deleteFile(filenameJson);
                        await this.deleteFile(filenameJsonMp3);
                    }
                } catch (error) {
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * Download a video from Reddit.
     * @param {string} url - The Reddit link.
     * @param {string} saveDir - The directory to save the videos.
     * @returns {Promise<Object>} - The downloaded video and its information.
     */
    async downloadFromReddit(url, saveDir) {
        const decodedUrl = decodeURIComponent(url);
        return new Promise(async (resolve, reject) => {
            if (!url.match(/^https?:\/\/(?:www\.)?(reddit\.com|redd\.it)\/.*/)) {
                return reject({ error: `Not a valid Reddit URL?: \`${decodedUrl}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(id)s.%(ext)s')}`, decodedUrl];

            const ytDlpPath = await this.getYtDlpPath();
            const ytdlp = spawn(ytDlpPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                reject({ command: command, error: `yt-dlp: ${message}` });
            });

            ytdlp.on('close', async (code) => {
                try {
                    if (rawData.length === 0) return;
                    const jsonResult = JSON.parse(rawData);
                    const filename = jsonResult._filename;
                    const filenameJson = path.join(saveDir, jsonResult.title + ".info.json");
                    const fileBuffer = fs.readFileSync(filename);
                    delete jsonResult.formats;
                    let buffer = fileBuffer;
                    resolve({ command: command, ...jsonResult, buffer: buffer });
                    if (this.deleteAfterDownload) {
                        await this.deleteFile(filename);
                        await this.deleteFile(filenameJson);
                    }
                } catch (error) {
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * Check if the given text represents a valid URL.
     * @param {string} url - The text to check.
     * @returns {boolean} - true if the text represents a valid URL, false otherwise.
     */
    isValidUrl(url) {
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
     * Check the type of the URL.
     * @param {string} url - The URL to check.
     * @returns {string} - The type of the website (YouTube, Instagram, TikTok, Facebook, Twitter, Reddit, SoundCloud, Dailymotion, Twitch).
     */
    checkUrlType(url) {
        if (!this.isValidUrl(url)) {
            return 'Invalid URL';
        }
        const patterns = {
            'YouTube': /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
            'Instagram': /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/.+$/,
            'TikTok': /^(https?:\/\/)?(www\.)?(tiktok\.com|vt\.tiktok\.com)\/[\w\-\.]+\/?$/,
            'Facebook': /^(https?:\/\/)?(www\.)?facebook\.com\/.+$/,
            'Twitter': /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+$/,
            'Reddit': /^(https?:\/\/)?(www\.)?(redd\.it|reddit\.com)\/.+$/,
            'SoundCloud': /^(https?:\/\/)?(www\.)?(soundcloud\.com|on\.soundcloud\.com)\/.+$/,
            'Dailymotion': /^(https?:\/\/)?(www\.)?dailymotion\.com\/.+$/,
            'Twitch': /^(https?:\/\/)?(www\.)?twitch\.tv\/.+$/,
            'Telegram': /^(https?:\/\/)?(www\.)?(t\.me\/\w+|telegram\.me\/\w+)$/,
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(url)) {
                return type;
            }
        }
        return 'Unknown';
    }

    /**
     * Generates a unique ID consisting of alphanumeric characters.
     * @param {number} length - The length of the unique ID to be generated.
     * @returns {string} - The generated unique ID.
     */
    generateUniqueId(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let uniqueId = '';
        for (let i = 0; i < length; i++) {
            uniqueId += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return uniqueId;
    }
}

export default Downlib;