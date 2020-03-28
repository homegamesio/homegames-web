let socket;
const initSocket = (hostname, port, playerId) => {
    socket = new WebSocket("ws://" + hostname + ":" + port);

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
        postMessage(JSON.stringify({
            type: 'socketready'
        }));
    };

    socket.onerror = (err) => {
        console.log("ERROR");
        console.log(err);
    };

    socket.onclose = () => {
    };

    socket.onmessage = function(msg) {
        postMessage(msg.data);
    };

    return socket;
};

onmessage = (msg) => {
    if (msg.data.socketInfo) {
        socket && socket.close();
        initSocket(msg.data.socketInfo.hostname, msg.data.socketInfo.port, msg.data.socketInfo.playerId);
    } else {
        socket && socket.readyState == 1 && socket.send(msg.data);
    }
};
