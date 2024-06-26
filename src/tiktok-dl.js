/**
 * LICENSE MIT
 * Copyright (c) 2024 rn0x
 * github: https://github.com/rn0x
 * telegram: https://t.me/F93ii
 * repository: https://github.com/rn0x/downib
 */

import axios from 'axios';

// Add user-agent to avoid ban
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

/**
 * Creates a promise that resolves after a specified delay.
 * @param {number} ms - The delay in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the delay.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Downloads media (video or image slides) from a TikTok URL without watermarks.
 * @param {string} url - The TikTok post URL to download media from.
 * @returns {Promise<{ id: string, url: string, username: string | null, media: { type: string, data: Buffer }[] } | { error: string }>} - Promise that resolves with the downloaded media buffers and information, or an error message if media not found.
 */
const downloadFromTikTok = async (url) => {
    try {
        const finalUrl = await resolveRedirects(url);
        const Medias = await fetchMedia(finalUrl, false); // Download without watermark

        if (Medias && Medias.length > 0) {
            const mediaItems = await downloadMedia(Medias[0]);
            return {
                id: Medias[0].id,
                url: url,
                username: extractUsername(url),
                media: mediaItems
            };
        } else {
            return {
                error: `[X] ${JSON.stringify(Medias)}\nMedia not found at URL: ${url}`
            };
        }
    } catch (err) {
        return { error: `Error in downloadFromTikTok: ${err.message}` };
    }
};

/**
 * Extracts the username from a TikTok URL.
 * @param {string} url - The TikTok URL.
 * @returns {string | null} - The extracted username, or null if not found.
 */
const extractUsername = (url) => {
    const match = url.match(/tiktok\.com\/@([^/]+)/);
    return match ? match[1] : null;
};

/**
 * Resolves any redirects in the given URL.
 * @param {string} url - The URL to resolve.
 * @returns {Promise<string>} - The final URL after following redirects.
 */
const resolveRedirects = async (url) => {
    try {
        if (!url) {
            throw new Error('URL is undefined or empty.');
        }

        let finalUrl = url;

        // Check if the URL is a TikTok short link that redirects
        if (finalUrl.includes('vm.tiktok.com') || finalUrl.includes('vt.tiktok.com')) {
            const response = await axios.get(finalUrl, {
                maxRedirects: 10,
                headers: headers,
            });
            finalUrl = response.request.res.responseUrl;
            // console.log("[*] Redirected to:", finalUrl);
        }

        return finalUrl;
    } catch (err) {
        return { error: `Error in resolveRedirects: ${err.message}` };
    }
};

/**
 * Fetches video or slideshow information from TikTok API.
 * @param {string} url - The TikTok video URL.
 * @param {boolean} watermark - Whether to include watermarks.
 * @returns {Promise<{ url: string, images: string[], id: string }[] | { error: string }>} - Promise that resolves with an array of video or slideshow information objects, or an error message if not found.
 */
