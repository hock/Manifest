var serviceURL = "http://sourcemap.com/services/";

function init() {
	initUI();
	initMap();
}

function initUI() {
	$("#mapselect")
		.click(function() {
		$("#vizselector div")
			.removeClass("active");
		$(this)
			.addClass("active");
		$("#chordviz")
			.css("display", "none");
	});
	$("#chordselect")
		.click(function() {
		$("#vizselector div")
			.removeClass("active");
		$(this)
			.addClass("active");
		$("#chordviz")
			.css("display", "block");
	});
	$("#navsubmit")
		.click(function() {
		window.location.hash = $("#navid")
			.val();
		location.reload();
	});
}

function initViz(id) {
	$(".vizwrapper iframe")
		.each(function() {
		$(this)
			.attr("src", $(this)
			.attr("src") + "#" + id);
	});
	$("#navid")
		.val(id);
}

function initMap() {
	map = new L.Map('map', {
		worldCopyJump: true
	});
	var colors = ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];

	var graphiteUrl = 'http://{s}.tiles.mapbox.com/v3/hock.map-9kffj8nv/{z}/{x}/{y}.png'
	var graphiteAttribution = 'Graphite, MapBox';
	var graphite = new L.TileLayer(graphiteUrl, {
		maxZoom: 18,
		attribution: graphiteAttribution
	});

	var bluemarbleUrl = 'http://{s}.tiles.mapbox.com/v3/mapbox.blue-marble-topo-bathy-jul-bw/{z}/{x}/{y}.png';
	var bluemarbleAttribution = 'Blue Marble, NASA';
	var bluemarble = new L.TileLayer(bluemarbleUrl, {
		maxZoom: 8,
		attribution: bluemarbleAttribution
	});

	var baseMaps = {
		"Graphite": graphite,
		"Bluemarble": bluemarble
	};

	layersControl = new L.Control.Layers(baseMaps, null, {
		position: "topright"
	});
	map.addControl(layersControl);

	// Add search control	
	var searchwidget = L.control({
		position: "bottomleft"
	});
	searchwidget.onAdd = function(map) {
		this._div = L.DomUtil.create('div', 'searchwidget');
		this.update();
		return this._div;
	};

	searchwidget.update = function(props) {
		this._div.innerHTML = '<fieldset><input type="text" id="searchbar" /></fieldset>';
	};
	searchwidget.addTo(map);

	function controlEnter(e) {
		map.dragging.disable();
	}

	function controlLeave() {
		map.dragging.enable();
	}

	document.getElementsByClassName("searchwidget")[0].onmouseover = controlEnter;
	document.getElementsByClassName("searchwidget")[0].onmouseout = controlLeave;
	$("#searchbar")
		.keyup(search)
		.mouseup(search);

	map.attributionControl.setPrefix('');
	map.addLayer(bluemarble)
		.setView(new L.LatLng(0, 0), 2);
}

