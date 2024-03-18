# Homegames - the web client
This repo contains the "official" Homegames web client, used to connect to game sessions created by homegames-core.

**If you are just trying to play games, you probably don't need this. The best way to do that is downloading builds available at [homegames.io](https://homegames.io)**

## Setup
Requires: Node.js >= 18
```
npm install
npm run build
npm run start
```

This will run a homegames web client at `localhost:80`. It will attempt to connect to a game server at port `7001` or `HOME_PORT` if defined in `config.json`

## Socket
`src/socket.js`
The socket connection stuff runs as a [worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) created by the web client. After an initial handshake with the game server, it receives squished game data over a web socket. The worker is also responsible for sending keyboard and mouse/touch input from the client to the game server.

## Rendering
