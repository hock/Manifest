

$( document ).ready(function() {	
	EditorInit();
}); // End document.ready
	
/** Setup Manifest JSON editor **/
function EditorInit() {		
	// Configure JSONEditor
	JSONEditor.defaults.iconlib = 'fontawesome5';
	JSONEditor.defaults.callbacks.template = {
	  "indexCount": function (jseditor,e) {
		  return Number(jseditor.parent.parent.key)+1;
	  }
	};
	JSONEditor.defaults.resolvers.unshift(function(schema) {
	  if(schema.type === "object" && schema.format === "") {
	 
	  }
	});
	
	// UI Setup
	$("#minfo-hamburger, #minfo").click(function() { $("#minfodetail").toggleClass("closed");  });				
	
    $("#save-manifest-btn").click(function() {
      // Get the value from the editor
		console.log(editor.getValue());

		var manifestjson = editor.getValue();
		var name = manifestjson.summary.name == "" ? "untitled" : manifestjson.summary.name.toLowerCase().replace(/\s/g, '-');
		SaveManifest( JSON.stringify(manifestjson), name+".json" );
	  
    });
	$("#file-input").change(function(e) {
	    var file = e.target.files[0];
	    if (!file) {
	      return;
	    }
		var fileName = e.target.value.split( '\\' ).pop();
		console.log(fileName);
		$("#file-input-label span").text(fileName);
		
	    var reader = new FileReader();
	    reader.onload = function(e) {
	      var contents = e.target.result;
	      editor.setValue(JSON.parse(contents));	
	    };
	    reader.readAsText(file);
	});
 	
	// Map setup
	var mapCenter = [40.730610,-73.935242];
	var map = L.map('map_chooser', {center : mapCenter, zoom : 3});
	L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
	    maxZoom: 12,
	    attribution: 'Terrain, Stamen',
	    worldCopyJump: false
	}).addTo(map);
	
	var marker = L.marker( mapCenter, {
		icon: L.divIcon({
			className: 'map_chooser-marker',
			html: "<div class='dot' style='background:#4d34db; border-color:#ffffff;'> </div>",
		})
	}).addTo(map);

	map.on('click', function(e) {
		var nm =  $(editor.geoinput).attr("name").replace(/\[/g, ".").replace(/\]/g, "");
		console.log(nm);
		var geoed = editor.getEditor(nm);
		console.log(geoed);
		console.log($(editor.geoinput));
		geoed.setValue(e.latlng.lat+","+e.latlng.lng);
	   //$(editor.geoinput).val(e.latlng.lat+","+e.latlng.lng);
	    UpdateChooserMarker(e.latlng.lat, e.latlng.lng, marker);
	});
	
	// Editor setup
    var editor = new JSONEditor(document.getElementById('editor_holder'),{
		ajax: true,
		geoinput: null,
		disable_edit_json: true,
		disable_properties: true,
		schema: {
			$ref: $("base").attr("href")+"json/schema/supplychain.json"
		}
	});

	editor.on('change', function() {
		$("input").focus(function() {
			if(!($(this).hasClass("geocoderinput"))) {
				CloseMap();
			}
		});
		$("textarea").focus(function() {
			CloseMap();
		});
		$(".geocoderinput").click(function() {
			editor.geoinput = this;
			$("#chooser_arrow").css("top",$(this).offset().top);
			OpenMap(map, marker, editor.geoinput);
		});
		$(".geocoderinput").keydown(function() {
			var inputvalue = $(this).val();
			
			if(inputvalue != "") {
				if(inputvalue.split(",")[1] != undefined) {
					UpdateChooserMarker(inputvalue.split(",")[0], inputvalue.split(",")[1], marker);
				}
			}
		});					
	});
}

/** Open the map chooser for manual geocoding **/
function OpenMap(map, marker, input) {
	$("#map_chooser_wrap").removeClass("closed");
	
	var mapCenter = [40.730610,-73.935242];
	var inputvalue = $(input).val();
	
	if(inputvalue != "") {
		if(inputvalue.split(",")[1] != undefined) {
			map.setView(new L.LatLng(inputvalue.split(",")[0], inputvalue.split(",")[1]), 3, {"animate": false});
			UpdateChooserMarker(inputvalue.split(",")[0], inputvalue.split(",")[1], marker);			
		} else { 
			map.setView(new L.LatLng(mapCenter[0], mapCenter[1]), 3, {"animate": false});
			UpdateChooserMarker(mapCenter[0], mapCenter[1], marker); 
		}
	} else { 
		$(input).val(mapCenter.toString());
		map.setView(new L.LatLng(mapCenter[0], mapCenter[1]), 3, {"animate": false});
		UpdateChooserMarker(mapCenter[0], mapCenter[1], marker); 
	}
	map.invalidateSize();			
}

/** Close the map chooser after manual geocoding **/
function CloseMap() {
	$("#map_chooser_wrap").addClass("closed");						
}

/** Update the chooser marker position (either because the user clicked, or because there was a value set in the input field) **/
function UpdateChooserMarker(lat, lng, marker) {
    marker
        .setLatLng([lat, lng])
        .bindPopup(marker.getLatLng().toString()+"<div class='confirm-loc-btn' onclick='CloseMap()'>Select</div>")
        .openPopup();
    return false;
}

/** Save a local JSON file representing the Manifest supply chain **/
function SaveManifest(text, filename){
	var a = document.createElement('a');
	a.setAttribute('href', 'data:text/plain;charset=utf-8,'+encodeURIComponent(text));
	a.setAttribute('download', filename);
	a.click();
}


