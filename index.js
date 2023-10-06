const { Readable, Writable } = require('stream');
const unzipper = require('unzipper');
const https = require('https');
const os = require('os');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const process = require('process');
const reportBug = require('./report-bug');
const { getConfigValue, login, log, authWorkflow, guaranteeDir, guaranteeCerts } = require('homegames-common');

const { server } = require('./app_server');

let baseDir = path.dirname(require.main.filename);

if (baseDir.endsWith('src')) {
   baseDir = baseDir.substring(0, baseDir.length - 3);
}

log.info("Starting homegames client server");

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

let certPathArg;
try {
	const certPathArgs = process.argv.filter(a => a.startsWith('--cert-path=')).map(a => a.replace('--cert-path=', ''));
	certPathArg = certPathArgs && certPathArgs.length > 0 ? certPathArgs[0] : null;

	if (!certPathArg) {
		if (getConfigValue('HTTPS_ENABLED', false) && fs.existsSync(`${baseDir}/hg-certs`)) {
		    certPathArg = `${baseDir}/hg-certs`;
		}
	}
} catch (err) {
	reportBug('Error getting cert path arg:\n' + certPathArg);
}

log.info('cert path arg is ' + certPathArg);

try {
	server(certPathArg);
} catch (err) {
	reportBug('Failed to start web server:\n' + err.toString()); 
}

