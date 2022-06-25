const { server } = require('./app_server');

const path = require('path');
const process = require('process');

const baseDir = path.dirname(require.main.filename);

const { authWorkflow, guaranteeDir, guaranteeCerts } = require('homegames-common');
const { getConfigValue, log } = require('homegames-common');

log.info("Starting homegames client server");
server();

