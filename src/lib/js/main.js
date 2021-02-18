$( document ).ready(function() {
	var smapurl = "";
	if(typeof(location.hash) != 'undefined' && location.hash != "") { 
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
		MI.functions.process("YetiAPI", yeti, {"id": "yeti"});
		
		setTimeout(MI.functions.cleanup, 500);		
	}			
	
	$.getJSON("lib/data/samples.json", function(d) { 
		for(var s in d) { 
			$("#load-samples").append('<option value="'+s+'">'+d[s]+'</option>');	
		} 
		$("#load-samples").append('<option value="other">Other...</option>');		
		
	});
	
	$("#load-samples").change(function() {
		if($("#load-samples option:selected").val() == "other") {
			$("#load-samples").css("width","20%");
			$("#load-samples-input").removeClass("closed");
		} else {
			$("#load-samples").css("width","100%");
			$("#load-samples-input").addClass("closed");
		}
	});

	$("#load-samples-btn").click(function() {
		var loadurl = "";
		
		if($("#load-samples").val() == "other") {
			loadurl = $("#load-samples-input").val();
			if (loadurl.toLowerCase().indexOf("https://raw.githubusercontent.com/hock/smapdata/master/data/") >= 0) {
				var id = loadurl.substring(60).split(".")[0];
				$.getJSON(loadurl, function(d) { MI.functions.process("SourcemapAPI", d, {"id": id});});					
			}
		} else {
			var sample = $("#load-samples").val().split("-");
			if(sample[0] == "smap") {
				loadurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/" + sample[1] + ".geojson";
				$.getJSON(loadurl, function(d) { MI.functions.process("SourcemapAPI", d, {"id": sample[1]});});
			}		
		}
	});
	
	$("#viz-choices").change(function() {
		visualize($("#viz-choices").val());		
	});
	$("#measure-choices").change(function() {
		ui_measuresort();		
		visualize($("#viz-choices").val());	
	});
	
	$( window ).resize(function() {
		if(!($(".vizwrap").hasClass("closed"))) {
			viz_resize();
		}			
	});
});	