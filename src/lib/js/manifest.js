/* Manifest =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
/* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/* Manifest Base Classes /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

/** Manifest Class **/
function Manifest() {
	this.supplychains = [];
	this.clusters = [];
	this.attributes = {
		'initialized': false,
		'clustering':true,
		'scrollpos': 0,
		'prevsearch': "",
		'linetype': LINETYPES.GREATCIRCLE,
		'tiletypes': TILETYPES,
		'measures': MEASURES,
		'globes': GLOBES
	};
	this.functions = {
		'process': SCProcessor,
		'center':  InterestView, // OR CenterView
		'cleanup': Cleanup,
		'search': SimpleSearch
	};
		
	this.visualization = "map";
	this.scview = new SpatialSupplyChain();
}

/** Initialize a Spatial Supply Chain **/
function SpatialSupplyChain() {
	this.map = new L.Map('map', { preferCanvas: true, worldCopyJump: false, center: new L.LatLng(40.730610,-73.935242), zoom: 3, zoomControl: false, scrollWheelZoom: false });
	this.clustergroup = this.active_point = null;
	
	/* Define Layers */
	this.layerdefs = {
		'google': new L.TileLayer(TILETYPES.GOOGLE, 
			{ maxZoom: 20, className: "googlebase", detectRetina: true, subdomains:['mt0','mt1','mt2','mt3'], attribution: 'Terrain, Google' }),		
		'light': new L.TileLayer(TILETYPES.LIGHT, {detectRetina: true, subdomains: 'abcd', minZoom: 0, maxZoom: 20, ext: 'png', attribution: 'Toner, Stamen' }),
		'terrain': new L.TileLayer(TILETYPES.TERRAIN, { detectRetina: true, subdomains: 'abcd', minZoom: 0, maxZoom: 18, ext: 'png', attribution: 'Terrain, Stamen' }),	
		'satellite': new L.TileLayer(TILETYPES.SATELLITE, { detectRetina: true, attribution: 'Satellite, ESRI' }),
	 	'dark': new L.TileLayer(TILETYPES.DARK, { subdomains: 'abcd', maxZoom: 19, detectRetina: true, attribution: 'Dark, CartoDB' }),

		'shipping': new L.TileLayer(TILETYPES.SHIPPING, 
			{ maxNativeZoom: 4, detectRetina: true, className: "shippinglayer", bounds:L.latLngBounds( L.latLng(-60, -180), L.latLng(60, 180)), attribution: '[ARCGIS Data]' }),
		'marine': new L.TileLayer(TILETYPES.MARINE, { maxZoom: 19, tileSize: 512, detectRetina: false, className: "marinelayer", attribution: '[Marinetraffic Data]' }),
		'rail': new L.TileLayer(TILETYPES.RAIL, { maxZoom: 19, className: "raillayer", attribution: '[OpenStreetMap Data]' })		
	};
	
					  
	/* Renderers */
	this.pointrender = RenderPoint;	
	this.linerender = RenderLine;
	
	/* Focus Function */
	this.focus = PointFocus;
	
	/* Styles */
	this.styles = {
		'point': { fillColor: "#eeeeee", color: "#999999", radius: 8, weight: 4, opacity: 1, fillOpacity: 1 },
		'highlight': { fillColor: "#ffffff" },
		'line': { color: "#dddddd", stroke: true, weight: 2, opacity: 0.4, smoothFactor: 0 }
	};
	this.colorchoice = Colorize(COLORSETS);
	
	// Map configuration
	this.map.attributionControl.setPrefix('');
	L.Control.zoomHome().addTo(this.map);
	this.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
	this.map.on("popupopen", function(e) {
			MI.scview.map.setView(e.popup._latlng, MI.scview.map.getZoom());	
			MI.scview.active_point = e.sourceTarget;
			ui_pointclick(MI.scview.active_point); 
			$(".fa-tag").click(function() {
				if(e.target._popup._source._preSpiderfyLatlng) {
					MI.scview.map.setView(e.popup._source.__parent._latlng, 16);
					
				} else {
					MI.scview.map.setView(e.popup._latlng, 16);
					
				}
			});
			
	});
	this.map.on("popupclose", function(e) { MI.scview.active_point = null; } );

	
	if($("body").hasClass("light")) {
		this.map.addLayer(this.layerdefs.google);
		this.map.addLayer(this.layerdefs.shipping);
	} else if($("body").hasClass("dark")) { 
		this.map.addLayer(this.layerdefs.dark);		
		this.map.addLayer(this.layerdefs.shipping);
	}
	
	// General UI
	$("#fullscreen-menu").click(function() { ui_fullscreen(); });	
	$("#minfo, #minfo-hamburger").click(function() { ui_hamburger(); });			
	$("#searchbar").bind('keyup mouseup', function() { MI.functions.search(); });
	$(".searchclear").click(function() { $("#searchbar").val(""); MI.functions.search(); });
}

