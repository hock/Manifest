/* Manifest =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
/* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/* Manifest Base Class */
function Manifest(url) {
	this.smapcount = 0;
	this.resourceurl = url;
	this.attributes = {
		'fullscreen':false,
		'waypointscroll':false,
		'clustering':false,
		'initialpoi': {id: 0, length: 0},
		'linetype': LINETYPES.GREATCIRCLE
	};
	this.functions = {
		'fetch': SourcemapAPI,
		'center': CenterView, //InterestView,
		'visualize': Visualize,
		'cleanup': Cleanup,
		'search': SimpleSearch
	}
	this.ssc = new SpatialSupplyChain();
	Initialization(this.ssc.map);
}

function Initialization(map) {
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


}

/* Spatial Supply Chain, Leaflet Map */
function SpatialSupplyChain() {
	this.map = new L.Map('map', { worldCopyJump: true, center : new L.LatLng(40,-60), zoom : 3 });
	this.clustergroup;

	/* Define Layers */
	var layerdefs = {
	 	'dark': new L.TileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaG9jayIsImEiOiJXcDZvWTFVIn0.DDAXuVl0361Bfsb9chrH-A', {
			maxZoom: 18,
			detectRetina: true,
			attribution: 'Dark, MapBox'
		}),
		'light': new L.TileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaG9jayIsImEiOiJXcDZvWTFVIn0.DDAXuVl0361Bfsb9chrH-A', {
			maxZoom: 8,
			detectRetina: true,
			attribution: 'Light, Mapbox'
		}),
		'terrain': new L.TileLayer('http://tile.stamen.com/toner/{z}/{x}/{y}.png', {
			maxZoom: 12,
			detectRetina: true,
			attribution: 'Toner, Stamen'
		})
	};

	var layerlist = {
		"Dark Tiles": layerdefs.dark,
		"Light Tiles": layerdefs.light,
		"Toner": layerdefs.terrain
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
			if (layer.feature.properties && layer.feature.properties.style && layer.setStyle) {
				layer.setStyle(layer.feature.properties.style);
			} else {
				layer.setStyle(ManifestInstance.ssc.styles.point);
			}
		});

		layer.bindPopup(popupContent);
		layer.bindLabel(title);

		if (feature.properties && feature.properties.style && layer.setStyle) {
			layer.setStyle(feature.properties.style);
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
	this.focus = function(pid) {
		var id = (typeof(pid) != 'object' ? pid : $(this).attr("id").substring(6));

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
	this.map.on('popupopen', function(e){
		//$('.sidepanel').scrollTo($("li#local_"+e.popup._source.feature.properties.lid),  500, { offset:{ top:-1*($("#mtitle").outerHeight()),left:0 }});
	});

	this.map.attributionControl.setPrefix('');
	this.map.addLayer(layerdefs.terrain);
}

/* SupplyChain Processor Functions */
function SourcemapAPI(id, map, layerstyle, start) {
	$.getJSON(ManifestInstance.resourceurl + id + ".geojson", function(d, start) {
		ManifestInstance.smapcount++;
		
			$("#mdetails").append('<div class="mtitle"><a target="_blank" href="#'+id+'">' + d.properties.title + '</a></div>');
			temptitle = "";
			$( ".mtitle").text(function(i, t){
				temptitle += i == 0 ? t : ' + ' + t;
			});
			document.title = temptitle + " - Manifest";
		
		if (typeof(d.properties.description) != 'undefined') { $("#mdetails").append("<p class='mdescription'>"+d.properties.description+"</p>"); }
		for (i in d.features) {
			templid = 1000*ManifestInstance.smapcount+Number(i);
			if (typeof(d.features[i].properties) != 'undefined') {
				if (typeof(d.features[i].properties.title) != 'undefined' && d.features[i].geometry.type != "LineString") {
					var ptitle = d.features[i].properties.title;
					var pdesc = d.features[i].properties.description ? "<p>" + d.features[i].properties.description + "</p>" : "";
					var pplace = d.features[i].properties.placename ? "<p class='placename'>" + d.features[i].properties.placename + "</p>" : (d.features[i].properties.address ? "<p>" + d.features[i].properties.address + "</p>" : "");

					if(typeof(d.features[i].properties.description) != 'undefined') {
						if(d.features[i].properties.description.length > ManifestInstance.attributes.initialpoi.length) { ManifestInstance.attributes.initialpoi.length = d.features[i].properties.description.length; ManifestInstance.attributes.initialpoi.id = i;}
					}

					// Set style
					if(typeof(layerstyle)!='undefined') { d.features[i].properties.style=layerstyle; }
					else {d.features[i].properties.style=ManifestInstance.ssc.styles.point;}
					var li = $("<li id='local_" + templid + "'><div class='dot' style='background:"+d.features[i].properties.style.fillColor+"; border-color:"+d.features[i].properties.style.color+";'></div>" + d.features[i].properties.title + " " + pplace + pdesc + "</li>");
					li.delegate( li, "click", ManifestInstance.ssc.focus);
					$("#mdetails")
						.append(li);
				}
				d.features[i].properties.lid = templid;
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

		ManifestInstance.ssc.clustergroup = new L.MarkerClusterGroup();

		var pointLayer = new L.GeoJSON(points, { onEachFeature: ManifestInstance.ssc.pointrender });
		pointLayer.on('click', function(e){
			console.log(e.layer._popup._source.feature.properties.lid);
			$('.sidepanel').scrollTo($("li#local_"+e.layer._popup._source.feature.properties.lid),  500, {offset: -1*($(".mtitle").outerHeight())});
		});

		if(lines.features.length == 0) {
			ManifestInstance.ssc.detailstyle = "points";
		} else {
			ManifestInstance.ssc.detailstyle = "lines";
			var lineLayer = new L.GeoJSON(lines, { onEachFeature: ManifestInstance.ssc.linerender });
			lineLayer.setStyle(ManifestInstance.ssc.styles.line);
			map.layersControl.addOverlay(lineLayer, d.properties.title + " lines.");
			map.addLayer(lineLayer);
		}

		if(ManifestInstance.attributes.clustering) {
			ManifestInstance.ssc.clustergroup.addLayer(pointLayer);
			map.layersControl.addOverlay(ManifestInstance.ssc.clustergroup, d.properties.title + " points.");
			map.addLayer(ManifestInstance.ssc.clustergroup);

		} else {
			map.layersControl.addOverlay(pointLayer, d.properties.title + " points.");
			map.addLayer(pointLayer);
		}

		map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 180)));

		ManifestInstance.functions.visualize(id, d.properties.title);

		if(start) {
			ManifestInstance.functions.cleanup();
		}
	});
}

