/*
	Author: Ramzi Sah#2992
	Desription:
		main bot code
*/

// read configs
const fs = require('fs');
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

// await for instance id
var instanceId = -1;

process.on('message', function(m) {
	// get message type
	if (Object.keys(m)[0] == "id") {
		// set instance id
		instanceId = m.id
		
		// send ok signal to main process
		process.send({
			instanceid : instanceId,
			message : "instance started."
		});
		
		// init bot
		init();
	};
});

function init() {
	// get config
	config["instances"][instanceId]["webServerHost"] = config["webServerHost"];
	config["instances"][instanceId]["webServerPort"] = config["webServerPort"];
	config["instances"][instanceId]["statusUpdateTime"] = config["statusUpdateTime"];
	config["instances"][instanceId]["timezone"] = config["timezone"];
	config["instances"][instanceId]["format24h"] = config["format24h"];
	config = config["instances"][instanceId];
	
	// connect to discord API
	client.login(config["discordBotTocken"]);
};


//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------
// common
function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};

//----------------------------------------------------------------------------------------------------------
// create client
require('dotenv').config();
const {Client, MessageEmbed, Intents, MessageActionRow, MessageButton} = require('discord.js');
const client = new Client({
	messageEditHistoryMaxSize: 0,
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});

//----------------------------------------------------------------------------------------------------------
// on client ready
client.on('ready', async () => {
	process.send({
		instanceid : instanceId,
		message : "Logged in as \"" + client.user.tag + "\"."
	});
	
	// wait until process instance id receaived
	while (instanceId < 0) {
		await Sleep(1000);
	};
	
	// get broadcast chanel
	let statusChannel = client.channels.cache.get(config["serverStatusChanelId"]);
	
	if (statusChannel == undefined) {
		process.send({
			instanceid : instanceId,
			message : "ERROR: channel id " + config["serverStatusChanelId"] + ", does not exist."
		});
		return;
	};
	
	// get a status message
	let statusMessage = await createStatusMessage(statusChannel);
	
	if (statusMessage == undefined) {
		process.send({
			instanceid : instanceId,
			message : "ERROR: could not send the status message."
		});
		return;
	};

	// start server status loop
	startStatusMessage(statusMessage);
	
	// start generate graph loop
	generateGraph();
});

//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------
// create/get last status message
async function createStatusMessage(statusChannel) {
	// delete old messages except the last one
	await clearOldMessages(statusChannel, 1);
	
	// get last message
	let statusMessage = await getLastMessage(statusChannel);
	if (statusMessage != undefined) {
		// return last message if exists
		return statusMessage;
	};
	
	// delete all messages
	await clearOldMessages(statusChannel, 0);
	
	// create new message
	let embed = new MessageEmbed();
	embed.setTitle("instance starting...");
	embed.setColor('#ffff00');
	

	
	return await statusChannel.send({ embeds: [embed] }).then((sentMessage)=> {
		return sentMessage;
	});	
};

function clearOldMessages(statusChannel, nbr) {
	return statusChannel.messages.fetch({limit: 99}).then(messages => {
		// select bot messages
		messages = messages.filter(msg => (msg.author.id == client.user.id && !msg.system));
		
		// keep track of all promises
		let promises = [];
		
		// delete messages
		let i = 0;
		messages.each(mesasge => {
			// let nbr last messages
			if (i >= nbr) {
				// push to promises
				promises.push(
					mesasge.delete().catch(function(error) {
						return;
					})
				);
			};
			i += 1;
		});
		
		// return when all promises are done
		return Promise.all(promises).then(() => {
			return;
		});
		
	}).catch(function(error) {
		return;
	});
};

function getLastMessage(statusChannel) {
	return statusChannel.messages.fetch({limit: 20}).then(messages => {
		// select bot messages
		messages = messages.filter(msg => (msg.author.id == client.user.id && !msg.system));
		
		// return first message
		return messages.first();
	}).catch(function(error) {
		return;
	});
};

