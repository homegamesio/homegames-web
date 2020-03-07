const { GameNode, squish, unsquish, Colors } = require('squishjs');

const socketWorker = new Worker('socket.js');

let currentBuf;

let rendered = false;

socketWorker.onmessage = (socketMessage) => {
    currentBuf = socketMessage.data;
    if (currentBuf[0] == 2) {
        window.playerId = currentBuf[1];
        let gameWidth1 = String(currentBuf[2]);
        let gameWidth2 = String(currentBuf[3]).length > 1 ? currentBuf[3] : "0" + currentBuf[3];

        let gameHeight1 = String(currentBuf[4]);
        let gameHeight2 = String(currentBuf[5]);//.length > 1 ? currentBuf[5] : '0' + currentBuf[5];
        initCanvas(Number(gameWidth1 + gameWidth2), Number(gameHeight1 + gameHeight2));
    } else if (currentBuf[0] == 1) {
        storeAssets(currentBuf);
    } else if (currentBuf[0] === 5) {
        let a = String(currentBuf[1]);
        let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
        let newPort = a + b;

        socketWorker.postMessage(JSON.stringify({
            hostname: window.location.hostname,
            playerId: window.playerId || null,
            port: Number(newPort)
        }));


        //initSocket(Number(newPort).toString());
    } else if (currentBuf[0] == 3 && !rendered) {
        rendered = true;
        req();
    }
};

socketWorker.postMessage(JSON.stringify({
    hostname: window.location.hostname,
    playerId: window.playerId || null,
    port: 7000
}));

let gamepad;
let moving;

let horizontalScale = 1;
let verticalScale = 1;
let scaleFactor = 1;

window.playerId = null;

let mouseDown = false;
const keysDown = {};

let audioCtx, source;

const gameAssets = {};
const imageCache = {};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

//const initSocket = (port) => {
//    socket = new WebSocket("ws://" + hostname + ":" + port);
//
//    socket.binaryType = "arraybuffer";
//
//    socket.onopen = () => {
//        socket.send(JSON.stringify({
//            type: "ready",
//            id: window.playerId || null
//        }));
//    };
//
//    socket.onerror = (err) => {
//        console.log("ERROR");
//        console.log(err);
//    };
//
//    socket.onclose = () => {
//    };
//
//    let rendered;
//    socket.onmessage = function(msg) {
//        currentBuf = new Uint8ClampedArray(msg.data);
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
//    };
//};

const initCanvas = (gameWidth, gameHeight) => {
    let windowWidth = window.innerWidth;
    window.gameWidth = gameWidth;
    window.gameHeight = gameHeight;
    
    scaleFactor = Math.floor(windowWidth / gameWidth) || windowWidth / gameWidth;

    horizontalScale = gameWidth * scaleFactor;
    verticalScale = gameHeight * scaleFactor;

    canvas.height = verticalScale;
    canvas.width = horizontalScale;
};

initCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);
//initSocket(7000);

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
                const imgBase64 = btoa(imgBase64String);
                gameAssets[payloadKey] = {"type": "image", "data": "data:image/jpeg;base64," + imgBase64};
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

function renderBuf(buf) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let i = 0;
    
    while (buf && i < buf.length) {
        const frameType = buf[i];

        const playerId = 0;//buf[i + 1];
        const frameSize = buf[i + 1];

        let bufIndex = i + 2;
        let thing = unsquish(buf.slice(i, i + frameSize));
        
        if (thing.playerId === 0 || thing.playerId === window.playerId) {

            if (thing.color && thing.size) {
                ctx.fillStyle = "rgba(" + thing.color[0] + "," + thing.color[1] + "," + thing.color[2] + "," + thing.color[3] + ")";
                ctx.fillRect(thing.pos.x * horizontalScale / 100, thing.pos.y * verticalScale / 100, thing.size.x * horizontalScale / 100, thing.size.y * verticalScale / 100);
            }

            if (thing.text) {
                ctx.fillStyle = "black";
                const fontSize = thing.text.size * scaleFactor;
                ctx.font = fontSize + "px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(thing.text.text, thing.text.x * horizontalScale / 100, thing.text.y * verticalScale / 100);
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
                    let image;

                    if (imageCache[assetKey]) {
                        image = imageCache[assetKey];
                        ctx.drawImage(image, (asset.pos.x / 100) * horizontalScale, 
                            (asset.pos.y / 100) * verticalScale, image.width, image.height);
                    } else {
                        image = new Image(asset.size.x / 100 * horizontalScale, asset.size.y / 100 * verticalScale);
                        imageCache[assetKey] = image;
                        image.onload = () => {
                            ctx.drawImage(image, (asset.pos.x / 100) * horizontalScale, 
                                (asset.pos.y / 100) * verticalScale, image.width, image.height);
                        };

                        if (gameAssets[assetKey]) {
                            image.src = gameAssets[assetKey].data;
                        }
                    }
                }

            }

        }

        i += frameSize;
    }
}

