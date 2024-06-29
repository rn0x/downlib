import Downlib from './src/Downlib.js';

// Initialize Downlib with optional configurations
const downlib = new Downlib({
  deleteAfterDownload: true,
});

try {
  // Example: Download a video from YouTube
  const youtubeUrl = 'https://www.youtube.com/shorts/H_IwLWa64gs';
  const saveDir = './downloads';
  const result = await downlib.downloadFromYouTube(youtubeUrl, saveDir);

  console.log('Downloaded video information:', result);
} catch (error) {
  console.error('Error downloading video:', error);
}