import * as Discord from "discord.js";
import * as gm from "gm";
import * as request from "request";
import { Face } from "./Face";
import { iC7MSSQLDriver } from "./db_driver";
import { VarChar, BigInt } from "mssql";

const client = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES]});
const db = new iC7MSSQLDriver({
	server: process.env.SQL_HOST,
	user: process.env.SQL_USER,
	password: process.env.SQL_PASS,
	database: process.env.SQL_DB,
});

//absolutely REQUIRED for the bot to function at all
const token = process.env.BOT_TOKEN;
const face_key = process.env.FACE_KEY;
const admin_id = process.env.ADMIN_ID;
const prefix = process.env.BOT_PREFIX || "face!";

//not required but some functionality will be lost
const log_channel_id = process.env.LOG_CHANNEL;
const comp_vision_key = process.env.COMP_VISION_KEY;
const support_server_invite = "9JXxUm6";

//debug variables
const test_mode = (process.env.TEST_MODE == "true");

function simpleCommand(message: Discord.Message, command: string, func: (arg: string) => void) {
	if (message.content.toLowerCase().startsWith(prefix+command))
		func(message.content.substring(command.length+prefix.length+1));
}

function log_channel(log_msg: string) {
	console.log(log_msg);
	//log_channel_id == null also evaluates to true if log_channel_id is undefined
	if (!test_mode && log_channel_id != null) (client.channels.cache.get(log_channel_id) as Discord.TextChannel).send(log_msg);
}

function gCreateDelete(created: boolean, g: Discord.Guild): void { //runs when bot is added to or removed from a server
    let msg = `I have been ${created ? "added to" : "removed from"} a server! It is called ${g.name} and its ID is ${g.id}`;
    console.log(msg); 
    log_channel(msg);
    general_log(db, `guild_${created ? "create" : "delete"}`, `${g.name} (ID: ${g.id})`);
}

function general_log(db: iC7MSSQLDriver, e_type: string, e_details: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let timestamp = new Date(); //getting a timestamp
		db.insert("general_log", [
			{
				name: "event_type",
				value: e_type,
				type: VarChar()
			}, {
				name: "event_details",
				value: e_details,
				type: VarChar()
			}, {
				name: "timestamp",
				value: timestamp.getTime(),
				type: BigInt()
			}
		]).then(() => resolve()).catch((err) => { if (err) reject(err); });
	});
}
	
client.on("ready", () => {
	//checking config variables
	if (!face_key) throw new Error("Face API key is not set.");
	if (!process.env.SQL_HOST) throw new Error("SQL server is not set.");
	if (!process.env.SQL_USER) throw new Error("SQL username is not set.");
	if (!process.env.SQL_PASS) throw new Error("SQL password is not set.");
	if (!process.env.SQL_DB) throw new Error("SQL database is not set.");

	console.log(`Logged in as ${client.user.tag}!`);
	client.user.setPresence({ activities: [{ name: `${prefix}help`}], status: "online" });
	console.log(`Bot prefix: "${prefix}"`);
});

