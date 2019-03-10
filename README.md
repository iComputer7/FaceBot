# FaceBot
FaceBot is a Discord bot that uses the [Microsoft Azure Face API](https://docs.microsoft.com/en-us/azure/cognitive-services/face/overview) to analyze faces as a Discord bot.
# Docker Installation (recommended)
I designed FaceBot to be run in Docker so it can be deployed easier.
## From Docker Hub
Simply use `docker run -d -e BOT_TOKEN=(bot token) -e FACE_KEY=(Azure Face API Key) icomputer7/facebot` to start FaceBot.
## From source
Clone this repo and cd into it. Run `docker build -t facebot .` Let it do its thing. Then use `docker run -d -e BOT_TOKEN=(bot token) -e FACE_KEY=(Azure Face API Key) facebot` to start FaceBot.
# Environment Variables
* `BOT_TOKEN` - This is the Discord bot token.
* `ADMIN_ID` - This is the Discord ID of the bot admin. Default is `171717502911381505` (my ID).
* `CROPPED_FACES_PATH` - Where to store the cropped face images. Default is `./cropped_faces/`
* `LOG_CHANNEL` - A Discord text channel ID that the bot can send logs to. Default is `464651304246181888` (on my internal testing server).
# Using FaceBot in a Discord server
Upload an image with the caption `;face` or just say `;face (image url)`
