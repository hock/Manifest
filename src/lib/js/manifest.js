/* Manifest =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
/* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */


/* Manifest Base Classes /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

/** Manifest Class **/
class Manifest {
	constructor(options) {
		this.options = options;
		// Default options (passed from main.js)
		// options = { hoverHighlight: false, retinaTiles: false };

		this.initialized = false;
		this.changelog = '';
		
		this.supplychains = [];
		this.Supplychain = new ManifestSupplyChain();
		this.Interface = new ManifestUI(); this.options.mobile = this.Interface.IsMobile(options);
		this.Atlas = new ManifestAtlas(options);
		this.Visualization = new ManifestVisualization();		
		this.Messenger = new ManifestMessenger(this.Atlas);
		this.Util = new ManifestUtilities();
	}
	Start(delay=false) {
		if (!(MI.initialized) || MI.Atlas.active_point === null) { MI.Atlas.SetView(MI.options.view, !(delay)); }

		if (MI.supplychains.length > 0) {
			if (!(MI.initialized || delay)) { 
				MI.Interface.CleanupInterface(); 				
				document.dispatchEvent( new Event("Manifested"));
			
				if (MI.options.demoMode) { MI.ManifestTests(); }
			}   
		}

		if (MI.Interface.IsMobile()) {		
			if (document.getElementById('viz-choices').querySelector('option[value='+document.getElementById('viz-choices').value+']').disabled) {
				MI.Visualization.type = 'map';
			}
			MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element);		
		}
	}
	
	ManifestTests() {
		MI.Interface.ShowMessage('Welcome to Manifest!');
		MI.Atlas.glMap.on('load', (e) => { 
			MI.Interface.AddDataLayer('services/data/sample/roads.geojson');
			MI.Interface.AddDataLayer('services/data/sample/countries.pmtiles');
			//MI.Atlas.LoadExternalDataLayer('png', './json/cases/bishop/australia.png', {extents: [ [100, -1], [165, -4], [163, -45], [100, -45] ]});
			//MI.Atlas.LoadExternalDataLayer('png', './json/samples/westernelectric/we-map-1927-wm.png', {extents: [ [-180, 85], [180, 85], [180, -85], [-180, -85] ]});
			
			
		//	MI.Atlas.Play("tour"); // tour or highlight
		});		
		
		MI.Messenger.AddObject(353136000);
		//setInterval(TestLoad, 5000);
	}
	
	/** SupplyChain processor main wrapper function. **/
	Process(type, d, options) {
		let lname = type === 'smap' ? d.graph.supplychain.attributes.title : (d.summary ? d.summary.name : (d.g.values[1] ? d.g.values[1][0] : ""));
		console.log(`Loaded: ${lname} (${options.url})`);
		for (let s in MI.supplychains) { if (MI.supplychains[s].details.id === options.id) { return; }}
		
		if (document.getElementById('samples-previews') !== null) {
			document.getElementById('samples-previews').querySelectorAll('.sample-preview').forEach(el => { 
				if (Number(el.dataset.hash) === options.id) { el.classList.add('loaded'); } 
		}); }
		options = Object.assign(options, MI.options);
	
		switch(type) {
			case 'manifest': d = this.Supplychain.Map(this.Supplychain.Setup(this.FormatMANIFEST(d, options))); 
				this.ManifestGraph({supplychain: {stops:d.stops, hops:d.hops}}, Object.assign(options, {style: d.details.style})); break;
			case 'smap': this.Supplychain.Map(this.Supplychain.Setup(this.FormatSMAP(d.geo, options))); 
				this.SMAPGraph(d.graph, Object.assign(options, {style: d.geo.details.style})); break;
			case 'yeti': d = this.Supplychain.Map(this.Supplychain.Setup(this.FormatYETI(d, options))); break;
			case 'gsheet': d = this.Supplychain.Map(this.Supplychain.Setup(this.FormatGSHEET(d, options))); 
				this.ManifestGraph({supplychain: {stops:d.stops, hops:d.hops}}, Object.assign(options, {style: d.details.style})); break;
		}
		
		d.setOptions = type !== 'smap' ? this.ProcessOptions(d.setOptions, d) : {};
		MI.Start(options.delay);	
	}
	
	ProcessOptions(options, d) {
		if (d.setOptions.map && MI.supplychains.length === 1 && !(MI.options.urlparams.map)) { 		
		    fetch(MI.Atlas.tiletypes[d.setOptions.map.value.toUpperCase()]).then(r => r.json()).then(s => {
		        const newStyle = s; MI.Atlas.glMap.setStyle(newStyle);
				document.getElementById('basemap-chooser').value = d.setOptions.map.value;
				document.getElementById('map').querySelectorAll('.leaflet-control-attribution').forEach(el => { el.innerHTML =  MI.Atlas.layerdefs[d.setOptions.map.value.toLowerCase()].layer.options.attribution; });
			});
		}
		if (d.setOptions.visualization && MI.supplychains.length === 1 && !(MI.options.urlparams.visualization)) { MI.Visualization.Set(d.setOptions.visualization.value, MI.Interface.active_element); }
		if (d.setOptions.position && MI.supplychains.length === 1 && !(MI.options.urlparams.position)) { 
			MI.options.position = {lat:Number(d.setOptions.position.value.split(',')[0]),lng:Number(d.setOptions.position.value.split(',')[1])}; MI.options.view = 'center';}
		if (d.setOptions.zoom && MI.supplychains.length === 1 && !(MI.options.urlparams.zoom)) { MI.options.zoom = Number(d.setOptions.zoom.value); MI.options.view = 'center'; }
		
		if (d.setOptions.storyMap && MI.supplychains.length === 1 && !(MI.options.urlparams.storyMap)) { 	
			MI.options.zoom = typeof d.setOptions.zoom !== 'undefined' ? Number(d.setOptions.zoom.value) : 10;
			MI.Interface.Storyize(); MI.Interface.SetupStoryTrigger('#mlist-'+d.details.id+' li .node-title'); }
		if (d.setOptions.datalayer) {
			d.setOptions.datalayer.parameters.scid = d.details.id;
			if (MI.Atlas.glMapLoaded) {
				MI.Atlas.LoadExternalDataLayer(d.setOptions.datalayer.value.split('.').pop(), d.setOptions.datalayer.value, d.setOptions.datalayer.parameters);
			} else {
				MI.Atlas.glMap.on('load', (e) => { 
					MI.Atlas.LoadExternalDataLayer(d.setOptions.datalayer.value.split('.').pop(), d.setOptions.datalayer.value, d.setOptions.datalayer.parameters);});	
			}
		}
			
		return d.setOptions;
	}
	/** Format a Manifest file so Manifest can understand it */
	FormatMANIFEST(manifest, options) {	
		let setOptions = {};
		for (let o in manifest.options) { setOptions[manifest.options[o].type] = {'value':manifest.options[o].value, 'parameters':manifest.options[o].parameters}; }
		
		let d = {type: 'FeatureCollection', mtype: 'manifest', raw: manifest, mapper: {}, setOptions: setOptions, options: options, details: {id: options.id, url: (options.url === '' || options.url === '#manifest-') ? '' : ('#manifest-'+options.url).split('#')[0]+'#'+('#manifest-'+options.url).split('#')[1], layers: [], measures: []}, properties: {title: manifest.summary.name, description: MI.Util.markdowner.makeHtml(manifest.summary.description)}, features: [], stops: [], hops: []};
		
		if (d.details.url === '#manifest-') { d.details.url = '#'; }
		for (let n of manifest.nodes) {
			let ft = {type: 'Feature', properties: {index: n.overview.index, scid: options.id, title: n.overview.name, description: MI.Util.markdowner.makeHtml(n.overview.description), placename: n.location.address, category: n.attributes.category ? n.attributes.category : '', images: n.attributes.image.map(function(s) { return s;}), icon: n.attributes.icon ? n.attributes.icon : '', color: n.attributes.color ? n.attributes.color : '', measures: n.measures.measures, sources: n.attributes.sources.map(function(s) { return s.source;}), notes: MI.Util.markdowner.makeHtml(n.notes.markdown)}, geometry: {type:'Point', coordinates:[n.location.geocode.split(',')[1] ? n.location.geocode.split(',')[1] : '', n.location.geocode.split(',')[0] ? n.location.geocode.split(',')[0] : '']}};
			
			ft.properties.measures = ft.properties.measures.sort(function(a,b) { return a.mtype.localeCompare(b.mtype); });
			for	(let m of ft.properties.measures) { 
				if (!ft.properties.time && (m.mtype === 'starttime' || m.mtype === 'endtime')) { ft.properties.time = {}; if (!d.details.time) { d.details.time = {}; }}
				if (m.mtype === 'starttime') { 
					ft.properties.time.start = m.mvalue; 
					d.details.time.start = d.details.time.start ? Math.min(Number(d.details.time.start), Number(m.mvalue)) : m.mvalue;
					d.details.time.end = d.details.time.end ? Math.max(Number(d.details.time.end), Number(m.mvalue)) : m.mvalue;
				} if (m.mtype === 'endtime') { 
					ft.properties.time.end = m.mvalue;
					d.details.time.start = d.details.time.start ? Math.min(Number(d.details.time.start), Number(m.mvalue)) : m.mvalue;
					d.details.time.end = d.details.time.end ? Math.max(Number(d.details.time.end), Number(m.mvalue)) : m.mvalue;
				}
			}
			//for (let attr in manifest.nodes[i].attributes) { d.features[i][attr] = manifest.nodes[i].attributes[attr]; }
			d.stops.push({ local_stop_id:Number(n.overview.index), id:Number(n.overview.index), attributes:ft.properties, geometry:ft.geometry });
			if (n.attributes.destinationindex !== '') {
				let hops = n.attributes.destinationindex.split(',');
				for (let h in hops) { d.hops.push({ from_stop_id:Number(n.overview.index), to_stop_id:Number(hops[h]), attributes:ft.properties}); }
			}		
			d.features.push(ft);
		}
		if (d.details.time && (d.details.time.start === d.details.time.end)) { d.details.time = null;}

		for (let h of d.hops) {
			h.from = d.features[h.from_stop_id-1]; h.to = d.features[h.to_stop_id-1];
			let ft = {type: 'Feature', properties: {title: h.from.properties.title+'|'+h.to.properties.title, category: [...new Set([... h.from.properties.category.split(','),...h.to.properties.category.split(',')])].join(','), connections: {from: {scid: h.from.properties.scid, index: h.from.properties.index}, to: {scid:h.to.properties.scid, index:h.to.properties.index}}}, geometry: {type:"Line", coordinates:[h.from.geometry.coordinates,h.to.geometry.coordinates]}};
			d.features.push(ft);
		}	
		return d;
	}

	/** Format a legacy Sourcemap file so Manifest can understand it */
	FormatSMAP(d, options) {
		d.raw = JSON.parse(JSON.stringify(d)); d.mtype = 'smap';
		d.details = options; d.setOptions = {}; d.details.layers = []; d.details.measures = {}; d.mapper = {}; 
		d.details.url = '#smap-'+options.idref;
		for (let ft of d.features) {
			ft.properties.category = '';
			ft.properties.images = [];
			ft.properties.sources = [''];
		}
		return d;
	}

	/** Format a google sheet file so Manifest can understand it */
	FormatGSHEET(d, options) {
		d.raw = JSON.parse(JSON.stringify(d));
		let sheetoverview = this.GSheetToJson(d.g)[0], sheetpoints = this.GSheetToJson(d.r);
		let setOptions = {};		
		if (sheetoverview.options) { 
			sheetoverview.options = sheetoverview.options.split('},{').join('}||{').split('||').map(JSON.parse); 			
			for (let o in sheetoverview.options) { setOptions[sheetoverview.options[o].type] = {'value':sheetoverview.options[o].value, 'parameters':sheetoverview.options[o].parameters}; }
		}
		let sheetid = options.id;
		let sheetsc = {};

		if (typeof sheetoverview.rootgeocode === 'undefined') {
			sheetsc = {type: 'FeatureCollection', mtype: 'gsheet', raw: d.raw, mapper: {}, setOptions: setOptions, options: options, details: {id: options.id, url: '#gsheet-'+options.idref, layers: [], measures: []}, properties: {title: sheetoverview.name, description: MI.Util.markdowner.makeHtml(sheetoverview.description)}, features: [], stops: [], hops: []};
			
			sheetpoints = sheetpoints.sort((a,b) => Number(a.index) - Number(b.index) );
			
			if (sheetpoints[0].index === 'An increasing number for indexing purposes') { sheetpoints.splice(0,1); }
			if (sheetpoints[0].index === '0' && sheetpoints[0].name === 'Sample') { sheetpoints.splice(0,1); }
			
			// @TODO This logic works great (see also hop handling below) -- should do this with the FormatManifest function also.
			let indexmap = [];
			for (let i = 0; i < sheetpoints.length; i++) { indexmap[sheetpoints[i].index] = i+1; sheetpoints[i].index = i+1; }
			
			for (let n of sheetpoints) {
				let ft = {type: 'Feature', properties: {index: n.index, scid: options.id, title: n.name, description: MI.Util.markdowner.makeHtml(n.description), placename: n.location, category: n.category, images: n.images.split('),('), icon: n.icon ? n.icon : '', color: n.color ? n.color : '', measures: typeof n.measure !== 'undefined' && n.measure !== '' ? n.measure.split('),(').map(function(s) { if (typeof s !== 'undefined' && (s.split(',').length === 3)) { return {mtype:s.split(',')[0].replace('(','').replace(')',''), mvalue:s.split(',')[1], munit:s.split(',')[2].replace('(','').replace(')','')};}}) : [], sources: n.sources.split('),('), notes: MI.Util.markdowner.makeHtml(typeof n.additionalnotes !== 'undefined' ? n.additionalnotes : '')}, geometry: {type:'Point', coordinates:[n.geocode.split(',')[1] ? n.geocode.split(',')[1] : '', n.geocode.split(',')[0] ? n.geocode.split(',')[0] : '']}};
				if (ft.properties.sources.length !== 1 || (ft.properties.sources[0].charAt(0) === '(' && ft.properties.sources[ft.properties.sources.length-1].slice(-1) === ')')) { 
					ft.properties.sources[0] = ft.properties.sources[0].slice(1); 
					ft.properties.sources[ft.properties.sources.length-1] = ft.properties.sources[ft.properties.sources.length-1].slice(0,-1);
				}
				ft.properties.measures = ft.properties.measures.sort(function(a,b) { return a.mtype.localeCompare(b.mtype); });
				for	(let m of ft.properties.measures) { 
					if (!ft.properties.time && (m.mtype === 'starttime' || m.mtype === 'endtime')) { ft.properties.time = {}; if (!sheetsc.details.time) { sheetsc.details.time = {}; }}
					if (m.mtype === 'starttime') { 
						ft.properties.time.start = m.mvalue; 
						sheetsc.details.time.start = sheetsc.details.time.start ? Math.min(Number(sheetsc.details.time.start), Number(m.mvalue)) : m.mvalue;
						sheetsc.details.time.end = sheetsc.details.time.end ? Math.max(Number(sheetsc.details.time.end), Number(m.mvalue)) : m.mvalue;
					} if (m.mtype === 'endtime') { 
						ft.properties.time.end = m.mvalue;
						sheetsc.details.time.start = sheetsc.details.time.start ? Math.min(Number(sheetsc.details.time.start), Number(m.mvalue)) : m.mvalue;
						sheetsc.details.time.end = sheetsc.details.time.end ? Math.max(Number(sheetsc.details.time.end), Number(m.mvalue)) : m.mvalue;
					}
				}

				if (ft.properties.images.length !== 1 || (ft.properties.images[0].charAt(0) === '(' && ft.properties.images[ft.properties.images.length-1].slice(-1) === ')')) { 
				
					ft.properties.images[0] = ft.properties.images[0].slice(1); 
					ft.properties.images[ft.properties.images.length-1] = ft.properties.images[ft.properties.images.length-1].slice(0,-1);
				}
				ft.properties.images = ft.properties.images.map(function(i) { 
					let icap = i.split('|'); if (icap.length <= 1) { return { URL: icap[0] }; } else { return {URL: icap[0], caption: icap[1] }; }});
				if (ft.properties.measures.length !== 0 && ft.properties.measures[0].mtype.charAt(0) === '(' && ft.properties.measures[ft.properties.measures.length-1].munit.slice(-1) === ')') { 
					ft.properties.measures[0].mtype = ft.properties.measures[0].mtype.slice(1); 
					ft.properties.measures[ft.properties.measures.length-1].munit = ft.properties.measures[ft.properties.measures.length-1].munit.slice(0,-1);
				}				
				
				sheetsc.stops.push({ local_stop_id:Number(n.index), id:Number(n.index), attributes:ft.properties, geometry:ft.geometry });
				if (n.destinationindex !== '') {
					let hops = n.destinationindex.replace(' ', '').split(',');
					for (let h in hops) { if (typeof indexmap[hops[h]] !== 'undefined') {
						sheetsc.hops.push({ from_stop_id:Number(n.index), to_stop_id:Number(indexmap[hops[h]]), attributes:ft.properties}); 
					}}
				}		
				sheetsc.features.push(ft);
			}
			if (sheetsc.details.time && (sheetsc.details.time.start === sheetsc.details.time.end)) { sheetsc.details.time = null;}
			
			for (let h of sheetsc.hops) {
				h.from = sheetsc.features[h.from_stop_id-1]; h.to = sheetsc.features[h.to_stop_id-1];
				let ft = {type: 'Feature', properties: {title: h.from.properties.title+'|'+h.to.properties.title, category: [...new Set([... h.from.properties.category.split(','),...h.to.properties.category.split(',')])].join(','), connections: {from: {scid: h.from.properties.scid, index: h.from.properties.index}, to: {scid:h.to.properties.scid, index:h.to.properties.index}}}, geometry: {type:"Line", coordinates:[h.from.geometry.coordinates,h.to.geometry.coordinates]}};
				sheetsc.features.push(ft);
			}	
		}
		else { // Format a Legacy Gsheet		
			sheetsc = {type:'FeatureCollection', mtype: 'gsheet', features: [], properties: { title: sheetoverview.name, description: sheetoverview.description, address: sheetoverview.rootaddress, geocode: sheetoverview.rootgeocode, measure: sheetoverview.measure }, details: options, mapper: {}, raw: d.raw, stops: [], hops: []};
			sheetsc.details.layers = []; sheetsc.details.measures = {};
			sheetsc.details.url = '#gsheet-'+sheetsc.details.url.split('&id=')[1];
			for (let point of sheetpoints) {
				let j = sheetsc.features.length;
				sheetsc.features[j] = {type: 'Feature'};			
				sheetsc.features[j].properties = {};	
				sheetsc.features[j].properties.title = point.name;
				sheetsc.features[j].properties.description = point.description;
				sheetsc.features[j].properties.placename = point.location;
				sheetsc.features[j].properties.category = point.category;
				sheetsc.features[j].properties.sources = point.sources;
				sheetsc.features[j].properties.notes = point.notes;
				sheetsc.features[j].properties.measures = {};
				sheetsc.features[j].geometry = {type:'Point', coordinates:[Number(point.geocode.split(',')[1]), Number(point.geocode.split(',')[0])]};				
				sheetsc.stops.push({ 'local_stop_id':Math.max(1,j), 'id':Math.max(1,j), 'attributes':sheetsc.features[j].properties });
			}					
		}
		return sheetsc;
	
	}
	GSheetToJson(sheet) {
		let rows = [];
		for (let i = 1; i < sheet.values.length; i++) {
			let row = {};
			for (let [j, prop] of sheet.values[0].entries()) {
				row[prop.toLowerCase()] = sheet.values[i][j];
				if (typeof row[prop.toLowerCase()] === 'undefined') { row[prop.toLowerCase()] = '';}
			}
			rows[rows.length] = row;
		}
		return rows;
	}
	
	/** Format a Yeti file so Manifest can understand it */
	FormatYETI(yeti, options) {	
		let d = {type:'FeatureCollection', mtype: 'yeti'};
		d.raw = yeti;
		d.details = options; d.details.layers = []; d.details.measures = {};
		d.properties = {title: yeti.company_name, description: yeti.company_address};
		for (let item in yeti){	d.properties[item] = yeti[item]; }	
		d.tempFeatures = d.properties.vendor_table; delete d.properties.vendor_table;	
				
		// Format Layer
		d.features = [];
	
		for (let i in d.tempFeatures) {
			if (typeof d.tempFeatures[i] !== 'undefined') {
				d.features[i] = {type: 'Feature'};			
				d.features[i].properties = {};	
				for (let ft in d.tempFeatures[i]) { d.features[i][ft] = d.tempFeatures[i][ft]; }
				d.features[i].properties.title = d.tempFeatures[i].vendor_name; delete d.tempFeatures[i].vendor_name;
				d.features[i].properties.description = d.tempFeatures[i].product_descriptions.join(' / '); delete d.tempFeatures[i].product_descriptions;
				d.features[i].properties.placename = d.tempFeatures[i].vendor_address; delete d.tempFeatures[i].vendor_address;
						
				d.features[i].properties.measures = {};
				d.features[i].properties.percent = d.tempFeatures[i].shipments_percents_company;
				d.features[i].properties.measures.percent = d.tempFeatures[i].shipments_percents_company;
				d.details.measures.percent = {max:100, min:0};
				d.features[i].geometry = {type:'Point', coordinates:[d.tempFeatures[i].lng, d.tempFeatures[i].lat]};
			}
		}
	
		delete d.tempFeatures;
		return d;
	}

	/** Setup the graph relationships for Manifest files **/
	ManifestGraph(d, options) {
		let sc = null;
		for (let s in MI.supplychains) {
			if (MI.supplychains[s].details.id === options.id) { 
				MI.supplychains[s].graph = {nodes:[], links:[]}; 
				sc = MI.supplychains[s]; 
			} 
		}

		if (typeof d.supplychain.stops !== 'undefined') {
			for (let i = 0; i < d.supplychain.stops.length; ++i) {
			
				let title = (d.supplychain.stops[i].attributes.title) ? d.supplychain.stops[i].attributes.title : 'Node';
				let place = (d.supplychain.stops[i].attributes.placename) ? d.supplychain.stops[i].attributes.placename : 
							((d.supplychain.stops[i].attributes.address) ? d.supplychain.stops[i].attributes.address : '');
				let loc = place.split(', ').pop();
				let localstopid = Number(d.supplychain.stops[i].local_stop_id-1);
				let newNode = { id: options.id+'-'+localstopid, name: title, loc: loc, place: place, group: options.id, links: [], ref: sc.mapper[localstopid],
					color: options.style.color, fillColor: options.style.fillColor };
				sc.graph.nodes[d.supplychain.stops[i].local_stop_id - 1] = newNode;
			}
		}
		
		if (typeof d.supplychain.hops !== 'undefined' && d.supplychain.hops.length > 0) {
			sc.graph.type = 'directed';
			for (let j = 0; j < d.supplychain.hops.length; ++j) {	
				sc.graph.nodes[d.supplychain.hops[j].to_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[j].from_stop_id - 1].loc);
				let newLink = { source: Number(d.supplychain.hops[j].from_stop_id - 1), target: Number(d.supplychain.hops[j].to_stop_id - 1),
					 color: options.style.color, fillColor: options.style.fillColor};
				sc.graph.links.push(newLink);

			} 	
			for (let k = 0; k < d.supplychain.hops.length; ++k) {
				sc.graph.nodes[d.supplychain.hops[k].from_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[k].to_stop_id - 1].loc);
			}
		} else { sc.graph.type = 'undirected'; }

		for (let l = 0; l < sc.graph.links.length; l++) {
			sc.graph.links[l].source = String(options.id)+'-'+(sc.graph.links[l].source);
			sc.graph.links[l].target = String(options.id)+'-'+(sc.graph.links[l].target);		
		}
		for (let l = 0; l < sc.graph.nodes.length; l++) {
			if (typeof sc.graph.nodes[l] !== 'undefined') {
				let id = sc.graph.nodes[l].id.split('-');
				sc.graph.nodes[l].id = id[0]+'-'+(Number(id[1]));				
			}
		}	
		MI.Interface.SetVizOptions();	
	}
	
	SMAPGraph(d, options) {
		let sc = null;
		for (let s in MI.supplychains) {
			if (MI.supplychains[s].details.id === options.id) { 
				MI.supplychains[s].graph = {nodes:[], links:[]}; 
				sc = MI.supplychains[s]; 
			} 
		}

		let digits = null;
		if (typeof d.supplychain.stops !== 'undefined') {
			//d.supplychain.stops = d.supplychain.stops.reverse();
			for (let i = 0; i < d.supplychain.stops.length; ++i) {
			
				let title = (d.supplychain.stops[i].attributes.title) ? d.supplychain.stops[i].attributes.title : 'Node';
				let place = (d.supplychain.stops[i].attributes.placename) ? d.supplychain.stops[i].attributes.placename : 
							((d.supplychain.stops[i].attributes.address) ? d.supplychain.stops[i].attributes.address : '');
				let loc = place.split(', ').pop();

				// Correct local stop id
				digits = (Math.round(100*Math.log(d.supplychain.stops.length)/Math.log(10))/100)+1;
				d.supplychain.stops[i].local_stop_id = Number((''+d.supplychain.stops[i].local_stop_id).slice(-1*digits));

				let ref = sc.mapper['map'+place.replace(/[^a-zA-Z0-9]/g, '')+title.replace(/[^a-zA-Z0-9]/g, '')];
				let newNode = { id: options.id+'-'+Number(d.supplychain.stops[i].local_stop_id-1), name: title, loc: loc, place: place, group: options.id, links: [], ref: ref,
					color: options.style.color, fillColor: options.style.fillColor };
				sc.graph.nodes[d.supplychain.stops[i].local_stop_id - 1] = newNode;
			}
		} delete sc.mapper; // Remove Mapper
	
		if (typeof d.supplychain.hops !== 'undefined' && d.supplychain.hops.length > 0) {
			sc.graph.type = 'directed';
			for (let j = 0; j < d.supplychain.hops.length; ++j) {
				// Correct stop ids
				d.supplychain.hops[j].to_stop_id = Number((''+d.supplychain.hops[j].to_stop_id).slice(-1*digits));
				d.supplychain.hops[j].from_stop_id = Number((''+d.supplychain.hops[j].from_stop_id).slice(-1*digits));
			
				sc.graph.nodes[d.supplychain.hops[j].to_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[j].from_stop_id - 1].loc);
				let newLink = { source: Number(d.supplychain.hops[j].from_stop_id - 1), target: Number(d.supplychain.hops[j].to_stop_id - 1),
					 color: options.style.color, fillColor: options.style.fillColor};
				sc.graph.links.push(newLink);

			} 	
			for (let k = 0; k < d.supplychain.hops.length; ++k) {
				sc.graph.nodes[d.supplychain.hops[k].from_stop_id - 1].links.push(sc.graph.nodes[d.supplychain.hops[k].to_stop_id - 1].loc);
			}
		} else { sc.graph.type = 'undirected'; }

		let offset = 0;
		for (let l = 0; l < sc.graph.nodes.length; l++) { if (typeof sc.graph.nodes[l] === 'undefined') { offset++; } }
		for (let l = 0; l < sc.graph.links.length; l++) {
			sc.graph.links[l].source = String(options.id)+'-'+(sc.graph.links[l].source - offset);
			sc.graph.links[l].target = String(options.id)+'-'+(sc.graph.links[l].target - offset);		
		}
		for (let l = 0; l < sc.graph.nodes.length; l++) {
			if (typeof sc.graph.nodes[l] !== 'undefined') {
				let id = sc.graph.nodes[l].id.split('-');
				sc.graph.nodes[l].id = id[0]+'-'+(Number(id[1])-offset);				
			}
		}		
		let adjgraph = [];
		for (let l = 0; l < sc.graph.nodes.length; l++) { if (typeof sc.graph.nodes[l] !== 'undefined') { adjgraph.push(sc.graph.nodes[l]); } }
		sc.graph.nodes = adjgraph.reverse();
		MI.Interface.SetVizOptions();		
	}

	/** Setup the graph relationships for Yeti files **/
	YETIGraph(d, options) {
		let sc = null;
		for (let i in MI.supplychains) {
			if (MI.supplychains[i].details.id === options.id) { 
				MI.supplychains[i].graph = {nodes:[], links:[]}; 
				sc = MI.supplychains[i]; 
			} 
		}
		let root = { id: sc.details.id, group: 1, name: sc.properties.company_name, ref: sc.features[0] };
		sc.graph.nodes.push(root);
	
		for (let f in sc.features) {
			let node = { id: sc.features[f].properties.lid, group: sc.features[f].properties.lid, name: sc.features[f].properties.title, ref: sc.features[f] };
			sc.graph.nodes.push(node);
		}
		for (let j = 1; j <  sc.graph.nodes.length; ++j) {
			let link = { size: 4, source: 0, target: j, value: 10 };
			sc.graph.links.push(link);
		}	
		sc.graph.type = 'directed';
	}

	LoadManifestFile(filedata, filename) {
		for (let s in MI.supplychains) { if (MI.supplychains[s].details.id === ManifestUtilities.Hash(filename)) { return false; }}
		
	    if (!filedata) { return false; }

	    let reader = new FileReader();
		reader.filename = filename;
	    reader.onload = function(e) { MI.Process('manifest', JSON.parse(e.target.result), {id: ManifestUtilities.Hash(e.target.filename), url: '', start:MI.supplychains.length === 0}); };
	    reader.readAsText(filedata);
		document.getElementById('file-input').value = "";
		return true;
	}
	
	_saveMapImage(gl, branding=false, getimage=false) {
		MI.Atlas.glMap.prepareSaveImage = {status: false, logo: false, get: false};
		
		let canvas = document.createElement('canvas');
		let markers = document.querySelectorAll('.leaflet-overlay-pane canvas')[0];
	    canvas.width =  MI.Atlas.map.getSize().x;
	    canvas.height =  MI.Atlas.map.getSize().y;
		let composite = canvas.getContext('2d');
		
        composite.drawImage(gl._actualCanvas, 0, 0, MI.Atlas.map.getSize().x, MI.Atlas.map.getSize().y);
		composite.drawImage(markers, 0, 0, MI.Atlas.map.getSize().x, MI.Atlas.map.getSize().y);
		
		if (branding) {
			composite.fillStyle = '#4d34db';
			composite.strokeStyle = "black";
			composite.fillRect(0, 0, 330, 55);

			composite.textBaseline = "top";
			composite.font = "20px Roboto, Helvetica, sans-serif";
			composite.fillStyle = "white";
			composite.fillText("M", 10, 8);
		}
		if (getimage === false) {
			let link = document.createElement('a');
			link.download = 'test.png';
			link.href = 	composite.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
			link.click();	
		} else {
			let mapimage = new Image();
			mapimage.src = composite.canvas.toDataURL("image/png"); mapimage.id = 'map-printpreview';
			document.body.appendChild(mapimage);
		}
	}
	 ExportManifest(d, filename, format) {
		 if (typeof d === 'number') { 
			 for (let s in MI.supplychains) { if (MI.supplychains[s].details.id === d) { 
				 d = MI.supplychains[s];
			 }}
		 }
		 let a = document.createElement('a');
		
		if (format === 'map') {
			MI.Atlas.glMap.prepareSaveImage = {status: true, logo: false, get: false};
			MI.Atlas.glMap.triggerRepaint(); 
		} else if (format === 'json') {
			let json = '';
			if (d.mtype === 'smap') { json = this._smapToManifest(d); } 
			else if (d.mtype === 'gsheet') { json = this._gsheetToManifest(d); }
			else { json = d.raw; }
			a.setAttribute('href', 'data:text/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(json)));
			a.setAttribute('download', filename+'.json');
			a.click();
		} else if (format === 'markdown') {
			a.setAttribute('href', 'data:text/md;charset=utf-8,'+encodeURIComponent(this._manifestToMarkdown(d)));
			a.setAttribute('download', filename+'.md');
			a.click();
		}
	}

	_gsheetToManifest(d) {
		let s = {summary:{name:d.properties.title, description:d.properties.description}, nodes:[]};
		let off = 0;
		for (let node of d.graph.nodes) {
			if (off === 0) { off = Number(node.id.split('-')[1]); } if (off >= Number(node.id.split('-')[1])) { off = Number(node.id.split('-')[1]); }
			let n = {overview:{index:Number(node.id.split('-')[1])+1,name:node.ref.properties.title,description:node.ref.properties.description},
				location:{address:node.ref.properties.placename,geocode:node.ref.geometry.coordinates[1]+','+node.ref.geometry.coordinates[0]},
				attributes:{destinationindex:[],image:node.ref.properties.images,sources:node.ref.properties.sources.map(s => ({'source':s}))}, measures:{measures:[]},notes:{markdown:'',keyvals:[{key:'',value:''}]}};
			for (let m of node.ref.properties.measures) { if (Number(m.mvalue) !== 0) { n.measures.measures.push(m); } }						
			s.nodes[Number(node.id.split('-')[1])] = n;
		}

		for (let link of d.graph.links) { 

			s.nodes[Number(link.source.split('-')[1])].attributes.destinationindex.push(Number(link.target.split('-')[1])+1); 
		}
		for (let i = 0; i < s.nodes.length; i++) {
			if (typeof s.nodes[i] === 'undefined') {
				s.nodes.splice(i, 1); 
				
				for (let j = 0; j < s.nodes.length; j++) { if (j >= i && typeof s.nodes[j] !== 'undefined') {
					s.nodes[j].overview.index = Number(s.nodes[j].overview.index) - 1;			
				}}
				for (let k = 0; k < s.nodes.length; k++) { if (typeof s.nodes[k] !== 'undefined') {
					for (let d in s.nodes[k].attributes.destinationindex) {
						if (s.nodes[k].attributes.destinationindex[d] > i) {
							s.nodes[k].attributes.destinationindex[d] = Number(s.nodes[k].attributes.destinationindex[d]) - 1;
						}
					}					
				}}		
				
				i--;
			} 
		}
		for (let node of s.nodes) {  if (typeof node !== 'undefined') {
			if (node.attributes.destinationindex.length === 0) { node.attributes.destinationindex = '';} 
			else { node.attributes.destinationindex = node.attributes.destinationindex.filter((d, index, dests) => { return dests.indexOf(d) === index; }).join(','); }
		}}
		
		return s;
	}
	
	_smapToManifest(d) {
		let s = {summary:{name:d.properties.title, description:d.properties.description}, nodes:[]};
		let off = 0;
		for (let node of d.graph.nodes) {
			if (off === 0) { off = Number(node.id.split('-')[1]); } if (off >= Number(node.id.split('-')[1])) { off = Number(node.id.split('-')[1]); }
			let n = {overview:{index:Number(node.id.split('-')[1])+1,name:node.ref.properties.title,description:node.ref.properties.description},
				location:{address:node.ref.properties.placename,geocode:node.ref.geometry.coordinates.reverse().join(',')},
				attributes:{destinationindex:[],image:[{URL:''}],sources:[{source:''}]}, measures:{measures:[]},notes:{markdown:'',keyvals:[{key:'',value:''}]}};
			for (let m of node.ref.properties.measures) { if (Number(m.mvalue) !== 0) { n.measures.measures.push(m); } }						
			s.nodes[Number(node.id.split('-')[1])] = n;
		}
		if (off > 0) {
			let newlist = [], destmap = d => Number(d) - off;
			for (let node of s.nodes) { if (typeof node !== 'undefined') {
				let index = Number(node.overview.index) - off;
				node.overview.index = index;
				
				newlist[index -1] = node;
			}}
			s.nodes = newlist;
		}
		for (let link of d.graph.links) { 

			s.nodes[Number(link.source.split('-')[1])].attributes.destinationindex.push(Number(link.target.split('-')[1])+1); 
		}
		for (let i = 0; i < s.nodes.length; i++) {
			if (typeof s.nodes[i] === 'undefined') {
				s.nodes.splice(i, 1); 
				
				for (let j = 0; j < s.nodes.length; j++) { if (j >= i && typeof s.nodes[j] !== 'undefined') {
					s.nodes[j].overview.index = Number(s.nodes[j].overview.index) - 1;			
				}}
				for (let k = 0; k < s.nodes.length; k++) { if (typeof s.nodes[k] !== 'undefined') {
					for (let d in s.nodes[k].attributes.destinationindex) {
						if (s.nodes[k].attributes.destinationindex[d] > i) {
							s.nodes[k].attributes.destinationindex[d] = Number(s.nodes[k].attributes.destinationindex[d]) - 1;
						}
					}					
				}}		
				
				i--;
			} 
		}
		for (let node of s.nodes) {  if (typeof node !== 'undefined') {
			if (node.attributes.destinationindex.length === 0) { node.attributes.destinationindex = '';} 
			else { node.attributes.destinationindex = node.attributes.destinationindex.filter((d, index, dests) => { return dests.indexOf(d) === index; }).join(','); }
		}}
		
		return s;
	}
	
	_manifestToMarkdown(d) {
		let md = '';

		md += '# '+d.properties.title + '\n';
		md += ''+d.properties.description.replace(/(<([^>]+)>)/gi, '').replace(/(\r\n|\n|\r)/gm,'') + '\n\n';

		if (d.features.length >= 1) {
			for (let ft of d.features) {
				// TODO For now we purposefully ignore lines.. If we have detailed line information we can reconsider this.
				if (ft.geometry.type === 'Point') {
					md += (ft.properties.title !== undefined && ft.properties.title !== '') ? '### '+ft.properties.title + '\n' : '';
					md += (ft.properties.placename !== undefined && ft.properties.placename !== '') ? ''+ft.properties.placename + '\n' : '';
					md += (ft.properties.category !== undefined && ft.properties.category !== '') ? ''+ft.properties.category + '\n' : '';
					md += (ft.properties.description !== undefined && ft.properties.description !== '') ? ''+ft.properties.description.replace(/(<([^>]+)>)/gi, '').replace(/(\r\n|\n|\r)/gm,'') + '\n' : '';
					md += (ft.properties.sources !== undefined && ft.properties.sources !== '') ? ''+'* '+ft.properties.sources.join('\n* ') + '\n' : '';
					md += (ft.properties.notes !== undefined && ft.properties.notes !== '') ? ''+ft.properties.notes.replace(/(<([^>]+)>)/gi, '').replace(/(\r\n|\n|\r)/gm,'') + '\n' : '';
	
					md += '\n';
				}
			}
		}		
		return md;
	}	
}