let gamepads;

const getGamepadMappings = (gamepadId) => {
    if (gamepadId.indexOf('Xbox 360') >= 0 || gamepadId.indexOf('Xbox One') >= 0) { 
        const leftStickXIndex = 0;
        const leftStickYIndex = 1;

        const rightStickXIndex = 2;
        const rightStickYIndex = 3;

        const stickInputThreshold = 0.2;

        const aButtonIndex = 0;
        const bButtonIndex = 1;
        const xButtonIndex = 2;
        const yButtonIndex = 3;

        const stickMappings = {
            [leftStickXIndex]: (val) => {
                if (Math.abs(val) >= stickInputThreshold) {
                    if (val < 0) {
                        keydown('a');
                        keysDown['a'] = true;
                    } else {
                        keydown('d');
                        keysDown['d'] = true;
                    }
                } else {
                    keysDown['a'] = false;
                    keysDown['d'] = false;
                }
            },
            [leftStickYIndex]: (val) => {
                if (Math.abs(val) >= stickInputThreshold) {
                    if (val < 0) {
                        keydown('w');
                        keysDown['w'] = true;
                    } else {
                        keydown('s');
                        keysDown['s'] = true;
                    }
                } else {
                    keysDown['w'] = false;
                    keysDown['s'] = false;
                }
            },
            [rightStickXIndex]: (val) => {
                if (Math.abs(val) >= stickInputThreshold) {
                    if (val < 0) {
                        keydown('ArrowLeft');
                        keysDown['ArrowLeft'] = true;
                    } else {
                        keydown('ArrowRight');
                        keysDown['ArrowRight'] = true;
                    }
                } else {
                    keysDown['ArrowLeft'] = false;
                    keysDown['ArrowRight'] = false;
                }
            },
            [rightStickYIndex]: (val) => {
                if (Math.abs(val) >= stickInputThreshold) {
                    if (val < 0) {
                        keydown('ArrowUp');
                        keysDown['ArrowUp'] = true;
                    } else {
                        keydown('ArrowDown');
                        keysDown['ArrowDown'] = true;
                    }
                } else {
                    keysDown['ArrowDown'] = false;
                    keysDown['ArrowUp'] = false;
                }
            }
        };

        const buttonMappings = {
            [aButtonIndex]: {
                press: () => {
                    console.log('cio');
                },
                depress: () => {
                    console.log(':(');
                }
            },
            [bButtonIndex]: {
                press: () => {
                    console.log('b');
                },
                depress: () => {
                    console.log('no b');
                }
            },
            [xButtonIndex]: {
                press: () => {
                    console.log('x');
                },
                depress: () => {
                    console.log('no x');
                }
            },
            [yButtonIndex]: {
                press: () => {
                    console.log('y');
                },
                depress: () => {
                    console.log('no y');
                }

            }
        }

        return {
            stickMappings,
            buttonMappings
        }
    }
};

const gamepadsPressed = {};

