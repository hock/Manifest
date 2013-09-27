/* Manifest =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
/* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/* Manifest Base Class */
function Manifest(url) {
	this.resourceurl = url;
	this.attributes = {
		'fullscreen':false,
		'initialpoi': {id: 0, length: 0},
		'linetype': LINETYPES.GREATCIRCLE
	};
	this.functions = {
		'fetch': SourcemapAPI,
		'center': InterestView,
		'visualize': Visualize,
		'search': SimpleSearch
	}
	this.ssc = new SpatialSupplyChain();
	Initialization(this.ssc.map);
}

function Initialization(map) {	
	$( window ).resize(function() { 
		$(".titlepanel").height($("#mtitle").height()); $("#mdescription").css("paddingTop", $("#mtitle").height()+60); 
	});	
	
	$("#fullscreen").click(function() {
		if(!ManifestInstance.attributes.fullscreen) {
			$(".vizwrapper").addClass("fullscreen"); $(".sidepanel").addClass("fullscreen");
			ManifestInstance.ssc.map.invalidateSize(); $( window ).resize();	
			ManifestInstance.attributes.fullscreen = true;
		} else {
			$(".vizwrapper").removeClass("fullscreen"); $(".sidepanel").removeClass("fullscreen");
			ManifestInstance.ssc.map.invalidateSize(); $( window ).resize();
			ManifestInstance.attributes.fullscreen = false;
		}		
	});

	$(".searchwidget").mouseover(function(e) { ManifestInstance.ssc.map.dragging.disable(); });
	$(".searchwidget").mouseout(function() { ManifestInstance.ssc.map.dragging.enable(); });
	$("#searchbar").keyup(function() { ManifestInstance.functions.search(); });
	$("#searchbar").mouseup(function() { ManifestInstance.functions.search(); });	
	
	/* Setup Visualizations */
	$(".vizwrapper iframe").each(function() { $(this) .attr("src", $(this) .attr("src") + "#" + id); });
}

