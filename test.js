import Downlib from './src/Downlib.js';

// Initialize Downlib with optional configurations
const downlib = new Downlib({
    deleteAfterDownload: true,
});

// Example: Download a video from YouTube
const youtubeUrl = 'https://www.youtube.com/shorts/H_IwLWa64gs';
const saveDir = './downloads';
downlib.downloadFromYouTube(youtubeUrl, saveDir)
  .then((result) => {
    console.log('Downloaded video information:', result);
  })
  .catch((error) => {
    console.error('Error downloading video:', error);
  });