/* Map core functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/** Render points by setting up a GeoJSON feature for display **/
function RenderPoint(feature, layer) {
		var title = (typeof(feature.properties.title) != 'undefined') ? feature.properties.title : "Unnamed.";
		var description = (typeof(feature.properties.description) != 'undefined') ? feature.properties.description : "";
		var fid = feature.properties.lid;
		var popupContent = "<h2 id='popup-"+fid+"'><i class='fas fa-tag'></i> " + title + "</h2><p>" + Autolinker.link(description) + "</p>";
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
}

/** Render lines by setting up a GeoJSON feature for display **/
function RenderLine(feature, layer) {
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
}

/** Focus on a point on the map and open its popup. **/
function PointFocus(pid) {	
	var id = (typeof(pid) != 'object' ? pid : $(this).attr("id").substring(6));		
	for (var i in MI.scview.map._layers) {
		if (typeof(MI.scview.map._layers[i].feature) != 'undefined') {			
			if (MI.scview.map._layers[i].feature.properties.lid == id) {				
				MI.scview.active_point = MI.scview.map._layers[i];
				MI.scview.map._layers[i].openPopup();
			}
		} else if (typeof(MI.scview.map._layers[i].getAllChildMarkers) != 'undefined') {				
			var childmarkers = MI.scview.map._layers[i].getAllChildMarkers();
			for (var j in childmarkers) {
				if (typeof(childmarkers[j].feature) != 'undefined') {
					if (childmarkers[j].feature.properties.lid == id) {
						MI.scview.map._layers[i].spiderfy();
						MI.scview.active_point = childmarkers[j];
						childmarkers[j].openPopup();
						MI.functions.search();
					}
				} // Get Childmarker feature
			} // Iterate Childmarkers
		} // Get all Childmarkers
	} // Iterate Map Layers
}
	
/* Supply chain core functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
	
/** SupplyChain processor main wrapper function. **/
function SCProcessor(type, d, options) {
	for(var s in MI.supplychains) { if(MI.supplychains[s].details.id == options.id) {return;}}
	var scid = null;
	if(type == "smap") { 
		var geo = d.g;
		var graph = d.r;
		d = FormatSMAP(geo, options); 
		scid = SetupSC(d, options); 
		MapSC(d, scid);
		SMAPGraph(graph, options);
	} 
	else if(type == "yeti") { 
		//YetiAPI(d, options);
		d = FormatYETI(d, options); 
		scid = SetupSC(d, options); 
		MapSC(d, scid);
		YETIGraph(d, {"id": d.details.id});		
	}
	else if(type == "gsheet") { 
		d = FormatGSHEET(d, options); 
		scid = SetupSC(d, options); 
		MapSC(d, scid);
		GSHEETGraph(d, options);		
	}
	
}