//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------
// main loops
async function startStatusMessage(statusMessage) {
	while(true){
		try {
			// steam link button
			let row = new MessageActionRow()
			row.addComponents(
				new MessageButton()
					.setCustomId('steamLink')
					.setLabel('Connect')
					.setStyle('PRIMARY')
			);
		
			let embed = await generateStatusEmbed();
			statusMessage.edit({ embeds: [embed], components: config["steam_btn"] ? [row] : [] });
		} catch (error) {
			process.send({
				instanceid : instanceId,
				message : "ERROR: could not edit status message. " + error
			});
		};

		await Sleep(config["statusUpdateTime"] * 1000);
	};
};

client.on('interactionCreate', interaction => {
	if (!interaction.isButton()) return;
	
	interaction.reply({ content: 'steam://connect/' + config["server_host"] + ':' + config["server_port"], ephemeral: true });
});




//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------
// fetch data
const gamedig = require('gamedig');
var tic = false;
function generateStatusEmbed() {
	let embed = new MessageEmbed();

	// set embed name and logo
	embed.setAuthor(config["server_name"], config["server_logo"]);
	
	// set embed updated time
	tic = !tic;
	let ticEmojy = tic ? "⚪" : "⚫";
	
	let updatedTime = new Date();

	updatedTime.setHours(updatedTime.getHours() + config["timezone"][0] - 1);
	updatedTime.setMinutes(updatedTime.getMinutes() + config["timezone"][1]);

	embed.setFooter(
		ticEmojy + ' ' + 
		"Last Update" + ': ' + 
		updatedTime.toLocaleTimeString('en-US', {hour12: !config["format24h"], month: 'short', day: 'numeric', hour: "numeric", minute: "numeric"})
	);
	
	try {
		return gamedig.query({
			type: config["server_type"],
			host: config["server_host"],
			port: config["server_port"],

			maxAttempts: 5,
			socketTimeout: 1000,
			debug: false
		}).then((state) => {
			// set embed color
			embed.setColor(config["server_color"]);

			//-----------------------------------------------------------------------------------------------
			// set server name
			let serverName = config["server_name"];
			
			// refactor server name
			for (let i = 0; i < serverName.length; i++) {
				if (serverName[i] == "^") {
					serverName = serverName.slice(0, i) + " " + serverName.slice(i+2);
				} else if (serverName[i] == "█") {
					serverName = serverName.slice(0, i) + " " + serverName.slice(i+1);
				} else if (serverName[i] == "�") {
					serverName = serverName.slice(0, i) + " " + serverName.slice(i+2);
				};
			};
			
			// server name field
			embed.addField("Server Name" + ' :', serverName);

			//-----------------------------------------------------------------------------------------------
			// basic server info
			if (!config["minimal"]) {
				embed.addField("Direct Connect" + ' :', "`" + state.connect + "`", true);
				embed.addField("Game Mode" + ' :', config["server_type"] , true);
				if (state.map == "") {
					embed.addField("\u200B", "\u200B", true);
				} else {
					embed.addField("Map" + ' :', state.map, true);
				};
			};

			embed.addField("Status" + ' :', "✅ " + "Online", true);
			embed.addField("Online Players" + ' :', state.players.length + " / " + state.maxplayers, true);
			embed.addField('\u200B', '\u200B', true);

			//-----------------------------------------------------------------------------------------------
			// player list
			if (config["server_enable_playerlist"] && state.players.length > 0) {
				// recover game data
				let dataKeys = Object.keys(state.players[0]);

				// set name as first
				if (dataKeys.includes('name')) {
					dataKeys = dataKeys.filter(e => e !== 'name');
					dataKeys.splice(0, 0, 'name');
				};

				// remove some unwanted data
				dataKeys = dataKeys.filter(e => 
					e !== 'frags' && 
					e !== 'score' && 
					e !== 'guid' && 
					e !== 'id' && 
					e !== 'team' &&
					e !== 'squad' &&
					e !== 'raw' &&
					e !== 'skin'
				);
				
				if (!config["server_enable_graph"] && dataKeys.length > 0)
					embed.addField('\u200B', '▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄');
				
				for (let j = 0; j < dataKeys.length && j < 2; j++) {
					// check if data key empty
					if (dataKeys[j] == "") {
						dataKeys[j] = "\u200B";
					};
					
					let player_datas = "```\n";
					for (let i = 0; i < state.players.length; i++) {
						// break if too many players, prevent discord message overflood
						if (i + 1 > 50) {
							if (j == 0) player_datas += "and " + (state.players.length - 50) + " others...";
							else player_datas += "...";

							break;
						};
						
						// set player data
						if (state.players[i][dataKeys[j]] != undefined) {
							let player_data = state.players[i][dataKeys[j]].toString();
							if (player_data == "") {
								player_data = "-";
							};
							
							// handle discord markdown strings
							player_data = player_data.replace(/_/g, " ");
							for (let k = 0; k < player_data.length; k++) {
								if (player_data[k] == "^") {
									player_data = player_data.slice(0, k) + " " + player_data.slice(k+2);
								};
							};
							
							if (dataKeys[j] == "time") {
								let date = new Date(player_data * 1000);
								player_datas += ("0" + (date.getHours() - 1)).substr(-2) + ':' + ("0" + date.getMinutes()).substr(-2) + ':' + ("0" + date.getSeconds()).substr(-2);
							} else {
								// handle very long strings
								player_data = (player_data.length > 15) ? player_data.substring(0, 15 - 3) + "..." : player_data;
								
								let index = i + 1 > 9 ? i + 1 : "0" + (i + 1);
								player_datas += j == 0 ? index +  " - " + player_data : player_data;
								
								if (dataKeys[j] == "ping") player_datas += " ms";
							};
						};
						
						player_datas += "\n";
					};
					player_datas += "```";
					dataKeys[j] = dataKeys[j].charAt(0).toUpperCase() + dataKeys[j].slice(1);
					embed.addField(dataKeys[j] + ' :', player_datas, true);
				};
			};
			
			// set bot activity
			client.user.setActivity("✅ Online: " + state.players.length + "/" + state.maxplayers, { type: 'WATCHING' });

			// add graph data
			graphDataPush(updatedTime, state.players.length);

			// set graph image
			if (config["server_enable_graph"])
				embed.setImage(
					"http://" + config["webServerHost"] + ":" + config["webServerPort"] + "/" + 'graph_' + instanceId + '.png' + "?id=" + Date.now()
				);

			return embed;
		}).catch(function(error) {
			
			// set bot activity
			client.user.setActivity("❌ Offline.", { type: 'WATCHING' });
	
			// offline status message
			embed.setColor('#ff0000');
			embed.setTitle('❌ ' + "Server Offline" + '.');

			// add graph data
			graphDataPush(updatedTime, 0);

			return embed;
		});
	} catch (error) {
		console.log(error);
		
		// set bot activity
		client.user.setActivity("❌ Offline.", { type: 'WATCHING' });
		
		// offline status message
		embed.setColor('#ff0000');
		embed.setTitle('❌ ' + "Server Offline" + '.');

		// add graph data
		graphDataPush(updatedTime, 0);

		return embed;
	};
};

