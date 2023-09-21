const { Homepad } = require('homepad');
const hp = new Homepad();


// if creating an electron build, these should all point to a version that works with electron. if not, these can be the proper referenced versions
const squishMap = {
    '0756': require('squish-0756'),
    '0762': require('squish-0762'),
    '0765': require('squish-0765'),
    '0766': require('squish-0766'),
    '0767': require('squish-0767'),
    '1000': require('squish-1000'),
    '1004': require('squish-1004')
};

//let { squish, unsquish, Colors } = require('squishjs');
let { squish, unsquish, Colors } = squishMap['0766'];

let bezelInfo;

Colors = Colors.COLORS;

const socketWorker = new Worker('socket.js');
const canvas = document.getElementById("game");

const playingSounds = {};
let currentBuf;

let rendering = false;

let aspectRatio;

let mousePos;
let clientWidth;

let spectating;

let hotClient;

let performanceProfiling;
let performanceData = [];

const getConfig = () => new Promise((resolve, reject) => {
    fetch('/config.json').then(response => {
        response.json().then(responseJson => {
            resolve(responseJson);
        });
    });
});

const showErrorDiv = (childDiv) => {
	const errorDiv = document.createElement('div');
	errorDiv.style.position = 'absolute';
	errorDiv.style.width = '100vw;';
	errorDiv.style.top = '0';
	errorDiv.style['text-align'] = 'center';
	errorDiv.style['font-size'] = '10vw';

	errorDiv.appendChild(childDiv);
	document.body.appendChild(errorDiv);
};


