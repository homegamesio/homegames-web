const { Readable, Writable } = require('stream');
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

if (getConfigValue('HTTPS_ENABLED', false) && fs.existsSync(`${baseDir}/hg-certs`)) {
    certPathArg = `${baseDir}/hg-certs`;
}

try {
	server(certPathArg);
} catch (err) {
	reportBug('Failed to start web server:\n' + err.toString()); 
}
