const http = require("http");
const https = require("https");
const fs = require('fs');
const path = require('path');

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

const server = (certPath) => {

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

    if (certPath) {
        https.createServer({
            key: fs.readFileSync(certPath.keyPath).toString(),
            cert: fs.readFileSync(certPath.certPath).toString()
        }, app).listen(443);
    } else {
        http.createServer(app).listen(80);
    }

};

module.exports = {
    server
};
