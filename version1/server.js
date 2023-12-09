
const fs = require('fs');
const http = require('http');
const parse = require('url').parse;
const ws = require('ws');


const App = {
	
	express: null,
	web_server: null,
	web_socket: null,
	connected_client: null,
	
	onRequest: function (request, response) {
	
		const { pathname } = parse(request.url);
		
		console.log("Request " + pathname);
		
		if (pathname == "/")
		{	
			fs.readFile("index.html", function(error, content) {
				if (error){
					response.writeHead(500);
		            response.end('Error');
		            response.end();
		            return;
				}
				let contentType = "text/html";
				response.writeHead(200, { 'Content-Type': contentType });
		        response.end(content, 'utf-8');
			});
			return;
		}
		
		response.writeHead(404);
	    response.end('File not found');
	    response.end();
	    return;
		
	},
}


/* Start web server */

App.web_server = http.createServer();
App.web_socket = new ws.Server({
	server: App.web_server,
});

App.web_server.on('request', App.onRequest);

App.web_socket.on('connection', (client) => {
	console.log("User connected");
	App.connected_client = client;
	client.on('close', () => {
		App.connected_client = null;
	});
});

App.web_server.listen(8080, () => {
	console.log("Web server is started on port 8080");
});

/* Start ffmpeg */

const ffmpeg = require('child_process').spawn("ffmpeg", [
	"-re",
	"-f", "x11grab", "-s", "1024x768", "-i", ":0",
	"-r", "15",
	"-tune", "zerolatency",
	//"-preset", "ultrafast",
	"-fflags", "nobuffer",
	"-crf", "30", // video quality !!!
	"-avoid_negative_ts", "make_zero",
	//"-c:v", "libx264",
	"-f", "mjpeg", "pipe:1"
	]
);

let connectedClient = null;

ffmpeg.on('error', function (err) {
	throw err;
});

ffmpeg.on('close', function (code) {
	console.log('ffmpeg exited with code ' + code);
	process.exit(1);
});

ffmpeg.stderr.on('data', function (data) {
	console.log(data.toString());
});

ffmpeg.stdout.on('data', function (data) {
	if (App.connected_client)
	{
		let image = new Buffer.from(data).toString('base64');
		App.connected_client.send(image);
	}
});


