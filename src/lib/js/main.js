$( document ).ready(function() {
	var smapurl = "";
	if(typeof(location.hash) != 'undefined' && location.hash != "") { 
		// TODO handle bad hashes gracefully and still load the page.
		MI = new Manifest();

		smapurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/";
		var hashtype = location.hash.substr(1).split("-")[0]; 
		var hashid = location.hash.substr(1).split("-")[1]; 
		
		if(hashtype == "smap") { $.getJSON(smapurl + hashid + ".geojson", function(d) { MI.functions.process("SourcemapAPI", d, {"id": hashid});}); }
	} else {
		
		MI = new Manifest();

		smapurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/";
		var starters = [5333,2239,602,5228,4532,2737,5228];
		var starter_id = starters[Math.floor(Math.random() * starters.length)];
		
		$.getJSON(smapurl + starter_id + ".geojson", function(d) { MI.functions.process("SourcemapAPI", d, {"id": starter_id});});
		MI.functions.process("YetiAPI", yeti, {"id": ("casper sleep").hashCode()});
		//MI.functions.process("GoogleSheets","1IsJ6_GEFXzPBWbMilEN--Ft20ryO88XynMoNVtFTUa4")
		
		/* Google Sheet Test */
		
		/*
		var sheetoverview = {};
		var sheetpoints = {};
		var so_offset = 5;
		var sp_offset = 8;
		var sheetid = "1IsJ6_GEFXzPBWbMilEN--Ft20ryO88XynMoNVtFTUa4"
		$.when(	
			$.getJSON("https://spreadsheets.google.com/feeds/cells/"+sheetid+"/"+"1"+"/public/full?alt=json", function(d) { sheetoverview = d;}) &&
			$.getJSON("https://spreadsheets.google.com/feeds/cells/"+sheetid+"/"+"2"+"/public/full?alt=json", function(d) { sheetpoints = d;})

		).then(function() {
			let sheetsc = {
				name: sheetoverview.feed.entry[so_offset].gs$cell.$t,
				description: sheetoverview.feed.entry[so_offset+1].gs$cell.$t,
				rootaddress: sheetoverview.feed.entry[so_offset+2].gs$cell.$t,
				rootgeocode: sheetoverview.feed.entry[so_offset+3].gs$cell.$t,
				measure: sheetoverview.feed.entry[so_offset+4].gs$cell.$t,
				points: {}				
			};
			
			for(let s in sheetpoints.feed.entry) {
				if(Number(sheetpoints.feed.entry[s].gs$cell.row) > 1) {
					if(sheetsc.points[Number(sheetpoints.feed.entry[s].gs$cell.row)-1] == undefined) { 
						sheetsc.points[Number(sheetpoints.feed.entry[s].gs$cell.row)-1] = {};
					}
					let position = (Number(sheetpoints.feed.entry[s].gs$cell.row)-1)*sp_offset-1+(Number(sheetpoints.feed.entry[s].gs$cell.col)+1);
					let header = position - (sp_offset*(Number(sheetpoints.feed.entry[s].gs$cell.row)-1));
				
					let point = sheetsc.points[Number(sheetpoints.feed.entry[s].gs$cell.row)-1];
					point[sheetpoints.feed.entry[header-1].gs$cell.$t] = sheetpoints.feed.entry[s].gs$cell.$t;
					
				}				
			}
			MI.functions.process("GoogleSheets", sheetsc, {"id": sheetid});
			console.log(sheetsc);
			
			// Do this manually since this Ajax request has to preprocessed right now.		
			// TODO What we should do is check in the "then" clause if the other ajax request is done. If it is, we can process in the callback
			// TODO ACTUALLY, maybe we shoudl make a discrete endpoint that does this processing, so here in the viewer we call only that..!!!
			MI.scview.map.fitBounds(MI.scview.map.getBounds());
			MI.scview.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
		
			viz_resize();
		
			if(MI.supplychains.length == 1) {
				MI.functions.cleanup();
			}
			
		});*/
	}			
	$.getJSON("lib/json/samples.json", function(d) { 
		for(var s in d) { 
			$("#load-samples").append('<option value="'+s+'">'+d[s]+'</option>');	
		} 
		$("#load-samples").append('<option value="other">Other...</option>');			
	});
	
	$(document).ajaxStop(function() {
		console.log(MI.scview.active_point);
		MI.scview.map.fitBounds(MI.scview.map.getBounds());
		MI.scview.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
		
		viz_resize();
		
		if(MI.scview.active_point == null) { console.log("trying center"); MI.functions.center(); }
		if(!(MI.attributes.initialized)) { MI.functions.cleanup(); }   
	});
	
	// Do Testing
	// ManifestTests();
});	