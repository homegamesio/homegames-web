const { GameNode, squish, unsquish, Colors } = require('squishjs');

let socket;
let canvas;
let playerId;
let windowWidth;
let windowHeight;
let scaleFactor;
let hostname;

const gameAssets = {};
const imageCache = {};

const renderBuf = (buf) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let i = 0;
    
    while (buf && i < buf.length) {
        const frameSize = buf[i + 1];

        let thing = unsquish(buf.slice(i, i + frameSize));

        if (thing.playerId === 0 || thing.playerId === playerId) {

            if (thing.color && thing.size) {
                ctx.fillStyle = "rgba(" + thing.color[0] + "," + thing.color[1] + "," + thing.color[2] + "," + thing.color[3] + ")";
                ctx.fillRect(thing.pos.x * canvas.width / 100, thing.pos.y * canvas.height / 100, thing.size.x * canvas.width / 100, thing.size.y * canvas.height / 100);
            }

            if (thing.text) {
                ctx.fillStyle = "black";
                const fontSize = thing.text.size * scaleFactor;
                ctx.font = fontSize + "px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(thing.text.text, thing.text.x * canvas.width / 100, thing.text.y * canvas.height / 100);
            }

            if (thing.asset) {
                const assetKey = Object.keys(thing.asset)[0];

                if (gameAssets[assetKey] && gameAssets[assetKey]["type"] === "audio") {
                    if (audioCtx) {
                        source = audioCtx.createBufferSource();
                        source.connect(audioCtx.destination);
                        source.buffer = gameAssets[assetKey].data;
                        source.start(0);
                    } else {
                        console.warn("Cant play audio");
                    }
                } else {
                    const asset = thing.asset[assetKey];
                    if (imageCache[assetKey]) {
                        const image = imageCache[assetKey];
                        ctx.drawImage(image, (asset.pos.x / 100) * canvas.width, 
                            (asset.pos.y / 100) * canvas.height, (asset.size.x / 100) * canvas.width, (asset.size.y / 100) * canvas.height);
                    } else {
                        createImageBitmap(gameAssets[assetKey].data).then(image=> {
                            imageCache[assetKey] = image;

                            ctx.drawImage(image, (asset.pos.x / 100) * canvas.width, 
                                (asset.pos.y / 100) * canvas.height, (asset.size.x / 100) * canvas.width, (asset.size.y / 100) * canvas.height);
                        });
                    }
                }

            }

        }

        i += frameSize;
    }
}

const storeAssets = (buf) => {
    let i = 0;

    while (buf && i < buf.length) {
        const frameType = buf[i];

        if (frameType === 1) {
            const assetType = buf[i + 1];
            // image
            if (assetType === 1) {
                const payloadLengthBase32 = String.fromCharCode.apply(null, buf.slice(i + 2, i + 6));
                const payloadLength = parseInt(payloadLengthBase32, 36);

                const payloadKeyRaw = buf.slice(i + 6, i + 6 + 32);
                const payloadData = buf.slice(i + 6 + 32, i + 6 +  payloadLength);
                const payloadKey = String.fromCharCode.apply(null, payloadKeyRaw.filter(k => k)); 
                let imgBase64String = "";
                for (let i = 0; i < payloadData.length; i++) {
                    imgBase64String += String.fromCharCode(payloadData[i]);
                }
                //const imgBase64 = btoa(imgBase64String);
                //gameAssets[payloadKey] = {"type": "image", "data": "data:image/jpeg;base64," + imgBase64};
                gameAssets[payloadKey] = {'type': 'image', 'data': new Blob([new Uint8Array(payloadData)])};

                i += 6 + payloadLength;
            } else {
                // audio
                const payloadLengthBase32 = String.fromCharCode.apply(null, buf.slice(i + 2, i + 6));
                const payloadLength = parseInt(payloadLengthBase32, 36);
                const payloadKeyRaw = buf.slice(i + 6, i + 6 + 32);
                const payloadData = buf.slice(i + 6 + 32, i + 6 +  payloadLength);
                const payloadKey = String.fromCharCode.apply(null, payloadKeyRaw.filter(k => k)); 
                if (!audioCtx) {
                    gameAssets[payloadKey] = {"type": "audio", "data": payloadData.buffer, "decoded": false};
                } else {
                    audioCtx.decodeAudioData(payloadData.buffer, (buffer) => {
                        gameAssets[payloadKey] = {"type": "audio", "data": buffer, "decoded": true};
                    });
                }

                i += 6 + payloadLength;
            }
        }
    }
}



const initCanvas = (width, height) => {
    scaleFactor = Math.floor(windowWidth / width) || windowWidth / width;
    canvas.height = height * scaleFactor;
    canvas.width = width * scaleFactor;
};

const handleSocketMessage = (buf) => {
    if (buf[0] == 2) {
        playerId = buf[1];
        const gameWidth1 = String(buf[2]);
        const gameWidth2 = String(buf[3]).length > 1 ? buf[3] : "0" + buf[3];

        const gameHeight1 = String(buf[4]);
        const gameHeight2 = String(buf[5]);
        postMessage({
            gameInfo: {
                width: Number(gameWidth1 + gameWidth2),
                height: Number(gameHeight1 + gameHeight2),
            }
        });
        initCanvas(Number(gameWidth1 + gameWidth2), Number(gameHeight1 + gameHeight2));
    } else if (buf[0] == 1) {
        storeAssets(buf);
    } else if (buf[0] == 3) {
        renderBuf(buf);
    } else if (buf[0] === 5) {
        let a = String(buf[1]);
        let b = String(buf[2]).length > 1 ? buf[2] : "0" + buf[2];
        let newPort = a + b;
        initSocket(Number(newPort).toString());
    }
};

const initSocket = (port) => {
    socket && socket.close();
    socket = new WebSocket(`ws://${hostname}:${port}`);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: 'ready',
            playerId: playerId || null
        }));
    };

    socket.onmessage = (msg) => {
        handleSocketMessage(new Uint8ClampedArray(msg.data));
    };
};

onmessage = (msg) => {
    if (msg.data.socketInfo) {
        hostname = msg.data.socketInfo.hostname;
        initSocket(msg.data.socketInfo.port);
    } else if (msg.data.windowInfo) {
        windowWidth = msg.data.windowInfo.width;
        windowHeight = msg.data.windowInfo.height;
    } else if (msg.data.canvas) {
        canvas = msg.data.canvas;
    } else {
        socket && socket.readyState === 1 && socket.send(msg.data);
    }
};
