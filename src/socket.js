let socket;
let clientInfo;
let sentClientInfo;

const initSocket = (hostname, port, playerId, secure, spectating) => {
    const wsProtocol = secure ? 'wss' : 'ws';

    socket = new WebSocket('ws://54.176.82.103:82');//`${wsProtocol}://` + hostname + ":" + port);

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: "ready",
            id: playerId,
            clientInfo,
            spectating
        }));
    };

    socket.onerror = (err) => {
        console.log("ERROR");
        console.log(err);
        sentClientInfo = false;
        clientInfo = undefined;
    };

    socket.onclose = () => {
        postMessage({
            type: 'SOCKET_CLOSE'
        });
        sentClientInfo = false;
        clientInfo = undefined;
    };

    socket.onmessage = function(msg) {
        if (!sentClientInfo) {
            clientInfo && socket.send(JSON.stringify(clientInfo));
            sentClientInfo = true;
        }
        postMessage(msg.data);
    };

    return socket;
};

onmessage = (msg) => {
    if (msg.data.socketInfo) {
        socket && socket.close();
        initSocket(msg.data.socketInfo.hostname, msg.data.socketInfo.port, msg.data.socketInfo.playerId, msg.data.socketInfo.secure, msg.data.socketInfo.spectating);
    } else if (msg.data.clientInfo) {
        clientInfo = msg.data;
        if (socket && socket.readyState == 1) { 
            socket.send(JSON.stringify(clientInfo));
        }
    } else {
        socket && socket.readyState == 1 && socket.send(msg.data);
    }
};
