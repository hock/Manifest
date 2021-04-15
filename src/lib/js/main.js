$( document ).ready(function() {
	MI = new Manifest();
	MI.serviceurl = "http://hockbook.local/Manifest/src/services/";
	MI.jsoncollection = "json/samples.json";
	
	if(typeof(location.hash) != 'undefined' && location.hash != "") { 
		// TODO handle bad hashes gracefully and still load the page.
		
		var hash =  location.hash.substr(1).split("-");
		var hashtype = hash[0]; 
		hash = [hash.shift(), hash.join('-')];
		var hashid = hash[1]; 
		
		if(typeof(hashtype) == 'undefined' || typeof(hashid) == 'undefined') {
			$("#loader h2").text("[BAD REQUEST]");
		}
		
		if(hashtype == "smap") { 
			$.getJSON(MI.serviceurl + "?type=smap&id=" + hashid, function(d) { MI.functions.process("smap", d, {"id": hashid});}).fail(function() {
				$("#loader h2").text("[SMAP ID NOT FOUND]");
			}); 
		} else 	if(hashtype == "gsheet") { 
			$.getJSON(MI.serviceurl + "?type=gsheet&id=" + hashid, function(d) { MI.functions.process("gsheet", d, {"id": hashid.hashCode()});}).fail(function() {
				$("#loader h2").text("[GOOGLE SHEET NOT FOUND]");
			}); 
		}
	} else {
		var starters = [5333,2239,602,5228,4532,2737,5228];
		var starter_id = starters[Math.floor(Math.random() * starters.length)];
		 
		$.getJSON(MI.serviceurl + "?type=smap&id=" + starter_id, function(d) { MI.functions.process("smap", d, {"id": starter_id});});
		//$.getJSON(MI.serviceurl + "?type=gsheet&id=" + "1IsJ6_GEFXzPBWbMilEN--Ft20ryO88XynMoNVtFTUa4", function(d) { MI.functions.process("gsheet", d, {"id": ("1IsJ6_GEFXzPBWbMilEN--Ft20ryO88XynMoNVtFTUa4").hashCode()});});
		
		//MI.functions.process("yeti", yeti, {"id": ("casper sleep").hashCode()});
		
	}		
		
	$.getJSON(MI.jsoncollection, function(d) { 
		$("#collection-description").html(d.description);
		for(var s in d.collection) { 
			$("#load-samples").append('<option value="'+s+'">'+d.collection[s]+'</option>');	
		} 
		$("#load-samples").append('<option value="other">Other...</option>');			
	});
	
	$(document).ajaxStop(function() {
		MI.scview.map.fitBounds(MI.scview.map.getBounds());
		MI.scview.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
		
		viz_resize();
		
		if(MI.supplychains.length > 0) {
			if(MI.scview.active_point == null) { MI.functions.center(); }
			if(!(MI.attributes.initialized)) { MI.functions.cleanup(); }   
		}
	});
	
	// Do Testing
	// ManifestTests();
});	