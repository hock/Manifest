/* Manifest =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
/* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/* Manifest Base Class /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

function Manifest() {
	this.supplychains = [];
	this.attributes = {
		'clustering':false,
		'initialpoi': {id: 0, length: 0},
		'linetype': LINETYPES.GREATCIRCLE,
		'tiletypes': TILETYPES,
		'measures': MEASURES,
		'globes': GLOBES
	};
	this.functions = {
		'process': SCProcessor,
		'center':  CenterView, // OR InterestView
		//'visualize': Visualize,
		'graph': SCGraph,
		'cleanup': Cleanup,
		'search': SimpleSearch
	};
	this.visualization = "map";
	this.scview = new SpatialSupplyChain();
}

/* Spatial Supply Chain, Leaflet Map =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
function SpatialSupplyChain() {
	this.map = new L.Map('map', { preferCanvas: true, worldCopyJump: true, center : new L.LatLng(40,-60), zoom : 3 });
	this.clustergroup = null;

	/* Define Layers */
	var layerdefs = {
	 	'dark': new L.TileLayer(TILETYPES.DARK, { maxZoom: 18, detectRetina: true, attribution: 'Dark, MapBox' }),
		'light': new L.TileLayer(TILETYPES.LIGHT, { maxZoom: 8, detectRetina: true, attribution: 'Light, Mapbox' }),
		'terrain': new L.TileLayer(TILETYPES.TERRAIN, { maxZoom: 12, detectRetina: true, attribution: 'Terrain, Stamen' })
	};

	var layerlist = { "Dark Tiles": layerdefs.dark, "Light Tiles": layerdefs.light, "Terrain": layerdefs.terrain };

	/* Add Search Controls */

	$("#searchbar").bind('keyup mouseup', function() { MI.functions.search(); });
	
	/* Renderers /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
	/* Pointrender */
	this.pointrender = function(feature, layer) {
		var title = (typeof(feature.properties.title) != 'undefined') ? feature.properties.title : "Unnamed.";
		var description = (typeof(feature.properties.description) != 'undefined') ? feature.properties.description : "";

		var popupContent = "<h2><i class='fas fa-tag'></i> " + title + "</h2><p>" + Autolinker.link(description) + "</p>";
		if (feature.properties && feature.properties.popupContent) { popupContent += feature.properties.popupContent;}
		
		layer.bindPopup(popupContent);
		layer.bindTooltip(title);	
		
		layer.on("click", function(e) {  
			var toolTip = layer.getTooltip();
        	if (toolTip) { layer.closeTooltip(toolTip);}
		});
		layer.on("mouseover", function (e) { if(layer.options.fillOpacity != 0.1) { layer.setStyle(MI.scview.styles.highlight); } });
		layer.on("mouseout", function (e) {

			if (layer.feature.properties && layer.feature.properties.style) {
				layer.setStyle(layer.feature.properties.style);
				var measure_sort = $("#measure-choices").val();
				var radius = 8;
				if(feature.properties.measures != undefined) {
			
					if(feature.properties.measures[measure_sort] != undefined) {			
						radius = feature.properties.style.radius = 8 + 100 * feature.properties.measures[measure_sort] / MI.supplychains[feature.properties.scid].details.measures[measure_sort].max;
					}
				}
				radius = radius || 0;
				layer.setStyle({radius: radius});
				
				// Not Great!
				if($("#searchbar").val() != "") { MI.functions.search();}
			}
		});	
	
		var measure_sort = $("#measure-choices").val();
		if(feature.properties.measures != undefined) {
			
			if(feature.properties.measures[measure_sort] != undefined) {			
				feature.properties.style.radius = 8 + 100 * feature.properties.measures[measure_sort] / MI.supplychains[feature.properties.scid].details.measures[measure_sort].max;
			}
		}
		
		if (feature.properties && feature.properties.style) { layer.setStyle(feature.properties.style); }
	};
	
	/* Linerender */
	this.linerender = function(feature, layer) {
		var title = "Unnamed.";
		if (typeof(feature.properties.title) != 'undefined') {
			title = feature.properties.title;
		}
		var description = "";
		if (typeof(feature.properties.description) != 'undefined') {
			description = feature.properties.description;
		}

		var popupContent = "<h2>" + title + "</h2><p>" + Autolinker.link(description) + "</p>";
		if (feature.properties && feature.properties.popupContent) {
			popupContent += feature.properties.popupContent;
		}
		layer.bindPopup(popupContent);
		if (feature.properties && feature.properties.style && layer.setStyle) {
			layer.setStyle(e.properties.style);
		}
	};
	
	/* Focus Function */
	this.focus = function(pid) {
		var id = (typeof(pid) != 'object' ? pid : $(this).attr("id").substring(6));

		for (var i in MI.scview.map._layers) {
			if (typeof(MI.scview.map._layers[i].feature) != 'undefined') {
				if (MI.scview.map._layers[i].feature.properties.lid == id) {
					MI.scview.active_point = MI.scview.map._layers[i];
					MI.scview.map._layers[i].openPopup();
					MI.scview.map.setView(MI.scview.map._layers[i]._latlng, MI.scview.map.getZoom());
				}
			} else if (typeof(MI.scview.map._layers[i].getAllChildMarkers) != 'undefined') {
				var childmarkers = MI.scview.map._layers[i].getAllChildMarkers();
				for (var j in childmarkers) {
					if (typeof(childmarkers[j].feature) != 'undefined') {
						if (childmarkers[j].feature.properties.lid == id) {
							MI.scview.map._layers[i].spiderfy();
							MI.scview.active_point = childmarkers[j];
							childmarkers[j].openPopup();
							MI.scview.map.setView(childmarkers[j]._latlng, MI.scview.map.getZoom());
						}
					} // Get Childmarker feature
				} // Iterate Childmarkers
			} // Get all Childmarkers
		} // Iterate Map Layers
	}; // Focus Function
	
	/* Styles */
	this.styles = {
		'point': { fillColor: "#eeeeee", color: "#999999", radius: 8, weight: 4, opacity: 1, fillOpacity: 1 },
		'highlight': { fillColor: "#ffffff" },
		'line': { color: "#dddddd", stroke: true, weight: 2, opacity: 0.4, smoothFactor: 0 }
	};
	this.colorchoice = Colorize(COLORSETS);
	this.map.attributionControl.setPrefix('');
	if($("body").hasClass("light")) {
		this.map.addLayer(layerdefs.terrain);
	} else if($("body").hasClass("dark")) { 
		this.map.addLayer(layerdefs.dark);		
	}
	
	// General UI
	$(".fullscreen-menu").click(function() { ui_fullscreen(); });	
	$("#minfo, #minfo-hamburger").click(function() { ui_hamburger(); });			
	
}

