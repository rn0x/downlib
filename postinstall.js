/**
 * LICENSE MIT
 * Copyright (c) 2024 rn0x
 * github: https://github.com/rn0x
 * telegram: https://t.me/F93ii
 * repository: https://github.com/rn0x/downib
 */

// postinstall.js
import path from 'path';
import { fileURLToPath } from 'url';
import setupYtDlp from "./src/setupYtDlp.js";

// Convert __dirname to ES module equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    try {
        const outputDir = path.resolve(__dirname, 'src', 'yt-dlp');
        const ytDlp = await setupYtDlp(outputDir, { log: true });
        console.log('yt-dlp downloaded and extracted:', ytDlp);
    } catch (error) {
        console.error('Error setting up yt-dlp:', error);
    }
})();