document.addEventListener('DOMContentLoaded', function(event) { Start(); });

	
/** Setup Manifest JSON editor **/
function Start() {		
	// Configure JSONEditor
	JSONEditor.defaults.iconlib = 'fontawesome5';
	JSONEditor.defaults.callbacks.template = { 'indexCount': function (jseditor,e) { return Number(jseditor.parent.parent.key)+1; } };
	JSONEditor.defaults.resolvers.unshift(function(schema) { if(schema.type === 'object' && schema.format === '') { } });
	
	// UI Setup
	document.querySelectorAll('#minfo-hamburger, #minfo').forEach(el => { 
		el.addEventListener('click', (e) => { document.getElementById('minfodetail').classList.toggle('closed'); }); });	
	
	document.getElementById('save-manifest-btn').addEventListener('click', (e) => { 
		let manifestjson = editor.getValue();
		let mname = manifestjson.summary.name === '' ? 'untitled' : manifestjson.summary.name.toLowerCase().replace(/\s/g, '-');
		SaveManifest( JSON.stringify(manifestjson), mname );
	});			

	document.getElementById('file-input').addEventListener('change', (e) => { 
	    let file = e.target.files[0];
	    if (!file) { return; }
		
		let fileName = e.target.value.split( '\\' ).pop();
		document.getElementById('file-input-label-text').innerHTML = fileName;
		
	    let reader = new FileReader();
	    reader.onload = function(e) { editor.setValue(JSON.parse(e.target.result)); };
	    reader.readAsText(file);
	});	
	
	// Map setup
	let mapCenter = [40.730610,-73.935242];
	let map = L.map('map_chooser', {center : mapCenter, zoom : 3});
	L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', { maxZoom: 12, attribution: 'Terrain, Stamen', worldCopyJump: false }).addTo(map);
	
	let marker = L.marker( mapCenter, {
		icon: L.divIcon({
			className: 'map_chooser-marker',
			html: '<div class="dot" style="background:#4d34db; border-color:#ffffff;"> </div>'
		})
	}).addTo(map);

	map.on('click', function(e) {
		let geoed = editor.getEditor(editor.geoinput.getAttribute('name').replace(/\[/g, '.').replace(/\]/g, ''));
		geoed.setValue(e.latlng.lat+','+e.latlng.lng);
	    UpdateChooserMarker(e.latlng.lat, e.latlng.lng, marker);
	});

	// Editor setup
    let editor = new JSONEditor(document.getElementById('editor_holder'),{
		ajax: true, geoinput: null, disable_edit_json: true, disable_properties: true,
		schema: { $ref: document.baseURI+'json/schema/supplychain.json' }
	});

	editor.on('change', function() {
		document.querySelectorAll('input, textarea').forEach(el => { el.addEventListener('focus', (e) => { 
			if (!( el.classList.contains('geocoderinput') )) { CloseMap(); } }); });	
		document.querySelectorAll('.geocoderinput').forEach(el => { el.addEventListener('click', (e) => { 
			editor.geoinput = el;
			document.getElementById('chooser_arrow').style.top = editor.geoinput.getBoundingClientRect().top+window.scrollY+'px';
			OpenMap(map, marker, editor.geoinput);
		 }); });	
		document.querySelectorAll('.geocoderinput').forEach(el => { el.addEventListener('keydown', (e) => { 
			let inputvalue = el.value;
			if (inputvalue !== '') { if (typeof inputvalue.split(',')[1] != 'undefined') { UpdateChooserMarker(inputvalue.split(',')[0], inputvalue.split(',')[1], marker);}}
		}); });				
	});
}

/** Open the map chooser for manual geocoding **/
function OpenMap(map, marker, input) {
	document.getElementById('map_chooser_wrap').classList.remove('closed');
	let mapCenter = [40.730610,-73.935242], inputvalue = input.value;
	
	if (inputvalue != '') {
		if (inputvalue.split(',')[1] != undefined) {
			map.setView(new L.LatLng(inputvalue.split(',')[0], inputvalue.split(',')[1]), 3, {'animate': false});
			UpdateChooserMarker(inputvalue.split(',')[0], inputvalue.split(',')[1], marker);			
		} else { 
			map.setView(new L.LatLng(mapCenter[0], mapCenter[1]), 3, {'animate': false});
			UpdateChooserMarker(mapCenter[0], mapCenter[1], marker); 
		}
	} else { 
		input.value = mapCenter.toString();
		input.dispatchEvent(new Event('change'));
		map.setView(new L.LatLng(mapCenter[0], mapCenter[1]), 3, {'animate': false});
		UpdateChooserMarker(mapCenter[0], mapCenter[1], marker); 
	}
	map.invalidateSize();			
}

/** Close the map chooser after manual geocoding **/
function CloseMap() { document.getElementById('map_chooser_wrap').classList.add('closed'); }

/** Update the chooser marker position (either because the user clicked, or because there was a value set in the input field) **/
function UpdateChooserMarker(lat, lng, marker) {
    marker.setLatLng([lat, lng]).bindPopup(marker.getLatLng().toString()+'<div class="confirm-loc-btn" onclick="CloseMap()">Select</div>').openPopup();
    return false;
}

/** Save a local JSON file representing the Manifest supply chain **/
function SaveManifest(text, filename){
	let a = document.createElement('a');
	a.setAttribute('href', 'data:text/json;charset=utf-8,'+encodeURIComponent(text)); a.setAttribute('download', filename+'.json'); a.click();
}


