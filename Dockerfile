# Fetch image of node v13
FROM node:13

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
RUN npm install -g webpack
RUN npm install -g webpack-cli
# If you are building your code for production
# RUN npm ci --only=production

COPY . .

RUN webpack

EXPOSE 80

CMD [ "node", "app_server.js" ]