/** Setup the supply chain rendering by adding it to the user interface */
function SetupSC(d, options) {	
	var scid = MI.supplychains.push(d);
	MI.attributes.scrollpos = $(".sidepanel").scrollTop();
	$("#manifestlist").append(
		'<div class="mheader" id="mheader-'+d.details.id+'">'+
			'<div class="mtitle" style="background:'+d.details.style.fillColor+'; color:'+d.details.style.color+';">'+
				'<i class="menu-map fas fa-globe-'+d.details.globe+'"></i><a>' + d.properties.title + '</a>' +
				'<i class="fas fa-times-circle close-map"></i>'+
			'</div>'+
		'</div>'				
	);
	
	// Title setup
	var temptitle = "";
	$( ".mtitle").text(function(i, t){ temptitle += i == 0 ? t : ' + ' + t; });
	document.title = temptitle + " - Manifest";
	
	// UI Setup
	$("#mheader-"+d.details.id).click(function() { ui_mheader(d.details.id);});	
	$("#mheader-"+d.details.id+" .close-map").click(function() { ui_mclose(d.details.id);});	
	$("#mheader-"+d.details.id+" .menu-map").click(function() { ui_mmenu(d.details.id);});	
	
	$("#manifestlist").append('<div class="mdetails" id="mdetails-'+d.details.id+'"></div>');	
	if (d.properties.description != "") { $("#mdetails-"+d.details.id).append(
		'<p class="mdescription">'+Autolinker.link(d.properties.description)+'</p>'
	);}
	$("#manifestlist").append('<ul class="mlist" id="mlist-'+d.details.id+'"></ul>');
		
	$("#mapmenu").click(function() {
		$("#mapmenu-window").removeClass("closed");
	});
	$("#mapmenu-window").mouseleave(function() {
		$("#mapmenu-window").addClass("closed");
	});
	
	$("#basemap-chooser li").click(function() {
		var tile = $(this).attr("class");
		var previoustiles = $("#basemap-preview").attr("class");
		$("#basemap-preview").removeClass();
		$("#basemap-preview").addClass(tile);
		MI.scview.map.removeLayer(MI.scview.layerdefs[previoustiles]);
		MI.scview.map.addLayer(MI.scview.layerdefs[tile]);	
		$('#datalayers input').each(function() { 
			MI.scview.map.removeLayer(MI.scview.layerdefs[$(this).val()]);
			if($(this).prop("checked")) {
				MI.scview.map.addLayer(MI.scview.layerdefs[$(this).val()]);		
			} 
		});
	});	

	$('#datalayers input').click(function() {
		if($(this).prop("checked")) {
			MI.scview.map.addLayer(MI.scview.layerdefs[$(this).val()]);		
		} else {
			MI.scview.map.removeLayer(MI.scview.layerdefs[$(this).val()]);
		}	
	});
	
	// Finalize UI
	var moffset = 0; $('.mheader').each(function(i) { $(this).css("top", moffset); moffset += $(this).outerHeight(); });
	var roffset = 0; $('.mheader').reverse().each(function(i) { $(this).css("bottom", roffset); roffset += $(this).outerHeight(); });
	
	if($("#searchbar").val() != "") { $("#searchbar").val(""); MI.functions.search(); }
	
	return scid;
}