/* Spatial Supply Chain, Leaflet Map */
function SpatialSupplyChain() {
	this.map = new L.Map('map', { worldCopyJump: true, center : new L.LatLng(0,0), zoom : 2 });
	
	/* Define Layers */
	var layerdefs = {		
	 	'graphite': new L.TileLayer('http://{s}.tiles.mapbox.com/v3/hock.map-9kffj8nv/{z}/{x}/{y}.png', {
			maxZoom: 18,
			detectRetina: true,
			attribution: 'Graphite, MapBox'
		}),
		'bluemarble': new L.TileLayer('http://{s}.tiles.mapbox.com/v3/mapbox.blue-marble-topo-bathy-jul-bw/{z}/{x}/{y}.png', {
			maxZoom: 8,
			detectRetina: true,
			attribution: 'Blue Marble, NASA'
		}),
		'terrain': new L.TileLayer('http://{s}.tiles.mapbox.com/v3/hock.map-74gr3ak8/{z}/{x}/{y}.png', {
			maxZoom: 16,
			detectRetina: true,
			attribution: 'Terrain, MapBox'
		})
	};
	
	var layerlist = {
		"Graphite Tiles": layerdefs.graphite,
		"Bluemarble Satellite": layerdefs.bluemarble,
		"Terrain": layerdefs.terrain		
	};

	/* Add Map Controls */
	this.map.layersControl = new L.Control.Layers(layerlist, null, { position: "topright" });
	this.map.addControl(this.map.layersControl);

	var searchwidget = L.control({ position: "bottomleft" });
	searchwidget.onAdd = function(map) {
		this._div = L.DomUtil.create('div', 'searchwidget');
	    L.DomEvent.disableClickPropagation(this._div);
		this.update();
		return this._div;
	};
	searchwidget.update = function(props) { this._div.innerHTML = '<fieldset><input type="text" placeholder="Filter..." id="searchbar" /></fieldset>';};
	searchwidget.addTo(this.map);
	
	var fullscreenwidget = L.control({ position: "bottomright" });
	fullscreenwidget.onAdd = function(map) {
		this._div = L.DomUtil.create('div', 'fullscreenwidget');
	    L.DomEvent.disableClickPropagation(this._div);
		this.update();
		return this._div;
	};	
	fullscreenwidget.update = function(props) { this._div.innerHTML = '<div id="fullscreen"> </div>'; };
	fullscreenwidget.addTo(this.map);
	
	/* Renderers */
	this.pointrender = function(feature, layer) {
		console.log(feature);
		var title = "Unnamed."
		if (typeof(feature.properties.title) != 'undefined') {
			title = feature.properties.title;
		}
		var description = ""
		if (typeof(feature.properties.description) != 'undefined') {
			description = feature.properties.description;
		}
					
		var popupContent = "<h2>" + title + "</h2><p>" + description + "</p>";
	
		if (feature.properties && feature.properties.popupContent) {
			popupContent += feature.properties.popupContent;
		}

		layer.on("mouseover", function (e) {
			layer.setStyle(ManifestInstance.ssc.styles.highlight);
		});
		layer.on("mouseout", function (e) {
			layer.setStyle(ManifestInstance.ssc.styles.point); 
		});
	
		layer.bindPopup(popupContent);
		layer.bindLabel(title);

		if (feature.properties && feature.properties.style && layer.setStyle) {
			layer.setStyle(e.properties.style);
		}
	};
	this.linerender = function(feature, layer) {
		var title = "Unnamed."
		if (typeof(feature.properties.title) != 'undefined') {
			title = feature.properties.title;
		}
		var description = ""
		if (typeof(feature.properties.description) != 'undefined') {
			description = feature.properties.description;
		}

		var popupContent = "<h2>" + title + "</h2><p>" + description + "</p>";
		if (feature.properties && feature.properties.popupContent) {
			popupContent += feature.properties.popupContent;
		}
		layer.bindPopup(popupContent);
		if (feature.properties && feature.properties.style && layer.setStyle) {
			layer.setStyle(e.properties.style);
		}
	}
	this.focus = function() {
		var id = $(this).attr("id").substring(6);
		for (i in map._layers) {
			if (typeof(map._layers[i].feature) != 'undefined') {
				if (map._layers[i].feature.properties.lid == id) {
					map._layers[i].openPopup();
					map.setView(map._layers[i]._latlng, map.getZoom());
				}
			} else if (typeof(map._layers[i].getAllChildMarkers) != 'undefined') {
				var childmarkers = map._layers[i].getAllChildMarkers();
				for (j in childmarkers) {
					if (typeof(childmarkers[j].feature) != 'undefined') {
						if (childmarkers[j].feature.properties.lid == id) {
							map._layers[i].spiderfy();
							childmarkers[j].openPopup();
							map.setView(childmarkers[j]._latlng, map.getZoom());
						}
					}
				}
			} 
		} 
	} 
	
	/* Styles */	
	this.styles = {
		'point': { fillColor: "#3498DB", color: "#3498DB", radius: 10, weight: 4, opacity: 1, fillOpacity: 1 },
		'highlight': { fillColor: "#ffffff", color: "#3498DB", radius: 10, weight: 4, opacity: 1, fillOpacity: 1 },
		'line': { color: "#dddddd", stroke: true, weight: 2, opacity: 0.4, smoothFactor: 0 }	
	};
	
	/* Final Map Setup */
	this.map.attributionControl.setPrefix('');
	this.map.addLayer(layerdefs.terrain);
}

