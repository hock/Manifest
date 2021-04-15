function ManifestTests() {
	setInterval(TestLoad, 5000);
}

function TestLoad() {
	var options = $('#load-samples').find('option'),
    random = ~~(Math.random() * options.length);
	options.eq(random).prop('selected', true);
	var testid = options.eq(random).val().split("-")[1];
	
	$.getJSON("https://raw.githubusercontent.com/hock/smapdata/master/data/" + testid + ".geojson", 
			  function(d) { MI.functions.process("SourcemapAPI", d, {"id": testid});});
}

