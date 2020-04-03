const socket = new WebSocket('ws://localhost:7000');

socket.binaryType = 'arraybuffer';

const becomeHost = () => new Promise((resolve, reject) => {
    socket.onmessage = (msg) => {
        if (typeof(msg.data) === 'string') {
            const data = JSON.parse(msg.data);
            if (data.type === 'RTCHostResponse') {
                socket.onmessage = null;
                resolve(data.success);
            }
        }
    };

    socket.send(JSON.stringify({
        type: 'RTCHostRequest'
    }));
});

const clientConnections = {};

const relayData = () => {
    socket.onmessage = (msg) => {
        if (typeof(msg.data) === 'string') {
            const data = JSON.parse(msg.data);
            if (data.type === 'RTCPeerRequest') {
                const connection = new RTCPeerConnection({});
                clientConnections[data.targetId] = connection;
                connection.onicecandidate = ({ candidate }) => {
                    if (!candidate) {
                        socket.send(JSON.stringify({
                            type: 'RTCOffer',
                            offer: connection.localDescription,
                            targetId: data.targetId
                        }));
                    }
                };

                connection.ondatachannel = (e) => {
                    console.log("GOT A DATA CHANNEL");
                };

                const dataChannel = connection.createDataChannel('homegames');
                connection.createOffer().then(offer => {
                    const replacedSDP = offer.sdp.replace(/\r\na=ice-options:trickle/g, '');
                    offer.sdp = replacedSDP;
                    connection.setLocalDescription(offer);
                });
            } else if (data.type === 'RTCAnswer') {
                const connection = clientConnections[data.targetId];
                connection.setRemoteDescription(data.answer);
            }
        } else {
            console.log("MSG DATA");
            for (let clientId in clientConnections) {
                console.log("gonna relay to this boi");
            }
        }
    };

    socket.send(JSON.stringify({
        type: 'ready'
    }));
};

const initRtcChannel = () => {
    socket.onmessage = (msg) => {
        if (typeof(msg.data) === 'string') {
            const data = JSON.parse(msg.data);
            if (data.type === 'RTCOffer') {
                const connection = new RTCPeerConnection({});
                const dataChannel = connection.createDataChannel('homegames');
                connection.onicecandidate = ({ candidate }) => {
                    if (candidate) {
                        socket.send(JSON.stringify({
                            type: 'RTCAnswer',
                            answer: connection.localDescription
                        }));
                    }
                }
    
                connection.ondatachannel = (e) => {
                    console.log("CLIENT GOT A DATA CHANNEL");
                };
    
                connection.setRemoteDescription(data.offer);
                connection.createAnswer().then(answer => {
                    connection.setLocalDescription(answer);
                });
            }
        } else {
            console.log('got something');
        }
    };

    socket.send(JSON.stringify({
        type: 'RTCPeerRequest'
    }));
    
    socket.send(JSON.stringify({
        type: 'ready'
    }));
};

socket.onopen = () => {
    becomeHost().then(isHost => {
        if (isHost) {
            relayData();
        } else {
            initRtcChannel();
        }
    });
};
