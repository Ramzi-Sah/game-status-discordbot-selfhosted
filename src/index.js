/*
	Author: Ramzi Sah#2992
	Desription:
		creates multiple instances of the bot
*/
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
// read configs
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

// create temp data folders
if (!fs.existsSync(__dirname + "/temp")){
    fs.mkdirSync(__dirname + "/temp");
};
if (!fs.existsSync(__dirname + "/temp/graphs")){
    fs.mkdirSync(__dirname + "/temp/graphs");
};
if (!fs.existsSync(__dirname + "/temp/data")){
    fs.mkdirSync(__dirname + "/temp/data");
};

// initiation
const ChildProcess = require('child_process');
var instances = [];

//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
// start instances
for (let i = 0; i < config["instances"].length; i++) {
	// create child process for every instance
	let instance = ChildProcess.fork(__dirname + '/bot.js');
	
	instance.on('message', function(m) {
		console.log('[instance ' + m.instanceid + ']:', m.message);
	});
	
	// communicate id to instence
	instance.send({id: i});
	
	// push to instances list
	instances.push(instance);
};


//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
// start web server
const http = require('http');
const path = require('path');
var dir = "./src/temp/graphs";
dir = path.resolve(dir);

var mime = {
    html: 'text/html',
    txt: 'text/plain',
    css: 'text/css',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    js: 'application/javascript'
};

var server = http.createServer(function (req, res) {
    var reqpath = req.url.toString().split('?')[0];
    if (req.method !== 'GET') {
        res.statusCode = 501;
        res.setHeader('Content-Type', 'text/plain');
        return res.end('Method not implemented');
    }
    var file = path.join(dir, reqpath.replace(/\/$/, '/index.html'));
	
    if (file.indexOf(dir + path.sep) !== 0) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain');
        return res.end('Forbidden');
    }
    var type = mime[path.extname(file).slice(1)] || 'text/plain';
    var s = fs.createReadStream(file);
    s.on('open', function () {
        res.setHeader('Content-Type', type);
        s.pipe(res);
    });
    s.on('error', function () {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 404;
        res.end('Not found');
    });
});

// start web server
try {
	server.listen(config["webServerPort"], function () {
		console.log('Started web server on port ' + config["webServerPort"]);
	});
} catch (error) {
	// console.error(error);
	console.log("PORT " + config["webServerPort"] + "ALREDY IN USE !");
};
