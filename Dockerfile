FROM node:alpine

RUN mkdir -p /usr/src/bot && mkdir /usr/src/bot/cropped_faces
WORKDIR /usr/src/bot

COPY package.json /usr/src/bot
RUN npm install

RUN apk update && apk upgrade && apk add graphicsmagick

COPY . /usr/src/bot

CMD ["node", "index.js"]
