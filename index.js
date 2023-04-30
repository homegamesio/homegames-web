const { Readable, Writable } = require('stream');
const unzipper = require('unzipper');
const https = require('https');
const os = require('os');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const process = require('process');
const { getConfigValue, login, log, authWorkflow, guaranteeDir, guaranteeCerts } = require('homegames-common');

const { server } = require('./app_server');

let baseDir = path.dirname(require.main.filename);

if (baseDir.endsWith('src')) {
    baseDir = baseDir.substring(0, baseDir.length - 3);
}

log.info("Starting homegames client server");

const promptUser = (promptText, hideUserInput) => new Promise((resolve, reject) => {

    let muted = false;
    
    const mutableStdout = new Writable({
        write: (chunk, encoding, callback) => {
            if (!muted) {
                process.stdout.write(chunk, encoding);
            }
            callback && callback();
        }
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: mutableStdout,
        terminal: true
    });

    rl.question(`${promptText}\n`, function(userInput) {
        rl.close();
        resolve(userInput);
    });

    muted = hideUserInput;

});

const doLogin = () => new Promise((resolve, reject) => {
    console.log('need to log in, get token');

    promptUser('Homegames username: ', false).then(username=> {
        promptUser('Password: ', true).then(password => {
            login(username, password).then(tokens => {
                resolve({ username, token: tokens.accessToken });
            }).catch(err => {
                console.error(err);
                reject(err);
            });
        });
    });
});

const getLocalIP = () => {
    const ifaces = os.networkInterfaces();
    let localIP;

    Object.keys(ifaces).forEach((ifname) => {
        ifaces[ifname].forEach((iface) => {
            if ('IPv4' !== iface.family || iface.internal) {
                return;
            }
            localIP = localIP || iface.address;
        });
    });

    return localIP;
};

const requestCert = (username, token) => new Promise((resolve, reject) => {
    const payload = JSON.stringify({
        localServerIp: getLocalIP()
    });

    const port = 443;
    const hostname = 'certs.homegames.link';
    const path = '/request-cert'
    const headers = {
        'hg-username': username,
        'hg-token': token
    };

    Object.assign(headers, {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    });

    const options = {
        hostname,
        path,
        port,
        method: 'POST',
        headers
    };

    let responseData = '';

    const req = https.request(options, (res) => {
        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            resolve(responseData);
        });
    });

    req.write(payload);
    req.end();
});

const bufToStream = (buf) => {
    return new Readable({
        read() {
            this.push(buf);
            this.push(null);
        }
    });
};

const getCertStatus = (username, token) => new Promise((resolve, reject) => {
    const payload = JSON.stringify({
        localServerIp: getLocalIP()
    });

    const port = 443;
    const hostname = 'certs.homegames.link';
    const path = '/cert_status'
    const headers = {
        'hg-username': username,
        'hg-token': token
    };

    Object.assign(headers, {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    });

    const options = {
        hostname,
        path,
        port,
        method: 'POST',
        headers
    };

    let responseData = '';

    const req = https.request(options, (res) => {
        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            resolve(responseData);
        });
    });

    req.write(payload);
    req.end();
});

const certPathArgs = process.argv.filter(a => a.startsWith('--cert-path=')).map(a => a.replace('--cert-path=', ''));
const certPathArg = certPathArgs && certPathArgs.length > 0 ? certPathArgs[0] : null;

console.log("CERT PATH ARG");
console.log(certPathArg);

server(certPathArg);

//if (false && getConfigValue('HTTPS_ENABLED', false)) {
//    console.log('sdfdsfdsfdsfdsf');
//    doLogin().then(({username, token}) => {
//        getCertStatus(username, token).then((_certStatus) => {
//            console.log('here is cert status');
//            const certStatus = JSON.parse(_certStatus);
//            console.log(certStatus);
//            if (!certStatus.certFound || !certStatus.certExpiration || certStatus.certExpiration <= Date.now()) {
//                requestCert(username, token).then(keyBundle => {
//                    console.log("KEY BUDNLE");
//                    console.log(keyBundle);
//                    const keyBuf = Buffer.from(keyBundle, 'base64');
//                    const keyStream = bufToStream(keyBuf);
//                    const unzip = unzipper.Extract({ path: baseDir });
//                    keyStream.pipe(unzip);
//
//                    unzip.on('close', () => {
//                        console.log('finished unzipping! waiting for cert...');
//
//                        const timeoutTime = Date.now() + (60 * 3 * 1000);
//                        let timeWaited = 0;
//                        const checker = setInterval(() => {
//                            console.log('Checking for cert...');
//                            if (Date.now() >= timeoutTime) {
//                                console.error('Timed out waiting for cert');
//                                clearInterval(checker);
//                            } else {
//                                console.log('need to check...');
//                                getCertStatus(username, token).then((_currentStatus) => {
//                                    console.log('cert info!');
//                                    const currentStatus = JSON.parse(_currentStatus);
//                                    if (currentStatus) {
//                                        if (currentStatus.certData) {
//                                            console.log('got cert!');
//                                            clearInterval(checker);
//                                            const certBuf = Buffer.from(currentStatus.certData, 'base64');
//                                            fs.writeFileSync(`${baseDir}/hg-certs/homegames.cert`, certBuf);
//                                            server(`${baseDir}/hg-certs`);
//                                        }
//                                    }
//                                });
//                            }
//
//                        }, 20 * 1000);
//                    });
//                });
//            } else {
//                // start server
//                if (certStatus.certFound) {
//                    server(`${baseDir}/hg-certs`);
//                } else {
//	            server();
//                }
//            }
//        });
//    });
//} else {
//
////const certPath = getConfigValue('CERT_PATH', null);
////const keyPath = getConfigValue('KEY_PATH', null);
//
////if (certPath && keyPath) {
////	console.log('secure server start');
////	server({ certPath, keyPath });
////} else {
//	log.info('insecure server start');
//}