/* Couch Processor Functions */
function CouchAPI(id, map) {
	$.getJSON(ManifestInstance.resourceurl + id, function(d) {
		if (typeof(d.properties.title) != 'undefined') {
			document.title = d.properties.title + " - Manifest";
			$("#mtitle").html('<a target="_blank" href="http://sourcemap.com/view/' + id + '">' + d.properties.title + '</a>');
		}
		if (typeof(d.properties.description) != 'undefined') { $("#mdescription").append("<p>"+d.properties.description+"</p>"); }
		for (i in d.features) {
			templid = 1000*ManifestInstance.smapcount+Number(i);
			
			if (typeof(d.features[i].properties) != 'undefined') {
				if (typeof(d.features[i].properties.title) != 'undefined' && d.features[i].geometry.type != "LineString") {
					var ptitle = d.features[i].properties.title;
					var pdesc = d.features[i].properties.description ? "<p>" + d.features[i].properties.description + "</p>" : "";
					var pplace = d.features[i].properties.placename ? "<span>" + d.features[i].properties.placename + "</span>" : (d.features[i].properties.address ? "<span>" + d.features[i].properties.address + "</span>" : "");

					if(typeof(d.features[i].properties.description) != 'undefined') {
						if(d.features[i].properties.description.length > ManifestInstance.attributes.initialpoi.length) { ManifestInstance.attributes.initialpoi.length = d.features[i].properties.description.length; ManifestInstance.attributes.initialpoi.id = i;}
					}

					var li = $("<li id='local_" + templid + "'><div></div>" + d.features[i].properties.title + " " + pplace + pdesc + "</li>");
					li.delegate( li, "click", ManifestInstance.ssc.focus);
					$("#mlist")
						.append(li);
				}
				d.features[i].properties.lid = templid;
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
		
	});
}

/* Miscellaneous Functions */
function Cleanup() {
	ManifestInstance.functions.center();
	$("#loader").remove();
}

function CenterView() {
	map = ManifestInstance.ssc.map;
	map.setView(new L.LatLng(40, -60), 3);
}
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
	map.locate({setView : true, maxZoom: map.getZoom()});
}

function Visualize(id, title) {
	map = ManifestInstance.ssc.map;
	console.log
	if(ManifestInstance.ssc.detailstyle != "points") {
		$(map.layersControl._container.childNodes[1]).append('<div class="leaflet-control-layers-separator" style=""></div><div class="visualization-list"><label><input type="checkbox" id="'+id+'" class="chord-selector"><span>'+title+' Chord Diagram</span></label></div>');
		$(".chord-selector").click(function() {
			console.log(this);
			if($(this).is(':checked')) { 
				$("#chordviz").css("visibility", "visible"); 
				document.getElementsByName("chordframe")[0].src = "lib/viz/chord/chord.html#"+$(this).attr("id");
			} else { 
				document.getElementsByName("chordframe")[0].src = "";		
				$("#chordviz").css("visibility", "hidden"); 
			}
		});
	}
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