/* SupplyChain Processor Functions */
function SCProcessor(type, d, options) {
	if(type == "SourcemapAPI") { SourcemapAPI(d, options); } 
	else if(type == "YetiAPI") { YetiAPI(d, options);}
}

function SourcemapAPI(d, options) {
	for(var s in MI.supplychains) { if(MI.supplychains[s].details.id == options.id) {return;}}
	d.details = options; d.details.layers = []; d.details.measures = {};
	d.mapper = {}; // Try to map to graph
	
	var scid = MI.supplychains.push(d);
	
	var globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];
	var moffset = 0;
	$('.mheader').each(function(i) { moffset += $(this).outerHeight(); });
	
	// Set default layerstyle
	if(!options.style) { 
		options.style = Object.assign({}, MI.scview.styles.point); 
		var color = MI.scview.colorchoice();
		options.style.fillColor = color[0];
		options.style.color = color[1];
	}
	
	$("#manifestlist").append(
		'<div class="mheader" id="mheader-'+d.details.id+'"style="top:'+moffset+'px;">'+
			'<div class="mtitle" style="background:'+d.details.style.fillColor+'; color:'+d.details.style.color+';">'+
				'<a><i class="fas fa-globe-'+globe+'"></i> ' + d.properties.title + '</a>' +
				'<i class="fas fa-bars menu-map"></i> <i class="fas fa-window-close close-map"></i>'+
			'</div>'+
		'</div>'				
	);
	
	// UI Setup
	$("#mheader-"+d.details.id).click(function() { ui_mheader(d.details.id);});	
	$("#mheader-"+d.details.id+" .close-map").click(function() { ui_mclose(d.details.id);});	
	$("#mheader-"+d.details.id+" .menu-map").click(function() { ui_mmenu(d.details.id);});	

	temptitle = "";
	$( ".mtitle").text(function(i, t){ temptitle += i == 0 ? t : ' + ' + t; });
	document.title = temptitle + " - Manifest";

	$(".mdetails").addClass("closed");
	$(".mlist").addClass("closed");
	
	$("#manifestlist").append('<div class="mdetails" id="mdetails-'+d.details.id+'"></div>');	
	if (typeof(d.properties.description) != 'undefined') { $("mdetails-"+d.details.id).append(
		'<p class="mdescription"">'+Autolinker.link(d.properties.description)+'</p>'
	);}
	$("#manifestlist").append('<ul class="mlist" id="mlist-'+d.details.id+'"></ul>');

	// Setup Layer
	for (var i in d.features) {
		templid = 1000*MI.supplychains.length+Number(i);
		if (typeof(d.features[i].properties) != 'undefined') {
			if (typeof(d.features[i].properties.title) != 'undefined' && d.features[i].geometry.type != "LineString") {
				var ptitle = d.features[i].properties.title ? d.features[i].properties.title : "Untitled Point";
				var pdesc = d.features[i].properties.description ? "<p>" + d.features[i].properties.description + "</p>" : "";
				d.features[i].properties.placename = d.features[i].properties.placename ? d.features[i].properties.placename : (d.features[i].properties.address ? d.features[i].properties.address : ""); var pplace = d.features[i].properties.placename;
				
				// Try to map to graph
				d.mapper["map"+d.features[i].properties.placename.replace(/[^a-zA-Z0-9]/g, '')+d.features[i].properties.title.replace(/[^a-zA-Z0-9]/g, '')] = d.features[i]; 
				
				// Setup Measures
				d.features[i].properties.measures = {};
				var measure = d.features[i].properties.measures;				
				var measure_list = MI.attributes.measures;
				
				pdesc += "<p class='measures'>";
				var measuredesc = [];
				for(var m in measure_list) {					
					if(d.features[i].properties[measure_list[m].measure] != undefined) { 
						if(d.details.measures[measure_list[m].measure] == undefined) {
							d.details.measures[measure_list[m].measure] = {"max":1,"min":0}; 
						}
						d.details.measures[measure_list[m].measure] = {
							"max": Number(d.details.measures[measure_list[m].measure].max) +
								   Number(d.features[i].properties[measure_list[m].measure]),
							"min": 0
						};		
						measure[measure_list[m].measure] = d.features[i].properties[measure_list[m].measure]; 
						measuredesc.push(measure_list[m].measure + ": " +
							 			 d.features[i].properties[measure_list[m].measure] +  
										 measure_list[m].unit);						
					}
				}
				pdesc += measuredesc.join(" / ")+"</p>";
				d.features[i].properties.scid = scid-1;
				
				// Set Style
				d.features[i].properties.style=d.details.style;
				var li = $(						
					"<li id='local_" + templid + "'>"+
						"<div class='dot' style='background:"+d.details.style.fillColor+"; border-color:"+d.details.style.color+";'></div>"+
					"<h5 class='mdetail_title'>" + ptitle + "</h5> " + pplace + Autolinker.link(pdesc) + 
					"</li>"						
				);
				li.delegate( li, "click", MI.scview.focus);
				$("#mlist-"+d.details.id).append(li);
			}
			d.features[i].properties.lid = templid;
		}
	}
	ui_measurelist();
	
	// Setup Lines
	points = $.extend(true, {}, d); lines = $.extend(true, {}, d);

	var plen = points.features.length; var llen = lines.features.length;
	while (plen--) { if (points.features[plen].geometry.type == GEOMTYPES.LINE) { points.features.splice(plen, 1); } }
	while (llen--) { if (lines.features[llen].geometry.type == GEOMTYPES.POINT) { lines.features.splice(llen, 1); } }

	if (MI.attributes.linetype != LINETYPES.STRAIGHT) {
		for (var k = 0, len = lines.features.length; k < len; k++) {
			var fromx = lines.features[k].geometry.coordinates[0][0]; var fromy = lines.features[k].geometry.coordinates[0][1];
			var tox = lines.features[k].geometry.coordinates[1][0]; var toy = lines.features[k].geometry.coordinates[1][1];

			lines.features[k].geometry.type = GEOMTYPES.MULTI;
			var multipass = null;
			if (MI.attributes.linetype == LINETYPES.GREATCIRCLE) {
				multipass = Grate.great_circle_route([fromx, fromy], [tox, toy], 7, MI.scview.map.getPixelBounds());
			} else {
				multipass = Grate.bezier_route([fromx, fromy], [tox, toy], 7, MI.scview.map.getPixelBounds());
			}
			lines.features[k].geometry.coordinates = multipass;
		}
	}

	// Setup Pointlayer
	var pointLayer = new L.geoJSON(points, { onEachFeature: MI.scview.pointrender, pointToLayer: function (feature, latlng) { 
		return L.circleMarker(latlng, MI.scview.styles.points); 
	} });	
	pointLayer.on('click', function(e){	ui_pointclick(e); });

	// Prepare to add layers
	maplayergroup = L.layerGroup();
		
	// Set Lines (if lines)
	if(lines.features.length == 0) { MI.scview.detailstyle = "points";
	} else {
		MI.scview.detailstyle = "lines";
		var lineLayer = new L.geoJSON(lines, { onEachFeature: MI.scview.linerender, style: MI.scview.styles.line });
		d.details.layers.push(maplayergroup.addLayer(lineLayer));		
	}
	
	// Set Pointlayer or Clusterview		
	MI.scview.clustergroup = new L.MarkerClusterGroup();
	if(MI.attributes.clustering) {
		MI.scview.clustergroup.addLayer(pointLayer);
		d.details.layers.push(maplayergroup.addLayer(MI.scview.clustergroup));		
	} else {
		d.details.layers.push(maplayergroup.addLayer(pointLayer));
	}
		
	// Final Layer Setup
	d.details.layers.push(MI.scview.map.addLayer(maplayergroup));
	pointLayer.bringToFront();
	
	// Finalize Map
	MI.scview.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
	$('.sidepanel').scrollTo( $(".mheader").last(),  500, { offset: -1* moffset } );
	
	var smapurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/";
	var smapid = d.details.id;
	$.getJSON(smapurl + smapid + ".json", function(d) { MI.functions.graph("SourcemapGraph", d, {"id": smapid});});
	
	//MI.functions.visualize(d.details.id, d.properties.title);
}

