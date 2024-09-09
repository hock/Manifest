const express = require("express");
const { google } = require("googleapis");

const mserver = require('./json/mserver.json');
const aprsfi = require('./json/aprsfi.json');
const maptiler = require('./json/maptiler.json');
const path = require('path');
const fs = require('fs');

const app = express();

const cors = require('cors')
const corsOptions = {
  origin: ['https://manifest.supplystudies.com','http://localhost','https://hockbook.local']
}

const mime = { html: 'text/html', txt: 'text/plain', css: 'text/css', gif: 'image/gif', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', js: 'application/javascript' };

app.use(cors(corsOptions));
app.listen(mserver.port, () => { console.log(`Server running at ${mserver.name}:${mserver.port}/`); });


app.get('/', (req, res) => {
	console.log('Requested {/}');
	res.send(`Manifest Web Service v${mserver.version}`); 
});


app.get('/thumb/', async (req, res) => {
	if (typeof req.query.img === 'undefined') {
		res.sendFile(path.resolve('../lib/json/samples/thumbnails/card/default.png'));		
	} else {
		let manifest = '';
		if (req.query.img.split('/').pop() === '') { manifest = req.query.img.split('/').slice(-2, -1)[0]; } 
		else { manifest = req.query.img.split('/').pop(); }
		if (fs.existsSync('../lib/json/samples/thumbnails/'+manifest+'.png')) { res.sendFile(path.resolve('../lib/json/samples/thumbnails/card/'+manifest+'.png'));} 
		else { res.sendFile(path.resolve('../lib/json/samples/thumbnails/card/default.png')); }
	}
});
	
app.get('/marinetraffic/', async (req, res) => {});

app.get('/maptiler/:type', async (req, res) => {
	console.log("Requested Map Tile: "+req.params.type);	
	
	if (req.params.type === 'raster') {
		const data = 'https://api.maptiler.com/maps/791a2394-6b08-4ef6-ab01-bc385f68ac37/{z}/{x}/{y}.webp?key='+maptiler.key;
		res.send(data);		
	} else {
		const response = await fetch('https://api.maptiler.com/maps/'+req.params.type+'/style.json?key='+maptiler.key, {
			headers: {'Referer': 'https://service.supplystudies.com/',}
		});
		//const response = await fetch('https://api.protomaps.com/tiles/v3.json?key=357cb60093a0b2c9');	
		const data = await response.json();
		res.send(data);		
	}		
});

app.get('/geocode/:type/:query', async (req, res) => {
	console.log("Geocoding: "+req.params.query);
	
	let options = '';	
	if (req.params.type !== 'reverse') { otpions = '&proximity=ip&autocomplete=true&fuzzyMatch=true&limit=3'; }
	const response = await fetch('https://api.maptiler.com/geocoding/'+req.params.query+'.json?key='+maptiler.key+options, {
		headers: {'Referer': 'https://service.supplystudies.com/',}
	});
	//const response = await fetch('https://api.protomaps.com/tiles/v3.json?key=357cb60093a0b2c9');	

	const data = await response.json();
		
	res.send(data);
});

app.get('/aprsfi/vessel/:vID', async (req, res) => {
	console.log("Requested AprsFi Vessel "+req.params.vID);	
	
	const response = await fetch('https://api.aprs.fi/api/get?name=' + req.params.vID + '&what=loc&apikey=' + aprsfi.key + '&format=json', {
		headers: {'User-Agent': 'manifest/0.2 (+https://manifest.supplystudies.com/)',}
	});
	const data = await response.json();
	
	console.log(data);
	
	res.send(data);
});

app.get('/smap/:smapID', async (req, res) => {
	console.log("Requested SMAP "+req.params.smapID);	
	
	let smap = {};

	const geo = await fetch('https://raw.githubusercontent.com/hock/smapdata/master/data/' + req.params.smapID + '.geojson');
	smap.geo = await geo.json();	
	const graph = await fetch('https://raw.githubusercontent.com/hock/smapdata/master/data/' + req.params.smapID + '.json');
	smap.graph = await graph.json();
	
	console.log(smap);
	
	res.send(smap);
});

app.get('/gsheet/:sheetID', async (req, res) => {
	console.log("Requested Gsheet "+req.params.sheetID);	
	
	const auth = new google.auth.GoogleAuth({
	        keyFile: "./json/google.json", //the key file
	        //url to spreadsheets API
	        scopes: "https://www.googleapis.com/auth/spreadsheets", 
	    });
	
	const authClientObject = await auth.getClient();
	const googleSheetsInstance = google.sheets({ version: "v4", auth: authClientObject });
	
	  googleSheetsInstance.spreadsheets.get( 
	    { spreadsheetId: req.params.sheetID, fields: "sheets/properties/title" },
	    (error, result) => { if (error) { 
			console.log('The API returned an error: ' + error); 
			
			if (error.message === 'Requested entity was not found.') {
				res.status(500).send('ERROR: We couldn\'t find a Google Sheet with that ID!');
			} else if (error.message === 'The caller does not have permission') {
				res.status(500).send(`ERROR: This Google Sheet is not publicly accessible.<br>If this is your sheet, please go to [File] > [Share] > [Share With Others] in your Google Sheet and change the Viewing permissions to "Anyone with the link".`);
			} else {
			 	res.status(500).send('ERROR: The API returned an error: ' + error);
			}
			return; }
	      googleSheetsInstance.spreadsheets.values.batchGet(
	        { spreadsheetId: req.params.sheetID, ranges: result.data.sheets.map(e => e.properties.title) },
	        (error, sheetresult) => {  if (error) {  
				console.log('The API returned an error: ' + error); 
				res.status(500).send('ERROR: The API returned an error: ' + error);
				return; }
	         
			  const rows = sheetresult.data.values;
			//  for (let r of rows) {
				  console.log(sheetresult.data.valueRanges);
				  res.send(sheetresult.data.valueRanges);
				 // res.send(res.data.valueRanges);
				  //}
	          //console.log(JSON.stringify(res, rows, 2));
	        }
	      );
	    }
	  );
});