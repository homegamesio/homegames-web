const { GameNode, squish, unsquish, Colors } = require('squishjs');

const socketWorker = new Worker('socket.js');

let currentBuf;

let rendered = false;

let aspectRatio;

let lastClick;
let clientWidth;

socketWorker.onmessage = (socketMessage) => {
    currentBuf = new Uint8ClampedArray(socketMessage.data);
    if (currentBuf[0] == 2) {
        window.playerId = currentBuf[1];
        const aspectRatioX = currentBuf[2];
        const aspectRatioY = currentBuf[3];
        aspectRatio = {x: aspectRatioX, y: aspectRatioY};

        initCanvas();
    } else if (currentBuf[0] == 1) {
        storeAssets(currentBuf);
    } else if (currentBuf[0] === 5) {
        let a = String(currentBuf[1]);
        let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
        let newPort = a + b;

        socketWorker.postMessage({
            socketInfo: {
                hostname: window.location.hostname,
                playerId: window.playerId || null,
                port: Number(newPort)
            }
        });

    } else if (currentBuf[0] == 3 && !rendered) {
        rendered = true;
        req();
    }
};

socketWorker.postMessage({
    socketInfo: {
        hostname: window.location.hostname,
        playerId: window.playerId || null,
        port: 7000
    }
});

let gamepad;
let moving;

window.playerId = null;

let mouseDown = false;
const keysDown = {};

let audioCtx, source;

const gameAssets = {};
const imageCache = {};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", {alpha: false});

const initCanvas = () => {
    const canvasHeight = (window.innerWidth * aspectRatio.y) / aspectRatio.x;
//    let windowWidth = window.innerWidth;
//    window.gameWidth = gameWidth;
//    window.gameHeight = gameHeight;
    
//    scaleFactor = Math.floor(windowWidth / gameWidth) || windowWidth / gameWidth;

//    horizontalScale = gameWidth * scaleFactor;
//    verticalScale = gameHeight * scaleFactor;

    canvas.height = 2 * canvasHeight;
    canvas.width = 2 * window.innerWidth;
    clientWidth = .5 * canvas.width;
    clientHeight = .5 * canvas.height;
    canvas.style.height = `${clientHeight}px`;
    canvas.style.width = `${clientWidth}px`;
};

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

let thingIndices = [];

function renderBuf(buf) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let i = 0;
    thingIndices = [];
    
    while (buf && i < buf.length) {
        const frameType = buf[i];

        const frameSize = buf[i + 1];

        let bufIndex = i + 2;
        let thing = unsquish(buf.slice(i, i + frameSize));

        if (thing.playerId === 0 || thing.playerId === window.playerId) {

            if (thing.color && thing.size) {
                const clickableChunk = [
                    !!thing.handleClick,
                    thing.input && thing.input.type,
                    thing.id,
                    Math.floor(thing.pos.x * clientWidth / 100), 
                    Math.floor(thing.pos.x * clientWidth / 100) + Math.floor(thing.size.x * clientWidth / 100), 
                    Math.floor(thing.pos.y * clientHeight / 100), 
                    Math.floor(thing.pos.y * clientHeight / 100) + Math.floor(thing.size.y * clientHeight / 100)
                ];
                thingIndices.push(clickableChunk);

                if (thing.effects && thing.effects.shadow) {
                    const shadowColor = thing.effects.shadow.color;
                    ctx.shadowColor = "rgba(" + shadowColor[0] + "," + shadowColor[1] + "," + shadowColor[2] + "," + shadowColor[3] + ")";
                    if (thing.effects.shadow.blur) {
                        ctx.shadowBlur = thing.effects.shadow.blur;
                    }
                }

                ctx.globalAlpha = thing.color[3] / 255;
                ctx.fillStyle = "rgba(" + thing.color[0] + "," + thing.color[1] + "," + thing.color[2] + "," + thing.color[3] + ")";
                ctx.fillRect(Math.floor(thing.pos.x * canvas.width / 100), Math.floor(thing.pos.y * canvas.height / 100), Math.floor(thing.size.x * canvas.width / 100), Math.floor(thing.size.y * canvas.height / 100));
                ctx.shadowColor = null;
                ctx.shadowBlur = 0;
            }

            if (thing.text) {
                ctx.globalAlpha = thing.text.color[3] / 255;
                ctx.fillStyle = "rgba(" + thing.text.color[0] + "," + thing.text.color[1] + "," + thing.text.color[2] + "," + thing.text.color[3] + ")";
                const fontSize = thing.text.size;
                ctx.font = fontSize + "px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(thing.text.text, thing.text.x * canvas.width/ 100, thing.text.y * canvas.height / 100);
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
                        image.width = asset.size.x / 100 * canvas.width;
                        image.height = asset.size.y / 100 * canvas.height;
                        ctx.drawImage(image, (asset.pos.x / 100) * canvas.width, 
                            (asset.pos.y / 100) * canvas.height, image.width, image.height);
                    } else {
                        image = new Image(asset.size.x / 100 * canvas.width, asset.size.y / 100 * canvas.height);
                        imageCache[assetKey] = image;
                        image.onload = () => {
                            ctx.drawImage(image, (asset.pos.x / 100) * canvas.width, 
                                (asset.pos.y / 100) * canvas.height, image.width, image.height);
                        };

                        if (gameAssets[assetKey]) {
                            image.src = gameAssets[assetKey].data;
                        }
                    }
                }

            }

        }

        i += frameSize;

        ctx.globalAlpha = 1;
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
                    console.log('a');
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

