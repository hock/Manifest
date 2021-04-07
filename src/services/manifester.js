const http = require('http');
const hostname = 'localhost';
const port = 3000;
const url = require('url');

const server = http.createServer((req, res) => {
	var request = require('request-promise');

	var Manifester = {
		geo: null,
		graph: null,
		getSmapGeo: function(id) {
			return request({
				"method":"GET", 
				"uri": "https://raw.githubusercontent.com/hock/smapdata/master/data/"+id+".geojson",
				"json": true
			});
		},
		getSmapGraph: function(id) {
			return request({
				"method":"GET", 
				"uri": "https://raw.githubusercontent.com/hock/smapdata/master/data/"+id+".json",
				"json": true
			});
		}
	};
	
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	
	var geoprocessor = null;
	var graphprocessor = null;
	
	if(query.type == "smap") { geoprocessor = Manifester.getSmapGeo; graphprocessor = Manifester.getSmapGraph; }
	
	geoprocessor(query.id).then(function(result) {
	  	Manifester.geo = result; 
		graphprocessor(query.id).then(function(result) {
			Manifester.graph = result;
			res.statusCode = 200;

			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Access-Control-Allow-Origin', '*');
			console.log("success!");
			res.end(JSON.stringify("{["+JSON.stringify(Manifester.geo)+"],["+JSON.stringify(Manifester.graph)+"]}"));
		});
	}).catch(function(err) {
		console.log("failure!");
		
		res.statusCode = 404;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify("{RESOURCE NOT FOUND}"));
	});
});
server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
