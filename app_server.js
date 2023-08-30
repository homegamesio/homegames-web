const http = require("http");
const https = require("https");
const fs = require('fs');
const path = require('path');
const reportBug = require('./report-bug');
const { getAppDataPath } = require('homegames-common');
const baseDir = path.dirname(require.main.filename);

const DEFAULT_CONFIG = {
    "LINK_ENABLED": true,
    "HTTPS_ENABLED": true,
    "HOMENAMES_PORT": 7400,
    "HOME_PORT": 9801,
    "LOG_LEVEL": "INFO",
    "GAME_SERVER_PORT_RANGE_MIN": 8300,
    "GAME_SERVER_PORT_RANGE_MAX": 8400,
    "IS_DEMO": false,
    "BEZEL_SIZE_Y": 15,
    "BEZEL_SIZE_X": 15,
    "PUBLIC_GAMES": true,
    "DOWNLOADED_GAME_DIRECTORY": "hg-games",
    "LOG_PATH": "hg_log.txt"
};

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
    },
    "/config.json": {
        path: "config.json",
        contentType: "application/json"
    },
    "/code": {
       path: "web/code.html",
       contentType: "text/html"
    }
};

const server = (certPath) => {

    const app = (req, res) => {
        let requestPath = req.url;

        if (requestPath === '/config.json') {
            res.statusCode = 200;
            res.setHeader("Content-Type", 'application/json');
            
            let payload = JSON.stringify(DEFAULT_CONFIG);
            const configPath = path.join(getAppDataPath(), 'config.json');

            if (fs.existsSync(configPath)) {
                payload = fs.readFileSync(configPath);
            }

            res.end(payload);
        } else {
    
            const queryParamIndex = requestPath.indexOf("?");
    
            if (queryParamIndex > 0) {
                requestPath = requestPath.substring(0, queryParamIndex);
            }
    
            const pathMapping = PATH_MAP[requestPath];
    
            if (pathMapping) {
                res.statusCode = 200;
                res.setHeader("Content-Type", pathMapping.contentType);
                
                const payload = fs.readFileSync(path.join(path.dirname(require.main.filename), pathMapping.path));
                res.end(payload);
            } else {
                res.statusCode = 404;
                res.end();
            }
        }
    };

    if (certPath) {
        http.createServer((req, res) => {
            const host = req.headers['host'];
	    res.writeHead(307, {
	        'Location': `https://${host}`
	    });
	    res.end();
        }).listen(80);
        
        https.createServer({
            key: fs.readFileSync(certPath + '/homegames.key').toString(),
            cert: fs.readFileSync(certPath + '/homegames.cert').toString()
        }, app).listen(443);
    } else {
        http.createServer(app).listen(80);
    }

};

module.exports = {
    server
};
