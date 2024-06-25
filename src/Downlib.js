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


/**
 * @class Downlib
 * @classdesc كلاس لتحميل المحتوى من مواقع شهيرة.
 */
class Downlib {
    /**
     * @constructor
     * @param {object} options - كائن يحتوي على إعدادات.
     */
    constructor(options) {

        this.options = options;
        this.deleteAfterDownload = options?.deleteAfterDownload;
        this.__dirname = path.dirname(fileURLToPath(import.meta.url));
        this.ytApp = os.platform() === 'win32' ? "../yt-dlp/yt-dlp.exe" :
            os.platform() === 'linux' ? "../yt-dlp/yt-dlp" :
                os.platform() === 'darwin' ? "../yt-dlp/yt-dlp_macos" : false;
        this.ytAppPath = this.ytApp ? path.join(this.__dirname, this.ytApp) : "yt-dlp"
        this.Split_issue = " please report this issue on  https://github.com/yt-dlp/yt-dlp/issues?q= , filling out the appropriate issue template. Confirm you are on the latest version using  yt-dlp -U\n";
    }

    /**
     * تحقق من وجود المجلد وإنشائه إذا لم يكن موجودًا.
     * @param {string} dirPath - مسار المجلد.
     * @returns {void}
     * @throws {Error} - إذا فشل في إنشاء المجلد.
     */
    ensureDirectoryExists(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`Directory created: ${dirPath}`);
            }
        } catch (error) {
            console.error(`Error creating directory: ${dirPath}`, error);
            throw error;
        }
    }

    /**
     * حذف ملف من نظام الملفات.
     * @param {string} filepath - مسار الملف للحذف.
     * @returns {Promise<void>} - وعد بحذف الملف.
     */
    async deleteFile(filepath) {
        return new Promise((resolve, reject) => {
            fs.access(filepath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error(`File not found: ${filepath}`);
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
     * تحميل صورة أو فيديو من Instagram.
     * @param {string} url - رابط Instagram.
     * @param {string} saveDir - المجلد لحفظ الفيديوهات.
     * @returns {Promise<Buffer>} - المحتوى المحمل.
     */
    async downloadFromInstagram(url, saveDir) {
        try {
            if (!url.includes('instagram.com')) {
                return { error: 'Invalid Instagram URL.' };
            }

            this.ensureDirectoryExists(saveDir);

            let links = await instagramGetUrl(url);

            if (!links || links?.url_list?.length === 0) {
                return { error: 'Failed to retrieve media URL from Instagram.' };
            }

            const mediaPromises = links.url_list.map(async (mediaUrl) => {
                const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });

                if (!response.data) {
                    return { error: 'Failed to download media from Instagram.' };
                }

                return response.data;
            });

            const buffers = await Promise.all(mediaPromises);
            const results = [];
            for (const iterator of buffers) {
                try {
                    const fileType = await fileTypeFromBuffer(iterator);
                    const extension = fileType ? `.${fileType.ext}` : '.bin';
                    const filename = `${this.generateUniqueId(20)}_${extension}`
                    const filepath = path.join(saveDir, filename);
                    fs.writeFileSync(filepath, iterator);
                    let buffer = iterator;
                    results.push({
                        link: url,
                        extension: extension,
                        filename: filename,
                        buffer: buffer
                    });
                    if (this.deleteAfterDownload) {
                        await this.deleteFile(filepath);
                    }
                } catch (error) {
                    console.error('Error downloading from Instagram:', error);
                    return { error: `Failed to download from Instagram: ${error}` };
                }
            }

            return {
                results: results
            }
        } catch (error) {
            console.error('Error downloading from Instagram:', error);
            return { error: `Failed to download from Instagram: ${error}` };

        }
    }



    /**
     * تحميل فيديو أو قائمة تشغيل من YouTube.
     * @param {string} url - رابط YouTube.
     * @param {string} saveDir - المجلد لحفظ الفيديوهات.
     * @param {Object} options - خيارات التحميل.
     * @param {boolean} options.audioOnly - إذا كانت القيمة true، يتم تحميل الصوت فقط.
     * @returns {Promise<Array>} - قائمة معلومات الفيديوهات المحملة.
     */
    async downloadFromYouTube(url, saveDir, options = { audioOnly: false }) {
        return new Promise((resolve, reject) => {
            if (!url.match(/^(https:\/\/(www\.)?youtube\.com\/(watch\?v=|playlist\?list=|shorts\/)|https:\/\/youtu\.be\/)/)) {
                return reject({ error: `Not a YouTube URL?: \`${url}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp based on options
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(title)s.%(ext)s')}`];
            if (!options.audioOnly) {
                args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
            }
            args.push(url);

            const ytdlp = spawn(this.ytAppPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';
            let jsonResults = [];

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
                // Split rawData by new lines and parse each JSON object
                const lines = rawData.split('\n');
                rawData = lines.pop(); // Keep the last line (it might be incomplete)
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        jsonResults.push(json);
                    } catch (error) {
                        return { error: `Error parsing JSON line: ${error}` };
                    }
                }
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                console.error(`yt-dlp: ${message}`);
                reject({ command: command, error: `${message}` });
            });

            ytdlp.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`yt-dlp process exited with code ${code}`);
                    reject({ command: command, error: `yt-dlp process exited with code ${code}` });
                } else {
                    try {
                        const results = [];

                        for (const json of jsonResults) {
                            const filename = json._filename;
                            const filenameJson = path.join(saveDir, json.title + ".info.json");
                            const fileBuffer = fs.readFileSync(filename);
                            delete json.formats;
                            let buffer = fileBuffer;
                            results.push({ ...json, buffer: buffer });
                            if (this.deleteAfterDownload) {
                                await this.deleteFile(filename);
                                await this.deleteFile(filenameJson);
                            }
                        }

                        resolve({ command: command, videos: results });

                    } catch (error) {
                        console.error('Error processing the download data:', error);
                        reject({ command: command, error: `Error processing the download data: ${error}` });
                    }
                }
            });
        });
    }

    /**
     * تحميل فيديو من TikTok.
     * @returns {Promise<Object>} - الفيديو المحمل.
     */
    async downloadFromTikTok(url, saveDir) {
        if (!url.match(/^https:\/\/[a-zA-Z0-9]+\.tiktok.com\/[^\?]+/)) {
            return { error: `Not a TikTok URL?: \`${url}\`` };
        }
        try {
            const result = await tiktokdl(url);
            if (result && result.media && result.media.length > 0) {
                return result;
            } else {
                return { error: 'No media found to download.' };
            }
        } catch (error) {
            console.error('Error in downloadFromTikTok:', error);
            return { error: `Error in downloadFromTikTok: ${error}` };
        }
    }

    /**
     * تحميل فيديو من Twitter.
     * @param {string} url - رابط Twitter.
     * @param {string} saveDir - المجلد لحفظ الفيديوهات.
     * @returns {Promise<Object>} - الفيديو المحمل ومعلوماته.
     */
    async downloadFromTwitter(url, saveDir) {
        return new Promise((resolve, reject) => {
            if (!url.match(/^https:\/\/(?:twitter\.com|x\.com)\/([^/]+)\/status\/([^/?]+)/)) {
                return reject({ error: `Not a valid x platform (Twitter) URL?: \`${url}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(title)s.%(ext)s')}`, url];

            const ytdlp = spawn(this.ytAppPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                console.error(`yt-dlp: ${message}`);
                reject({ command: command, error: `${message}` });
            });

            ytdlp.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`yt-dlp process exited with code ${code}`);
                    reject({ command: command, error: `yt-dlp process exited with code ${code}` });
                }

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
                    console.error('Error processing the download data:', error);
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * تحميل فيديو من Facebook.
     * @param {string} url - رابط Facebook.
     * @param {string} saveDir - المجلد لحفظ الفيديوهات.
     * @returns {Promise<Object>} - الفيديو المحمل ومعلوماته.
     */
    async downloadFromFacebook(url, saveDir) {
        return new Promise((resolve, reject) => {
            if (!url.match(/^https:\/\/(?:www\.)?facebook\.com\/.*\/videos\/.*/)) {
                return reject({ error: `Not a valid Facebook video URL?: \`${url}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(title)s.%(ext)s')}`, url];

            const ytdlp = spawn(this.ytAppPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                console.error(`yt-dlp: ${message}`);
                reject({ command: command, error: `${message}` });
            });

            ytdlp.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`yt-dlp process exited with code ${code}`);
                    reject({ command: command, error: `yt-dlp process exited with code ${code}` });
                }
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
                    console.error('Error processing the download data:', error);
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }

            });
        });
    }


    /**
     * تحميل فيديو من Twitch.
     * @param {string} url - رابط Twitch.
     * @param {string} saveDir - المجلد لحفظ الفيديوهات.
     * @returns {Promise<Object>} - الفيديو المحمل ومعلوماته.
     */
    async downloadFromTwitch(url, saveDir) {
        return new Promise((resolve, reject) => {
            if (!url.match(/^https:\/\/(?:www\.)?twitch\.tv\/.*/)) {
                return reject({ error: `Not a valid Twitch URL: \`${url}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(title)s.%(ext)s')}`, url];

            const ytdlp = spawn(this.ytAppPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';
            let jsonResult;

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                console.error(`yt-dlp: ${message}`);
                reject({ command: command, error: `${message}` });
            });

            ytdlp.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`yt-dlp process exited with code ${code}`);
                    reject({ command: command, error: `yt-dlp process exited with code ${code}` });
                }
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
                    console.error('Error processing the download data:', error);
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * تحميل فيديو من Dailymotion.
     * @param {string} url - رابط Dailymotion.
     * @param {string} saveDir - المجلد لحفظ الفيديوهات.
     * @returns {Promise<Object>} - الفيديو المحمل ومعلوماته.
     */
    async downloadFromDailymotion(url, saveDir) {
        return new Promise((resolve, reject) => {
            if (!url.match(/^https:\/\/(?:www\.)?dailymotion\.com\/video\/.*/)) {
                return reject({ error: `Not a valid Dailymotion video URL?: \`${url}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(title)s.%(ext)s')}`, url];

            const ytdlp = spawn(this.ytAppPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';
            let jsonResult;

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                console.error(`yt-dlp: ${message}`);
                reject({ command: command, error: `${message}` });
            });

            ytdlp.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`yt-dlp process exited with code ${code}`);
                    reject({ command: command, error: `yt-dlp process exited with code ${code}` });
                }
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
                    console.error('Error processing the download data:', error);
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * تحميل مقطوعة صوتية من SoundCloud.
     * @param {string} url - رابط SoundCloud.
     * @param {string} saveDir - المجلد لحفظ الملفات الصوتية.
     * @returns {Promise<Object>} - الملف الصوتي المحمل ومعلوماته.
     */
    async downloadFromSoundCloud(url, saveDir) {
        return new Promise((resolve, reject) => {
            if (!url.match(/^https:\/\/soundcloud\.com\/.*/)) {
                return reject({ error: `Not a valid SoundCloud URL?: \`${url}\`` });
            }

            this.ensureDirectoryExists(saveDir);
            const filename = path.join(saveDir, `${this.generateUniqueId(20)}_.mp3`);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--extract-audio', '--audio-format', 'mp3', '--output', `${filename}`, url];

            const ytdlp = spawn(this.ytAppPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                console.error(`yt-dlp: ${message}`);
                reject({ command: command, error: `${message}` });
            });

            ytdlp.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`yt-dlp process exited with code ${code}`);
                    reject({ command: command, error: `yt-dlp process exited with code ${code}` });
                }
                try {
                    if (rawData.length === 0) return
                    const jsonResult = JSON.parse(rawData);
                    const filenameJson = filename + ".info.json"
                    const fileBuffer = fs.readFileSync(filename);
                    delete jsonResult.formats;
                    let buffer = fileBuffer;
                    resolve({ command: command, ...jsonResult, buffer: buffer });
                    if (this.deleteAfterDownload) {
                        await this.deleteFile(filename);
                        await this.deleteFile(filenameJson);
                    }
                } catch (error) {
                    console.error('Error processing the download data:', error);
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }


    /**
     * تحميل فيديو من Reddit.
     * @param {string} url - رابط Reddit.
     * @param {string} saveDir - المجلد لحفظ الفيديوهات.
     * @returns {Promise<Object>} - الفيديو المحمل ومعلوماته.
     */
    async downloadFromReddit(url, saveDir) {
        return new Promise((resolve, reject) => {
            if (!url.match(/^https:\/\/(?:www\.)?reddit\.com\/.*\/.*/)) {
                return reject({ error: `Not a valid Reddit URL?: \`${url}\`` });
            }

            this.ensureDirectoryExists(saveDir);

            // Set the arguments for yt-dlp
            const args = ['--print-json', '--write-info-json', '--merge-output-format', 'mp4', '--output', `${path.join(saveDir, '%(title)s.%(ext)s')}`, url];

            const ytdlp = spawn(this.ytAppPath, args);
            const command = ytdlp.spawnargs.join(" ");
            let rawData = '';
            let jsonResult;

            ytdlp.stdout.on('data', (data) => {
                rawData += data.toString();
            });

            ytdlp.stderr.on('error', (data) => {
                const message = `${data.toString().split(this.Split_issue).join("")}`;
                console.error(`yt-dlp: ${message}`);
                reject({ command: command, error: `${message}` });
            });

            ytdlp.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`yt-dlp process exited with code ${code}`);
                    reject({ command: command, error: `yt-dlp process exited with code ${code}` });
                }
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
                    console.error('Error processing the download data:', error);
                    reject({ command: command, error: `Error processing the download data: ${error}` });
                }
            });
        });
    }

    /**
     * تحقق مما إذا كان النص المعطى يمثل رابط صحيح.
     * @param {string} url - النص للتحقق منه.
     * @returns {boolean} - true إذا كان النص يمثل رابط صحيح، وfalse إذا لم يكن.
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
     * التحقق من نوع الرابط.
     * @param {string} url - الرابط للتحقق.
     * @returns {string} - نوع الموقع (YouTube, Instagram, TikTok, Facebook, Twitter, Reddit, SoundCloud, Dailymotion, Twitch).
     */
    checkUrlType(url) {

        if (!this.isValidUrl(url)) {
            return 'Invalid URL';
        }
        const patterns = {
            'YouTube': /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
            'Instagram': /^(https?:\/\/)?(www\.)?instagram\.com\/.+$/,
            'TikTok': /^(https?:\/\/)?(www\.)?tiktok\.com\/.+$/,
            'Facebook': /^(https?:\/\/)?(www\.)?facebook\.com\/.+$/,
            'Twitter': /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+$/,
            'Reddit': /^(https?:\/\/)?(www\.)?reddit\.com\/.+$/,
            'SoundCloud': /^(https?:\/\/)?(www\.)?soundcloud\.com\/.+$/,
            'Dailymotion': /^(https?:\/\/)?(www\.)?dailymotion\.com\/.+$/,
            'Twitch': /^(https?:\/\/)?(www\.)?twitch\.tv\/.+$/
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