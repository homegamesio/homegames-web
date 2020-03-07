const worker = new Worker('worker.js');

const canvas = document.getElementById("game");
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({canvas: offscreen}, [offscreen])

worker.postMessage({
    socketInfo: {
        hostname: window.location.hostname,
        port: 7000
    }
});

worker.postMessage({
    windowInfo: {
        width: window.innerWidth,
        height: window.innerHeight
    }
});