function fetchGeoJSON(geoid, linetype) {
	$.getJSON(serviceURL + "supplychains/" + geoid + "?f=geojson&callback=", function(geodata) {
		if (typeof(geodata.properties.title) != 'undefined') {
			$("#mtitle")
				.html('<a target="_blank" href="http://sourcemap.com/view/' + geoid + '">' + geodata.properties.title + '</a>');
		}
		if (typeof(geodata.properties.description) != 'undefined') {
			$("#mdescription")
				.text(geodata.properties.description);
		}
		for (i in geodata.features) {
			if (typeof(geodata.features[i].properties) != 'undefined') {
				if (typeof(geodata.features[i].properties.title) != 'undefined' && geodata.features[i].geometry.type != "LineString") {
					var ptitle = geodata.features[i].properties.title;
					var pdesc = geodata.features[i].properties.description ? "<p>" + geodata.features[i].properties.description + "</p>" : "";
					var pplace = geodata.features[i].properties.placename ? "<span>" + geodata.features[i].properties.placename + "</span>" : (geodata.features[i].properties.address ? "<span>" + geodata.features[i].properties.address + "</span>" : "");
					var li = $("<li id='local_" + i + "'><div></div>" + geodata.features[i].properties.title + " " + pplace + pdesc + "</li>");

					li.click(function() {
						for (i in map._layers) {
							if (typeof(map._layers[i].feature) != 'undefined') {
								if (map._layers[i].feature.properties.lid == ($(this)
									.attr("id"))
									.substring(6)) {
									map._layers[i].openPopup();
									map.setView(map._layers[i]._latlng, map.getZoom());
								}
							} else if (typeof(map._layers[i].getAllChildMarkers) != 'undefined') {
								var childmarkers = map._layers[i].getAllChildMarkers();
								for (j in childmarkers) {
									if (typeof(childmarkers[j].feature) != 'undefined') {
										if (childmarkers[j].feature.properties.lid == ($(this)
											.attr("id"))
											.substring(6)) {
											map._layers[i].spiderfy();
											childmarkers[j].openPopup();
											map.setView(childmarkers[j]._latlng, map.getZoom());
										}
									}
								}
							}
						}
					});
					$("#mlist")
						.append(li);
				}
				geodata.features[i].properties.lid = i;
			}
		}

		points = $.extend(true, {}, geodata);
		lines = $.extend(true, {}, geodata);

		var plen = points.features.length;
		var llen = lines.features.length;
		while (plen--) {
			if (points.features[plen].geometry.type == "LineString") {
				points.features.splice(plen, 1);
			}
		}
		while (llen--) {
			if (lines.features[llen].geometry.type == "Point") {
				lines.features.splice(llen, 1);
			}
		}

		if (linetype != "st") {
			for (var i = 0, len = lines.features.length; i < len; i++) {
				var fromx = lines.features[i].geometry.coordinates[0][0];
				var fromy = lines.features[i].geometry.coordinates[0][1];
				var tox = lines.features[i].geometry.coordinates[1][0];
				var toy = lines.features[i].geometry.coordinates[1][1];

				lines.features[i].geometry.type = "MultiLineString";
				if (linetype == "gc") {
					var multipass = Grate.great_circle_route([fromx, fromy], [tox, toy], 7, map.getPixelBounds());
				} else {
					var multipass = Grate.bezier_route([fromx, fromy], [tox, toy], 7, map.getPixelBounds());
				}
				lines.features[i].geometry.coordinates = multipass;
			}
		}

		var markers = new L.MarkerClusterGroup();

		var pointLayer = new L.GeoJSON(points, {
			onEachFeature: function(feature, layer) {
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
				layer.bindLabel(title);

				if (feature.properties && feature.properties.style && layer.setStyle) {
					layer.setStyle(e.properties.style);
				}
			}
		});

		var lineLayer = new L.GeoJSON(lines, {
			onEachFeature: function(feature, layer) {
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
		});

		var pointOptions = {
			radius: 10,
			fillColor: "#A23DD1",
			color: "#ffffff",
			weight: 4,
			opacity: 1,
			fillOpacity: 1
		};
		var lineOptions = {
			stroke: true,
			color: "#dddddd",
			weight: 2,
			opacity: 0.4,
			smoothFactor: 0
		};

		pointLayer.setStyle(pointOptions);
		lineLayer.setStyle(lineOptions);
		markers.addLayer(pointLayer);

		layersControl.addOverlay(markers, geodata.properties.title + " points.");
		layersControl.addOverlay(lineLayer, geodata.properties.title + " lines.");

		map.addLayer(lineLayer);
		map.addLayer(markers);

		var southWest = new L.LatLng(-80, 180),
			northEast = new L.LatLng(80, - 180),
			bounds = new L.LatLngBounds(southWest, northEast);
		map.setMaxBounds(bounds);
		$("#loader")
			.remove();

	});
}

function search(s) {
	s = $("#searchbar")
		.val()
		.toLowerCase();
	for (i in map._layers) {
		if (typeof(map._layers[i].feature) != 'undefined') {
			if (map._layers[i].feature.geometry.type != "MultiLineString") {
				var found = false;
				for (k in map._layers[i].feature.properties) {
					if (String(map._layers[i].feature.properties[k])
						.toLowerCase()
						.indexOf(s) != -1) {
						found = true;
					}
				}
				if (!(found)) {
					map._layers[i].setStyle({
						fillOpacity: 0.2,
						opacity: 0.2
					});
				} else {
					map._layers[i].setStyle({
						fillOpacity: 1,
						opacity: 1
					});
				}
			}
		} else if (typeof(map._layers[i].getAllChildMarkers) != 'undefined') {
			var childmarkers = map._layers[i].getAllChildMarkers();
			var found = false;

			for (j in childmarkers) {
				if (typeof(childmarkers[j].feature) != 'undefined') {
					for (k in childmarkers[j].feature.properties) {
						if (String(childmarkers[j].feature.properties[k])
							.toLowerCase()
							.indexOf(s) != -1) {
							found = true;
						}
					}
				}
			}
			if (!(found)) {
				map._layers[i].setOpacity(0.2);
			} else {
				map._layers[i].setOpacity(1);
			}
		}
	}
}