class ManifestMessenger {
	constructor(atlas) {
		this.rate = 300000;
		this.interval = setInterval(this.Update, this.rate);
		this.objects = {};
		
		atlas.livelayer = new L.layerGroup();
		atlas.map.addLayer(atlas.livelayer);				
	}

	Add(url, callback) {
		fetch(url).then(c => c.json()).then(d => callback(d)).then(obj => {this.objects[obj.oid] = obj; console.log(this.objects);}); 
	}
	
	AddObject(oid) {
		let call = MI.options.serviceurl+'aprsfi/vessel/'+oid;
		this.Add(call, function(d) {
			console.log(d);
			let vessel = {oid: oid, name: d.entries[0].name, heading: d.entries[0].heading, latlng: new L.latLng(d.entries[0].lat,d.entries[0].lng)};
			vessel.style = MI.Atlas.styles.live; vessel.style.rotation = vessel.angle = vessel.heading;
			let tooltipContent = `<div id="tooltip-oid-${oid}" class="mtooltip" style="background: #ffffff; color: #2196F3;">The vessel ${vessel.name} (${d.entries[0].lat},${d.entries[0].lng})</div>`;
			let marker = new L.triangleMarker(vessel.latlng, vessel.style);
			marker.feature = {properties: {hidden: false}};
			marker.bindTooltip(tooltipContent);
			vessel.service = call;
			vessel.mapref = MI.Atlas.livelayer.addLayer(marker);
			
			let liveobject = document.createElement('li');
			liveobject.classList.add('liveobject'); liveobject.id = 'lo-'+d.entries[0].lat+'|'+d.entries[0].lng;
			liveobject.innerHTML = `${vessel.name} (${d.entries[0].lat},${d.entries[0].lng})`;
			document.getElementById('liveobjectlist').append(liveobject);
			
			document.querySelectorAll('.liveobject').forEach(el => { el.addEventListener('click', (e) => { 
				let ll = el.id.substring(3).split('|');
				MI.Atlas.SetActivePoint(null, true);
				MI.Atlas.map.setView(new L.latLng(ll[0],ll[1])); 
				
			});});
			
			return vessel;
		});
	}
	
	Update() {
		MI.Atlas.livelayer.clearLayers();
		const listlist = document.getElementById("liveobjectlist");
		while (listlist.firstChild) {
			listlist.removeChild(listlist.lastChild);
		}
		for (let obj in MI.Messenger.objects) {
			MI.Messenger.AddObject(MI.Messenger.objects[obj].oid);
		}
	
	}
}
