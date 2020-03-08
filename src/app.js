const worker = new Worker('worker.js');

const canvas = document.getElementById("game");
const offscreen = canvas.transferControlToOffscreen();

console.log('ayyyy');

let gameWidth;
let gameHeight;

worker.postMessage({canvas: offscreen}, [offscreen])

worker.onmessage = (msg) => {
    console.log("got message from worker");
    console.log(msg);
    if (msg.data.gameInfo) {
        gameWidth = msg.data.gameInfo.width;
        gameHeight = msg.data.gameInfo.height;
    }
};

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
let mouseDown = false;
const keysDown = {};

let audioCtx, source;

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

    window.requestAnimationFrame(req);
}


const click = function(x, y) {
    if (!gameWidth) {
        return;
    }
    const pixelWidth = canvas.width / gameWidth;
    const pixelHeight = canvas.height / gameHeight;
    const clickX = Math.floor((x + window.scrollX) / pixelWidth);
    const clickY = Math.floor((y + window.scrollY) / pixelHeight);
    const payload = {type: "click",  data: {x: clickX, y: clickY}};
    worker.postMessage(JSON.stringify(payload));
};

const keydown = function(key) {
    const payload = {type: "keydown",  key: key};
    worker.postMessage(JSON.stringify(payload));
};

const keyup = function(key) {
    const payload = {type: "keyup",  key: key};
    worker.postMessage(JSON.stringify(payload));
};

//const unlock = () => {
//    if (!audioCtx) {
//        audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
//        if (audioCtx.state === "suspended") {
//            audioCtx.resume();
//        }
//        for (const key in gameAssets) {
//            if (gameAssets[key]["type"] === "audio" && !gameAssets[key]["decoded"]) {
//                audioCtx.decodeAudioData(gameAssets[key].data, (buffer) => {
//                    gameAssets[key].data = buffer;
//                    gameAssets[key].decoded = true;
//                });
//            }
//        }
//    }
//};
//
//document.addEventListener("touchstart", unlock, false);

canvas.addEventListener("mousedown", function() {
    mouseDown = true;
    //unlock();
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

//if (isMobile()) {
//    document.getElementById("text-hack").addEventListener("input", (e) => {
//        let eventKey = e.data ? e.data.charAt(e.data.length - 1) : "Backspace";
//        e.key = eventKey;
//        if (keyMatters(e) && !keysDown["Meta"]) {
//            e.preventDefault && e.preventDefault();
//            keydown(e.key);
//        }
//    });
//} else {
//    document.addEventListener("keydown", function(e) {
//        if (keyMatters(e) && !keysDown["Meta"]) {
//            e.preventDefault();
//            keydown(e.key);
//            keysDown[e.key] = true;
//        }
//    });
//    document.addEventListener("keyup", function(e) {
//        if (keyMatters(e)) {
//            e.preventDefault();
//            keyup(e.key);
//            keysDown[e.key] = false;
//        }
//    });
//}
//
//window.addEventListener('resize', () => {
//    initCanvas(window.gameWidth, window.gameHeight);
//});
//
