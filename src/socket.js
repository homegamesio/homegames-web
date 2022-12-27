let socket;
let clientInfo;
let sentClientInfo;

let code;
let needReadyFinish = false;
let _spectating = false;
const initSocket = (hostname, port, playerId, secure, spectating, serverCode) => {
    const wsProtocol = secure ? 'wss' : 'ws';
	_spectating = spectating;
    //socket = new WebSocket('ws://54.176.82.103:82');//`${wsProtocol}://` + hostname + ":" + port);
    socket = new WebSocket(`${wsProtocol}://${hostname}:${port}`);

    console.log('what the hell is my player id ' + playerId);

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
        console.log('sever code ? ' + serverCode);
        if (serverCode) {
            socket.send(JSON.stringify({
                type: 'code',
                code: serverCode
            }));
    		code = serverCode;
	    console.log('need to wait for id from server');
		needReadyFinish = true;
        } else {
	    console.log('ayyyy lmao');
       	    needReadyFinish = false;
            socket.send(JSON.stringify({
                type: "ready",
                id: playerId,
                clientInfo,
		code: serverCode,
                spectating
            }));
	}
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
	    console.log('got emssage');
	    console.log(msg);
	    // todo: encode this in a better way
	    if (msg.data === 'error: bad code supplied') {
		postMessage({
			type: 'ERROR',
			message: 'Bad server code supplied.'
		});
	    } else {
        if (!sentClientInfo) {
            clientInfo && socket.send(JSON.stringify(clientInfo));
            sentClientInfo = true;
        }
        postMessage(msg.data);
	    }
    };

    return socket;
};

onmessage = (msg) => {
    console.log(msg);
    if (msg.data.type && msg.data.type == 'finishReady') {
            socket.send(JSON.stringify({
                type: "ready",
		code: code || null,
                id: msg.data.playerId,
                clientInfo,
                spectating: _spectating
            }));
	
    } else if (msg.data.socketInfo) {
        socket && socket.close();
        initSocket(msg.data.socketInfo.hostname, msg.data.socketInfo.port, msg.data.socketInfo.playerId, msg.data.socketInfo.secure, msg.data.socketInfo.spectating, msg.data.socketInfo.serverCode);
    } else if (msg.data.clientInfo) {
        clientInfo = msg.data;
        if (socket && socket.readyState == 1) { 
            socket.send(JSON.stringify(clientInfo));
        }
    } else {
        socket && socket.readyState == 1 && socket.send(msg.data);
    }
};