function YetiAPI(yeti, options) {	
	d = {"type":"FeatureCollection"};
	d.details = options; d.details.layers = []; d.details.measures = {};
	d.properties = {"title": yeti.company_name, "description": yeti.company_address};	
	for(var item in yeti){	d.properties[item] = yeti[item]; }
	//delete yeti;
	

	d.tempFeatures = d.properties.vendor_table; delete d.properties.vendor_table;
	
	var scid = MI.supplychains.push(d);
		
	var globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];
	var moffset = 0;
	$('.mheader').each(function(i) { moffset += $(this).outerHeight(); });
		
	// Set default layerstyle
	if(!options.style) { 
		options.style = Object.assign({}, MI.scview.styles.point); 
		var color = MI.scview.colorchoice();
		options.style.fillColor = color[0];
		options.style.color = color[1];
	}
		
	$("#manifestlist").append(
		'<div class="mheader" id="mheader-'+d.details.id+'"style="top:'+moffset+'px;">'+
			'<div class="mtitle" style="background:'+d.details.style.fillColor+'; color:'+d.details.style.color+';">'+
				'<a><i class="fas fa-globe-'+globe+'"></i> ' + d.properties.title + '</a>'+
				'<i class="fas fa-bars menu-map"></i> <i class="fas fa-window-close close-map"></i>'+
			'</div>'+
		'</div>'				
	);
	
	// UI Setup
	$("#mheader-"+d.details.id).click(function() { ui_mheader(d.details.id);});	
	$("#mheader-"+d.details.id+" .close-map").click(function() { ui_mclose(d.details.id);});	
	$("#mheader-"+d.details.id+" .menu-map").click(function() { ui_mmenu(d.details.id);});	
	
	temptitle = "";
	$( ".mtitle").text(function(i, t){ temptitle += i == 0 ? t : ' + ' + t; });
	document.title = temptitle + " - Manifest";

	$(".mdetails").addClass("closed");
	$(".mlist").addClass("closed");
	
	$("#manifestlist").append('<div class="mdetails" id="mdetails-'+d.details.id+'"></div>');	
	if (typeof(d.company_address) != 'undefined') { $("mdetails-"+d.details.id).append(
		'<p class="mdescription"">'+Autolinker.link(d.properties.description)+'</p>'
	);}
	$("#manifestlist").append('<ul class="mlist" id="mlist-'+d.details.id+'"></ul>');
	
	// Setup Layer
	d.features = [];
	
	for (var i in d.tempFeatures) {
		templid = 1000*MI.supplychains.length+Number(i);
		if (typeof(d.tempFeatures[i]) != 'undefined') {
			d.features[i] = {"type": "Feature"};			
			d.features[i].properties = {};	
			for(var ft in d.tempFeatures[i]) { d.features[i][ft] = d.tempFeatures[i][ft]; }
			d.features[i].properties.title = d.tempFeatures[i].vendor_name; delete d.tempFeatures[i].vendor_name;
			d.features[i].properties.description = d.tempFeatures[i].product_descriptions.join(" / "); delete d.tempFeatures[i].product_descriptions;
			d.features[i].properties.placename = d.tempFeatures[i].vendor_address; delete d.tempFeatures[i].vendor_address;
						
			var ptitle = d.features[i].properties.title;
			var pdesc = "<p>" + d.features[i].properties.description + "</p>";
			var pplace = "<p class='placename'>" + d.features[i].properties.placename + "</p>";

			// Measures
			//d.features[i].measures = [];
			//d.features[i].measures.push(d.tempFeatures[i].shipments_percents_company);
			// Setup Measures
			d.features[i].properties.measures = {};
			d.features[i].properties.measures.percent = d.tempFeatures[i].shipments_percents_company;
			d.details.measures.percent = {"max":100,"min":0};
			pdesc += "<p class='measures'>"+d.features[i].properties.measures.percent+"% of shipments.</p>";
			
			d.features[i].properties.scid = scid-1;
			
			// Set Style
			d.features[i].properties.style=d.details.style;
			
			var li = $(						
				"<li id='local_" + templid + "'>"+
					"<div class='dot' style='background:"+d.details.style.fillColor+"; border-color:"+d.details.style.color+";'></div>"+
				"<h5 class='mdetail_title'>" + ptitle + "</h5> " + pplace + Autolinker.link(pdesc) + 
				"</li>"						
			);
			li.delegate( li, "click", MI.scview.focus);
			$("#mlist-"+d.details.id).append(li);
			
			d.features[i].properties.lid = templid;

			d.features[i].geometry = {"type":"Point","coordinates":[d.tempFeatures[i].lng, d.tempFeatures[i].lat]};
		}
	}
	ui_measurelist();
	
	delete d.tempFeatures;
	points = {
		"type":"FeatureCollection",
		"details": d.details,
		"features": d.features,
		"properties": {}
	};

	// Setup Pointlayer
	var pointLayer = new L.geoJSON(points, { onEachFeature: MI.scview.pointrender, pointToLayer: function (feature, latlng) { 
		return L.circleMarker(latlng, MI.scview.styles.points); 
	} });	
	pointLayer.on('click', function(e){	ui_pointclick(e); });

	// Prepare to add layers
	maplayergroup = L.layerGroup();
	
	MI.scview.detailstyle = "points";
	
	// Set Pointlayer or Clusterview		
	MI.scview.clustergroup = new L.MarkerClusterGroup();
	if(MI.attributes.clustering) {
		MI.scview.clustergroup.addLayer(pointLayer);
		d.details.layers.push(maplayergroup.addLayer(MI.scview.clustergroup));		
	} else {
		d.details.layers.push(maplayergroup.addLayer(pointLayer));
	}
		
	// Final Layer Setup
	d.details.layers.push(MI.scview.map.addLayer(maplayergroup));
	pointLayer.bringToFront();
	
	// Finalize Map
	MI.scview.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
	$('.sidepanel').scrollTo( $(".mheader").last(),  500, { offset: -1* moffset } );
	
	MI.functions.graph("YetiGraph", d, {"id": d.details.id});
	//MI.functions.visualize(d.details.id, d.properties.title);
}

