const fetch = require("node-fetch");
const express = require('express'); // Import the Express module
const app = express(); // Create an Express application
const url = require('url'); // Import the URL module
const request = require('request-promise'); // Import the request-promise module
const hostname = 'hockbook.local';
const port = 3000;

fetch("http://hockbook.local/Manifest/dist/services/keys.json").then(d => d.json()).then(k => Service(k));
	
function Service(k) {
	console.log("Starting Service");

	const gsheetkey = k.gsheetkey; // Google Sheets API key
	const aprsfikey = k.aprsfikey; // APRS.fi API key

	app.listen(port, hostname, () => {
		console.log(`Server running at ${hostname}:${port}/`);
	});

	app.get('/', (req, res) => {
		let Manifester = {
			g: null,
			r: null,
			getSmapGeo: function (id) {
				return request({
					method: 'GET',
					uri: 'https://raw.githubusercontent.com/hock/smapdata/master/data/' + id + '.geojson',
					json: true,
				});
			},
			getSmapGraph: function (id) {
				return request({
					method: 'GET',
					uri: 'https://raw.githubusercontent.com/hock/smapdata/master/data/' + id + '.json',
					json: true,
				});
			},
			getGoogleOverview: function (id) {
				return request({
					uri: 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/Overview?key=' + gsheetkey,
					json: true,
				});
			},
			getGoogleList: function (id) {
				return request({
					method: 'GET',
					uri: 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/List?key=' + gsheetkey,
					json: true,
				});
			},
			getMarineTrafficOverview: function () {
				return request({
					method: 'GET',
					uri: 'http://services.marinetraffic.com/api/exportvessels/cc503f48eb2c8e49549cc56de3c7059c4b042931/timespan:4/protocol:json',
					json: true,
				});
			},
			getAprsFi: function (vid) {
				return request({
					method: 'GET',
					uri: 'https://api.aprs.fi/api/get?name=' + vid + '&what=loc&apikey=' + aprsfikey + '&format=json',
					headers: {
						'User-Agent': 'manifest/0.2 (+https://manifest.supplystudies.com/)',
					},
					json: true,
				});
			},
		};

		let url_parts = url.parse(req.url, true);
		let query = url_parts.query;

		if (query.type == 'smap' || query.type == 'gsheet') {
			let gprocessor = null;
			let rprocessor = null;

			if (query.type == 'smap') {
				gprocessor = Manifester.getSmapGeo;
				rprocessor = Manifester.getSmapGraph;
			}
			if (query.type == 'gsheet') {
				gprocessor = Manifester.getGoogleOverview;
				rprocessor = Manifester.getGoogleList;
			}

			gprocessor(query.id)
				.then(function (result) {
					Manifester.g = result;
					rprocessor(query.id)
						.then(function (result) {
							Manifester.r = result;
							res.statusCode = 200;

							res.setHeader('Access-Control-Allow-Origin', '*');
							res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
							res.setHeader('Access-Control-Allow-Methods', 'GET');
							res.setHeader('Content-Type', 'application/json');

							console.log('gprocessor done');
							res.end('{"g": ' + JSON.stringify(Manifester.g) + ', "r": ' + JSON.stringify(Manifester.r) + '}');
						})
						.catch(function (err) {
							console.log('gprocessor failed');

							res.statusCode = 404;
							res.setHeader('Access-Control-Allow-Origin', '*');
							res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
							res.setHeader('Access-Control-Allow-Methods', 'GET');
							res.setHeader('Content-Type', 'application/json');
							res.end('{"not found"}');
						});
				})
				.catch(function (err) {
					console.log('gprocessor failed');

					res.statusCode = 404;
					res.setHeader('Access-Control-Allow-Origin', '*');
					res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
					res.setHeader('Access-Control-Allow-Methods', 'GET');
					res.setHeader('Content-Type', 'application/json');
					res.end('{"not found"}');
				});
		}
		if (query.type == 'proxy-marine') {
			Manifester.getMarineTrafficOverview()
				.then(function (result) {
					res.statusCode = 200;

					res.setHeader('Access-Control-Allow-Origin', '*');
					res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
					res.setHeader('Access-Control-Allow-Methods', 'GET');
					res.setHeader('Content-Type', 'application/json');

					console.log('proxy-marine success');
					res.end(JSON.stringify(result));
				})
				.catch(function (err) {
					console.log('proxy-marine failed');

					res.statusCode = 404;
					res.setHeader('Access-Control-Allow-Origin', '*');
					res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
					res.setHeader('Access-Control-Allow-Methods', 'GET');
					res.setHeader('Content-Type', 'application/json');
					res.end('{"not found"}');
				});
		}
		if (query.type == 'aprsfi') {
			Manifester.getAprsFi(query.id)
				.then(function (result) {
					res.statusCode = 200;

					res.setHeader('Access-Control-Allow-Origin', '*');
					res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
					res.setHeader('Access-Control-Allow-Methods', 'GET');
					res.setHeader('Content-Type', 'application/json');

					console.log('aprsfi success');
					res.end(JSON.stringify(result));
				})
				.catch(function (err) {
					console.log('aprsfi failed');

					res.statusCode = 404;
					res.setHeader('Access-Control-Allow-Origin', '*');
					res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
					res.setHeader('Access-Control-Allow-Methods', 'GET');
					res.setHeader('Content-Type', 'application/json');
					res.end('{"error: "RESOURCE NOT FOUND"}');
				});
		}
	});
}