function req() {
    gamepads = navigator.getGamepads();

    if (gamepads.length > 0) {
        Object.keys(keysDown).filter(k => keysDown[k]).forEach(k => keydown(k));

        for (let gamepadIndex = 0; gamepadIndex < gamepads.length; gamepadIndex++) { 
            const gamepad = gamepads[gamepadIndex];
            if (gamepad) {
                if (!gamepadsPressed.hasOwnProperty(gamepadIndex)) {
                    gamepadsPressed[gamepadIndex] = {};
                }
                const inputMappings = getGamepadMappings(gamepad.id);
                if (inputMappings) {
                    for (let stickIndex in inputMappings.stickMappings) {
                        inputMappings.stickMappings[stickIndex](gamepad.axes[stickIndex]);
                    }

                    for (let buttonIndex in inputMappings.buttonMappings) {
                        if (!gamepadsPressed[gamepadIndex].hasOwnProperty(buttonIndex)) {
                            gamepadsPressed[gamepadIndex][buttonIndex] = false;
                        }
                        if (gamepad.buttons[buttonIndex].pressed && !gamepadsPressed[gamepadIndex][buttonIndex]) {
                            gamepadsPressed[gamepadIndex][buttonIndex] = true;
                            inputMappings.buttonMappings[buttonIndex].press();
                        } else if (!gamepad.buttons[buttonIndex].pressed && gamepadsPressed[gamepadIndex][buttonIndex]) {
                            gamepadsPressed[gamepadIndex][buttonIndex] = false;
                            inputMappings.buttonMappings[buttonIndex].depress();
                        }
                    }
                }
            }
        }
    }

    currentBuf && currentBuf.length > 1 && currentBuf[0] == 3 && renderBuf(currentBuf);

    window.requestAnimationFrame(req);
}

const click = function(x, y) {
    const pixelWidth = canvas.width / window.gameWidth;
    const pixelHeight = canvas.height / window.gameHeight;
    const clickX = Math.floor((x + window.scrollX) / pixelWidth);
    const clickY = Math.floor((y + window.scrollY) / pixelHeight);
    const payload = {type: "click",  data: {x: clickX, y: clickY}};
    socketWorker.postMessage(JSON.stringify(payload));
};

const keydown = function(key) {
    if (socket) {
        const payload = {type: "keydown",  key: key};
        socket.readyState === 1 && socket.send(JSON.stringify(payload));
    }
};

const keyup = function(key) {
    if (socket) {
        const payload = {type: "keyup",  key: key};
        socket.readyState === 1 && socket.send(JSON.stringify(payload));
    }
};

const unlock = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        for (const key in gameAssets) {
            if (gameAssets[key]["type"] === "audio" && !gameAssets[key]["decoded"]) {
                audioCtx.decodeAudioData(gameAssets[key].data, (buffer) => {
                    gameAssets[key].data = buffer;
                    gameAssets[key].decoded = true;
                });
            }
        }
    }
};

document.addEventListener("touchstart", unlock, false);

canvas.addEventListener("mousedown", function() {
    mouseDown = true;
    unlock();
});

canvas.addEventListener("mouseup", function(e) {
    click(e.clientX, e.clientY);
    mouseDown = false;
});

canvas.addEventListener("mousemove", function(e) {
    if (mouseDown) {
        click(e.clientX, e.clientY);
    }
});

canvas.addEventListener("touchstart", function(e) {
    e.preventDefault();
    click(e.touches["0"].clientX, e.touches["0"].clientY);
});

canvas.addEventListener("touchmove", function(e) {
    e.preventDefault();
    click(e.touches["0"].clientX, e.touches["0"].clientY);
});

function keyMatters(event) {
    // Key code values 36-40 are the arrow keys
    return event.key.length == 1 && event.key >= " " && event.key <= "z" || event.keyCode >= 36 && event.keyCode <= 40 || event.key === "Meta" || event.key == "Backspace";
}

function isMobile() {
    return /Android/i.test(navigator.userAgent);
}

if (isMobile()) {
    document.getElementById("text-hack").addEventListener("input", (e) => {
        let eventKey = e.data ? e.data.charAt(e.data.length - 1) : "Backspace";
        e.key = eventKey;
        if (keyMatters(e) && !keysDown["Meta"]) {
            e.preventDefault && e.preventDefault();
            keydown(e.key);
        }
    });
} else {
    document.addEventListener("keydown", function(e) {
        if (keyMatters(e) && !keysDown["Meta"]) {
            e.preventDefault();
            keydown(e.key);
            keysDown[e.key] = true;
        }
    });
    document.addEventListener("keyup", function(e) {
        if (keyMatters(e)) {
            e.preventDefault();
            keyup(e.key);
            keysDown[e.key] = false;
        }
    });
}

window.addEventListener('resize', () => {
    initCanvas(window.gameWidth, window.gameHeight);
});
