#!/bin/bash


test1()
{
	#ffmpeg -f x11grab -s 1024x768 -i :0 -framerate 20 \
	#	-tune zerolatency -c:v libx264 -listen 1 \
	#	-f mpeg http://127.0.0.1:8090
	
	ffmpeg -re -f x11grab -s 1024x768 -i :0 \
		-framerate 20 -tune zerolatency -preset ultrafast \
		-c:v libx264 -b:v 800k -pix_fmt yuv420p \
		-movflags +frag_keyframe+empty_moov+default_base_moof \
		-max_delay 0 -bf 0 -metadata title='media' \
		-keyint_min 250 \
		-listen 1 -f mpeg http://127.0.0.1:8090
	
}


server()
{
	node server.js
}


#test1
server
