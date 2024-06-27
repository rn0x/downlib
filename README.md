# Downlib

Downlib is a Node.js class for downloading content from various popular websites such as YouTube, Instagram, and TikTok. It uses tools like `yt-dlp` for YouTube downloads and handles downloading media from Instagram and TikTok.

<div align="center">

<img align="center" src = "https://komarev.com/ghpvc/?username=rn0x-downlib&label=REPOSITORY+VIEWS&style=for-the-badge" alt ="downlib"> <br><br>

</div>

## Installation

To use Downlib, first install it via npm:

```bash
npm install downlib
```

## Usage

### Example Usage

```javascript
import Downlib from 'downlib';

// Initialize Downlib with optional configurations
const downlib = new Downlib({
    ytApp: '', // Optional: Specify the path for yt-dlp if needed
    deleteAfterDownload: true,
});

// Example: Download a video from YouTube
const youtubeUrl = 'https://www.youtube.com/watch?v=yourvideoid';
const saveDir = './downloads';
downlib.downloadFromYouTube(youtubeUrl, saveDir)
  .then((result) => {
    console.log('Downloaded video information:', result);
  })
  .catch((error) => {
    console.error('Error downloading video:', error);
  });

// Example: Download media from Instagram
const instagramUrl = 'https://www.instagram.com/p/yourpostid/';
downlib.downloadFromInstagram(instagramUrl, saveDir)
  .then((result) => {
    console.log('Downloaded Instagram media:', result);
  })
  .catch((error) => {
    console.error('Error downloading Instagram media:', error);
  });

// Example: Download video from TikTok
const tiktokUrl = 'https://www.tiktok.com/@username/video/123456789';
downlib.downloadFromTikTok(tiktokUrl, saveDir)
  .then((result) => {
    console.log('Downloaded TikTok video:', result);
  })
  .catch((error) => {
    console.error('Error downloading TikTok video:', error);
  });

// Example: Determine the type of a URL
const urlToCheck = 'https://www.reddit.com/r/javascript/';
const urlType = downlib.checkUrlType(urlToCheck);
console.log(`URL '${urlToCheck}' is of type '${urlType}'.`);
// Output: URL 'https://www.reddit.com/r/javascript/' is of type 'Reddit'.

// You can also explore more methods provided by Downlib for other functionalities.
```


#### `class Downlib`

##### Constructor

```javascript
/**
 * Initialize Downlib with optional configurations.
 * @param {object} options - Optional configurations.
 */
const downlib = new Downlib(options);
```

##### Methods

- `ensureDirectoryExists(dirPath)`: Ensures that a directory exists at the specified path. Creates the directory if it doesn't already exist.
- `deleteFile(filepath)`: Deletes a file from the filesystem.
- `downloadFromInstagram(url, saveDir)`: Downloads media (photos or videos) from Instagram using `instagramGetUrl` and Axios. It handles multiple media files if available.
- `downloadFromYouTube(url, saveDir, options)`: Downloads videos or playlists from YouTube using `yt-dlp`. Supports options like `audioOnly` to download only audio.
- `downloadFromTikTok(url, saveDir)`: Downloads videos from TikTok using a custom function (`tiktokdl`).
- `downloadFromTwitter(url, saveDir)`: Downloads videos from Twitter using `yt-dlp`.
- `downloadFromFacebook(url, saveDir)`: Downloads videos from Facebook using `yt-dlp`.
- `downloadFromTwitch(url, saveDir)`: Downloads videos from Twitch using `yt-dlp`.
- `downloadFromDailymotion(url, saveDir)`: Downloads videos from Dailymotion using `yt-dlp`.
- `downloadFromSoundCloud(url, saveDir)`: Downloads audio tracks from SoundCloud using `yt-dlp`.
- `downloadFromReddit(url, saveDir)`: Downloads videos from Reddit using `yt-dlp`.
- `generateUniqueId(length)`: Generates a unique ID of specified length.
- `checkUrlType(url)`: Checks the type of a URL and returns the corresponding social media platform or streaming service (YouTube, Instagram, TikTok, Pinterest, Facebook, Twitter, Reddit, SoundCloud, Dailymotion, Twitch). If the URL doesn't match any recognized patterns, it returns `'Unknown'`.

#### Example Code

See examples above for usage of each method.

### Configuration Options

You can pass optional configurations when initializing `Downlib`. These options include:

- `options.ytApp`: Path to yt-dlp executable.
- `options.deleteAfterDownload`: Whether to delete the downloaded files after completion.

### Issues

If you encounter any issues or have suggestions, please open an issue [here](https://github.com/rn0x/downib/issues).

### License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.