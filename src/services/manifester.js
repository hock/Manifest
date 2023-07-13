const express = require('express');
const app = express();
const url = require('url');
const request = require('request-promise');

const gsheetkey = 'AIzaSyDbKq9njfiQa3UDGzRaaG0YaQOT0kYNoFQ';
const aprsfikey = '161937.xJdpU4VkxgfJ2EA';

const port = 3000;
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});

app.get('/', (req, res) => {
	var Manifester = {
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

	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;

	if (query.type == 'smap' || query.type == 'gsheet') {
		var gprocessor = null;
		var rprocessor = null;

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

						console.log('done');
						res.end('{"g": ' + JSON.stringify(Manifester.g) + ', "r": ' + JSON.stringify(Manifester.r) + '}');
					})
					.catch(function (err) {
						console.log('failure!');

						res.statusCode = 404;
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
						res.setHeader('Access-Control-Allow-Methods', 'GET');
						res.setHeader('Content-Type', 'application/json');
						res.end('{"not found"}');
					});
			})
			.catch(function (err) {
				console.log('failed');

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

				console.log('success');
				res.end(JSON.stringify(result));
			})
			.catch(function (err) {
				console.log('failed');

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

				console.log('success');
				res.end(JSON.stringify(result));
			})
			.catch(function (err) {
				console.log('failure!');

				res.statusCode = 404;
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
				res.setHeader('Access-Control-Allow-Methods', 'GET');
				res.setHeader('Content-Type', 'application/json');
				res.end('{"error: "RESOURCE NOT FOUND"}');
			});
	}
});

