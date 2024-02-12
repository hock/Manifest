const express = require("express");
const { google } = require("googleapis");

const mserver = require('./json/mserver.json');
const aprsfi = require('./json/aprsfi.json');
const maptiler = require('./json/maptiler.json');

const app = express();

const cors = require('cors')
const corsOptions = {
  origin: 'https://manifest.supplystudies.com'
}

app.use(cors(corsOptions));
app.listen(mserver.port, () => { console.log(`Server running at ${mserver.name}:${mserver.port}/`); });


app.get('/', (req, res) => {
	console.log("Requested {/}");
	res.send("Manifest Web Service v${mserver.version}"); 
});

app.get('/marinetraffic/', async (req, res) => {});

app.get('/maptiler/:type', async (req, res) => {
	console.log("Requested Map Tile: "+req.params.type);	
	
	const response = await fetch('https://api.maptiler.com/maps/'+req.params.type+'/style.json?key='+maptiler.key), {
		headers: {'Referer': 'https://service.supplystudies.com/',}
	});
	const data = await response.json();
	
	console.log(data);
	
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
			res.status(500).send('The API returned an error: ' + error);
			return; }
	      googleSheetsInstance.spreadsheets.values.batchGet(
	        { spreadsheetId: req.params.sheetID, ranges: result.data.sheets.map(e => e.properties.title) },
	        (error, sheetresult) => {  if (error) {  
				console.log('The API returned an error: ' + error); 
				res.status(500).send('The API returned an error: ' + error);
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