getConfig().then(config => {
    const HOME_PORT = config.HOME_PORT || 7001;

    if (!!config.PUBLIC_CLIENT) {
	    const urlParams = new URLSearchParams(window.location.search);
	    const code = urlParams.get('code');
	    if (code) {
		const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
            	window.history.pushState({path: newUrl}, '', newUrl);
	    }
	    window.serverCode = code ? code.toUpperCase() : window.prompt('Enter server code').toUpperCase();
    }

    const performanceDiv = document.getElementById('performance-data');
    
    const getClientInfo = () => {
        // s/o to Abdessalam Benharira - https://dev.to/itsabdessalam/detect-current-device-type-with-javascript-490j
        const userAgent = navigator.userAgent;
    
        const info = {};
    
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
            info.deviceType = "tablet";
        } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
            info.deviceType = "mobile";
        } else if (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) {
            info.deviceType = "tablet";
        } else { 
            info.deviceType = "desktop";
        }
    
        const _clientWidth = window.innerWidth;
        const _clientHeight = window.innerHeight;
    
        let aspectRatio = null;
    
        if (_clientWidth && _clientHeight) {
            aspectRatio = _clientWidth / _clientHeight;
        }
    
        info.aspectRatio = aspectRatio;
    
        return info;
    };
    
    const sendClientInfo = () => {
        const clientInfo = getClientInfo();
        const initData = {
            clientInfo
        }
        
        const searchParams = new URLSearchParams(window.location.search);
        // init with a specific game if the url contains a game parameter
        if (searchParams.get('gameId') && searchParams.get('versionId')) {
            const gameId = searchParams.get('gameId');
            const versionId = searchParams.get('versionId');
            const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
            window.history.pushState({path: newUrl}, '', newUrl);
            initData.requestedGame = {gameId, versionId};
        }
    
        socketWorker.postMessage(initData);
    };
    
    socketWorker.onmessage = (socketMessage) => {
        if (socketMessage.data.constructor === Object) {
            if (socketMessage.data.type === 'SOCKET_CLOSE') {
                rendering = false;
            }

	    if (socketMessage.data.type === 'ERROR') {
		rendering = false;
		const childDiv = document.createElement('div');
		const textChildDiv = document.createElement('div');
		textChildDiv.innerHTML = 'Error: ' + socketMessage.data.message;    
		const linkDiv = document.createElement('a');
		linkDiv.href = 'https://public.homegames.link/code';
		linkDiv.innerHTML = "Try again";
		childDiv.appendChild(textChildDiv);
		childDiv.appendChild(linkDiv);
		showErrorDiv(childDiv);
	    }
        } else {
            currentBuf = new Uint8ClampedArray(socketMessage.data);
            if (currentBuf[0] == 2) {
                window.playerId = currentBuf[1];
		if (currentBuf.length == 2) {
            		socketWorker.postMessage({type: 'finishReady', playerId: window.playerId });
		}
		if (currentBuf.length > 2) {
                 	 const aspectRatioX = currentBuf[2];
                 	 const aspectRatioY = currentBuf[3];
                 	 aspectRatio = {x: aspectRatioX, y: aspectRatioY};
    
                 	 bezelInfo = {x: currentBuf[4], y: currentBuf[5]};
    
                 	 const squishVersionLength = currentBuf[6];
                 	 const squishVersionString = String.fromCharCode.apply(null, currentBuf.slice(7, 7 + currentBuf[6]));
                 	 window.squishVersion = squishVersionString;
                 	const squishVersion = squishMap[squishVersionString];
                 	if (squishVersion) {
                 	    squish = squishVersion.squish;
                 	    unsquish = squishVersion.unsquish;
                 	    Colors = squishVersion.Colors;
                 	 }
                 	 initCanvas();
		}
            } else if (currentBuf[0] == 1) {
                storeAssets(currentBuf);
            } else if (currentBuf[0] == 9) {
                // for now i know its just aspectRatio
                aspectRatio = {x: currentBuf[1], y: currentBuf[2]};
                initCanvas();
            } else if (currentBuf[0] === 5) {
                spectating = false;
                let a = String(currentBuf[1]);
                let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
                let newPort = a + b;
     		const hostname2 = window.serverCode ? 'public.homegames.link' : window.location.hostname;
    		const socketPort2 = window.serverCode ? 82 : newPort;
    
                socketWorker.postMessage({
                    socketInfo: {
                        hostname: hostname2,//window.location.hostname,
                        playerId: window.playerId || null,
                        port: Number(socketPort2),
                        secure: window.location.host !== 'localhost' && window.isSecureContext,
            		serverCode: window.serverCode,
			spectating
                    }
                });
    
            } else if (currentBuf[0] === 6) {
                spectating = true;
                let a = String(currentBuf[1]);
                let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
                let newPort = a + b;
    
    		const hostname2 = window.serverCode ? 'public.homegames.link' : window.location.hostname;
    		const socketPort2 = window.serverCode ? 82 : newPort;
                socketWorker.postMessage({
                    socketInfo: {
                        hostname: hostname2,// window.location.hostname,
                        playerId: window.playerId || null,
                        port: Number(socketPort2),
                        secure: window.location.host !== 'localhost' && window.isSecureContext,
            		serverCode: window.serverCode,
                        spectating
                    }
                });
    
            } else if (currentBuf[0] === 7) {
                initPerformance();
            } else if (currentBuf[0] === 8) { 
                let a = String(currentBuf[1]);
                let b = String(currentBuf[2]).length > 1 ? currentBuf[2] : "0" + currentBuf[2];
                let newPort = a + b;
    
                if (!hotClient) {
                    const hostname = window.location.hostname;
                    hotClient = new WebSocket(`wss://${hostname}:${newPort}`);
                    hotClient.onopen = () => {
                        console.log('hot client opened');
                    }
    
                    hotClient.onerror = (err) => {
                        console.log('hot client err');
                        console.log(err);
                    }
    
                    hotClient.onmessage = (msg) => {
                        if (msg.data === 'reload') {
                            location.reload();
                        }
                    }
                }
            } else if (currentBuf[0] == 3 && !rendering) {
                rendering = true;
                req();
            }
        }
    };
    
    const avgGraph = document.createElement('canvas');
    const lastNGraph = document.createElement('canvas');
    
    const avgGraphLabel = document.createElement('h3');
    const lastNGraphLabel = document.createElement('h3');
    
    const initPerformance = () => {
        if (!performanceProfiling) {
            performanceProfiling = true;
    
            const div1 = document.createElement('div');
            const div2 = document.createElement('div');
    
            div1.style = 'float: left; margin-right: 50px';
            div2.style = 'float: left';
    
            div1.appendChild(avgGraph);
            div2.appendChild(lastNGraph);
    
            performanceDiv.appendChild(div1);
            div1.appendChild(avgGraphLabel);
    
            performanceDiv.appendChild(div2);
            div2.appendChild(lastNGraphLabel);
        }
    };

    const hostname = window.serverCode ? 'public.homegames.link' : window.location.hostname;
    const socketPort = window.serverCode ? 82 : HOME_PORT;
    
    socketWorker.postMessage({
        socketInfo: {
            hostname,
            playerId: window.playerId || null,
            port: socketPort,
            secure: window.location.host !== 'localhost' && window.isSecureContext,
            serverCode: window.serverCode
        }
    });
    
    sendClientInfo();
})

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

    if (performanceProfiling) { 
        performanceData.push({start: Date.now()});
    }

    Object.keys(keysDown).filter(k => keysDown[k]).forEach(k => keydown(k));

    const activeGamepads = gamepads;

    if (gamepads && gamepads.length) {
        gamepads.forEach((gamepad) => {
            sendGamepadState(hp.getGamepadState(gamepad.index));
        });
    } 

    if (mousePos) {
        const clickInfo = canClick(mousePos[0], mousePos[1]);//e.clientX, e.clientY);

        if (mouseDown && !clickStopper) {
            click(clickInfo);
            clickStopper = setTimeout(() => {
                clickStopper = null;
            }, 30);
        }


        if (clickInfo.isClickable || clickInfo.action) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'initial';
        }

        mousePos = null;
    }

    currentBuf && currentBuf.length > 1 && currentBuf[0] == 3 && renderBuf(currentBuf);

    if (performanceProfiling) {
        const currentRender = performanceData[performanceData.length - 1];
        currentRender.end = Date.now();
        const renderTime = currentRender.end - currentRender.start;
//        performanceDiv.innerHTML = `Last render: ${renderTime}ms`;
        if (performanceData.length % 60 === 0) {
            updatePerfGraphs();
        }
    }

    window.requestAnimationFrame(req);
}

