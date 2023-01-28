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

canvas.height = 500;
canvas.width = 500;

const fileInputDiv = document.getElementById('file-input');
fileInputDiv.style.display = 'block';

const frameSelectorDiv = document.getElementById('frame-selector');
frameSelectorDiv.style.display = 'block';

const fileInfoDiv = document.getElementById('file-info');
fileInfoDiv.style.display = 'block';

const clearChildren = (el) => {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
};

const renderFileInfo = (fileInfo, onPlayerIdChange, onPlay) => {
    clearChildren(fileInfoDiv);
    const container = document.createElement('div');

    const playButton = document.createElement('div');
    playButton.innerHTML = 'Play';
    playButton.onclick = () => onPlay();

    const frameCountDiv = document.createElement('div');
    const sessionLengthDiv = document.createElement('div');
    const playerIdSelector = document.createElement('select');
    playerIdSelector.value = window.playerId;

    const playerIdLabel = document.createElement('div');
    playerIdLabel.innerHTML = 'Player ID: ';

    const idOptions = new Set(fileInfo.playerIds);
    // TODO: add this back. we dont always have spectator frames available.
    // game session should make this easily available? if its recording, 
    // it should always be saving spectator frames
    // idOptions.add('Spectator');

    for (const pId of idOptions) {
        const playerIdOption = document.createElement('option');
        playerIdOption.value = pId === 'Spectator' ? 0 : pId;
        playerIdOption.innerHTML = pId;

        playerIdSelector.appendChild(playerIdOption);
    };

    playerIdSelector.onchange = (e) => {
        window.playerId = Number(e.target.value);
        onPlayerIdChange(e.target.value);
    }

    frameCountDiv.innerHTML = 'Frames: ' + fileInfo?.frameCount;

    // const sessionLength = fileInfo?.frameCount > 2 ? () : 0;
    sessionLengthDiv.innerHTML = 'Length: ' + fileInfo?.sessionLength + ' ms';

    const assetListDiv = document.createElement('div');
    assetListDiv.innerHTML = 'Assets';

    container.appendChild(frameCountDiv);
    container.appendChild(sessionLengthDiv);

    container.appendChild(playerIdLabel);
    container.appendChild(playerIdSelector);
    container.appendChild(playButton);

    // todo: fix global
    if (gameAssets) {
        for (const assetKey in gameAssets) {
            const assetEntry = document.createElement('div');
            assetEntry.innerHTML = assetKey + ' (' + gameAssets[assetKey].type + ')';
            assetListDiv.appendChild(assetEntry);
        }

        container.appendChild(assetListDiv);
    }

    fileInfoDiv.appendChild(container);
}

