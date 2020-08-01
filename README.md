# Homegames - the web stuff

This repo contains a NodeJS server that serves the Homegames web client. 

`npm install`

`webpack`

`node app_server.js`

There's way more info available in our [getting started wiki](https://github.com/homegamesio/homegames/wiki/Getting-Started)

#### Run with Docker

Want to run homegames core easily with docker? Well here ya go bud:


1. Navigate to root directory of homegames project

2. Run `docker build -t homegames-web .`

3. Run `docker run -dp 80:80 homegames-web`

4. That's it! The docker container should be up and running, and exposed/published on port 80 (localhost) on whatever machine you ran the above commands on