/* Graph Builders */
function SCGraph(type, d, options) {
	if(type == "SourcemapGraph") { SourcemapGraph(d, options); } 
	else if(type == "YetiGraph") { YetiGraph(d, options);}
}

function SourcemapGraph(d, options) {
	var sc = null;
	for(var s in MI.supplychains) {
		if(MI.supplychains[s].details.id == options.id) { 
			MI.supplychains[s].graph = {"nodes":[], "links":[]}; 
			sc = MI.supplychains[s]; 
		} 
	}
	var digits = null;
	if (typeof(d.supplychain.stops) != 'undefined') {
		for (var i = 0; i < d.supplychain.stops.length; ++i) {
			
			var place = (typeof(d.supplychain.stops[i].attributes.placename) != 'undefined') ? d.supplychain.stops[i].attributes.placename : d.supplychain.stops[i].attributes.address;
			loc = place.split(", ");
			loc = loc[loc.length - 1];
			if (loc == "USA") { loc = "United States"; }
			
			// Correct local stop id
			digits = (Math.round(100*Math.log(d.supplychain.stops.length)/Math.log(10))/100)+1;
			d.supplychain.stops[i].local_stop_id = Number((""+d.supplychain.stops[i].local_stop_id).slice(-1*digits));
			var ref = sc.mapper["map"+place.replace(/[^a-zA-Z0-9]/g, '')+d.supplychain.stops[i].attributes.title.replace(/[^a-zA-Z0-9]/g, '')];
			var newNode = { "id": i, "name": d.supplychain.stops[i].attributes.title, "loc": loc, "place": place, "group": d.supplychain.stops[i].local_stop_id - 1, "links": [], "weight": 10, "size": 10, "ref": ref };
			sc.graph.nodes[d.supplychain.stops[i].local_stop_id - 1] = newNode;
		}
	} delete sc.mapper; // Remove Mapper

	
	if (typeof(d.supplychain.hops) != 'undefined' && d.supplychain.hops.length > 0) {
		sc.graph.type = "directed";
		for (var j = 0; j < d.supplychain.hops.length; ++j) {
			// Correct stop ids
			d.supplychain.hops[j].to_stop_id = Number((""+d.supplychain.hops[j].to_stop_id).slice(-1*digits));
			d.supplychain.hops[j].from_stop_id = Number((""+d.supplychain.hops[j].from_stop_id).slice(-1*digits));
			
			sc.graph.nodes[d.supplychain.hops[j].to_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[j].from_stop_id - 1].loc);
			var newLink = { "source": Number(d.supplychain.hops[j].from_stop_id - 1), "target": Number(d.supplychain.hops[j].to_stop_id - 1), "value": 10, "size": 4 };
			sc.graph.links.push(newLink);

		} 	
		for (var k = 0; k < d.supplychain.hops.length; ++k) {
			sc.graph.nodes[d.supplychain.hops[k].from_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[k].to_stop_id - 1].loc);
		}
	} else { sc.graph.type = "undirected"; }

	for (var l = 0; l < sc.graph.nodes.length; l++) {
		if (typeof(sc.graph.nodes[l]) == 'undefined') {
			sc.graph.nodes[l] = { "name": "", "loc": "", "place": "", "group": l, "links": [], "weight": 10, "size": 10 };
		}
	}

	if (typeof(d.supplychain.hops) != 'undefined') {
		for (var m = 0; m < d.supplychain.hops.length; ++m) {
			sc.graph.nodes[d.supplychain.hops[m].to_stop_id - 1].links = sc.graph.nodes[d.supplychain.hops[m].from_stop_id - 1].links = [];
			sc.graph.nodes[d.supplychain.hops[m].to_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[m].from_stop_id - 1].place);
			sc.graph.nodes[d.supplychain.hops[m].from_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[m].to_stop_id - 1].place);
		}
	}
	viz_resize();
	//buildMatrix();
}

