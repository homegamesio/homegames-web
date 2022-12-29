const { server } = require('./app_server');

const path = require('path');
const process = require('process');
const { getConfigValue, log, authWorkflow, guaranteeDir, guaranteeCerts } = require('homegames-common');

const baseDir = path.dirname(require.main.filename);

log.info("Starting homegames client server");

const certPath = getConfigValue('CERT_PATH', null);
const keyPath = getConfigValue('KEY_PATH', null);

if (certPath && keyPath) {
	console.log('secure server start');
	server({ certPath, keyPath });
} else {
	console.log('insecure server start');
	server();
}

