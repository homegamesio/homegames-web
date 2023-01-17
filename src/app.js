const { Homepad } = require('homepad');
const hp = new Homepad();

const squishMap = {
    '0756': require('squish-0756'),
    '0762': require('squish-0762'),
    '0765': require('squish-0765'),
    '0766': require('squish-0766')
};

//let { squish, unsquish, Colors } = require('squishjs');
let { squish, unsquish, Colors } = squishMap['0756'];

let bezelInfo;

Colors = Colors.COLORS;

const canvas = document.getElementById("game");

const playingSounds = {};
let currentBuf;

let rendering = false;

let aspectRatio;

let mousePos;
let clientWidth;

const fileInputDiv = document.getElementById('file-input');
fileInputDiv.style.display = 'block';

fileInputDiv.oninput = (e) => {
    // console.log('fiiele');
    // console.log(e);
    const uploaded = e.target.files[0];
    // console.log(uploaded);
    const reader = new FileReader();
    reader.addEventListener('load', (ting) => {
        // console.log('tigiigigig!');
        // console.log(ting.target.result);
        const parsedData = JSON.parse(ting.target.result);
        console.log(parsedData);
        storeAssets(parsedData.assets);

        aspectRatio = Object.assign({}, parsedData.metadata.aspectRatio);

        bezelInfo = {x: 15, y: 15 };//currentBuf[4], y: currentBuf[5]};

                  // const squishVersionLength = currentBuf[6];
//                   const squishVersionString = String.fromCharCode.apply(null, currentBuf.slice(7, 7 + currentBuf[6]));
        window.squishVersion = parsedData.metadata.squishVersion;
        const squishVersion = squishMap[window.squishVersion];
        if (squishVersion) {
            squish = squishVersion.squish;
            unsquish = squishVersion.unsquish;
            Colors = squishVersion.Colors;
        }

        initCanvas();
        renderBuf(parsedData.data[17].data.flat());
    });

    reader.readAsText(uploaded);
}

// socketWorker.onmessage = (socketMessage) => {
//     if (socketMessage.data.constructor === Object) {
//         if (socketMessage.data.type === 'SOCKET_CLOSE') {
//             rendering = false;
//         }

//     if (socketMessage.data.type === 'ERROR') {
// 	rendering = false;
// 	const childDiv = document.createElement('div');
// 	const textChildDiv = document.createElement('div');
// 	textChildDiv.innerHTML = 'Error: ' + socketMessage.data.message;    
// 	const linkDiv = document.createElement('a');
// 	linkDiv.href = 'https://public.homegames.link/code';
// 	linkDiv.innerHTML = "Try again";
// 	childDiv.appendChild(textChildDiv);
// 	childDiv.appendChild(linkDiv);
// 	showErrorDiv(childDiv);
//     }
//     } else {
//         currentBuf = new Uint8ClampedArray(socketMessage.data);
//         if (currentBuf[0] == 2) {
//             window.playerId = currentBuf[1];
// 	if (currentBuf.length == 2) {
//         		socketWorker.postMessage({type: 'finishReady', playerId: window.playerId });
// 	}
// 	if (currentBuf.length > 2) {
//              	 const aspectRatioX = currentBuf[2];
//              	 const aspectRatioY = currentBuf[3];
//              	 aspectRatio = {x: aspectRatioX, y: aspectRatioY};

//              	 bezelInfo = {x: currentBuf[4], y: currentBuf[5]};

//              	 const squishVersionLength = currentBuf[6];
//              	 const squishVersionString = String.fromCharCode.apply(null, currentBuf.slice(7, 7 + currentBuf[6]));
//              	 window.squishVersion = squishVersionString;
//              	const squishVersion = squishMap[squishVersionString];
//              	if (squishVersion) {
//              	    squish = squishVersion.squish;
//              	    unsquish = squishVersion.unsquish;
//              	    Colors = squishVersion.Colors;
//              	 }
//              	 initCanvas();
// 	}
//         } else if (currentBuf[0] == 1) {
//             storeAssets(currentBuf);
//         } else if (currentBuf[0] == 9) {
//             // for now i know its just aspectRatio
//             aspectRatio = {x: currentBuf[1], y: currentBuf[2]};
//             initCanvas();
//         } else if (currentBuf[0] === 5) {
//             spectating = false;
//             let a = String(currentBuf[1]);
//             let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
//             let newPort = a + b;
//  		const hostname2 = window.serverCode ? 'public.homegames.link' : window.location.hostname;
// 		const socketPort2 = window.serverCode ? 82 : newPort;

