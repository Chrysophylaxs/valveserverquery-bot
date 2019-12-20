const Gamedig = require('gamedig');
const discord = require('discord.js');

const help = new discord.RichEmbed();
help.setTitle("Valve Server Query Bot  -  Help");
help.addField("Use \`!query ip:port\` in order to query any server directly:", `
\`\`\`c
Both of these should work:
	!query 146.66.159.74:27052
	!query bolus.fakkelbrigade.eu:27235
\`\`\`
`);
help.addField("You can also search valve servers using a few parameters:", `
\`\`\`c
Query layout:
	!query -[option] [params] -[option] [params] ...
I.E.:
	!query -c eu -l lux sto -gm mp -m ctf_hellfire ctf_gorge
\`\`\`
`);
help.addField("There are 5 possible options, each option can have any number of parameters separated by a space:", `
\`\`\`c
	-c   (Continent)
	-l   (Location)
	-gm  (Gamemode)
	-m   (Map)
	-p   (Player)
\`\`\`
`);
help.addField("\`-c\`, \`-l\` and \`-gm\` have limited options as parameters:", `
\`\`\`c
	-c [na, eu] for North America and Europe
	-l [lux, sto, mad, vir, lax] for Luxembourg, Stockholm, Madrid, Virginia and LA
	-gm [ad, ctf, koth, cp, pl, plr, misc, mp, pass, pd, mvm] for every Gamemode
\`\`\`
`);
help.addField("\`-m\` and \`-p\` can be used with any parameters:", `
\`\`\`c
The bot will search all servers regardless of the parameters:
	-m bla_bla
	-p Chrysophylaxs
\`\`\`
`);
help.addField("In case you would like to search a server with a player whose name contains spaces, replace the spaces with an underscore:", `
\`\`\`c
This will search for servers with players whose names contain "The" or "End":
	-p The End
This will search for servers with players whose names contain "The End" or "The_End":
	-p The_End
\`\`\`
`);

const client = new discord.Client({disableEveryone: true});
client.login(process.env.DISCORD);

client.on("ready", function() {
	client.user.setActivity('!query | finding servers...', {type: 'PLAYING'});
	console.log("Valve Server Query Bot");
});

client.on('message', (msg) => {
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith('!query')) return undefined;
	let content = msg.content.toLowerCase();
	let args = content.split(' ');
	if (args.length == 2) {
		let str = args[1].split(':');
		if (str.length != 2) return msg.channel.send(help);
		queryServer(str[0], str[1], msg.channel);
	}
	else if (args.length > 2) {
		let retval = getServers(args);
		sendServers(retval, msg.channel);
	}
	else {
		msg.channel.send(help);
	}
	return undefined;
});

function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}

function isAD(map) {return map == 'cp_dustbowl' || map == 'cp_egypt_final' || map.startsWith('cp_gorge') || map == 'cp_gravelpit' || map == 'cp_junction_final' || map == 'cp_manor_event' || map == 'cp_mercenarypark' || map == 'cp_mossrock' || map == 'cp_mountainlab' || map == 'cp_steel';}
function isCTF(map) {return map.startsWith('ctf_') && !isMP(map);}
function isCP(map) {return map.startsWith('cp_') && !isAD(map) && !isMISC(map);}
function isKOTH(map) {return map.startsWith('koth_');}
function isPL(map) {return map.startsWith('pl_');}
function isPLR(map) {return map.startsWith('plr_');}
function isMISC(map) {return map == 'tc_hydro' || map == 'cp_degrootkeep' || map == 'cp_snowplow';}
function isPD(map) {return map.startsWith('pd_');}
function isMP(map) {return map == 'ctf_thundermountain' || map == 'ctf_hellfire' || map == 'ctf_foundry' || map == 'ctf_gorge';}
function isPASS(map) {return map.startsWith('pass_');}
function isMVM(map) {return map.startsWith('mvm_');}

function isVIR(ip) {return ip.startsWith("208.78.164.") || ip.startsWith("208.78.165.");}
function isLAX(ip) {return ip.startsWith("162.254.194.");}
function isLUX(ip) {return ip.startsWith("146.66.152.") || ip.startsWith("146.66.153.") || ip.startsWith("146.66.158.") || ip.startsWith("146.66.159.") || ip.startsWith("155.133.240.") || ip.startsWith("155.133.241.");}
function isSTO(ip) {return ip.startsWith("146.66.156.") || ip.startsWith("146.66.157.") || ip.startsWith("155.133.242.") || ip.startsWith("155.133.243.") || ip.startsWith("185.25.180.") || ip.startsWith("185.25.181.");}
function isMAD(ip) {return ip.startsWith("155.133.247.");}
function isNA(ip) {return isVIR(ip) || isLAX(ip);}
function isEU(ip) {return isLUX(ip) || isSTO(ip) || isMAD(ip);}

