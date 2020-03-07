const socketWorker = new Worker('socket.js');

socketWorker.onmessage = (socketMessage) => {
    console.log('nice nice nice');
};

socketWorker.postMessage(JSON.stringify({
    hostname: window.location.hostname,
    playerId: window.playerId || null,
    port: 7000
}));
