# MusicViz 🎵

MusicViz is a minimalist, AI-powered web application that creates stunning real-time visualizations from your audio files. Built with pure HTML, CSS, and JavaScript, it uses the Web Audio API for analysis, Canvas API and Three.js for rendering, and Google's Gemini AI for dynamic, mood-based theming.

## ✨ Features

* **Local File Playback**: Upload your own MP3, WAV, OGG, or M4A files.
* **Dual Visualizer Modes**: Seamlessly switch between a 2D Canvas visualizer and a 3D Three.js visualizer.
* **Real-time Audio Analysis**: Uses the Web Audio API to analyze frequency data in real-time.
* **Basic Beat Detection**: Visuals react to the beat of the music, creating a more immersive experience.
* **AI-Powered Color Palettes**: Leverages the Gemini API to analyze the "mood" of the music and generate a fitting color scheme on the fly.
* **Fully Responsive**: A clean, modern UI that looks great on both desktop and mobile devices.
* **Zero Dependencies**: Runs directly in the browser with no need for a build step or external libraries beyond Three.js.

## 🚀 How to Use

1.  Download the `index.html` file.
2.  Open the file in any modern web browser (like Chrome, Firefox, or Edge).
3.  Click "Upload Audio" to select a local music file.
4.  Enjoy the show!

---

## 🔧 Guide to Future Improvements

This project has a solid foundation. Here’s how you can build upon it to implement the advanced features you envisioned.

### 1. Full Streaming Service Integration (YouTube, Spotify, etc.)

Handling streaming URLs is complex due to security policies (CORS) and the need for platform-specific APIs. You cannot do this purely on the client-side.

* **Required Architecture**: You'll need a server-side component (a "proxy server") to act as an intermediary.
    * **Client (Browser)**: Sends the YouTube/Spotify URL to your server.
    * **Server (e.g., Node.js on Google Cloud Run)**: Receives the URL. It then uses the appropriate API/SDK (like the YouTube Data API or Spotify Web API) to fetch the audio stream or track information. It then forwards the streamable audio data back to the client.
* **Steps**:
    1.  **Set up a simple Node.js/Express server.**
    2.  **Install SDKs**: Use `ytdl-core` for YouTube or the official SDKs for Spotify/SoundCloud.
    3.  **Create API Endpoints**: For example, a `POST /api/process-url` endpoint that takes a URL.
    4.  **Handle API Keys**: Securely store your API keys on the server, never on the client.
    5.  **Enable CORS**: Configure your server to allow requests from your web app's domain.
    6.  **Update Client-Side Code**: Modify the `processUrl()` function in the app to call your new server endpoint.

### 2. Advanced Beat Detection

The current beat detection is simple. A more robust method is **Spectral Flux Analysis**.

* **Concept**: Instead of just looking at bass levels, you compare the audio spectrum from one frame to the next. A large, sudden change across many frequencies indicates an "onset" or beat.
* **Implementation**:
    1.  In the `AudioAnalyzer`, store the `frequencyData` from the previous frame.
    2.  In the current frame, calculate the difference for each frequency bin: `diff = currentData[i] - previousData[i]`.
    3.  Only sum the positive differences (to detect increases in energy).
    4.  If this sum (the spectral flux) exceeds a dynamic threshold, you've detected a beat.

### 3. Procedural Noise & Advanced Visuals

To make visuals feel more organic, replace random movements with procedural noise.

* **Perlin/Simplex Noise**: These algorithms create natural-looking, smooth, random patterns.
* **Implementation**:
    1.  Find a JavaScript library for Perlin or Simplex noise.
    2.  In your `animate` loop, use a time-based variable (e.g., `time += 0.01`) as input to the noise function.
    3.  Use the noise output to influence visual properties like particle positions, camera movement in 3D, or the shape of 2D waves. For example: `particle.x += noise(time)`.

### 4. Deployment to Google Cloud Run

To deploy this app, you need to wrap it in a minimal web server.

1.  **Create a `package.json`**: `npm init -y`
2.  **Install Express**: `npm install express`
3.  **Create a `server.js` file**:
    ```javascript
    const express = require('express');
    const path = require('path');
    const app = express();
    const PORT = process.env.PORT || 8080;

    // Serve the static index.html file
    app.use(express.static(__dirname));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}...`);
    });
    ```
4.  **Create a `Dockerfile`**:
    ```dockerfile
    FROM node:18-slim
    WORKDIR /usr/src/app
    COPY package*.json ./
    RUN npm install --only=production
    COPY . .
    CMD [ "node", "server.js" ]
    ```
5.  **Deploy**: Use the `gcloud run deploy` command to build the container and deploy it to Cloud Run.