function YetiGraph(d, options) {
	var sc = null;
	for(var i in MI.supplychains) {
		if(MI.supplychains[i].details.id == options.id) { 
			MI.supplychains[i].graph = {"nodes":[], "links":[]}; 
			sc = MI.supplychains[i]; 
		} 
	}
	var root = {
		id: sc.details.id,
		group: 1,
		name: sc.properties.company_name,
		ref: sc.features[0]	
	};
	sc.graph.nodes.push(root);
	
	for(var f in sc.features) {
		var node = {
			id: sc.features[f].properties.lid,
			group: sc.features[f].properties.lid,
			name: sc.features[f].properties.title,
			ref: sc.features[f]
		};
		sc.graph.nodes.push(node);
	}
	for (var j = 1; j <  sc.graph.nodes.length; ++j) {

		var link = {
			"size": 4,
			"source": 0,
			"target": j,
			"value": 10
		};
		sc.graph.links.push(link);
	}
	
	sc.graph.type = "directed";
}
/* Miscellaneous Functions */
function Cleanup() { console.log(MI); MI.functions.center(); $("#loader").remove(); }
function CenterView() { MI.scview.map.setView(new L.LatLng(40, -60), 3);}
function Colorize(array) {
	var copy = array.slice(0);
	return function() {
		if (copy.length < 1) { copy = array.slice(0); }
		var index = Math.floor(Math.random() * copy.length);
		var item = copy[index];
		copy.splice(index, 1);
		return item;
	};
}
function InterestView() {
	map = MI.scview.map;

	for (var i in map._layers) {
		if (typeof(map._layers[i].feature) != 'undefined') {
			if (map._layers[i].feature.properties.lid == MI.attributes.initialpoi.id) {
				map.setView(map._layers[i]._latlng, 8, true);
			}
		} else if (typeof(map._layers[i].getAllChildMarkers) != 'undefined') {
			var childmarkers = map._layers[i].getAllChildMarkers();
			for (var j in childmarkers) {
				if (typeof(childmarkers[j].feature) != 'undefined') {
					if (childmarkers[j].feature.properties.lid == MI.attributes.initialpoi.id) {
						map.setView(childmarkers[j]._latlng, 8, true);
					}
				}
			}
		}
	}
	map.locate({setView : true, maxZoom: map.getZoom()});
}