const fetchMedia = async (url, watermark) => {
    try {
        const ids = await fetchIds(url);
        const results = [];
        const maxRetries = 5; // Max retries for any error

        for (const id of ids) {
            const API_URL = `https://api22-normal-c-alisg.tiktokv.com/aweme/v1/feed/?aweme_id=${id}&iid=7318518857994389254&device_id=7318517321748022790&channel=googleplay&app_name=musical_ly&version_code=300904&device_platform=android&device_type=ASUS_Z01QD&version=9`;

            let attempts = 0;
            let success = false;

            while (attempts < maxRetries && !success) {
                try {
                    await delay(2000); // 2 second delay between requests

                    const response = await axios({
                        url: API_URL,
                        method: 'OPTIONS',
                        headers: headers,
                    });

                    const body = response.data;

                    if (body.aweme_list && body.aweme_list.length > 0 && body.aweme_list[0].aweme_id === id) {
                        const aweme = body.aweme_list[0];
                        let mediaItems = [];

                        if (aweme.image_post_info) {
                            aweme.image_post_info.images.forEach((image) => {
                                mediaItems.push({
                                    type: 'image',
                                    data: image.display_image.url_list[1],
                                });
                            });
                        } else {
                            const urlMedia = watermark
                                ? aweme.video.download_addr.url_list[0]
                                : aweme.video.play_addr.url_list[0];
                            mediaItems.push({
                                type: 'video',
                                data: urlMedia,
                            });
                        }

                        const url = aweme?.video?.download_addr?.url_list[0] ? aweme?.video?.download_addr?.url_list[0] : aweme.video.play_addr.url_list[0];
                        const data = {
                            url: url,
                            id: id,
                            media: mediaItems,
                        };

                        results.push(data);
                        success = true; // Exit the retry loop if successful
                    } else {
                        throw new Error('No media found');
                    }
                } catch (err) {
                    await delay(2000 * (attempts + 1)); // Exponential backoff
                    attempts++;
                }
            }

            if (!success) {
                return { error: `Failed to fetch media after ${maxRetries} attempts` };
            }
        }

        return results.length > 0 ? results : { error: '[X] No media found' };
    } catch (err) {
        return { error: `Error in fetchMedia: ${err.message}` };
    }
};

/**
 * Downloads media buffers (images or video) from provided URLs.
 * @param {{ url: string, id: string, media: { type: string, url: string, fileName: string, buffer: Buffer }[] }} item - The object containing URLs and ID of media.
 * @returns {Promise<{ type: string, url: string, fileName: string, buffer: Buffer }[] | { error: string }>} - Promise that resolves with an array of objects containing downloaded media buffers and their corresponding URLs.
 */
const downloadMedia = async (item) => {
    try {
        let mediaItems = [];
        let index = 1;
        for (const mediaItem of item.media) {
            let url = mediaItem.data;
            const fileName = `${item.id}_${index++}.${mediaItem.type === 'video' ? 'mp4' : 'jpeg'}`;
            if (mediaItem.type === 'video') {
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data);
                mediaItems.push({
                    url: url,
                    fileName: fileName,
                    type: 'video',
                    buffer: buffer
                });
            } else if (mediaItem.type === 'image') {
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data);
                mediaItems.push({
                    url: url,
                    fileName: fileName,
                    type: 'image',
                    buffer: buffer
                });
            }
        }

        return mediaItems;
    } catch (err) {
        return { error: `Error in downloadMedia: ${err.message}` };
    }
};

/**
 * Extracts TikTok video or photo IDs from the provided URL.
 * @param {string} url - The TikTok URL.
 * @returns {Promise<string[] | { error: string }>} - Promise that resolves with an array of extracted video or photo IDs.
 */
const fetchIds = async (url) => {
    try {
        let ids = [];

        if (url.includes('/t/')) {
            url = await new Promise((resolve) => {
                require('follow-redirects').https.get(url, function (res) {
                    return resolve(res.responseUrl);
                });
            });
        }

        const matching = url.includes('/video/');
        const matchingPhoto = url.includes('/photo/');

        if (matching) {
            let idVideo = url.substring(
                url.indexOf('/video/') + 7,
                url.indexOf('/video/') + 26
            );
            ids.push(idVideo.length > 19 ? idVideo.substring(0, idVideo.indexOf('?')) : idVideo);
        } else if (matchingPhoto) {
            let idPhoto = url.substring(
                url.indexOf('/photo/') + 7,
                url.indexOf('/photo/') + 26
            );
            ids.push(idPhoto.length > 19 ? idPhoto.substring(0, idPhoto.indexOf('?')) : idPhoto);
        } else {
            return { error: '[X] Error: URL not found' };
        }

        return ids;
    } catch (err) {
        return { error: `Error in fetchIds: ${err.message}` };
    }
};

// Export the function
export default downloadFromTikTok;