fileInputDiv.oninput = (e) => {
    // console.log('fiiele');
    // console.log(e);
    if (!e?.target?.files?.length) {
        return;
    }

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

        const seenPlayerIds = new Set();
        parsedData.data.forEach(d => {
            // console.log(d.data);
            d.data.forEach(f => {
                const unsquished = unsquish(f);
                // console.log('just unsquished!');
                // console.log(unsquished);
                if (unsquished?.node?.playerIds?.length > 0) { 
                    // console.log('has player ids');
                    // console.log();
                    unsquished.node.playerIds.forEach(id => seenPlayerIds.add(id));
                }
            });
            
        });

        console.log('seen player ids');
        console.log(seenPlayerIds)

        const fileInfo = {
            assets: parsedData.assets,
            frameCount: parsedData.data.length,
            playerIds: seenPlayerIds,
            sessionLength: parsedData.data.length > 1 ? (parsedData.data[parsedData.data.length - 1].timestamp - parsedData.data[0].timestamp ) : 0
        };

        const startWith3 = parsedData.data.filter(d => d.data[0][0] === 3);

        let currentFrame = 0;

        const onPlayerIdChange = () => {
            playing = false;
            renderBuf(startWith3[currentFrame].data.flat());
        };

        let playing = false;
        const startPlay = () => {
            const hasNextFrame = currentFrame + 1 < startWith3.length;
            if (hasNextFrame && playing) {
                const timeDiff = startWith3[currentFrame + 1].timestamp - startWith3[currentFrame].timestamp;
                setTimeout(() => {
                    currentFrame++;
                    frameSelectorDiv.value = currentFrame + 1;
                    renderBuf(startWith3[currentFrame].data.flat());
                    startPlay();
                }, timeDiff);
            } else {
                playing = false;
            }
        }

        const onPlay = () => {
            playing = true;
            startPlay();
        }

        renderFileInfo(fileInfo, onPlayerIdChange, onPlay);
        // console.log('how many things in this ');
        // console.log(parsedData.data.length);
        // console.log('start with 3 ' + startWith3.length);

        // renderBuf(startWith3[0].data[0].flat());
        
        frameSelectorDiv.value = 1;
        frameSelectorDiv.min = 1;
        frameSelectorDiv.max = startWith3.length;

        frameSelectorDiv.oninput = () => {
            // console.log('input!');
            // console.log(frameSelectorDiv.value);
            if (startWith3[Number(frameSelectorDiv.value - 1)]) {
                playing = false;
                currentFrame = Number(frameSelectorDiv.value) - 1;
                renderBuf(startWith3[currentFrame].data.flat());
            }
        };

        renderBuf(startWith3[currentFrame].data.flat());
        
        // for (let i = 0; i < parsedData.data.length; i++) {
        //     renderBuf(startWith3[i].data.flat());
        //     setTimeout(() => {
        //         console.log('doing it agina!')
        //     }, 1500);
        // }
        // // renderBuf(parsedData.data[17].data.flat());
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
window.playerId = 1;

function renderBuf(buf) {
    const soundsToStop = new Set(Object.keys(playingSounds));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let i = 0;
    thingIndices = [];
    let shouldRender = true;
    
    while (buf && i < buf.length) {
        const frameType = buf[i];

        const frameSize = window.squishVersion === '0750' || window.squishVersion === '0751' ? buf[i + 1] : buf[i + 1] + buf[i+2] + buf[i+3];

        let thing = unsquish(buf.slice(i, i + frameSize)).node;

        // console.log('thing!');
        // console.log(thing);

        // if (!thing.playerIds || thing.playerIds.length == 0) {
        //     visibleToMe = true;
        // } else 
        // if (thing.playerIds && thing.playerIds.length && thing.playerIds.indexOf(window.playerId) >= 0) {
        //     visibleToMe = true;
        // } 
        // else {
        //     visibleToMe = false;
        // }

        // if we hit a node with player ids and it doesnt include mine, dont render until thats not true

        if (thing.playerIds && thing.playerIds.length && thing.playerIds.indexOf(window.playerId) < 0) {
            shouldRender = false;
            console.log('this isnt for me?');
            console.log(thing);
        }

        if (thing.playerIds && thing.playerIds.indexOf(window.playerId) >= 0) {
            shouldRender = true;
        }

        if (!shouldRender) {
            console.log("NOT FOR ME!");
            console.log('nofdsdf');
            console.log(thing);
        } else {
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


// const aspectRatioX = 16//currentBuf[2];
// const aspectRatioY = 9;//currentBuf[3];
// aspectRatio = {x: aspectRatioX, y: aspectRatioY};
// initCanvas();
// const fakeData = [[3,0,0,53,2,43,0,11,0,0,45,5,16,38,85,5,44,0,3,53,0,7,0,0,0,255,55,0,4,3,52,0,23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[3,0,0,53,2,43,0,11,0,0,75,21,92,48,30,76,44,0,3,53,0,7,0,0,0,255,55,0,4,3,52,0,23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[3,0,0,80,1,43,0,11,0,0,66,87,57,45,32,9,44,0,4,1,48,0,18,0,0,0,0,100,0,100,0,0,0,102,114,97,109,101,49,0,15,115,104,97,100,111,119,26,26,26,255,0,5,55,0,4,1,52,0,23,0,0,0,0,100,0,0,0,100,0,100,0,0,0,100,0,0,0,0,0],[3,0,0,128,3,43,0,11,0,0,26,93,42,16,49,42,44,0,4,1,47,0,104,75,0,1,0,1,56,241,112,112,255,18,0,0,99,0,1,1,0,1,10,0,1,16,0,1,1,0,1,14,0,1,4,0,1,11,0,1,9,0,1,1,0,1,3,0,0,97,0,1,9,0,1,1,0,1,15,0,0,46,0,1,8,0,1,5,0,1,10,0,1,7,0,0,32,0,0,32,0,0,32,0,0,68,0,0,32,0,0,50,0,0,32,0,0,57,0,0,32,0,0,50,55,0,4,2],[3,0,0,73,2,43,0,11,0,0,26,53,44,86,48,80,44,0,4,1,53,0,7,148,210,230,255,49,0,15,115,104,97,100,111,119,26,26,26,255,1,0,50,0,4,1,55,0,4,3,52,0,23,42.5,50,0.25,25,57.5,50,0.25,25,57.5,50,4.75,75,42.5,50,4.75,75,42.5,50,0.25,25],[3,0,0,95,3,43,0,11,0,0,82,0,83,24,84,63,44,0,4,1,47,0,71,50,0,1,50,1,13,26,26,26,255,18,0,0,99,0,1,1,0,1,10,0,1,16,0,1,1,0,1,14,0,1,12,0,1,1,0,1,12,0,1,12,0,1,1,0,1,14,0,0,32,0,1,19,0,0,97,0,1,2,0,1,2,0,1,8,0,1,1,55,0,4,2],[3,0,0,58,2,43,0,11,0,0,18,96,54,16,47,79,44,0,4,1,53,0,7,255,247,143,255,50,0,4,1,55,0,4,3,52,0,23,10,0,0,0,25,0,0,0,25,0,5,0,10,0,5,0,10,0,0,0],[3,0,0,80,3,43,0,11,0,0,74,72,20,11,97,14,44,0,4,1,47,0,56,17,50,1,50,1,27,26,26,26,255,18,0,0,99,0,1,1,0,1,10,0,1,16,0,1,1,0,1,14,0,0,83,0,1,12,0,1,1,0,0,99,0,1,16,0,0,97,0,1,16,0,1,1,55,0,4,2],[3,0,0,78,1,43,0,11,0,0,49,46,83,82,82,52,44,0,3,48,0,28,45,22,94,50,9,56,5,0,0,0,108,111,103,111,45,104,111,114,105,122,111,110,116,97,108,50,0,4,1,55,0,4,1,52,0,23,45.21875,22,94.5,50,54.78125,78,94.5,50,54.78125,78,99.5,50,45.21875,22,99.5,50,45.21875,22,94.5,50],[3,0,0,57,2,43,0,11,0,0,31,61,41,81,57,79,44,0,3,53,0,7,0,128,128,255,50,0,4,1,55,0,4,3,52,0,23,7.5,50,7.5,50,92.5,50,7.5,50,92.5,50,92.5,50,7.5,50,92.5,50,7.5,50,7.5,50],[3,0,0,57,2,43,0,11,0,0,74,87,56,72,53,55,44,0,3,53,0,7,0,255,255,255,50,0,4,1,55,0,4,3,52,0,23,8.35,35,8.35,35,91.64999999999999,65,8.35,35,91.64999999999999,65,91.64999999999999,65,8.35,35,91.64999999999999,65,8.35,35,8.35,35],[3,0,0,57,2,43,0,11,0,0,36,65,37,83,48,9,44,0,3,53,0,7,76,163,221,255,50,0,4,1,55,0,4,3,52,0,23,10.05,5,10.05,5,89.95,95,10.05,5,89.95,95,89.95,95,10.05,5,89.95,95,10.05,5,10.05,5],[3,0,0,57,2,43,0,11,0,0,72,70,52,13,61,40,44,0,3,53,0,7,14,47,68,255,50,0,4,1,55,0,4,3,52,0,23,11.75,75,11.75,75,88.25,25,11.75,75,88.25,25,88.25,25,11.75,75,88.25,25,11.75,75,11.75,75],[3,0,0,57,2,43,0,11,0,0,42,68,52,69,41,3,44,0,3,53,0,7,102,0,102,255,50,0,4,1,55,0,4,3,52,0,23,13.45,45,13.45,45,86.55,55,13.45,45,86.55,55,86.55,55,13.45,45,86.55,55,13.45,45,13.45,45],[3,0,0,57,2,43,0,11,0,0,50,54,36,62,70,3,44,0,3,53,0,7,255,255,0,255,50,0,4,1,55,0,4,3,52,0,23,15.149999999999999,15,15.149999999999999,15,84.85,85,15.149999999999999,15,84.85,85,84.85,85,15.149999999999999,15,84.85,85,15.149999999999999,15,15.149999999999999,15],[3,0,0,57,2,43,0,11,0,0,55,42,26,31,81,58,44,0,3,53,0,7,245,245,245,255,50,0,4,1,55,0,4,3,52,0,23,16.85,85,16.85,85,83.14999999999999,15,16.85,85,83.14999999999999,15,83.14999999999999,15,16.85,85,83.14999999999999,15,16.85,85,16.85,85],[3,0,0,57,2,43,0,11,0,0,39,52,42,42,10,71,44,0,3,53,0,7,192,214,228,255,50,0,4,1,55,0,4,3,52,0,23,18.549999999999997,55,18.549999999999997,55,81.45,45,18.549999999999997,55,81.45,45,81.45,45,18.549999999999997,55,81.45,45,18.549999999999997,55,18.549999999999997,55],[3,0,0,57,2,43,0,11,0,0,67,37,34,75,9,26,44,0,3,53,0,7,255,64,64,255,50,0,4,1,55,0,4,3,52,0,23,20.25,25,20.25,25,79.75,75,20.25,25,79.75,75,79.75,75,20.25,25,79.75,75,20.25,25,20.25,25],[3,0,0,57,2,43,0,11,0,0,87,44,48,8,31,82,44,0,3,53,0,7,70,132,153,255,50,0,4,1,55,0,4,3,52,0,23,21.95,95,21.95,95,78.05,5,21.95,95,78.05,5,78.05,5,21.95,95,78.05,5,21.95,95,21.95,95],[3,0,0,64,2,43,0,11,0,0,20,36,16,87,9,76,42,0,7,87,102,117,255,44,0,3,53,0,7,87,102,117,255,50,0,4,1,55,0,4,3,52,0,23,23.65,65,23.65,65,76.35,35,23.65,65,76.35,35,76.35,35,23.65,65,76.35,35,23.65,65,23.65,65],[3,0,0,64,2,43,0,11,0,0,23,80,49,38,29,77,42,0,7,255,128,237,255,44,0,3,53,0,7,255,128,237,255,50,0,4,1,55,0,4,3,52,0,23,25.349999999999998,35,25.349999999999998,35,74.64999999999999,65,25.349999999999998,35,74.64999999999999,65,74.64999999999999,65,25.349999999999998,35,74.64999999999999,65,25.349999999999998,35,25.349999999999998,35],[3,0,0,57,2,43,0,11,0,0,72,3,41,91,21,0,44,0,3,53,0,7,192,192,192,255,50,0,4,1,55,0,4,3,52,0,23,27.05,5,27.05,5,72.95,95,27.05,5,72.95,95,72.95,95,27.05,5,72.95,95,27.05,5,27.05,5],[3,0,0,64,2,43,0,11,0,0,80,56,54,11,90,18,42,0,7,204,255,0,255,44,0,3,53,0,7,204,255,0,255,50,0,4,1,55,0,4,3,52,0,23,28.75,75,28.75,75,71.25,25,28.75,75,71.25,25,71.25,25,28.75,75,71.25,25,28.75,75,28.75,75],[3,0,0,64,2,43,0,11,0,0,46,92,67,71,65,32,42,0,7,186,218,85,255,44,0,3,53,0,7,186,218,85,255,50,0,4,1,55,0,4,3,52,0,23,30.45,45,30.45,45,69.55,55,30.45,45,69.55,55,69.55,55,30.45,45,69.55,55,30.45,45,30.45,45],[3,0,0,64,2,43,0,11,0,0,23,50,48,70,51,90,42,0,7,192,192,192,255,44,0,3,53,0,7,192,192,192,255,50,0,4,1,55,0,4,3,52,0,23,32.15,15,32.15,15,67.85,85,32.15,15,67.85,85,67.85,85,32.15,15,67.85,85,32.15,15,32.15,15],[3,0,0,64,2,43,0,11,0,0,79,98,48,92,77,52,42,0,7,138,43,226,255,44,0,3,53,0,7,138,43,226,255,50,0,4,1,55,0,4,3,52,0,23,33.849999999999994,85,33.849999999999994,85,66.15,15,33.849999999999994,85,66.15,15,66.15,15,33.849999999999994,85,66.15,15,33.849999999999994,85,33.849999999999994,85],[3,0,0,57,2,43,0,11,0,0,30,19,42,11,92,34,44,0,3,53,0,7,255,0,255,255,50,0,4,1,55,0,4,3,52,0,23,35.55,55,35.55,55,64.44999999999999,45,35.55,55,64.44999999999999,45,64.44999999999999,45,35.55,55,64.44999999999999,45,35.55,55,35.55,55],[3,0,0,64,2,43,0,11,0,0,43,45,85,63,34,95,42,0,7,192,192,192,255,44,0,3,53,0,7,192,192,192,255,50,0,4,1,55,0,4,3,52,0,23,37.25,25,37.25,25,62.75,75,37.25,25,62.75,75,62.75,75,37.25,25,62.75,75,37.25,25,37.25,25],[3,0,0,64,2,43,0,11,0,0,78,89,89,83,82,89,42,0,7,227,151,17,255,44,0,3,53,0,7,227,151,17,255,50,0,4,1,55,0,4,3,52,0,23,38.95,95,38.95,95,61.05,5,38.95,95,61.05,5,61.05,5,38.95,95,61.05,5,38.95,95,38.95,95],[3,0,0,64,2,43,0,11,0,0,43,91,99,44,20,15,42,0,7,220,237,193,255,44,0,3,53,0,7,220,237,193,255,50,0,4,1,55,0,4,3,52,0,23,40.65,65,40.65,65,59.35,35,40.65,65,59.35,35,59.35,35,40.65,65,59.35,35,40.65,65,40.65,65],[3,0,0,57,2,43,0,11,0,0,87,3,31,52,67,74,44,0,3,53,0,7,255,218,185,255,50,0,4,1,55,0,4,3,52,0,23,42.35,35,42.35,35,57.65,65,42.35,35,57.65,65,57.65,65,42.35,35,57.65,65,42.35,35,42.35,35],[3,0,0,64,2,43,0,11,0,0,80,98,93,25,14,21,42,0,7,14,47,68,255,44,0,3,53,0,7,14,47,68,255,50,0,4,1,55,0,4,3,52,0,23,44.05,5,44.05,5,55.949999999999996,95,44.05,5,55.949999999999996,95,55.949999999999996,95,44.05,5,55.949999999999996,95,44.05,5,44.05,5],[3,0,0,64,2,43,0,11,0,0,18,9,99,7,54,5,42,0,7,255,255,102,255,44,0,3,53,0,7,255,255,102,255,50,0,4,1,55,0,4,3,52,0,23,45.75,75,45.75,75,54.25,25,45.75,75,54.25,25,54.25,25,45.75,75,54.25,25,45.75,75,45.75,75],[3,0,0,57,2,43,0,11,0,0,33,1,99,89,36,80,44,0,3,53,0,7,145,97,11,255,50,0,4,1,55,0,4,3,52,0,23,47.449999999999996,45,47.449999999999996,45,52.55,55,47.449999999999996,45,52.55,55,52.55,55,47.449999999999996,45,52.55,55,47.449999999999996,45,47.449999999999996,45],[3,0,0,64,2,43,0,11,0,0,16,61,62,82,92,88,42,0,7,105,105,102,255,44,0,3,53,0,7,105,105,102,255,50,0,4,1,55,0,4,3,52,0,23,49.15,15,49.15,15,50.85,85,49.15,15,50.85,85,50.85,85,49.15,15,50.85,85,49.15,15,49.15,15],[3,0,0,53,2,43,0,11,0,0,24,26,35,96,71,7,44,0,3,53,0,7,0,0,0,255,55,0,4,3,52,0,23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]].flat();//[3,0,0,57,2,43,0,11,0,0,36,65,37,83,48,9,44,0,3,53,0,7,76,163,221,255,50,0,4,1,55,0,4,3,52,0,23,10.05,5,10.05,5,89.95,95,10.05,5,89.95,95,89.95,95,10.05,5,89.95,95,10.05,5,10.05,5];
// renderBuf(fakeData);