//             socketWorker.postMessage({
//                 socketInfo: {
//                     hostname: hostname2,//window.location.hostname,
//                     playerId: window.playerId || null,
//                     port: Number(socketPort2),
//                     secure: window.location.host !== 'localhost' && window.isSecureContext,
//         		serverCode: window.serverCode,
// 		spectating
//                 }
//             });

//         } else if (currentBuf[0] === 6) {
//             spectating = true;
//             let a = String(currentBuf[1]);
//             let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
//             let newPort = a + b;

// 		const hostname2 = window.serverCode ? 'public.homegames.link' : window.location.hostname;
// 		const socketPort2 = window.serverCode ? 82 : newPort;
//             socketWorker.postMessage({
//                 socketInfo: {
//                     hostname: hostname2,// window.location.hostname,
//                     playerId: window.playerId || null,
//                     port: Number(socketPort2),
//                     secure: window.location.host !== 'localhost' && window.isSecureContext,
//         		serverCode: window.serverCode,
//                     spectating
//                 }
//             });

//         } else if (currentBuf[0] === 7) {
//             initPerformance();
//         } else if (currentBuf[0] === 8) { 
//             let a = String(currentBuf[1]);
//             let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
//             let newPort = a + b;

//             if (!hotClient) {
//                 const hostname = window.location.hostname;
//                 hotClient = new WebSocket(`ws://${hostname}:${newPort}`);
//                 hotClient.onopen = () => {
//                     console.log('hot client opened');
//                 }

//                 hotClient.onerror = (err) => {
//                     console.log('hot client err');
//                     console.log(err);
//                 }

//                 hotClient.onmessage = (msg) => {
//                     if (msg.data === 'reload') {
//                         location.reload();
//                     }
//                 }
//             }
//         } else if (currentBuf[0] == 3 && !rendering) {
//             rendering = true;
//             req();
//         }
//     }
// };

let gamepad;
let moving;

window.playerId = null;

let mouseDown = false;
const keysDown = {};

let audioCtx, source;

const gameAssets = {};
const imageCache = {};

const gameDiv = document.getElementById('homegames-main');
const divColor = Colors.BLACK;
gameDiv.style.background = `rgba(${divColor[0]}, ${divColor[1]}, ${divColor[2]}, ${divColor[3]})`; 

const ctx = canvas.getContext("2d", {alpha: false});

const initCanvas = () => {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;

    const canFitHeight = (maxWidth * aspectRatio.y / aspectRatio.x) <= maxHeight;

    let canvasHeight, canvasWidth;

    if (canFitHeight) { 
        const width = window.innerWidth;
        canvasWidth = width;
        canvasHeight = Math.floor(width * (aspectRatio.y / aspectRatio.x));
    } else {
        // fit canvas to height
        const height = window.innerHeight;
        canvasWidth = Math.floor(height * (aspectRatio.x / aspectRatio.y));
        canvasHeight = height;
    }

    canvas.height = 2 * canvasHeight;
    canvas.width = 2 * canvasWidth;
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
                const payloadLengthBase32 = String.fromCharCode.apply(null, buf.slice(i + 2, i + 12));
                const payloadLength = parseInt(payloadLengthBase32, 36);

                const payloadKeyRaw = buf.slice(i + 12, i + 12 + 32);
                const payloadData = buf.slice(i + 12 + 32, i + 12 +  payloadLength);
                const payloadKey = String.fromCharCode.apply(null, payloadKeyRaw.filter(k => k)); 
                let imgBase64String = "";
                for (let i = 0; i < payloadData.length; i++) {
                    imgBase64String += String.fromCharCode(payloadData[i]);
                }
                const imgBase64 = btoa(imgBase64String);
                gameAssets[payloadKey] = {"type": "image", "data": "data:image/jpeg;base64," + imgBase64};
                i += 12 + payloadLength;
            } else if (assetType === 2) {
                // audio
                const payloadLengthBase32 = String.fromCharCode.apply(null, buf.slice(i + 2, i + 12));
                const payloadLength = parseInt(payloadLengthBase32, 36);
                const payloadKeyRaw = buf.slice(i + 12, i + 12 + 32);
                const payloadData = buf.slice(i + 12 + 32, i + 12 +  payloadLength);
                const payloadKey = String.fromCharCode.apply(null, payloadKeyRaw.filter(k => k)); 
                if (!audioCtx) {
                    gameAssets[payloadKey] = {"type": "audio", "data": payloadData.buffer, "decoded": false};
                } else {
                      audioCtx.decodeAudioData(payloadData.buffer, (buffer) => {
                        gameAssets[payloadKey] = {"type": "audio", "data": buffer, "decoded": true};
                    }, (err) => {
                        console.log('unable to decode audio data');
                        console.log(err);
                    });
                }

                i += 12 + payloadLength;
            } else if (assetType === 3) {
                // font
                const payloadLengthBase32 = String.fromCharCode.apply(null, buf.slice(i + 2, i + 12));
                const payloadLength = parseInt(payloadLengthBase32, 36);
                const payloadKeyRaw = buf.slice(i + 12, i + 12 + 32);
                const payloadData = buf.slice(i + 12 + 32, i + 12 +  payloadLength);
                const payloadKey = String.fromCharCode.apply(null, payloadKeyRaw.filter(k => k)); 
                
                const font = new FontFace(payloadKey, payloadData);

                if (font) {
                    font.load().then((loadedFont) => {
                        document.fonts.add(loadedFont);
                        gameAssets[payloadKey] = { "type": "font", "data": loadedFont, "name": payloadKey }
                    });
                }
                i += 12 + payloadLength;
            } else {
                console.error('Unknown asset type: ' + assetType);
            }
        }
    }
    // console.log(gameAssets)
}