function graphDataPush(updatedTime, nbrPlayers) {
	// save data to json file
	fs.readFile(__dirname + '/temp/data/serverData_' + instanceId + '.json', function (err, data) {
		// create file if does not exist
		if (err) {
			fs.writeFile(__dirname + '/temp/data/serverData_' + instanceId + '.json', JSON.stringify([]),function(err){if (err) throw err;});
			return;
		};
		
		let json;
		// read old data and concat new data
		try {
			json = JSON.parse(data);
		} catch (err) {
			console.log("error on graph data")
			console.error(err)
			json = JSON.parse("[]");
		};
		
		// 1 day history
        let nbrMuchData = json.length - 24 * 60 * 60 / config["statusUpdateTime"];
        if (nbrMuchData > 0) {
            json.splice(0, nbrMuchData);
        };
		
		json.push({"x": updatedTime, "y": nbrPlayers});
		
		// rewrite data file 
		fs.writeFile(__dirname + '/temp/data/serverData_' + instanceId + '.json', JSON.stringify(json), function(err){});
	});
};

const width = 600;
const height = 400;
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
var canvasRenderService = new ChartJSNodeCanvas({width, height});
// const canvasRenderService = new CanvasRenderService(600, 400);
async function generateGraph() {
	while(true){
		try {

			// generate graph
			let data = [];

			try {
				data = JSON.parse(fs.readFileSync(__dirname + '/temp/data/serverData_' + instanceId + '.json', {encoding:'utf8', flag:'r'}));
			} catch (error) {
				data = [];
			}

			let graph_labels = [];
			let graph_datas = [];
			
			// set data
			for (let i = 0; i < data.length; i += 1) {
				graph_labels.push(new Date(data[i]["x"]));
				graph_datas.push(data[i]["y"]);
			};

			let graphConfig =  {
				type: 'line',
				
				data: {
					labels: graph_labels,
					datasets: [{
						label: 'number of players',
						data: graph_datas,
						
						pointRadius: 0,
						
						backgroundColor: hexToRgb(config["server_color"], 0.2),
						borderColor: hexToRgb(config["server_color"], 1.0),
						borderWidth: 1
					}]
				},
				
				options: {
					downsample: {
						enabled: true,
						threshold: 500 // max number of points to display per dataset
					},
					
					legend: {
						display: true,
						labels: {
							fontColor: 'white'
						}
					},
					scales: {
						yAxes: [{
							ticks: {
								fontColor: 'rgba(255,255,255,1)',
								precision: 0,
								beginAtZero: true
							},
							gridLines: {
								zeroLineColor: 'rgba(255,255,255,1)',
								zeroLineWidth: 0,
								
								color: 'rgba(255,255,255,0.2)',
								lineWidth: 0.5
							}
						}],
						xAxes: [{
							type: 'time',
							ticks: {
								fontColor: 'rgba(255,255,255,1)',
								autoSkip: true,
								maxTicksLimit: 10
							},
							time: {
								displayFormats: {
									quarter: 'h a'
								}
							},
							gridLines: {
								zeroLineColor: 'rgba(255,255,255,1)',
								zeroLineWidth: 0,
								
								color: 'rgba(255,255,255,0.2)',
								lineWidth: 0.5
							}
						}]
					},
					datasets: {
						normalized: true,
						line: {
							pointRadius: 0
						}
					},
					elements: {
						point: {
							radius: 0
						},
						line: {
							tension: 0
						}
					},
					animation: {
						duration: 0
					},
					responsiveAnimationDuration: 0,
					hover: {
						animationDuration: 0
					}
				}
			};

			let graphFile = 'graph_' + instanceId + '.png';
			
			canvasRenderService.renderToBuffer(graphConfig).then(data => {
				fs.writeFileSync(__dirname + '/temp/graphs/' + graphFile, data);
			}).catch(function(error) {
				console.error("graph creation for guild " + instanceId + " failed.");
				console.error(error);
			});

		} catch (error) {
			console.error(error);
			process.send({
				instanceid : instanceId,
				message : "could not generate graph image " + error
			});
		};

		await Sleep(60 * 1000); // every minute
	};
};

// does what its name says
function hexToRgb(hex, opacity) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? "rgba(" + parseInt(result[1], 16) + ", " + parseInt(result[2], 16) + ", " + parseInt(result[3], 16) + ", " + opacity + ")" : null;
}