function getContinent(ip) {
	if (isVIR(ip) || isLAX(ip)) return 'na';
	if (isLUX(ip) || isSTO(ip) || isMAD(ip)) return 'eu';
}

function getLocation(ip) {
	if (isVIR(ip)) return 'vir';
	if (isLAX(ip)) return 'lax';
	if (isLUX(ip)) return 'lux';
	if (isSTO(ip)) return 'sto';
	if (isMAD(ip)) return 'mad';
}

function getGamemode(map) {
	if (isAD(map)) return 'ad';
	if (isCTF(map)) return 'ctf';
	if (isCP(map)) return 'cp';
	if (isKOTH(map)) return 'koth';
	if (isPL(map)) return 'pl';
	if (isPLR(map)) return 'plr';
	if (isMISC(map)) return 'misc';
	if (isPD(map)) return 'pd';
	if (isMP(map)) return 'mp';
	if (isPASS(map)) return 'pass';
	if (isMVM(map)) return 'mvm';
}

let servers = [];
let states = [];
let timestamps = [];

function getServers(args) {
	let continents = [];
	let locations = [];
	let gamemodes = [];
	let maps = [];
	let players = [];

	let i = 1;
	while (i < args.length) {
		if (args[i] == "-c") {
			i++;
			while (i < args.length && !args[i].startsWith('-')) {
				continents.push(args[i]);
				i++;
			}
		}
		else if (args[i] == "-l") {
			i++;
			while (i < args.length && !args[i].startsWith('-')) {
				locations.push(args[i]);
				i++;
			}
		}
		else if (args[i] == "-gm") {
			i++;
			while (i < args.length && !args[i].startsWith('-')) {
				gamemodes.push(args[i]);
				i++;
			}
		}
		else if (args[i] == "-m") {
			i++;
			while (i < args.length && !args[i].startsWith('-')) {
				maps.push(args[i]);
				i++;
			}
		}
		else if (args[i] == "-p") {
			i++;
			while (i < args.length && !args[i].startsWith('-')) {
				players.push(args[i]);
				i++;
			}
		}
		else {
			return maps;
		}
	}

	let retval = states.slice(0);
	if (continents.length > 0)
	for (let k = 0; k < retval.length; k++) {
		if (continents.indexOf(getContinent(retval[k].connect)) == -1) {retval.splice(k, 1); k--;}
	}
	if (locations.length > 0)
	for (let k = 0; k < retval.length; k++) {
		if (locations.indexOf(getLocation(retval[k].connect)) == -1) {retval.splice(k, 1); k--;}
	}
	if (gamemodes.length > 0)
	for (let k = 0; k < retval.length; k++) {
		if (gamemodes.indexOf(getGamemode(retval[k].map)) == -1) {retval.splice(k, 1); k--;}
	}
	if (maps.length > 0)
	for (let k = 0; k < retval.length; k++) {
		if (maps.indexOf(retval[k].map) == -1) {retval.splice(k, 1); k--;}
	}
	if (players.length > 0)
	for (let k = 0; k < retval.length; k++) {
		let plyrs = [];
		for (let j = 0; j < retval[k].players.length; j++) {
			if (retval[k].players[j].name)
				plyrs.push(retval[k].players[j].name.toLowerCase().replace(' ', '_'));
		}
		let found = false;
		for (let p = 0; p < players.length; p++) {
			for (let q = 0; q < plyrs.length; q++) {
				if (plyrs[q].includes(players[p])) {
					found = true;
					break;
				}
			}
		}
		if (!found) {retval.splice(k, 1); k--;}
	}
	return retval;
}

async function sendServers(retval, channel) {
	let embed = new discord.RichEmbed();
	let string = "Found " + retval.length + " out of " + states.length + " logged Servers";
	embed.setTitle(string);
	embed.setColor("#42b548");
	channel.send(embed);
	for (let i = 0; i < retval.length && i < 5; i++) {
		let str = retval[i].connect.split(':');
		queryServer(str[0], str[1], channel);
		await sleep(500);
	}
}