let thingIndices = [];

function renderBuf(buf) {
    const soundsToStop = new Set(Object.keys(playingSounds));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let i = 0;
    thingIndices = [];
    
    while (buf && i < buf.length) {
        const frameType = buf[i];

        const frameSize = window.squishVersion === '0750' || window.squishVersion === '0751' ? buf[i + 1] : buf[i + 1] + buf[i+2] + buf[i+3];

        let thing = unsquish(buf.slice(i, i + frameSize)).node;

        console.log('thing!');
        console.log(thing);
        if (!thing.coordinates2d && thing.input && thing.text) {
            const maxTextSize = Math.floor(canvas.width);
            const fontSize = (thing.text.size / 100) * maxTextSize;
            ctx.font = fontSize + "px sans-serif";

            const textInfo = ctx.measureText(thing.text.text);
            let textStartX = thing.text.x * canvas.width / 100;
            
            if (thing.text.align && thing.text.align == 'center') {
                textStartX -= textInfo.width / 2;
            }

            textStartX = textStartX / canvas.width * 100;
            const textHeight = textInfo.actualBoundingBoxDescent - textInfo.actualBoundingBoxAscent;
            const textWidthPercent = textInfo.width / canvas.width * 100;
            const textHeightPercent = textHeight / canvas.height * 100;

            const clickableChunk = [
                !!thing.handleClick,
                thing.input && thing.input.type,
                thing.id,
                [textStartX, thing.text.y, textStartX + textWidthPercent, thing.text.y, textStartX + textWidthPercent, thing.text.y + textHeightPercent, textStartX, thing.text.y + textHeightPercent, textStartX, thing.text.y]
            ];
            thingIndices.push(clickableChunk);
        } else if (thing.coordinates2d !== null && thing.coordinates2d !== undefined) {// && thing.flll !== null) {
            const clickableChunk = [
                !!thing.handleClick,
                thing.input && thing.input.type,
                thing.id,
                thing.coordinates2d
            ];

            thingIndices.push(clickableChunk);

            if (thing.effects && thing.effects.shadow) {
                const shadowColor = thing.effects.shadow.color;
                ctx.shadowColor = "rgba(" + shadowColor[0] + "," + shadowColor[1] + "," + shadowColor[2] + "," + shadowColor[3] + ")";
                if (thing.effects.shadow.blur) {
                    ctx.shadowBlur = thing.effects.shadow.blur;
                }
            }

            if (thing.color) {
                ctx.globalAlpha = thing.color[3] / 255;
            }
            if (thing.fill !== null && thing.fill !== undefined) {
                ctx.fillStyle = "rgba(" + thing.fill[0] + "," + thing.fill[1] + "," + thing.fill[2] + "," + thing.fill[3] + ")";
            }
            if (thing.border !== undefined && thing.border !== null) {
                ctx.lineWidth = (thing.border / 255) * .1 * canvas.width;
                ctx.strokeStyle = "rgba(" + thing.color[0] + "," + thing.color[1] + "," + thing.color[2] + "," + thing.color[3] + ")";
            } 

            if (thing.coordinates2d !== null && thing.coordinates2d !== undefined) {
                ctx.beginPath();
                
                const firstPoint = thing.coordinates2d[0];
                ctx.moveTo(firstPoint[0] * canvas.width / 100, firstPoint[1] * canvas.height / 100);
                for (let i = 1; i < thing.coordinates2d.length; i++) {
                    const curPoint = thing.coordinates2d[i];
                    ctx.lineTo(canvas.width / 100 * curPoint[0], curPoint[1] * canvas.height / 100);
                }
    
                if (thing.fill !== undefined && thing.fill !== null) {
                    ctx.fill();
                }
    
                if (thing.border !== undefined && thing.border !== null) {
                    ctx.stroke();
                }
            }
            ctx.shadowColor = null;
            ctx.shadowBlur = 0;
            ctx.lineWidth = 0;
            ctx.strokeStyle = null;
        }

        if (thing.text) {
            ctx.globalAlpha = thing.text.color[3] / 255;
            ctx.fillStyle = `rgba(${thing.text.color[0]}, ${thing.text.color[1]}, ${thing.text.color[2]}, ${thing.text.color[3]})`;
            const maxTextSize = Math.floor(canvas.width);
            const fontSize = (thing.text.size / 100) * maxTextSize;
            ctx.font = fontSize + "px " + (!thing.text.font || thing.text.font === 'default' ? "sans-serif" : thing.text.font);
            if (thing.text.align) {
                ctx.textAlign = thing.text.align;
            }
            ctx.textBaseline = "top";
            ctx.fillText(thing.text.text, thing.text.x * canvas.width/ 100, thing.text.y * canvas.height / 100);
        }

        if (thing.asset) {
            const assetKey = Object.keys(thing.asset)[0];

            if (gameAssets[assetKey] && gameAssets[assetKey]["type"] === "audio") {
                if (!playingSounds[assetKey] && audioCtx && gameAssets[assetKey].decoded) {
                    source = audioCtx.createBufferSource();
                    source.connect(audioCtx.destination);
                    source.buffer = gameAssets[assetKey].data;
                    source.onended = () => {
                        delete playingSounds[assetKey];
                    }

                    source.start(0, thing.asset[assetKey].startTime  || 0);//? thing.asset[assetKey].startTime / 1000 : 0);
                    playingSounds[assetKey] = source;
                } else if (!playingSounds[assetKey] && audioCtx) {
                    console.warn("Cant play audio");
                } else if (playingSounds[assetKey]) {
                    // pause unless still referenced
                    soundsToStop.delete(assetKey);
                }
            } else {
                const asset = thing.asset[assetKey];
                let image;

                if (imageCache[assetKey] && imageCache[assetKey] !== 'loading') {
                    image = imageCache[assetKey];
                    image.width = asset.size.x / 100 * canvas.width;
                    image.height = asset.size.y / 100 * canvas.height;
                    if (thing.effects && thing.effects.shadow) {
                        const shadowColor = thing.effects.shadow.color;
                        ctx.shadowColor = "rgba(" + shadowColor[0] + "," + shadowColor[1] + "," + shadowColor[2] + "," + shadowColor[3] + ")";
                        if (thing.effects.shadow.blur) {
                            ctx.shadowBlur = thing.effects.shadow.blur;
                        }
                    }


                    ctx.drawImage(image, (asset.pos.x / 100) * canvas.width, 
                        (asset.pos.y / 100) * canvas.height, image.width, image.height);
                } else if (!imageCache[assetKey]) {
                    image = new Image(asset.size.x / 100 * canvas.width, asset.size.y / 100 * canvas.height);
                    imageCache[assetKey] = 'loading';
                    image.onload = () => {
                        imageCache[assetKey] = image;
                        if (thing.effects && thing.effects.shadow) {
                            const shadowColor = thing.effects.shadow.color;
                            ctx.shadowColor = "rgba(" + shadowColor[0] + "," + shadowColor[1] + "," + shadowColor[2] + "," + shadowColor[3] + ")";
                            if (thing.effects.shadow.blur) {
                                ctx.shadowBlur = thing.effects.shadow.blur;
                            }
                        }

                        ctx.drawImage(image, (asset.pos.x / 100) * canvas.width, 
                            (asset.pos.y / 100) * canvas.height, image.width, image.height);
                    };

                    if (gameAssets[assetKey]) {
                        image.src = gameAssets[assetKey].data;
                    }
                }
            }

        }

        i += frameSize;
            ctx.shadowColor = null;
            ctx.shadowBlur = 0;
            ctx.lineWidth = 0;
            ctx.strokeStyle = null;
 

        ctx.globalAlpha = 1;
    }

    soundsToStop.forEach(assetKey => {
        const source = playingSounds[assetKey];
        source.stop();
    });
 
}

let gamepads;

let clickStopper;

const updateGamepads = () => {
    gamepads = hp.getGamepads();
}

window.addEventListener('gamepadconnected', updateGamepads);
window.addEventListener('gamepaddisconnected', updateGamepads);

function req() {
    if (!rendering) {
        return;
    }

    currentBuf && currentBuf.length > 1 && currentBuf[0] == 3 && renderBuf(currentBuf);

    window.requestAnimationFrame(req);
}

