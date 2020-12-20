const http = require("http");
const https = require("https");
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { login, promptLogin, verifyAccessToken, storeTokens, linkInit, getLoginInfo, guaranteeCerts, refreshAccessToken } = require('homegames-common');

const HTTP_PORT = 80;
const HTTPS_PORT = 443;

const PATH_MAP = {
    "/": { 
        path: "web/index.html",
        contentType: "text/html"
    },
    "/bundle.js": {
        path: "web/bundle.js",
        contentType: "text/javascript"
    },
    "/app.css": {
        path: "web/app.css",
        contentType: "text/css"
    },
    "/favicon.ico": {
        path: "web/favicon.ico",
        contentType: "image/x-icon"
    },
    "/socket.js": {
        path: "src/socket.js",
        contentType: "text/javascript"
    }
};

const app = (req, res) => {
    let requestPath = req.url;

    const queryParamIndex = requestPath.indexOf("?");

    if (queryParamIndex > 0) {
        requestPath = requestPath.substring(0, queryParamIndex);
    }

    const pathMapping = PATH_MAP[requestPath];

    if (pathMapping) {
        res.statusCode = 200;
        res.setHeader("Content-Type", pathMapping.contentType);
        const payload = fs.readFileSync(path.join(__dirname, pathMapping.path));
        res.end(payload);
    } else {
        res.statusCode = 404;
        res.end();
    }
};
const thingo = () => {
    promptLogin().then((info) => {
        login(info.username, info.password).then((tokens) => {
            console.log('logged in');
            storeTokens(config.AUTH_DATA_PATH, info.username, tokens).then(() => {
                console.log('stored auth tokens. getting certs...');
                guaranteeCerts(config.AUTH_DATA_PATH, config.CERT_DATA_PATH).then(certPaths => {
                    console.log('about to start server');
                    setTimeout(() => {
                    const options = {
                        key: fs.readFileSync(certPaths.keyPath).toString(),
                        cert: fs.readFileSync(certPaths.certPath).toString()
                    };

                    if (config.LINK_ENABLED) {
                        linkInit(config.AUTH_DATA_PATH);
                    }

                    https.createServer(options, app).listen(HTTPS_PORT);
                    }, 3500);
                });
            });
        })
    });
};

if (config.ACCOUNT_ENABLED) {
    getLoginInfo(config.AUTH_DATA_PATH).then(info => {
        refreshAccessToken(info.username, info.tokens).then(newTokens => {
            verifyAccessToken(info.username, newTokens.accessToken).then(() => {
                storeTokens(config.AUTH_DATA_PATH, info.username, newTokens).then(() => {
                    guaranteeCerts(config.AUTH_DATA_PATH, config.CERT_DATA_PATH).then(certPaths => {
                        const options = {
                            key: fs.readFileSync(certPaths.keyPath).toString(),
                            cert: fs.readFileSync(certPaths.certPath).toString()
                        };

                        if (config.LINK_ENABLED) {
                            linkInit(config.AUTH_DATA_PATH);
                        }

                        https.createServer(options, app).listen(HTTPS_PORT);
                    });
                });
            }).catch(thingo)//{console.log(err);})
        }).catch(thingo)
    }).catch(thingo)
} else if (config.CERT_DATA_PATH) {
    const options = {
        key: fs.readFileSync(config.CERT_DATA_PATH + '/key.pem').toString(),
        cert: fs.readFileSync(config.CERT_DATA_PATH + '/cert.pem').toString()
    };

    if (config.LINK_ENABLED) {
        linkInit(config.AUTH_DATA_PATH);
    }

    https.createServer(options, app).listen(HTTPS_PORT);       

    const HTTP_PORT = 80;

    http.createServer((req, res) => {
        res.writeHead(301, {'Location': 'https://' + req.headers['host'] + req.url });
        res.end();
    }).listen(HTTP_PORT);
} else {
    http.createServer(app).listen(HTTP_PORT);
}

//    console.log('Skipping log in. Security features will be unavailable')

//linkInit().then(() => {
//        console.log("INITIALIZED LINK INIT");
//    });

//https.createServer(options, (req, res) => {
//}).listen(443);
