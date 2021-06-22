$( document ).ready(function() {
	MI = new Manifest();
	MI.serviceurl = "https://supplystudies.com/manifest/services/";
	MI.jsoncollection = "json/samples.json";
	
	var hash = "";
	var hashtype = "";
	var hashid = "";
	
	var initialmap = false;
	if(typeof(location.hash) != 'undefined' && location.hash != "") { 
		// TODO handle bad hashes gracefully and still load the page.
		hash =  location.hash.substr(1).split("-");
		hashtype = hash[0]; 
		hash = [hash.shift(), hash.join('-')];
		hashid = hash[1]; 
		
		if(typeof(hashtype) == 'undefined' || typeof(hashid) == 'undefined') {
			$("#loader h2").text("[BAD REQUEST]");
		}
		switch(hashtype) {
			case "smap":
				initialmap = true;
				// TODO service should handle full urls to smap also.
				
				$.getJSON(MI.serviceurl + "?type=smap&id=" + hashid, function(d) { MI.functions.process("smap", d, {"id": hashid});}).fail(function() {
					$("#loader h2").text("[SMAP ID NOT FOUND]");
				});
				break;
			case "gsheet":
				initialmap = true;
				// TODO service should handle full urls to gsheet also.
				
				$.getJSON(MI.serviceurl + "?type=gsheet&id=" + hashid, function(d) { MI.functions.process("gsheet", d, {"id": hashid.hashCode()});}).fail(function() {
					$("#loader h2").text("[GOOGLE SHEET NOT FOUND]");
				}); 
		    	break;
			case "manifest":
				initialmap = true;
				// TODO Should add a service for this, service handles urls--should handle ids in a github repo also.
				
				$.getJSON(hashid, function(d) { MI.functions.process("manifest", d, {"id": (d.summary.name).hashCode()});}).fail(function() {
					$("#loader h2").text("[MANIFEST NOT FOUND]");
				});
				break;
			case "collection":
				initialmap = false;			
				MI.jsoncollection = hashid;
				break;
		  	default:
				console.log("Option not supported...");
		}
	} 
	

	//MI.functions.process("yeti", yeti, {"id": ("casper sleep").hashCode()});
	//	var starters = [5333,2239,602,5228,4532,2737,5228]; ... if(d.featured)

		
	$.getJSON(MI.jsoncollection, function(d) { 
		$("#collection-description").html(d.description);
		for(var s in d.collection) { 
			$("#load-samples-group").append('<option value="'+d.collection[s].id+'">'+d.collection[s].title+'</option>');	
		} 
		$("#load-samples-custom").append('<option value="url">URL</option>');	
		$("#load-samples-custom").append('<option value="file">FILE</option>');	
		
		
		if(hashtype != "" && hashtype != "collection") { return; } // If a specific hash is passed, we're done--otherwise load a starter map.
			
		var option = $("#load-samples").val().split("-");
		type = option[0];	
		option = [option.shift(), option.join('-')];
		id = option[1];
		
		var starter = d.collection[Math.floor(Math.random() * d.collection.length)];
		var starterstring = starter.id.split("-"); 
		var startertype = starterstring[0];
		starterstring = [starterstring.shift(), starterstring.join('-')];
		var starterid = starterstring[1]; 
		
		if(startertype == "gsheet" || startertype == "yeti") {
			starterid = starterid.hashCode();
		}
		$.getJSON(MI.serviceurl + "?type="+startertype+"&id=" + starterstring[1], function(d) { MI.functions.process(startertype, d, {"id": starterid});});	
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