/** Setup the supply chain map **/
function MapSC(d, scid) {
	// Setup Layer
	for (var i in d.features) {
		templid = 10000*d.details.id+Number(i);
		if (typeof(d.features[i].properties) != 'undefined') {
			if (typeof(d.features[i].properties.title) != 'undefined' && d.features[i].geometry.type != "LineString") {
				var ptitle = d.features[i].properties.title ? d.features[i].properties.title : "Untitled Point";
				var pdesc = (d.features[i].properties.description && d.features[i].properties.description != "...") ? 
					"<p class='description'>" + d.features[i].properties.description + "</p>" : "";
				
				d.features[i].properties.placename = d.features[i].properties.placename ? 
					d.features[i].properties.placename : (d.features[i].properties.address ? d.features[i].properties.address : ""); 
				var pplace = d.features[i].properties.placename ? "<p class='placename'>" + d.features[i].properties.placename + "</p>" : "";
				
				var pcategory = (d.features[i].properties.category && d.features[i].properties.category != "...") ? 
					"<p class='category'><a href='javascript:MI.functions.search(\"" + d.features[i].properties.category + "\");'>#" + d.features[i].properties.category + "</a></p>" : "";
				var pnotes = (d.features[i].properties.notes && d.features[i].properties.notes != "") ? 
					"<li>" + d.features[i].properties.notes + "</li>" : "";
				var psources = (d.features[i].properties.sources && d.features[i].properties.sources != "") ? 
					"<details class='sources'><summary>Notes</summary><ul>" + pnotes + "<li>" + 
					d.features[i].properties.sources.replace(/,/g, "</li><li>") + "</li></ul></details>" : "";
	
				
				
				// Try to map to graph
				if(d.mapper) {
					d.mapper["map"+d.features[i].properties.placename.replace(/[^a-zA-Z0-9]/g, '')+d.features[i].properties.title.replace(/[^a-zA-Z0-9]/g, '')] = d.features[i]; 
				}
				
				// Setup Measures
				if(d.features[i].properties.measures == undefined) { d.features[i].properties.measures = {}; }
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
					"<h5 class='mdetail_title'>" + ptitle + "</h5> " + pplace + pcategory + Autolinker.link(pdesc) + Autolinker.link(psources) + 
					"</li>"						
				);
				li.delegate( li, "click", MI.scview.focus);
				$("#mlist-"+d.details.id).append(li);
			}
			d.features[i].properties.lid = templid;
		}
	}
	
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
	pointLayer.on('mouseup', function(e){	
		if(!(e.sourceTarget._preSpiderfyLatlng)){		
			for(var c in MI.clusters) {
				MI.clusters[c].unspiderfy();
			}
		}		
	});

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
	MI.scview.clustergroup = new L.MarkerClusterGroup({ 
    	iconCreateFunction: function (cluster) {
        	var markers = cluster.getAllChildMarkers();
        	var html = '<div style="background:'+markers[0].options.fillColor+'; color:'+markers[0].options.color+'"><span>' + markers.length + '</span></div>';
        	return L.divIcon({ html: html, className: 'marker-cluster marker-cluster-small', iconSize: L.point(40, 40) });
    	},
    	spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true 
	});
	if(MI.attributes.clustering) {
		MI.scview.clustergroup.addLayer(pointLayer);
		MI.clusters.push(MI.scview.clustergroup);
		d.details.layers.push(maplayergroup.addLayer(MI.scview.clustergroup));		
	} else {
		d.details.layers.push(maplayergroup.addLayer(pointLayer));
	}
		
	// Initialize Measurelist UI
	ui_measurelist();
	
	// Final Layer Setup
	if(MI.supplychains.length > 1 && $(".leaflet-popup").length > 0 && MI.scview.active_point) {		
		ui_pointclick(MI.scview.active_point, 0);
	}
	d.details.layers.push(MI.scview.map.addLayer(maplayergroup));
	pointLayer.bringToFront();	

	$('.sidepanel').scrollTo( MI.attributes.scrollpos,  0, {  } );	
}

/** Format a legacy Sourcemap file so Manifest can understand it */
function FormatSMAP(d, options) {
	d.details = options; d.details.layers = []; d.details.measures = {};
	d.details.globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];
	d.details.colorchoice = MI.scview.colorchoice();

	d.mapper = {}; // Try to map to graph
	
	// Set default layerstyle
	if(!d.details.style) { 
		d.details.style = Object.assign({}, MI.scview.styles.point); 
		d.details.style.fillColor = d.details.colorchoice[0];
		d.details.style.color = d.details.colorchoice[1];
	}
	
	// Error Checking
	if (typeof(d.properties.description) == 'undefined') { d.properties.description = ""; } 
	
	return d;
}

