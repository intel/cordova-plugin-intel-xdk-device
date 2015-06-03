/*
Copyright 2015 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file 
except in compliance with the License. You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the 
License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
either express or implied. See the License for the specific language governing permissions 
and limitations under the License
*/

var http = require("http");

http.createServer(requestListener).listen(8000);

function requestListener(request, response){
	console.log(request.method);
	//console.log(request.url);
	request.setEncoding('utf8');
	request.on('data', function(chunk){
		console.log(chunk);
	});

	request.on('end', function(){
		response.write("This is a server response message", "utf-8");
		response.end();
	})
}