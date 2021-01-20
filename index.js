const { server } = require('./app_server');

const path = require('path');
const process = require('process');

const baseDir = path.dirname(require.main.filename);

const { guaranteeCerts, getLoginInfo, promptLogin, login, storeTokens, verifyAccessToken } = require('homegames-common');

const doLogin = () => new Promise((resolve, reject) => {
    promptLogin().then(info => {
        login(info.username, info.password).then(tokens => {
            storeTokens(`${AUTH_DIR}/tokens.json`, info.username, tokens).then(() => {
                verifyAccessToken(info.username, tokens.accessToken).then(() => {
                    resolve({tokens, username: info.username});

                });
            });
        }).catch(err => {
            console.error('Failed to login');
            console.error(err);
        });
    });
});

const getConfigValue = (key, _default = undefined) => {
    let envValue = process.env[key] && `${process.env[key]}`;
    if (envValue !== undefined) {
        if (envValue === 'true') {
            envValue = true;
        } else if (envValue === 'false') {
            envValue = false;
        }
        console.log(`Using environment value: ${envValue} for key: ${key}`);
        return envValue;
    }
    try {
        const _config = require(`${process.cwd()}/config`);
        console.log(`Using config at ${process.cwd()}/config for ${key}`);
        if (_config[key] === undefined) {
            throw new Error(`No value for ${key} found in ${process.cwd()}/config`);
        }
        console.log(`Found value ${_config[key]} in config`);
        return _config[key];
    } catch(err) {
        if (_default === undefined) {
            throw new Error(`No config value found for ${key}`);
        } else {
            console.log(`Could not find config at ${process.cwd()}/config for key ${key}. Using default: ${_default}`);
            return _default;
        }
    }
};

const AUTH_DIR = getConfigValue('HG_AUTH_DIR', `${process.cwd()}/.hg_auth`);

const HTTPS_ENABLED = getConfigValue('HTTPS_ENABLED', false);
const CERT_PATH = getConfigValue('HG_CERT_PATH', `${process.cwd()}/.hg_certs`);

if (HTTPS_ENABLED) {
    setTimeout(() => {
        console.log(`\n\nHTTPS is enabled! Verifying cert + key are available at ${CERT_PATH}`);
        doLogin().then(info => {
            guaranteeCerts(`${AUTH_DIR}/tokens.json`, CERT_PATH).then(certPaths => {
                server(certPaths);
            });
        });
    }, 1000);
} else {
    console.log("Starting server without HTTPS");
    server();
}