/** Format a google sheet file so Manifest can understand it */
function FormatGSHEET(d, options) {
	var sheetoverview = d.g;
	var sheetpoints = d.r;
	var so_offset = 6;
	var sp_offset = 8;
	var sheetid = options.id;
	
	var sheetsc = {"type":"FeatureCollection"};
	sheetsc.properties = {
		title: sheetoverview.feed.entry[so_offset].gs$cell.$t,
		description: sheetoverview.feed.entry[so_offset+1].gs$cell.$t,
		address: sheetoverview.feed.entry[so_offset+2].gs$cell.$t,
		geocode: sheetoverview.feed.entry[so_offset+3].gs$cell.$t,
		measure: sheetoverview.feed.entry[so_offset+4].gs$cell.$t
	};
	sheetsc.tempFeatures = {};
	
	for(var s in sheetpoints.feed.entry) {		
		if(Number(sheetpoints.feed.entry[s].gs$cell.row) > 1) {
			if(sheetsc.tempFeatures[Number(sheetpoints.feed.entry[s].gs$cell.row)-1] == undefined) { 
				sheetsc.tempFeatures[Number(sheetpoints.feed.entry[s].gs$cell.row)-1] = {};
			}
			var position = (Number(sheetpoints.feed.entry[s].gs$cell.row)-1)*sp_offset-1+(Number(sheetpoints.feed.entry[s].gs$cell.col)+1);
			var header = position - (sp_offset*(Number(sheetpoints.feed.entry[s].gs$cell.row)-1));
		
			var point = sheetsc.tempFeatures[Number(sheetpoints.feed.entry[s].gs$cell.row)-1];
			point[sheetpoints.feed.entry[header-1].gs$cell.$t] = sheetpoints.feed.entry[s].gs$cell.$t;	
		}				
	}		
	sheetsc.details = options; sheetsc.details.layers = []; sheetsc.details.measures = {};
	sheetsc.details.globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];
	sheetsc.details.colorchoice = MI.scview.colorchoice();

	sheetsc.mapper = {}; // Try to map to graph
	
	// Set default layerstyle
	if(!sheetsc.details.style) { 
		sheetsc.details.style = Object.assign({}, MI.scview.styles.point); 
		sheetsc.details.style.fillColor = sheetsc.details.colorchoice[0];
		sheetsc.details.style.color = sheetsc.details.colorchoice[1];
	}

	sheetsc.features = [];
	
	for (var i in sheetsc.tempFeatures) {
		// TODO This templid should be based off of a numeric id, which Google doesn't have right 
		var j = i-1;
		if (typeof(sheetsc.tempFeatures[i]) != 'undefined') {
			sheetsc.features[j] = {"type": "Feature"};			
			sheetsc.features[j].properties = {};	
			sheetsc.features[j].properties.title = sheetsc.tempFeatures[i].Name;
			sheetsc.features[j].properties.description = sheetsc.tempFeatures[i].Description;
			sheetsc.features[j].properties.placename = sheetsc.tempFeatures[i].Location;
			sheetsc.features[j].properties.category = sheetsc.tempFeatures[i].Category;
			sheetsc.features[j].properties.sources = sheetsc.tempFeatures[i].Sources;
			sheetsc.features[j].properties.notes = sheetsc.tempFeatures[i].Notes;
			
			sheetsc.features[j].properties.measures = {};
			sheetsc.features[j].geometry = {"type":"Point","coordinates":[Number(sheetsc.tempFeatures[i].Geocode.split(",")[1]), Number(sheetsc.tempFeatures[i].Geocode.split(",")[0])]};
		}
	}
		
	delete sheetsc.tempFeatures;
	return sheetsc;
}

/** Format a Yeti file so Manifest can understand it */
function FormatYETI(yeti, options) {	
	var d = {"type":"FeatureCollection"};
	d.details = options; d.details.layers = []; d.details.measures = {};
	d.properties = {"title": yeti.company_name, "description": yeti.company_address};
	d.details.colorchoice = MI.scview.colorchoice();
	d.details.globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];	
	for(var item in yeti){	d.properties[item] = yeti[item]; }	
	d.tempFeatures = d.properties.vendor_table; delete d.properties.vendor_table;	
		
	// Set default layerstyle
	if(!d.details.style) { 
		d.details.style = Object.assign({}, MI.scview.styles.point); 
		d.details.style.fillColor = d.details.colorchoice[0];
		d.details.style.color = d.details.colorchoice[1];
	}
		
	// Format Layer
	d.features = [];
	
	for (var i in d.tempFeatures) {
		if (typeof(d.tempFeatures[i]) != 'undefined') {
			d.features[i] = {"type": "Feature"};			
			d.features[i].properties = {};	
			for(var ft in d.tempFeatures[i]) { d.features[i][ft] = d.tempFeatures[i][ft]; }
			d.features[i].properties.title = d.tempFeatures[i].vendor_name; delete d.tempFeatures[i].vendor_name;
			d.features[i].properties.description = d.tempFeatures[i].product_descriptions.join(" / "); delete d.tempFeatures[i].product_descriptions;
			d.features[i].properties.placename = d.tempFeatures[i].vendor_address; delete d.tempFeatures[i].vendor_address;
						
			d.features[i].properties.measures = {};
			d.features[i].properties.percent = d.tempFeatures[i].shipments_percents_company;
			d.features[i].properties.measures.percent = d.tempFeatures[i].shipments_percents_company;
			d.details.measures.percent = {"max":100,"min":0};
			d.features[i].geometry = {"type":"Point","coordinates":[d.tempFeatures[i].lng, d.tempFeatures[i].lat]};
		}
	}
	
	delete d.tempFeatures;
	return d;
}