client.on("messageCreate", (message: Discord.Message) => {
    if (message.author.bot) return; //fr*ck bots

    simpleCommand(message, "servers", () => { //this command lists all the servers that the bot is in
        if (message.author.id != admin_id) return;
		let formatted_guilds = [];
		for (let g of [...client.guilds.cache.values()]) formatted_guilds.push(`${g.name} (ID: ${g.id}) `);
		message.channel.send(formatted_guilds.join("\n"));
	});
	
	simpleCommand(message, "stats", () => {
		if (message.author.id != admin_id) return;
		let servers = [...client.guilds.cache.values()].length, members = [...client.users.cache.values()].length;
		(message.channel as Discord.TextChannel).send(`I am in ${servers} server(s) with a combined total of ${members} members.`);
	});

	simpleCommand(message, "help", () => {
		message.channel.send(`FaceBot takes a picture of a face and gives you info about it. If you need help, please join the support server.\n\n\`${prefix}info (URL or attachment)\` - Takes the specified picture and detects faces. You can also upload an image with the caption \`${prefix}info\` to get info as well.\n\`${prefix}support\` - Sends you an invite to the support server.`)
		.catch((err) => {
			log_channel(`Failed to send message in ${message.guild.name} (ID: ${message.guild.id}). Error: ${err}`);
		});
	});

	simpleCommand(message, "support", () => {
		log_channel(`User ${message.author.tag} has invoked the support command.`);
		general_log(db, "support_invoked", `User ${message.author.tag} has invoked the support command.`);
		message.author.send("Here is the invite to the support server: https://discord.gg/" + support_server_invite)
		.then(() => message.channel.send("An invite link to the support server has been sent over DM!"))
		.catch(() => message.reply("I cannot DM you so here is the invite link to the support server: https://discord.gg/" + support_server_invite));
	});
    
    simpleCommand(message, "info", (arg) => {
		let attach = [...message.attachments.values()], image: string;

		if (attach.length == 1) image = attach[0].url; 
		else if (attach.length > 1) return message.reply("Too many attachments! Please try again with one attachment.");
		else {
			//not enough attachments, fall back to URL
			image = arg;
			if (image.length <= 0) return message.reply(`Invalid use of command. Proper use: \`${prefix}face {image url}\` or upload an image with the comment \`${prefix}face\``);
		}

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
				message.reply(`An error ocurred when trying to submit the request. Please try again later.`);
				return log_channel(`Error when submitting request to Azure: ${error}`);
			}

			let resp = JSON.parse(body);

			if (response.statusCode != 200) {
				log_channel(`Encountered ${resp.error.code || resp.error.statusCode} when submitting to Azure.\n${resp.error.message}`);
				switch (response.statusCode) {
					case 400:
						switch (resp.error.code) {
							//this is a switch to make it easier to add more error handling in the future
							case "InvalidURL":
								return message.reply("The supplied URL is invalid.\nDetails: `" + resp.error.message + "`");
							default:
								return message.reply("An HTTP 400 error has occurred. Please try another image.\nDetails: `" + resp.error.message + "`");
						}
					case 403:
						message.reply("FaceBot is having internal issues at the moment. Please try again later.");
						return client.users.cache.get(admin_id).send(`URGENT: ${resp.error.message}`);
					case 429:
						return message.reply(resp.error.message);
				}
			}

			if (resp.length >= 1) {
				message.channel.send(`Detected faces: ${resp.length}`).catch((err) => {
					log_channel(`Failed to send message in ${message.guild.name} (ID: ${message.guild.id}). Error: ${err}`);
				});
				for (let f of resp) {
					let face = new Face(f); //parsing data for each face

					gm((request(image) as unknown) as string)
					.autoOrient()
					.crop(face.rect.width, face.rect.height, face.rect.left, face.rect.top) //width, height, x, y
					.toBuffer(`PNG`, (err, buffer) => {
						if (err) {
							message.reply(`An error ocurred when trying to edit the image. Please try again later.`);
							return log_channel(`Error when making GraphicsMagick stream: ${err}`);
						}

						message.channel.send({content: face.frontend, files: [buffer]});
					});
				}
			} 
			else return message.reply("No faces detected in this photo. Try another one.").catch((err) => {
				log_channel(`Failed to send message in ${message.guild.name} (ID: ${message.guild.id}). Error: ${err}`);
			});
		});
	});

	simpleCommand(message, "describe", (arg) => {
		//requires computer vision api key to function
		if (comp_vision_key == null) return message.reply("I don't have a Computer Vision API key so this command is disabled.");

		let attach = [...message.attachments.values()], image;

		if (attach.length == 1) image = attach[0].url; 
		else if (attach.length > 1) return message.reply("Too many attachments! Please try again with one attachment.");
		else {
			//not enough attachments, fall back to URL
			image = arg;
			if (image.length <= 0) return message.reply(`Invalid use of command. Proper use: \`${prefix}describe {image url}\` or upload an image with the comment \`${prefix}describe\``);
		}

		request.post({
			uri: "https://computervision-facebot.cognitiveservices.azure.com/vision/v3.0/describe?language=en", //"Endpoint" in azure overview
			body: `{"url":"${image}"}`,
			headers: {
				'Content-Type': 'application/json',
				'Ocp-Apim-Subscription-Key' : comp_vision_key
			}
		}, (error, response, body) => {
			if (error) {
				message.reply(`An error ocurred when trying to submit the request. Please try again later.`);
				return log_channel(`Error when submitting request to Azure: ${error}`);
			}

			let resp = JSON.parse(body);

			if (response.statusCode != 200) {
				log_channel(`Encountered ${resp.error.code || resp.error.statusCode} when submitting to Azure.\n${resp.error.message}`);
				if (response.statusCode == 403 || response.statusCode == 401) return client.users.cache.get(admin_id).send(`URGENT: ${resp.error.message}`);
				if (response.statusCode == 429) return message.reply(resp.error.message);
			}

			if (test_mode) console.log(JSON.stringify(resp), null, '  ');

			message.channel.send(`I am ${Math.floor(resp.description.captions[0].confidence*10000)/100}% sure that is ${resp.description.captions[0].text}.`);
		});
	});
});

client.on("guildCreate", (g) => gCreateDelete(true, g));
client.on("guildDelete", (g) => gCreateDelete(false, g));
client.on("guildUnavailable", (g) => { 
    console.log(`${g.name} (ID: ${g.id}) has become unavailable.`); 
    general_log(db, "guild_unavailable", `${g.name} (ID: ${g.id})`);
});

process.on("SIGINT", () => {
	client.destroy();
	db.close();
	process.exit();
});

client.login(token);