/* SupplyChain Processor Functions */
function SourcemapAPI(id, map) {
	$.getJSON(ManifestInstance.resourceurl + "supplychains/" + id + "?f=geojson&callback=", function(d) {
		if (typeof(d.properties.title) != 'undefined') {
			document.title = d.properties.title + " - Manifest";				
			$("#mtitle").html('<a target="_blank" href="http://free.sourcemap.com/view/' + id + '">' + d.properties.title + '</a>');
			$(".titlepanel").height($("#mtitle").height()); $("#mdescription").css("paddingTop", $("#mtitle").height()+60);
		}
		if (typeof(d.properties.description) != 'undefined') { $("#mdescription").append("<p>"+d.properties.description+"</p>"); }
		for (i in d.features) {
			if (typeof(d.features[i].properties) != 'undefined') {
				if (typeof(d.features[i].properties.title) != 'undefined' && d.features[i].geometry.type != "LineString") {
					var ptitle = d.features[i].properties.title;
					var pdesc = d.features[i].properties.description ? "<p>" + d.features[i].properties.description + "</p>" : "";
					var pplace = d.features[i].properties.placename ? "<span>" + d.features[i].properties.placename + "</span>" : (d.features[i].properties.address ? "<span>" + d.features[i].properties.address + "</span>" : "");
					
					if(typeof(d.features[i].properties.description) != 'undefined') {
						if(d.features[i].properties.description.length > ManifestInstance.attributes.initialpoi.length) { ManifestInstance.attributes.initialpoi.length = d.features[i].properties.description.length; ManifestInstance.attributes.initialpoi.id = i;}
					}

					var li = $("<li id='local_" + i + "'><div></div>" + d.features[i].properties.title + " " + pplace + pdesc + "</li>");
					li.delegate( li, "click", ManifestInstance.ssc.focus);
					$("#mlist")
						.append(li);
				}
				d.features[i].properties.lid = i;
			}
		}

		points = $.extend(true, {}, d); lines = $.extend(true, {}, d);

		var plen = points.features.length; var llen = lines.features.length;
		while (plen--) { if (points.features[plen].geometry.type == GEOMTYPES.LINE) { points.features.splice(plen, 1); } }
		while (llen--) { if (lines.features[llen].geometry.type == GEOMTYPES.POINT) { lines.features.splice(llen, 1); } }

		if (ManifestInstance.attributes.linetype != LINETYPES.STRAIGHT) {
			for (var i = 0, len = lines.features.length; i < len; i++) {
				var fromx = lines.features[i].geometry.coordinates[0][0]; var fromy = lines.features[i].geometry.coordinates[0][1];
				var tox = lines.features[i].geometry.coordinates[1][0]; var toy = lines.features[i].geometry.coordinates[1][1];

				lines.features[i].geometry.type = GEOMTYPES.MULTI;
				if (ManifestInstance.attributes.linetype == LINETYPES.GREATCIRCLE) {
					var multipass = Grate.great_circle_route([fromx, fromy], [tox, toy], 7, map.getPixelBounds());
				} else {
					var multipass = Grate.bezier_route([fromx, fromy], [tox, toy], 7, map.getPixelBounds());
				}
				lines.features[i].geometry.coordinates = multipass;
			}
		}

		var markers = new L.MarkerClusterGroup();

		var pointLayer = new L.GeoJSON(points, { onEachFeature: ManifestInstance.ssc.pointrender });
		var lineLayer = new L.GeoJSON(lines, { onEachFeature: ManifestInstance.ssc.linerender });
		pointLayer.setStyle(ManifestInstance.ssc.styles.point);
		lineLayer.setStyle(ManifestInstance.ssc.styles.line);
		
		markers.addLayer(pointLayer);

		map.layersControl.addOverlay(markers, d.properties.title + " points.");
		map.layersControl.addOverlay(lineLayer, d.properties.title + " lines.");
		map.addLayer(lineLayer).addLayer(markers);
		map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 180)));
		
		ManifestInstance.functions.visualize();		
		ManifestInstance.functions.center();		
	});
}

/* Couch Processor Functions */
function CouchAPI(id, map) {
	$.getJSON(ManifestInstance.resourceurl + id, function(d) {
		if (typeof(d.properties.title) != 'undefined') {
			document.title = d.properties.title + " - Manifest";				
			$("#mtitle").html('<a target="_blank" href="http://sourcemap.com/view/' + id + '">' + d.properties.title + '</a>');
			$(".titlepanel").height($("#mtitle").height()); $("#mdescription").css("paddingTop", $("#mtitle").height()+60);
		}
		if (typeof(d.properties.description) != 'undefined') { $("#mdescription").append("<p>"+d.properties.description+"</p>"); }
		for (i in d.features) {
			if (typeof(d.features[i].properties) != 'undefined') {
				if (typeof(d.features[i].properties.title) != 'undefined' && d.features[i].geometry.type != "LineString") {
					var ptitle = d.features[i].properties.title;
					var pdesc = d.features[i].properties.description ? "<p>" + d.features[i].properties.description + "</p>" : "";
					var pplace = d.features[i].properties.placename ? "<span>" + d.features[i].properties.placename + "</span>" : (d.features[i].properties.address ? "<span>" + d.features[i].properties.address + "</span>" : "");
					
					if(typeof(d.features[i].properties.description) != 'undefined') {
						if(d.features[i].properties.description.length > ManifestInstance.attributes.initialpoi.length) { ManifestInstance.attributes.initialpoi.length = d.features[i].properties.description.length; ManifestInstance.attributes.initialpoi.id = i;}
					}

					var li = $("<li id='local_" + i + "'><div></div>" + d.features[i].properties.title + " " + pplace + pdesc + "</li>");
					li.delegate( li, "click", ManifestInstance.ssc.focus);
					$("#mlist")
						.append(li);
				}
				d.features[i].properties.lid = i;
			}
		}

		points = $.extend(true, {}, d); lines = $.extend(true, {}, d);

		var plen = points.features.length; var llen = lines.features.length;
		while (plen--) { if (points.features[plen].geometry.type == GEOMTYPES.LINE) { points.features.splice(plen, 1); } }
		while (llen--) { if (lines.features[llen].geometry.type == GEOMTYPES.POINT) { lines.features.splice(llen, 1); } }

		if (ManifestInstance.attributes.linetype != LINETYPES.STRAIGHT) {
			for (var i = 0, len = lines.features.length; i < len; i++) {
				var fromx = lines.features[i].geometry.coordinates[0][0]; var fromy = lines.features[i].geometry.coordinates[0][1];
				var tox = lines.features[i].geometry.coordinates[1][0]; var toy = lines.features[i].geometry.coordinates[1][1];

				lines.features[i].geometry.type = GEOMTYPES.MULTI;
				if (ManifestInstance.attributes.linetype == LINETYPES.GREATCIRCLE) {
					var multipass = Grate.great_circle_route([fromx, fromy], [tox, toy], 7, map.getPixelBounds());
				} else {
					var multipass = Grate.bezier_route([fromx, fromy], [tox, toy], 7, map.getPixelBounds());
				}
				lines.features[i].geometry.coordinates = multipass;
			}
		}

		var markers = new L.MarkerClusterGroup();

		var pointLayer = new L.GeoJSON(points, { onEachFeature: ManifestInstance.ssc.pointrender });
		var lineLayer = new L.GeoJSON(lines, { onEachFeature: ManifestInstance.ssc.linerender });
		pointLayer.setStyle(ManifestInstance.ssc.styles.point);
		lineLayer.setStyle(ManifestInstance.ssc.styles.line);
		
		markers.addLayer(pointLayer);

		map.layersControl.addOverlay(markers, d.properties.title + " points.");
		map.layersControl.addOverlay(lineLayer, d.properties.title + " lines.");
		map.addLayer(lineLayer).addLayer(markers);
		map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 180)));
		
		ManifestInstance.functions.visualize();		
		ManifestInstance.functions.center();		
	});
}

