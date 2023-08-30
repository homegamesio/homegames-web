//const { Readable, Writable } = require('stream');
//const unzipper = require('unzipper');
//const https = require('https');
//const os = require('os');
//const fs = require('fs');
//const readline = require('readline');
//const path = require('path');
//const process = require('process');
const { reportBug, getConfigValue, login, log, authWorkflow, guaranteeDir, guaranteeCerts } = require('homegames-common');
//
//const { server } = require('./app_server');
//
//let baseDir = path.dirname(require.main.filename);
//
//if (baseDir.endsWith('src')) {
//    baseDir = baseDir.substring(0, baseDir.length - 3);
//}
//
//log.info("Starting homegames client server");
//
//const promptUser = (promptText, hideUserInput) => new Promise((resolve, reject) => {
//
//    let muted = false;
//    
//    const mutableStdout = new Writable({
//        write: (chunk, encoding, callback) => {
//            if (!muted) {
//                process.stdout.write(chunk, encoding);
//            }
//            callback && callback();
//        }
//    });
//
//    const rl = readline.createInterface({
//        input: process.stdin,
//        output: mutableStdout,
//        terminal: true
//    });
//
//    rl.question(`${promptText}\n`, function(userInput) {
//        rl.close();
//        resolve(userInput);
//    });
//
//    muted = hideUserInput;
//
//});
//
//const doLogin = () => new Promise((resolve, reject) => {
//    console.log('need to log in, get token');
//
//    promptUser('Homegames username: ', false).then(username=> {
//        promptUser('Password: ', true).then(password => {
//            login(username, password).then(tokens => {
//                resolve({ username, token: tokens.accessToken });
//            }).catch(err => {
//                console.error(err);
//                reject(err);
//            });
//        });
//    });
//});
//
//const getLocalIP = () => {
//    const ifaces = os.networkInterfaces();
//    let localIP;
//
//    Object.keys(ifaces).forEach((ifname) => {
//        ifaces[ifname].forEach((iface) => {
//            if ('IPv4' !== iface.family || iface.internal) {
//                return;
//            }
//            localIP = localIP || iface.address;
//        });
//    });
//
//    return localIP;
//};
//
//const requestCert = (username, token) => new Promise((resolve, reject) => {
//    const payload = JSON.stringify({
//        localServerIp: getLocalIP()
//    });
//
//    const port = 443;
//    const hostname = 'certs.homegames.link';
//    const path = '/request-cert'
//    const headers = {
//        'hg-username': username,
//        'hg-token': token
//    };
//
//    Object.assign(headers, {
//        'Content-Type': 'application/json',
//        'Content-Length': payload.length
//    });
//
//    const options = {
//        hostname,
//        path,
//        port,
//        method: 'POST',
//        headers
//    };
//
//    let responseData = '';
//
//    const req = https.request(options, (res) => {
//        res.on('data', (chunk) => {
//            responseData += chunk;
//        });
//
//        res.on('end', () => {
//            resolve(responseData);
//        });
//    });
//
//    req.write(payload);
//    req.end();
//});
//
//const bufToStream = (buf) => {
//    return new Readable({
//        read() {
//            this.push(buf);
//            this.push(null);
//        }
//    });
//};
//
//const getCertStatus = (username, token) => new Promise((resolve, reject) => {
//    const payload = JSON.stringify({
//        localServerIp: getLocalIP()
//    });
//
//    const port = 443;
//    const hostname = 'certs.homegames.link';
//    const path = '/cert_status'
//    const headers = {
//        'hg-username': username,
//        'hg-token': token
//    };
//
//    Object.assign(headers, {
//        'Content-Type': 'application/json',
//        'Content-Length': payload.length
//    });
//
//    const options = {
//        hostname,
//        path,
//        port,
//        method: 'POST',
//        headers
//    };
//
//    let responseData = '';
//
//    const req = https.request(options, (res) => {
//        res.on('data', (chunk) => {
//            responseData += chunk;
//        });
//
//        res.on('end', () => {
//            resolve(responseData);
//        });
//    });
//
//    req.write(payload);
//    req.end();
//});
//
//const certPathArgs = process.argv.filter(a => a.startsWith('--cert-path=')).map(a => a.replace('--cert-path=', ''));
//let certPathArg = certPathArgs && certPathArgs.length > 0 ? certPathArgs[0] : null;
//
//if (getConfigValue('HTTPS_ENABLED', false) && fs.existsSync(`${baseDir}/hg-certs`)) {
//    certPathArg = `${baseDir}/hg-certs`;
//}

//try {
//    server(certPathArg);
//} catch (err) {
    reportBug('web can report errors');//Failed to start web server:\n' + err.toString()); 
//}

