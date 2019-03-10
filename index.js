const Discord = require("discord.js");
const client = new Discord.Client();
const request = require("request");
const gm = require("gm");

let token = process.env.BOT_TOKEN,
    face_key = process.env.FACE_KEY,
    my_id = process.env.ADMIN_ID || "171717502911381505" //icomputer7
    cropped_faces_path = process.env.CROPPED_FACES_PATH || "./cropped_faces/",
    log_channel = process.env.LOG_CHANNEL || "464651304246181888"; //a channel on my internal bot testing server

function simpleCommand(message, command, func) { if (message.content.toLowerCase().startsWith(command)) { func(message); } }

client.on("ready", () => { 
	console.log(`Logged in as ${client.user.tag}!`);
	client.user.setActivity(";face", { type: 'Playing' });
});

client.on("message", (message) => {
    if (message.author.bot) return; //fr*ck bots

    simpleCommand(message, ";servers", (m) => { //this command lists all the servers that the bot is in
        if (message.author.id != my_id) return;
		let formatted_guilds = [];
		for (g in client.guilds.array()) { 
			formatted_guilds.push(`${client.guilds.array()[g].name} (ID: ${client.guilds.array()[g].id}) `); 
		}
		m.channel.send(formatted_guilds.join("\n"));
    });
    
    simpleCommand(message, ";face", () => {
		let attach = message.attachments.array(), image;
		if (attach.length == 1) {
			image = attach[0].url;
		} else if (attach.length > 1) {
			//too many attachments
			message.reply("Too many attachments! Please try again with one attachment.");
			return;
		} else {
			//not enough attachments, fall back to URL
			image = message.content.substring(6);
			//parser debug
			//message.channel.send(image.length);
			if (image.length <= 0) {
				message.reply("Invalid use of command. Proper use: `;face {image url}` or upload an image with the comment `;face`");
				return;
			}
		}

		//attachment detection debug
		//message.channel.send(`Attachments: ${message.attachments.array().length}`);

		request.post({
			uri: "https://centralus.api.cognitive.microsoft.com/face/v1.0/detect", //"Endpoint" in azure overview
			qs: { //this is the info that the api will return, gotta zucc all of it
				'returnFaceId': 'true',
				'returnFaceLandmarks': 'false',
				'returnFaceAttributes': 'age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise'
			},
			body: `{"url":"${image}"}`,
			headers: {
				'Content-Type': 'application/json',
				'Ocp-Apim-Subscription-Key' : face_key
			}
		}, (error, response, body) => {
			if (error) {
				message.reply(`Error: ${error.message}`);
				return;
			}

			let resp = JSON.parse(body);
			console.log(JSON.stringify(resp), null, '  ');
			if (resp.length >= 1) {
				message.channel.send(`Face(s): ${resp.length}`);
				resp.forEach((face) => {
					let faceTimestamp = new Date(), outimage;
					faceTimestamp = faceTimestamp.getTime(); //i need something 100% unique to name the files so that we don't get conflicts
					gm(request(image))
					.autoOrient()
					.crop(face.faceRectangle.width, face.faceRectangle.height, face.faceRectangle.left, face.faceRectangle.top) //width, height, x, y
					.write(`${cropped_faces_path}${faceTimestamp}.png`, (err) => {
						if (err) {
							message.channel.send(`${message.author} <@${my_id}> We got an issue here: ${err}`);
							return;
						}

						let formatted_hair = [];
						face.faceAttributes.hair.hairColor.forEach((color) => {
							formatted_hair.push(`${color.color}: ${color.confidence*100}% confident`);
						});
						formatted_hair = formatted_hair.join(", ");
						message.channel.send(`
${face.faceAttributes.age} year old ${face.faceAttributes.gender}
Smile: ${face.faceAttributes.smile*100}%
Glasses: ${face.faceAttributes.glasses}
Emotion: ${face.faceAttributes.emotion.anger*100}% anger, ${face.faceAttributes.emotion.contempt*100}% contempt, ${face.faceAttributes.emotion.disgust*100}% disgust, ${face.faceAttributes.emotion.fear*100}% fear, ${face.faceAttributes.emotion.happiness*100}% happiness, ${face.faceAttributes.emotion.neutral*100}% neutral, ${face.faceAttributes.emotion.sadness*100}% sadness, ${face.faceAttributes.emotion.surprise*100}% surprise
Eye Makeup: ${(face.faceAttributes.makeup.eyeMakeup) ? "Yes":"No"}, Face Makeup: ${(face.faceAttributes.makeup.faceMakeup) ? "Yes":"No"}
Bald: ${face.faceAttributes.hair.bald*100}%
Hair: ${formatted_hair}`, {files: [`${cropped_faces_path}${faceTimestamp}.png`]});
					});
				});	
			} else {
				message.reply("Azure cannot see a face in this photo. Try another one.");
			}
		});
	});
});

client.on("guildCreate", (g) => { 
	console.log(`I have been added to a new server! It is called ${g.name} and its ID is ${g.id}`); 
	client.channels.get(log_channel).send(`I have been added to a new server! It is called ${g.name} and its ID is ${g.id}`); 
});

client.on("guildDelete", (g) => { 
	console.log(`I have been removed from a server! It is called ${g.name} and its ID is ${g.id}`); 
	client.channels.get(log_channel).send(`I have been removed from a server! It is called ${g.name} and its ID is ${g.id}`);
});

process.on("SIGINT", () => {
	client.destroy();
	process.exit();
});

client.login(token);