let graphData = [];

const updatePerfGraphs = () => {
    const startFrame = performanceData.length - 60; //performanceData[performanceData.length - 60];
    const endFrame = performanceData.length - 1;//performanceData[performanceData.length - 1];
    let sum = 0;
    for (let i = startFrame; i <= endFrame; i++) {
        sum += (performanceData[i].end - performanceData[i].start);
    }
    const avgRenderTime = sum / 60;
    const lastNFrames = performanceData[endFrame].end - performanceData[startFrame].start;

    graphData.push({
        avgRenderTime,
        lastNFrames
    });

    const makeDot = (_canvas, _ctx, x, y) => {
        const maxY = _canvas.height;
        const maxX = _canvas.width;
        const _x = 5 + ((x / 100) * maxX);
        const _y = (y / 100) * maxY;
        _ctx.fillRect(_x, _y, 5, 5);
    }

    const avgGraphCtx = avgGraph.getContext("2d", {alpha: false});
    const lastNGraphCtx = lastNGraph.getContext("2d", {alpha: false});

    avgGraphCtx.clearRect(0, 0, avgGraph.width, avgGraph.height);
    lastNGraphCtx.clearRect(0, 0, lastNGraph.width, lastNGraph.height);

    avgGraphCtx.fillStyle = 'rgba(226, 114, 91, 255)';
    lastNGraphCtx.fillStyle = 'rgba(255, 192, 203, 255)';

    avgGraphCtx.fillRect(0, 0, avgGraph.width, avgGraph.height);
    lastNGraphCtx.fillRect(0, 0, lastNGraph.width, lastNGraph.height);

    avgGraphCtx.fillStyle = "rgba(255, 0, 0, 255)";
    lastNGraphCtx.fillStyle = "rgba(0, 255, 0, 255)";

    if (graphData.length > 10) {
        graphData = graphData.slice(graphData.length - 10, graphData.length);
    }
    
    avgGraphLabel.innerHTML = avgRenderTime.toFixed(2) + ' ms/render';
    lastNGraphLabel.innerHTML = Math.floor(1000 / (lastNFrames / 60)) + ' fps';

    for (let i = 0; i < graphData.length; i++) {
        const fps = 1000 / (graphData[i].lastNFrames / 60);
        makeDot(avgGraph, avgGraphCtx, i * 10, 100 - (10 * (graphData[i].avgRenderTime)));
        makeDot(lastNGraph, lastNGraphCtx, i * 10, 100 - (fps));
    }
};

