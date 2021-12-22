# FaceBot
FaceBot is a Discord bot that uses the [Microsoft Azure Face API](https://docs.microsoft.com/en-us/azure/cognitive-services/face/overview) to analyze faces as a Discord bot.

# Prerequisites
* Node.JS
* Microsoft SQL Server on Linux or Windows (Tested with SQL 2019 on Linux and SQL 2019 on Windows)

# Docker Installation (recommended)
I designed FaceBot to be run in Docker so it can be deployed easier, and it's also how I run FaceBot in production.

## From source
Clone this repo and cd into it. Run `docker build -t facebot .` Let it do its thing. Then use `docker run -d -e BOT_TOKEN=(bot token) -e FACE_KEY=(Azure Face API Key) facebot` to start FaceBot.

# Environment Variables
* `BOT_TOKEN` - This is the Discord bot token.
* `ADMIN_ID` - This is the Discord ID of the bot admin.
* `LOG_CHANNEL` - A Discord text channel ID that the bot can send logs to.
* `SQL_HOST` - FQDN/IP address of the SQL host. 
* `SQL_USER` - SQL username
* `SQL_PASS` - SQL password
* `SQL_DB` - SQL database
* `FACE_KEY` - Face API key
* `COMP_VISION_KEY` - Computer Vision API key
* `BOT_PREFIX` - Bot's command prefix
* `TEST_MODE` - Set to `true` to enable test mode, which makes logging more verbose.

# Using FaceBot in a Discord server
Upload an image with the caption `;face` or just say `;face (image url)`

# Required SQL Tables
I didn't save the actual SQL I used to make that table but here's a basic schema that you need to copy:

## general-log
* `id` - auto-incrementing integer
* `event_type` - VARCHAR(500)
* `event_details` - VARCHAR(MAX)
* `timestamp` - Unix timestamp, stored as bigint