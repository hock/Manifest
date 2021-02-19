$( document ).ready(function() {
	var smapurl = "";
	if(typeof(location.hash) != 'undefined' && location.hash != "") { 
		// TODO handle bad hashes gracefully and still load the page.
		MI = new Manifest();

		smapurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/";
		var hashtype = location.hash.substr(1).split("-")[0]; 
		var hashid = location.hash.substr(1).split("-")[1]; 
		
		if(hashtype == "smap") { $.getJSON(smapurl + hashid + ".geojson", function(d) { MI.functions.process("SourcemapAPI", d, {"id": hashid});}); }
		setTimeout(MI.functions.cleanup, 500);			
	} else {
		
		MI = new Manifest();

		smapurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/";
		var starters = [5333,2239,602,5228,4532,2737,5228];
		var starter_id = starters[Math.floor(Math.random() * starters.length)];
		
		$.getJSON(smapurl + starter_id + ".geojson", function(d) { MI.functions.process("SourcemapAPI", d, {"id": starter_id});});
		//MI.functions.process("YetiAPI", yeti, {"id": "yeti"});
	}			
	$.getJSON("data/samples.json", function(d) { 
		for(var s in d) { 
			$("#load-samples").append('<option value="'+s+'">'+d[s]+'</option>');	
		} 
		$("#load-samples").append('<option value="other">Other...</option>');		
		
	});
	
	
});	