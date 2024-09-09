import WebSocket from "ws";
import * as fs from 'fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AIS = require('./json/ais.json');

const subscriptionMessage = {
  APIkey: AIS.key,
  BoundingBoxes: [ [ [-90, -180], [90, 180], ], ],
};

setInterval(() => { 
	console.log('Reading ================================================');
	const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");
	let features = [];

	socket.addEventListener("open", (_) => {
	  socket.send(JSON.stringify(subscriptionMessage));
 
	  setTimeout(() => { 
		  socket.close(); 
  
		  const geojson = JSON.stringify({ 'type': 'FeatureCollection', 'features': features });
  
		  fs.writeFile("data/ais.geojson", geojson, (err) => {
		    if (err)
		      console.log(err);
		    else {
		      console.log("+++ File written successfully +++");
		    }
		  });
  
	  }, "5000");
	});

	socket.addEventListener("error", (event) => {
	  console.log(event);
	});

	socket.addEventListener("message", (event) => {
	  let aisMessage = JSON.parse(event.data);
	  let heading;

	 // console.log(aisMessage);
	  //'ShipStaticData',
	  if (aisMessage['MessageType'] === 'PositionReport' || aisMessage['MessageType'] === 'ShipStaticData') {
	    //aisMessage["MetaData"]['ShipName'] // aisMessage["MetaData"]['latitude'] aisMessage["MetaData"]['longitude']

		let ft = {
			'type':'Feature',
			'geometry':{'type':'Point','coordinates':[aisMessage['MetaData']['longitude'],aisMessage['MetaData']['latitude']]},
			'properties':{
				'id':aisMessage['MetaData']['MMSI'],
				'name':aisMessage['MetaData']['ShipName'].trim(),
				'heading':aisMessage['MessageType'] === 'PositionReport' ? aisMessage['Message']['PositionReport']['TrueHeading'] : 511
			}
		};
		//console.log(ft);
		features.push(ft);
	  }
	});
  
}, "15000");
