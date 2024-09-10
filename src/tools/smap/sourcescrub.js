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

// Generates a simple index of the current SMAP Archive listing on Github.
function buildSmapIndex() {
	$.getJSON("https://api.github.com/repos/hock/smapdata/git/trees/master?recursive=1", function(d) {
		var limiter = 0;
		for(var i in d.tree) {
			if(d.tree[i].path.split(".")[1] != undefined && d.tree[i].path.split(".")[1] == "json") {						
				if(limiter < 9000) {
					$.getJSON("https://raw.githubusercontent.com/hock/smapdata/master/data/"+d.tree[i].path.split("/")[1], function(sc) {
						console.log(sc.supplychain.id);		
						if(sc.supplychain.id == undefined) {sc.supplychain.id = 0; }		
						
						if(sc.supplychain.attributes.title == undefined) {sc.supplychain.attributes.title = " "; }		
						if(sc.supplychain.attributes.title == "") {sc.supplychain.attributes.title = " "; }		
						
						if(sc.supplychain.attributes.description == undefined) {sc.supplychain.attributes.description = " "; }	
						if(sc.supplychain.attributes.description == "") {sc.supplychain.attributes.description = " "; }	
						
						chains.push({id: sc.supplychain.id, nm: sc.supplychain.attributes.title, dc: sc.supplychain.attributes.description});
					});
				}
				limiter++;
				
				
			}
		}
	});
}	