const getActiveGamepads = (gamepads) => {
    const activeGamepads = new Map();

    for (let gamepadIndex = 0; gamepadIndex < gamepads.length; gamepadIndex++) {
        const gamepad = gamepads[gamepadIndex];
        activeGamepads.set(gamepadIndex, gamepad);
    }

    return activeGamepads;
};

let lastClickTime;

function req() {
    gamepads = navigator.getGamepads();

    Object.keys(keysDown).filter(k => keysDown[k]).forEach(k => keydown(k));

    const activeGamepads = getActiveGamepads(gamepads);

    if (activeGamepads.length) {
        activeGamepads.forEach((gamepadIndex, gamepad) => {
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
        });
    } else if (mouseDown && (!lastClickTime || Date.now() - lastClickTime > 200)) {
        lastClickTime = Date.now();
        click();
    }

    currentBuf && currentBuf.length > 1 && currentBuf[0] == 3 && renderBuf(currentBuf);

    window.requestAnimationFrame(req);
}

const click = function() {
    if (!lastClick) {
        return;
    }
    const x = lastClick[0];
    const y = lastClick[1];
    //[e.touches["0"].clientX + window.scrollX, e.touches["0"].clientY + window.scrollY];
    const clickX = x / clientWidth * 100;
    const clickY = y / clientHeight * 100;
    
    const clickInfo = canClick(x, y);
    if (clickInfo.action) {
        if (clickInfo.action === 'text') {
            // mouseup doesnt fire when you call prompt
            mouseDown = false;
            const textInput = prompt('Input text');
            socketWorker.postMessage(JSON.stringify({
                type: 'input',
                input: textInput,
                nodeId: clickInfo.nodeId
            }));
        } else if (clickInfo.action === 'file') {
            mouseDown = false;
            const inputEl = document.getElementById('file-input');
            inputEl.click();
            inputEl.onchange = (e) => {
                if (inputEl.files.length > 0) {
                    const fileReader = new FileReader();
                    fileReader.onload = (data) => {
                        socketWorker.postMessage(JSON.stringify({
                            type: 'input',
                            // this is absolutely the wrong way to do this (????)
                            input: new Uint8Array(fileReader.result),
                            nodeId: clickInfo.nodeId
                        }));
                    };
                    fileReader.readAsArrayBuffer(inputEl.files[0]);
                }
            };
        }
    } else {
        if (clickX <= 100 && clickY <= 100) {
            const payload = {type: "click",  data: {x: clickX, y: clickY}};
            socketWorker.postMessage(JSON.stringify(payload));
        }
    }
};

const keydown = function(key) {
    const payload = {type: "keydown",  key: key};
    socketWorker.postMessage(JSON.stringify(payload));
};

const keyup = function(key) {
    const payload = {type: "keyup",  key: key};
    socketWorker.postMessage(JSON.stringify(payload));
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

const canClick = (x, y) => {
    let isClickable = false;
    let action = null;
    let nodeId = null;

    for (const chunkIndex in thingIndices) {
        const clickableIndexChunk = thingIndices[chunkIndex];
        const intersects = (
            x >= clickableIndexChunk[3] && 
            x <= clickableIndexChunk[4]
        ) && (
            y >= clickableIndexChunk[5] && 
            y <= clickableIndexChunk[6]) ;
        if (intersects) {
            isClickable = clickableIndexChunk[0];
            action = clickableIndexChunk[1];
            nodeId = clickableIndexChunk[2];
        }
    }

    return {
        isClickable,
        action,
        nodeId
    }
};

window.addEventListener("mousedown", function(e) {
    mouseDown = true;
    lastClick = [e.clientX + window.scrollX, e.clientY + window.scrollY];
    unlock();
    click();//e.clientX + window.scrollX, e.clientY + window.scrollY);
});

window.addEventListener("mouseup", function(e) {
    mouseDown = false;
});

canvas.addEventListener("mousemove", function(e) {
    if (mouseDown) {
        lastClick = [e.clientX + window.scrollX, e.clientY + window.scrollY];
        click();//e.clientX + window.scrollX, e.clientY + window.scrollY);
    }
});

window.addEventListener("touchstart", function(e) {
    e.preventDefault();
    mouseDown = true;
    lastClick = [e.touches["0"].clientX + window.scrollX, e.touches["0"].clientY + window.scrollY];
    click();
});

canvas.addEventListener("touchmove", function(e) {
    e.preventDefault();
    mouseDown = true;
    lastClick = [e.touches["0"].clientX + window.scrollX, e.touches["0"].clientY + window.scrollY];
    click();//e.touches["0"].clientX + window.scrollX, e.touches["0"].clientY + window.scrollY);
});

window.addEventListener('touchend', () => {
    mouseDown = false;
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

window.addEventListener('mousemove', (e) => {
    const clickInfo = canClick(e.clientX + window.scrollX, e.clientY + window.scrollY);

    if (clickInfo.isClickable || clickInfo.action) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'initial';
    }

});

window.addEventListener('resize', () => {
    initCanvas(window.gameWidth, window.gameHeight);
    currentBuf && currentBuf.length > 1 && currentBuf[0] == 3 && renderBuf(currentBuf);
});