async function updateServers(state) {
	let date = new Date()
	let index = servers.indexOf(state.connect);
	if (index == -1) {
		servers.push(state.connect);
		states.push(state);
		timestamps.push(date.getTime());
	}
	else {
		timestamps[index] = date.getTime();
		states[index] = state;
	}
}

async function query(input, ranges) {
	for (let [from, to] of ranges)
	for (let ip = from; ip <= to; ip++) {
		// console.log(ip);
		for (let port = 27015; port < 27090; port++) {
			Gamedig.query({
				type: 'tf2',
				host: input + ip,
				port: port
			}).then((state) => {
				if (state.raw.game == 'Team Fortress' && state.players.length > 0) {
					updateServers(state);
					// console.log(state.map + " | " + state.connect);
				}
				// if (state.raw.game == 'Team Fortress') console.log(state.connect + " " + state.name);
			}).catch((error) => {
				// console.log("Server is Offline");
			});
			await sleep(20);
		}
	}
}

async function losangeles() {
	// console.log("LOSANGELES");
	// console.log("================================");
	await query('162.254.194.', [[146, 166]]);
}

async function virginia() {
	// console.log("VIRGINIA");
	// console.log("================================");
	await query('208.78.164.', [[71, 75], [167, 170], [230, 235]]);
	await query('208.78.165.', [[71, 75], [232, 235]]);	
	// await query('208.78.166.', [[0, 255]]);
}

async function luxembourg() {
	// console.log("LUXEMBOURG");
	// console.log("================================");
	await query('146.66.152.', [[163, 166]]);
	await query('146.66.153.', [[72, 75], [232, 235]]);
	// await query('146.66.154.', [[0, 255]]);
	// await query('146.66.155.', [[0, 255]]);	
	await query('146.66.158.', [[167, 170]]);
	await query('146.66.159.', [[71, 74], [230, 233]]);

	// await query('155.133.228.', [[0, 255]]);
	// await query('155.133.229.', [[0, 255]]);
	await query('155.133.240.', [[167, 170]]);
	await query('155.133.241.', [[71, 73]]);
}

async function stockholm() {
	// console.log("STOCKHOLM");
	// console.log("================================");
	await query('146.66.156.', [[167, 168]]);
	await query('146.66.157.', [[71, 72], [232, 233]]);

	await query('155.133.242.', [[167, 168]]);
	await query('155.133.243.', [[71, 72]]);

	await query('185.25.180.', [[167, 168]]);
	await query('185.25.181.', [[71, 72], [230, 235]]);
	// await query('185.25.182.', [[0, 255]]);
}

async function madrid() {
	// await query('155.133.246.', [[0, 255]]);
	await query('155.133.247.', [[142, 144]]);
	// await query('155.133.248.', [[0, 255]]);
}

async function queryAll() {
	await luxembourg();
	await stockholm();
	await madrid();
	await virginia();
	await losangeles();
	// console.log("=== CHECKED ALL SERVERS ===");
	queryAll();
}

queryAll();

async function queryServer(ip, port, channel) {
	Gamedig.query({
		type: 'tf2',
		host: ip,
		port: port,
		socketTimeout: 3000,
		maxAttempts: 3
	}).then((state) => {
		let date = new Date()
		sendServerInfo(state, channel, date.getTime());
		let index = servers.indexOf(state.connect);
		if (index != -1) {
			timestamps[index] = date.getTime();
			states[index] = state;
		}
	}).catch((error) => {
		let index = servers.indexOf(state.connect);
		if (index != -1) {
			servers.splice(index, 1);
			states.splice(index, 1);
			timestamps.splice(index, 1);
		}
	});
	return undefined;
}

async function sendServerInfo(state, channel, time) {
	let string = "```c\nMap: " + state.map + "\nIP: " + state.connect + "\nName                           | Kills\n======================================";
	state.players.sort((a, b) => b.score - a.score);
	for (let i = 0; i < state.players.length; i++) {
		if (!state.players[i].hasOwnProperty("name")) continue;
		string = string + "\n" + state.players[i].name;
		if (state.players[i].name) for (let j = 0; j < 30 - state.players[i].name.length; j++) string += " ";
		string = string + " | " + state.players[i].score;
	}
	string = string + "\n======================================\nTotal: " + state.players.length + " / " + state.maxplayers + "```";
	let embed = new discord.RichEmbed();
	embed.setTitle(state.name);
	embed.setDescription(string);
	embed.setColor("#f75931");
	let date = new Date();
	embed.setFooter("Time since last query: " + (date.getTime() - time) / 1000 + " seconds");
	embed.setTimestamp(date);
	channel.send(embed);
}