/* Miscellaneous Functions */
function InterestView() {
	map = ManifestInstance.ssc.map;

	for (i in map._layers) {
		if (typeof(map._layers[i].feature) != 'undefined') {
			if (map._layers[i].feature.properties.lid == ManifestInstance.attributes.initialpoi.id) {
				map.setView(map._layers[i]._latlng, 8, true);
			}
		} else if (typeof(map._layers[i].getAllChildMarkers) != 'undefined') {
			var childmarkers = map._layers[i].getAllChildMarkers();
			for (j in childmarkers) {
				if (typeof(childmarkers[j].feature) != 'undefined') {
					if (childmarkers[j].feature.properties.lid == ManifestInstance.attributes.initialpoi.id) {
						map.setView(childmarkers[j]._latlng, 8, true);
					}
				}
			}
		}
	}
	map.locate({setView : true});	
	$("#loader").remove();		
}

function Visualize() {
	map = ManifestInstance.ssc.map;
		
	$(map.layersControl._container.childNodes[1]).append('<div class="leaflet-control-layers-separator" style=""></div><div class="visualization-list"><label><input type="checkbox" class="chord-selector"><span>Chord Diagram</span></label></div>');	
	$(".chord-selector").click(function() {
		if($('.chord-selector').is(':checked')) { $("#chordviz").css("display", "block"); } else { $("#chordviz").css("display", "none"); }
	});
}

function SimpleSearch() {
	map = ManifestInstance.ssc.map;
	
	s = $("#searchbar").val().toLowerCase();
	for (i in map._layers) {
		if (typeof(map._layers[i].feature) != 'undefined') {
			if (map._layers[i].feature.geometry.type != "MultiLineString") {
				var found = false;
				for (k in map._layers[i].feature.properties) {
					if (String(map._layers[i].feature.properties[k]) .toLowerCase() .indexOf(s) != -1) { found = true; }
				}
				if (!(found)) {
					map._layers[i].setStyle({ fillOpacity: 0.2, opacity: 0.2 });
				} else {
					map._layers[i].setStyle({ fillOpacity: 1, opacity: 1 });
				}
			}
		} else if (typeof(map._layers[i].getAllChildMarkers) != 'undefined') {
			var childmarkers = map._layers[i].getAllChildMarkers();
			var found = false;

			for (j in childmarkers) {
				if (typeof(childmarkers[j].feature) != 'undefined') {
					for (k in childmarkers[j].feature.properties) {
						if (String(childmarkers[j].feature.properties[k]) .toLowerCase() .indexOf(s) != -1) { found = true; }
					}
				}
			}
			if (!(found)) { map._layers[i].setOpacity(0.2); } else { map._layers[i].setOpacity(1); }
		}
	}
}

/* Constants */
LINETYPES = {	
	'GREATCIRCLE': 'GREAT_CIRCLE_LINE',
	'BEZIER': 'BEZIER_LINE',
	'STRAIGHT': 'STRAIGHT_LINE'	
};

GEOMTYPES = {	
	'MULTI': 'MultiLineString',
	'LINE': 'LineString',
	'POINT': 'Point'	
};

COLORSETS = {	

};