/*
function Visualize(id, title) {
	map = MI.scview.map;
	if(MI.scview.detailstyle != "points") {
		$(map.layersControl._container.childNodes[1]).append('<div class="leaflet-control-layers-separator" style=""></div><div class="visualization-list"><label><input type="checkbox" id="'+id+'" class="chord-selector"><span>'+title+' Chord Diagram</span></label></div>');
		$(".chord-selector").click(function() {
			$("#chordviz").css("visibility", "visible"); 
			$("#overlay").css("visibility", "visible"); 
			
			if($(this).is(':checked')) { 
				$("#chordviz").css("visibility", "visible"); 
				$("#overlay").css("visibility", "visible"); 
				
				document.getElementsByName("chordframe")[0].src = "lib/viz/chord/chord.html#"+$(this).attr("id");
			} else { 
				document.getElementsByName("chordframe")[0].src = "";		
				$("#chordviz").css("visibility", "hidden"); 
				$("#overlay").css("visibility", "hidden"); 
				
			}
		});
	}
}
*/

function SimpleSearch() {
	s = $("#searchbar").val().toLowerCase();
    $(".mlist li").each(function () {
        var $this = $(this);
        if ($(this).text().toLowerCase().indexOf(s) !== -1)  { $this.show();
        } else { $this.hide(); }
    });
	var found = false;
	for (var i in MI.scview.map._layers) {
		if (typeof(MI.scview.map._layers[i].feature) != 'undefined') {
			if (MI.scview.map._layers[i].feature.geometry.type != "MultiLineString") {
				found = false;
				for (var k in MI.scview.map._layers[i].feature.properties) {
					if (String(MI.scview.map._layers[i].feature.properties[k]) .toLowerCase() .indexOf(s) != -1) { found = true; }
				}
				if (!(found)) { 
					MI.scview.map._layers[i].setStyle({ fillOpacity: 0.1, opacity: 0.1 });
					if(MI.scview.active_point == MI.scview.map._layers[i]) { MI.scview.active_point.closePopup(); MI.scview.active_point = null;}
				} else { MI.scview.map._layers[i].setStyle({ fillOpacity: 1, opacity: 1 }); MI.scview.map._layers[i].bringToFront();}
			}
		} else if (typeof(MI.scview.map._layers[i].getAllChildMarkers) != 'undefined') {
			var childmarkers = MI.scview.map._layers[i].getAllChildMarkers();
			found = false;

			for (var j in childmarkers) {
				if (typeof(childmarkers[j].feature) != 'undefined') {
					for (var l in childmarkers[j].feature.properties) {
						if (String(childmarkers[j].feature.properties[l]) .toLowerCase() .indexOf(s) != -1) { found = true; }
					}
				}
			}
			if (!(found)) { MI.scview.map._layers[i].setOpacity(0.1); } else { MI.scview.map._layers[i].setOpacity(1); }
		}
	} // Search map layers
} // SimpleSearch