const click = function(clickInfo = {}) {
    if (!mousePos) {
        return;
    }
    const x = mousePos[0];
    const y = mousePos[1];
    const clickX = (x - canvas.offsetLeft) / clientWidth * 100;//) - canvas.offsetLeft;
    const clickY = y / clientHeight * 100;
    
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

const sendGamepadState = (gamepadState) => {
    socketWorker.postMessage(JSON.stringify({
        type: 'input',
        gamepad: true,
        input: gamepadState
        // nodeId: clickInfo.nodeId
    }));
}

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

    if (x < canvas.offsetLeft - window.scrollLeft) {
        return false;
    }

    const translatedX = x - canvas.offsetLeft - window.scrollX;
    const translatedY = y - window.scrollY;

    const xPercentage = 100 * translatedX / clientWidth;
    const yPercentage = 100 * translatedY / clientHeight;

    const bezelTop = bezelInfo.y / 2;
    const bezelBottom = 100 - (bezelInfo.y / 2);

    const bezelLeft = bezelInfo.x / 2;
    const bezelRight = 100 - (bezelInfo.x / 2);

    if ( spectating && (xPercentage > bezelLeft && xPercentage < bezelRight) && (yPercentage > bezelTop && yPercentage < bezelBottom) ) {
        return false;
    }

    for (const chunkIndex in thingIndices) {
        const clickableIndexChunk = thingIndices[chunkIndex];

        let vertices = clickableIndexChunk[3];
        if (!vertices || !vertices.length) {
            continue;
        }
        // TODO: fix this hack
        if (!vertices[0].length) {
            let verticesSwp = new Array(vertices.length / 2);
            for (let i = 0; i < vertices.length; i+=2) {
                verticesSwp[i/2] = [vertices[i], vertices[i+1]];
            }
            vertices = verticesSwp;
        }
        let isInside = false;

        let minX = translateX(vertices[0][0]);
        let maxX = translateX(vertices[0][0]);
        let minY = translateY(vertices[0][1]);
        let maxY = translateY(vertices[0][1]);

        for (let i = 1; i < vertices.length; i++) {
            const vert = vertices[i];
            minX = Math.min(translateX(vert[0]), minX);
            maxX = Math.max(translateX(vert[0]), maxX);
            minY = Math.min(translateY(vert[1]), minY);
            maxY = Math.max(translateY(vert[1]), maxY);
        }

        if (!(x < minX || x > maxX || y < minY || y > maxY)) {
            let i = 0;
            let j = vertices.length - 1;
            for (i, j; i < vertices.length; j=i++) {
                if ((translateY(vertices[i][1]) > y) != (translateY(vertices[j][1]) > y) &&
                        x < (translateX(vertices[j][0]) - translateX(vertices[i][0])) * (y - translateY(vertices[i][1])) / (translateY(vertices[j][1]) - translateY(vertices[i][1])) + translateX(vertices[i][0])) {
                        isInside = !isInside;
                }
            }
        }
 
        if (isInside) {

            isClickable = clickableIndexChunk[0];
            action = clickableIndexChunk[1];
            nodeId = clickableIndexChunk[2];
        }


//        const intersects = (
//            x >= clickableIndexChunk[3] && 
//            x <= clickableIndexChunk[4]
//        ) && (
//            y >= clickableIndexChunk[5] && 
//            y <= clickableIndexChunk[6]) ;
//        if (intersects) {
//            isClickable = clickableIndexChunk[0];
//            action = clickableIndexChunk[1];
//            nodeId = clickableIndexChunk[2];
//        }
    }

    return {
        isClickable,
        action,
        nodeId
    }
};

const translateX = (x) => {
    const translated = (x * clientWidth / 100) + canvas.offsetLeft + window.scrollX;
    return translated;
};
const translateY = (y) => {
    return (y * clientHeight / 100) + canvas.offsetTop + window.scrollY;
};

window.addEventListener("mousedown", function(e) {
    mouseDown = true;
    mousePos = [e.clientX, e.clientY];
    unlock();
//    const clickInfo = canClick(mousePos[0], mousePos[1]);//e.clientX, e.clientY);
//    click(clickInfo);//e.clientX + window.scrollX, e.clientY + window.scrollY);
});

window.addEventListener("mouseup", function(e) {
    mouseDown = false;
});

canvas.addEventListener("mousemove", function(e) {
});

window.addEventListener("touchstart", function(e) {
    e.preventDefault();
    mouseDown = true;
    mousePos = [e.touches["0"].clientX + window.scrollX, e.touches["0"].clientY + window.scrollY];
//    const clickInfo = canClick(mousePos[0], mousePos[1]);//e.clientX, e.clientY);
//    click(clickInfo);
});

canvas.addEventListener("touchmove", function(e) {
    e.preventDefault();
    mouseDown = true;
    mousePos = [e.touches["0"].clientX + window.scrollX, e.touches["0"].clientY + window.scrollY];
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
    mousePos = [e.clientX + window.scrollX, e.clientY + window.scrollY];
});

window.addEventListener('resize', () => {
    initCanvas(window.gameWidth, window.gameHeight);
    currentBuf && currentBuf.length > 1 && currentBuf[0] == 3 && renderBuf(currentBuf);
    sendClientInfo();
});