/** Setup the graph relationships for legacy Sourcemap files **/
function SMAPGraph(d, options) {
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
}

/** Setup the graph relationships for Yeti files **/
function YETIGraph(d, options) {
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

function GSHEETGraph(d, options) {

}
/* Miscellaneous functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

/** Called after Manifest has been initialized and the first supply chain loaded **/ 
function Cleanup() { 
	console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"); 
	console.log(MI); 
	console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"); 
	
	MI.attributes.initialized = true;	
	$("#load-samples").change(function() {
		if($("#load-samples option:selected").val() == "other") {
			$("#load-samples").css("width","20%");
			$("#load-samples-input").removeClass("closed");
		} else {
			$("#load-samples").css("width","100%");
			$("#load-samples-input").addClass("closed");
		}
	});

	// @TODO Move this to a more general function
	$("#load-samples-btn").click(function() {
		var loadurl = "";
		var loaded = false;
		var id = null;
		var type = null;
		
		if($("#load-samples").val() == "other") {
			loadurl = $("#load-samples-input").val();
			
			if (loadurl.toLowerCase().indexOf("https://raw.githubusercontent.com/hock/smapdata/master/data/") >= 0) {
				type = "smap";
				id = loadurl.substring(60).split(".")[0];
				loadurl = MI.serviceurl + "?type="+type+"&id=" + id;								
			} else if(loadurl.toLowerCase().indexOf("https://spreadsheets.google.com/feeds/cells/") >= 0) {
				type = "gsheet";
				id = loadurl.substring(44).split("/")[0];
				loadurl = MI.serviceurl + "?type="+type+"&id=" + id;								
				id = id.hashCode();
			}
			
			
		} else {
			var option = $("#load-samples").val().split("-");
			type = option[0];	
			option = [option.shift(), option.join('-')];
			id = option[1];
			if(type == "smap") {				
				loadurl = MI.serviceurl + "?type="+type+"&id=" + id;				
			} else if(type == "gsheet")	{
				loadurl = MI.serviceurl + "?type="+type+"&id=" + id;				
				id = id.hashCode();
			}	
		}
		for(var s in MI.supplychains) { if(MI.supplychains[s].details.id == id) { loaded = true; }}
				
		if(!loaded && id != null) {
			$.getJSON(loadurl, function(d) { MI.functions.process(type, d, {"id": id});});					
			ui_hamburger();
		} else {
			$("#manifestbar").shake(50,10,3);			
		}
	});
	
	$("#viz-choices").change(function() {
		visualize($("#viz-choices").val());		
	});
	$("#measure-choices").change(function() {
		MeasureSort();		
		visualize($("#viz-choices").val());	
	});
	
	var dropArea = new jsondrop('minfodetail', {
	    onEachFile: function(file) {
	        console.log(file);
	        // and other stuff ...
	    }
	});
	$("#minfodetail").on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
			e.preventDefault();
			e.stopPropagation();
		})
		.on('dragover dragenter', function() {
			$("#minfodetail").addClass('is-dragover');
		})
		.on('dragleave dragend drop', function() {
			$("#minfodetail").removeClass('is-dragover');
		});

	$( window ).resize(function() {
		if(!($(".vizwrap").hasClass("closed"))) {
			viz_resize();
		}			
	});
	setTimeout(function() {$("#loader").remove();}, 250);
	 
}

/** A dumb centering function that always sets the map to the same location (New York, NY) **/
function CenterView() { MI.scview.map.setView(new L.LatLng(40.730610,-73.935242), 3);}

/** A slightly smarter centering function that focuses on the first point of a supply chain **/
function InterestView() {
	if(MI.visualization == "map") {
		for(var c in MI.clusters) {
			MI.clusters[c].unspiderfy();
		}
		var idname = $(".mlist").last().attr("id").split("-");
		idname = [idname.shift(), idname.join('-')];
		var id = idname[1];
		ui_mheader(id);
		MI.scview.focus($(".mlist").last().children("li").first().attr('id').split("_")[1]);	
	}	
	//map.locate({setView : true, maxZoom: map.getZoom()});
}

/** Cycle through the colors for supply chains randomly **/
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

