let socket;
const initSocket = (hostname, port, playerId) => {
    socket = new WebSocket("ws://" + hostname + ":" + port);

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: "ready",
            id: playerId
        }));
    };

    socket.onerror = (err) => {
        console.log("ERROR");
        console.log(err);
    };

    socket.onclose = () => {
    };

    socket.onmessage = function(msg) {
//        const canvas = new OffscreenCanvas(1920, 1080);
//        const ctx = canvas.getContext('2d');
//        ctx.fillStyle = `rgba(200, 200, 200, 255)`;
//        ctx.fillRect(0, 0, 100, 100);
//        postMessage({canvas});
//        const data = new Uint8ClampedArray(msg.data);
//        postMessage(data);

//        if (currentBuf[0] == 2) {
//            window.playerId = currentBuf[1];
//            let gameWidth1 = String(currentBuf[2]);
//            let gameWidth2 = String(currentBuf[3]).length > 1 ? currentBuf[3] : "0" + currentBuf[3];
//
//            let gameHeight1 = String(currentBuf[4]);
//            let gameHeight2 = String(currentBuf[5]);//.length > 1 ? currentBuf[5] : '0' + currentBuf[5];
//            initCanvas(Number(gameWidth1 + gameWidth2), Number(gameHeight1 + gameHeight2));
//        } else if (currentBuf[0] == 1) {
//            storeAssets(currentBuf);
//        } else if (currentBuf[0] === 5) {
//            let a = String(currentBuf[1]);
//            let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
//            let newPort = a + b;
//            initSocket(Number(newPort).toString());
//        } else if (currentBuf[0] == 3 && !rendered) {
//            if (!rendered) {
//                rendered = true;
//                req();
//            }
//        }
    };

    return socket;
};

onmessage = (msg) => {
    if (typeof(msg.data) === 'string') {
        const socketInitData = JSON.parse(msg.data);
        socket && socket.close();
//        initSocket(socketInitData.hostname, socketInitData.port, socketInitData.playerId);
    } else {
        console.log('huh');
        console.log(msg.data);
        const canvas = msg.data.canvas;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = `rgba(200, 200, 200, 255)`;
        ctx.fillRect(0, 0, 100, 100); 
        //socket && socket.readyState == 1 && socket.send(msg.data);
    }
};
//initSocket(7000);
