console.log("Sourcescrub...");

var fs = require('fs');
var request = require('request');

var start = 0;
var limit = 6700;
// There are approximately 6700 maps as of Sept 26th, 2013.

function fetchJson() {	
	for (var index = start; index < limit; index++) {
		console.log(index);
		(function(i) {	
			request('http://free.sourcemap.com/services/supplychains/' + i, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					fs.writeFile("./smaps/" + i + ".json", body, function(err) {
						if (err) {
							console.log(err);
						} else {
							console.log("The file was saved!");
						}
					});
				}
			});
		})(index);
	}
}
	
function fetchGeojson() {	
	for (var index = start; index < limit; index++) {
		console.log(index);
		(function(i) {	
			request('http://free.sourcemap.com/services/supplychains/' + i + '?f=geojson', function(error, response, body) {
				if (!error && response.statusCode == 200) {
					fs.writeFile("./smaps/" + i + ".geojson", body, function(err) {
						if (err) {
							console.log(err);
						} else {
							console.log("The file was saved!");
						}
					});
				}
			});
		})(index);
	}
}	