/** A simple text match search **/
function SimpleSearch(term) {
	if(term) { $("#searchbar").val(term); }
	var s = $("#searchbar").val().toLowerCase();
	// Only do something if the search has changed.
	if(s == MI.attributes.prevsearch) { return; }
	else { MI.attributes.prevsearch = s; }
	
    $(".mlist li").each(function () {
        var $this = $(this);
        if ($(this).text().toLowerCase().indexOf(s) !== -1)  { $this.show();
        } else { $this.hide(); }
    });
	var found = false;
	var clusterfound = false;
	for (var i in MI.scview.map._layers) {
		if (typeof(MI.scview.map._layers[i].feature) != 'undefined') {
			if (MI.scview.map._layers[i].feature.geometry.type != "MultiLineString") {
				found = false;
				for (var k in MI.scview.map._layers[i].feature.properties) {
					if (String(MI.scview.map._layers[i].feature.properties[k]) .toLowerCase() .indexOf(s) != -1) { found = true; }
				}
				if (!(found)) { 
					MI.scview.map._layers[i].setStyle({ fillOpacity: 0.1, opacity: 0.1 }); 
					
					if(MI.scview.active_point) {
						if(MI.scview.active_point._popup._source._leaflet_id == MI.scview.map._layers[i]._leaflet_id) { MI.scview.active_point.closePopup(); }
					}
				} else { MI.scview.map._layers[i].setStyle({ fillOpacity: 1, opacity: 1 }); MI.scview.map._layers[i].bringToFront();}
			} else {
				// Do something with lines
			}
		} else if (typeof(MI.scview.map._layers[i].getAllChildMarkers) != 'undefined') {
			var childmarkers = MI.scview.map._layers[i].getAllChildMarkers();
			clusterfound = false;
			
			for (var j in childmarkers) {
				found = false;
				
				if (typeof(childmarkers[j].feature) != 'undefined') {
					for (var l in childmarkers[j].feature.properties) {
						if (String(childmarkers[j].feature.properties[l]) .toLowerCase() .indexOf(s) != -1) { found = true; clusterfound = true;}
						if (!(found)) { 
							childmarkers[j].options.opacity = 0.1; childmarkers[j].options.fillOpacity = 0.1; } 
						else { childmarkers[j].options.opacity = 1; childmarkers[j].options.fillOpacity = 1; }						
					}
				}
			}
			if (!(clusterfound)) { MI.scview.map._layers[i].setOpacity(0.1); } else { MI.scview.map._layers[i].setOpacity(1); }
		}
	} // Search map layers	
	if(MI.visualization != "map") {
		visualize(MI.visualization);
	}
} // SimpleSearch