/* UI Functions */
function ui_mheader(id) {
	$("#mdetails-"+id).toggleClass("closed");
	$("#mlist-"+id).toggleClass("closed");
	if(!($("#mdetails").hasClass("closed"))) { $('.sidepanel').scrollTo(0,  50); }
}

function ui_fullscreen() {
	/*var canvas = $("canvas")[0];
	console.log(canvas);
	var ctx = canvas.getContext("2d");
	var ox = canvas.width / 2;
	var oy = canvas.height / 2;

	  var image = canvas.toDataURL("image/jpg");

	  
	    var link = document.createElement("a");
	    link.download = "map.png";
	    link.href = image;
	    document.body.appendChild(link);
	    link.click();
	    document.body.removeChild(link);
	    delete link;
*/
	 
	
	if(!($("body").hasClass("fullscreen"))) {
		$("body").addClass("fullscreen");

		if($(".leaflet-popup").length > 0 && MI.scview.active_point) {
			MI.scview.map.panTo(new L.LatLng(MI.scview.active_point._latlng.lat, MI.scview.active_point._latlng.lng));
		} else if(MI.scview.map.getZoom() == 3) { 
			MI.scview.map.panTo(new L.LatLng(40, 0)); 
		}
			
	} else {
		$("body").removeClass("fullscreen");	

		if($(".leaflet-popup").length > 0 && MI.scview.active_point) {
			MI.scview.map.panTo(new L.LatLng(MI.scview.active_point._latlng.lat, MI.scview.active_point._latlng.lng));
		} else if(MI.scview.map.getZoom() == 3) { 
			MI.scview.map.panTo(new L.LatLng(40, -60)); 
		}
		
	}
	viz_resize();
}
function ui_mclose(id) {
	event.stopPropagation();
	$("#mheader-"+id).remove();
	$("#mdetails-"+id).remove();
	$("#mlist-"+id).remove();
	
	var moffset = 0;
	$('.mheader').each(function(i) { 
		$(this).css("top", moffset);
		moffset += $(this).outerHeight(); 
	});
	for(var s in MI.supplychains) {
		if(MI.supplychains[s].details.id == id) {
			for(var i in MI.supplychains[s].details.layers) {
				MI.scview.map.removeLayer(MI.supplychains[s].details.layers[i]);
			}

			delete MI.supplychains[s];
		}
	}
	
	ui_measurelist();
	viz_resize();
}
function ui_mmenu(id) {
	event.stopPropagation();
	console.log(id);
	var raw = "";
	for(var s in MI.supplychains) {
		console.log(MI.supplychains[s].details.id );
		if(MI.supplychains[s].details.id == id) {
			console.log("match");
			raw = JSON.stringify(MI.supplychains[s].details.id) + " : " + 
			JSON.stringify(MI.supplychains[s].properties) + JSON.stringify(MI.supplychains[s].features) + JSON.stringify(MI.supplychains[s].graph);
		}
	}
	if($("#mdetails-"+id+" #mmenu").length == 0) {
		$("#mdetails-"+id).prepend(
			'<div id="mmenu" style="background:'+$("#mheader-"+id+" .mtitle").css("color")+'">'+
				raw +
			'</div>'
		);
	} else {
		$("#mdetails-"+id+" #mmenu").remove();
	}
}
function ui_hamburger() {
	$("#minfodetail").toggleClass("closed");
	$("#manifestbar").toggleClass("open");
	
	if($("#manifestbar").hasClass("open")) { $(".sidepanel").css("top", $("#manifestbar").outerHeight() + $("#manifestbar").outerHeight() / 20); } 
	else { $(".sidepanel").css("top", "4rem"); }
}

