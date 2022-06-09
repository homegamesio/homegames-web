const { server } = require('./app_server');

const path = require('path');
const process = require('process');

const baseDir = path.dirname(require.main.filename);

const { authWorkflow, guaranteeDir, guaranteeCerts } = require('homegames-common');
const { getConfigValue } = require('homegames-common');

const CERT_PATH = getConfigValue('HG_CERT_PATH', `${process.cwd()}/.hg_certs`);
const httpsInit = () => new Promise((resolve, reject) => {
    guaranteeDir(AUTH_DIR).then(() => {
        guaranteeCerts(`${AUTH_DIR}/tokens.json`, CERT_PATH).then(certPaths => {
            resolve(certPaths);
        });
    });
});

const AUTH_DIR = getConfigValue('HG_AUTH_DIR', `${process.cwd()}/.hg_auth`);

const HTTPS_ENABLED = getConfigValue('HTTPS_ENABLED', false);

if (process.env.BYPASS_CERT_CHECK) {
    server({
        certPath: process.env.HG_CERT_PATH,
        keyPath: process.env.HG_KEY_PATH
    })
}
else if (HTTPS_ENABLED) {
    console.log(`\n\nHTTPS is enabled! Verifying cert + key are available at ${CERT_PATH}`);
    guaranteeDir(CERT_PATH).then(() => {
        console.log('got cert dir');
        guaranteeDir(AUTH_DIR).then(() => {
            console.log('got auth dir');
            authWorkflow(`${AUTH_DIR}/tokens.json`).then(authInfo => {
                console.log('got auth info');
                httpsInit().then(certPaths => {
                    console.log('got cert. starting server');
                    server(certPaths);
                }).catch(err => {
                    console.log('failed to initialize server with HTTPS');
                    console.log(err);
                    server();
                });
            });
        });
    });
} else {
    console.log("Starting server without HTTPS");
    server();
}
