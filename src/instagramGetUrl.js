/**
 * LICENSE MIT
 * Copyright (c) 2024 rn0x
 * github: https://github.com/rn0x
 * telegram: https://t.me/F93ii
 * repository: https://github.com/rn0x/downib
 */

import axios from 'axios';
import cheerio from 'cheerio';

const instagramGetUrl = async (url_media) => {
    try {
        const BASE_URL = "https://v3.saveig.app/api/ajaxSearch";
        const params = {
            q: url_media,
            t: "media",
            lang: "en",
        };

        const headers = {
            Accept: "*/*",
            Origin: "https://saveig.app",
            Referer: "https://saveig.app/",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Microsoft Edge";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.183",
            "X-Requested-With": "XMLHttpRequest",
        };

        const response = await axios.post(BASE_URL, new URLSearchParams(params).toString(), { headers });
        const responseData = response.data.data;

        if (!responseData) {
            return { results_number: 0, url_list: [] };
        }

        const $ = cheerio.load(responseData);
        const downloadItems = $(".download-items");
        const result = [];

        downloadItems.each((index, element) => {
            const downloadLink = $(element).find(".download-items__btn > a").attr("href");
            result.push(downloadLink);
        });

        const igresponse = { results_number: result.length, url_list: result };
        return igresponse;
    } catch (err) {
        throw err;
    }
};

export default instagramGetUrl;