function ui_measurelist() {
	var choices = {"none":"none"};
	var previous = $("#measure-choices").val();
	for(var s in MI.supplychains) { for(var m in MI.supplychains[s].details.measures) { choices[m] = m; }}
	$("#measure-choices").empty();	
	for(var c in choices) { $("#measure-choices").append('<option value="'+c+'">'+c+'</option>'); }	
	if($("#measure-choices option[value='"+previous+"']").length) {
		$("#measure-choices").val(previous);
	}
}

function ui_measuresort() {
	var measure_sort = $("#measure-choices").val();
	
	for (var i in MI.scview.map._layers) {
		if (typeof(MI.scview.map._layers[i].feature) != 'undefined') {
			if (MI.scview.map._layers[i].feature.geometry.type != "MultiLineString") {
				var radius = 8;
				
				if(MI.scview.map._layers[i].feature.properties.measures != undefined) {	
					if(MI.scview.map._layers[i].feature.properties.measures[measure_sort] != undefined) {
						if(measure_sort != "none") {							
							radius = MI.scview.map._layers[i].feature.properties.style.radius = 8 + 100 * (MI.scview.map._layers[i].feature.properties.measures[measure_sort] / MI.supplychains[MI.scview.map._layers[i].feature.properties.scid].details.measures[measure_sort].max);
						}						
					}
				}
				
				MI.scview.map._layers[i].setStyle({ radius: radius });
				MI.scview.map._layers[i].bringToFront();
			}
		}
	}
}
function ui_pointclick(e, slid) {
	if(e) {MI.scview.active_point = e.sourceTarget;}
	if(e != undefined) {
		slid = e.layer._popup._source.feature.properties.lid;
		if(e.layer.options.fillOpacity == 0.1) { return; }
	}
	if($("li#local_"+slid).parent().length > 0) {
	gid = $("li#local_"+slid).parent().attr("id").split("-")[1];
	$("#mdetails-"+gid).removeClass("closed");
	$("#mlist-"+gid).removeClass("closed");	

	offset = 0;
	$("li#local_"+slid).parent().prevAll(".mheader").each(function(i) {
		offset += $(this).outerHeight();
	});
	
	$('.sidepanel').scrollTo(
		$("li#local_"+slid),  500, {
			offset: -1*offset
		}
	);
	if(e != undefined) {
		if(e.sourceTarget._popup._container != undefined) {
			if(ui_collide($(e.sourceTarget._popup._container), $(".sidepanel"))) {
				e.layer._map.setView(e.layer._latlng, e.layer._map.getZoom());
			}
		}
	}
	}
}

function ui_collide( $div1, $div2 ) {
	var d1_offset             = $div1.offset();
	var d1_height             = $div1.outerHeight( true );
	var d1_width              = $div1.outerWidth( true );
	var d1_distance_from_top  = d1_offset.top + d1_height;
	var d1_distance_from_left = d1_offset.left + d1_width;

	var d2_offset             = $div2.offset();
	var d2_height             = $div2.outerHeight( true );
	var d2_width              = $div2.outerWidth( true );
	var d2_distance_from_top  = d2_offset.top + d2_height;
	var d2_distance_from_left = d2_offset.left + d2_width;

	var not_colliding = ( d1_distance_from_top < d2_offset.top || d1_offset.top > d2_distance_from_top || d1_distance_from_left < d2_offset.left || d1_offset.left > d2_distance_from_left );

	// Return whether it IS colliding
	return ! not_colliding;
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

MEASURES = [{measure: "weight", unit: "kg"}, {measure: "co2e", unit: "kg"}, {measure: "water", unit: "kl"},
{measure: "energy", unit: "kj"}, {measure: "cost", unit: "dollars"}, {measure: "percent", unit: "%"}];

COLORSETS = [["#3498DB","#dbedf9"],["#FF0080","#f9dbde"],["#34db77","#dbf9e7"],["#ff6500","#f6d0ca"],["#4d34db","#dfdbf9"]];

TILETYPES = {
	'DARK': 'https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaG9jayIsImEiOiJXcDZvWTFVIn0.DDAXuVl0361Bfsb9chrH-A',
	'LIGHT': 'https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaG9jayIsImEiOiJXcDZvWTFVIn0.DDAXuVl0361Bfsb9chrH-A',
	'TERRAIN': 'http://tile.stamen.com/terrain/{z}/{x}/{y}.jpg'
};

GLOBES = ["americas","asia","europe","africa"];