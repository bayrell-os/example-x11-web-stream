
const fs = require('fs');
const http = require('http');
const parse = require('url').parse;
const ws = require('ws');


const App = {
	
	express: null,
	web_server: null,
	web_socket: null,
	connected_client: null,
	last_segment: null,
	mp4frag: null,
	
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
	
	pushSegment: function(segment){
		this.last_segment = segment;
	}
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
	
	client.send(App.mp4frag.initialization);
	if (App.last_segment)
	{
		client.send(App.last_segment);
	}
	
	client.on('close', () => {
		App.connected_client = null;
	});
});

App.web_server.listen(8080, () => {
	console.log("Web server is started on port 8080");
});

/* Start ffmpeg */

const ffmpeg_params = [
	"-re",
	"-f", "x11grab", "-s", "1440x900", "-i", ":0",
	"-framerate", "10",
	"-tune", "zerolatency",
	//"-preset", "ultrafast",
	"-fflags", "nobuffer",
	"-crf", "30",
	//"-flags", "low_delay",
	//"-framedrop",
	//"-strict", "experimental",
	"-c:v", "libx264", "-b:v", "1200k", "-pix_fmt", "yuv420p", //"-s", "960x600",
	//"-hls_time", "1",
	//"-segment_time", "3",
	"-g", "3",
	//"-force_key_frames", "'expr:gte(t,n_forced*3)'",
	//"-keyint_min", "250",
	"-movflags", "+frag_keyframe+empty_moov+default_base_moof",
	//"-movflags", "empty_moov+default_base_moof",
	"-metadata", "title='media'",
	//"-f", "mpeg",
	"-f", "mp4",
	"pipe:1"
];
const ffmpeg = require('child_process').spawn(
	"ffmpeg", ffmpeg_params, { stdio: ['ignore', 'pipe', 'pipe'] }
);

console.log("Run ffmpeg");
console.log(ffmpeg_params.join(" "));

ffmpeg.on('error', function (err) {
	throw err;
});

ffmpeg.on('close', function (code) {
	console.log('ffmpeg exited with code ' + code);
	process.exit(1);
});

const Mp4Frag = require('mp4frag');
App.mp4frag = new Mp4Frag({hlsPlaylistSize: 2, hlsPlaylistBase: 'test'});

const stream = require('stream');
var stderr = new stream.Writable();
stderr._write = function (data, encoding, callback) {
    process.stdout.write(data.toString() + "\n");
    callback();
};

ffmpeg.stdio[1].pipe(App.mp4frag);
ffmpeg.stdio[2].pipe(stderr);

/*
ffmpeg.stderr.on('data', function (data) {
	console.log(data.toString());
});
*/
App.mp4frag.on('segment', (data) => {
	//console.log(data);
	App.pushSegment(data.segment);
	if (App.connected_client)
	{
		App.connected_client.send(data.segment);
	}
});

/*
ffmpeg.stdout.on('data', function (data) {
	if (App.first_packet.length < 10)
	{ 
		App.first_packet.push(data); 
	}
	if (App.connected_client)
	{
		//let image = new Buffer.from(data).toString('base64');
		App.connected_client.send(data);
	}
});
*/