/** Scales the map based on selected measure **/
function MeasureSort() {
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

/* UI functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/** Handles header actions **/
function ui_mheader(id) {
	var offset = $("#mheader-"+id).outerHeight();
	$("#mheader-"+id).prevAll(".mheader").each(function(i) {
		offset += $(this).outerHeight();
	});
	$('.sidepanel').scrollTo($("#mdetails-"+id),  50, { offset: -1*offset}); 	
}

/** Sets interface to full screen mode **/
function ui_fullscreen() {
	if(!($("body").hasClass("fullscreen"))) {
		$("body").addClass("fullscreen");			
	} else {
		$("body").removeClass("fullscreen");	

		if($(".leaflet-popup").length > 0 && MI.scview.active_point != null) {
			ui_pointclick(MI.scview.active_point);				
		} 		
	}
	viz_resize();
}

/** Removes a supply chain from the interface (along with its data) **/
function ui_mclose(id) {
	event.stopPropagation();
	
	var offset = $("#mheader-"+id).outerHeight();
	var target_id = 0;
	if(MI.supplychains.length > 1) {
		$("#mheader-"+id).prevAll(".mheader").each(function(i) {
			offset += $(this).outerHeight();
		});
		var target = $("#mheader-"+id).nextUntil("",".mheader");
		if(target.length == 0) {
			target = $("#mheader-"+id).prev(); 
			offset = 0;
			$("#mheader-"+id).prevAll(".mheader").each(function(i) {
				offset += $(this).outerHeight();
			});
		 }
		target_id = target.attr("id").split("-")[1];	
	}
	
	$("#mheader-"+id).remove();
	$("#mdetails-"+id).remove();
	$("#mlist-"+id).remove();
	
	for(var s in MI.supplychains) {
		if(MI.supplychains[s].details.id == id) {
			for(var i in MI.supplychains[s].details.layers) {
				MI.scview.map.removeLayer(MI.supplychains[s].details.layers[i]);
			}
			
			MI.supplychains.splice(s, 1);
			// DEP delete MI.supplychains[s];
		}
	}
	
	var moffset = 0; $('.mheader').each(function(i) { $(this).css("top", moffset); moffset += $(this).outerHeight(); });
	var roffset = 0; $('.mheader').reverse().each(function(i) { $(this).css("bottom", roffset); roffset += $(this).outerHeight(); });
	
	if(MI.supplychains.length != 0) {
		if($(".leaflet-popup").length > 0 && MI.scview.active_point) {
			ui_pointclick(MI.scview.active_point, 0);		
		} else {					
			$('.sidepanel').scrollTo($("#mdetails-"+target_id),  0, { offset: -1*offset}); 	
		}
	} else {
		if($("#minfodetail").hasClass("closed")) { ui_hamburger(); }
	}
	MI.scview.map.fitBounds(MI.scview.map.getBounds());
	
	ui_measurelist();
	viz_resize();
}

/** Handles the supply chain extra menu **/
function ui_mmenu(id) {
	event.stopPropagation();

	var raw = "";
	for(var s in MI.supplychains) {

		if(MI.supplychains[s].details.id == id) {

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

/** Handles the Manifest information and loading menu **/
function ui_hamburger() {
	$("#minfodetail").toggleClass("closed");
	$("#manifestbar").toggleClass("open");
	
	if($("#manifestbar").hasClass("open")) { $(".sidepanel").css("top", $("#manifestbar").outerHeight() + $("#manifestbar").outerHeight() / 20); } 
	else { $(".sidepanel").css("top", "4rem"); }
}

/** Handles the measure sorting interface **/
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

/** The UI side of the focus function, scrolls the user interface to a point based on map (or functional) action **/
function ui_pointclick(e, speed, slid) {
	if($(window).width() <= 920) { return; }
		
	if(speed == undefined) { speed = 500; }
	if(slid == undefined) {
		if(e != undefined && e._popup) {
			slid = e._popup._source.feature.properties.lid;
			if(e._popup._source.options.fillOpacity == 0.1) { return; }
		} else { return; }
	} 
	if($("li#local_"+slid).parent().length > 0 && !($("body").hasClass("fullscreen"))) {
		var offset = 0;
		$("li#local_"+slid).parent().prevAll(".mheader").each(function(i) {
			offset += $(this).outerHeight();
		});

		// Scroll to point
		$('.sidepanel').scrollTo(
			$("li#local_"+slid),  speed, {
				offset: -1*offset
			}
		);		
	}
	if(e == undefined && $("li#local_"+slid).length > 0) {
		$("li#local_"+slid).click();
	}
}

/** Checks to see if user interface elements overlap **/
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

/* Utility functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

jQuery.fn.shake = function(interval,distance,times){
   interval = typeof interval == "undefined" ? 100 : interval;
   distance = typeof distance == "undefined" ? 10 : distance;
   times = typeof times == "undefined" ? 3 : times;
   var jTarget = $(this);
   jTarget.css('position','relative');
   for(var iter=0;iter<(times+1);iter++){
      jTarget.animate({ left: ((iter%2==0 ? distance : distance*-1))}, interval);
   }
   return jTarget.animate({ left: 0},interval);
};

jQuery.fn.reverse = [].reverse;

/* Constants /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

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
	'GOOGLE': 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
	'DARK': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',	
	'LIGHT': 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}',	
	'TERRAIN': 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}',
	'SATELLITE': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	
	'SHIPPING': 'https://tiles.arcgis.com/tiles/nzS0F0zdNLvs7nc8/arcgis/rest/services/ShipRoutes/MapServer/WMTS/tile/1.0.0/ShipRoutes/default/default028mm/{z}/{y}/{x}.png',
	'MARINE': 'https://tiles.marinetraffic.com/ais_helpers/shiptilesingle.aspx?output=png&sat=1&grouping=shiptype&tile_size=512&legends=1&zoom={z}&X={x}&Y={y}',
	'RAIL': 'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'
};

GLOBES = ["americas","asia","europe","africa"];