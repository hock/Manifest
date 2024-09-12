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
		options.storymode = options.urlparams.storyMap !== 'false' ? (options.storyMap || options.embed) || (d.setOptions && d.setOptions.storyMap && MI.supplychains.length === 1) : false;
		
		let index = MI.supplychains.length;

		switch(type) {
			case 'manifest': d = this.ManifestGraph(this.Supplychain.Map(this.Supplychain.Setup(this.FormatMANIFEST({index:index, manifest:d, options:options, data:{}})))); 
				MI.supplychains.push(d.manifest);			
				d.manifest.setOptions = this.ProcessOptions(d.manifest.setOptions, d.manifest); break;
			case 'smap':  d = this.SMAPGraph(this.Supplychain.Map(this.Supplychain.Setup(this.FormatSMAP({index:index, manifest:d.geo, options:options, data:{graph:d.graph}})))); 
				MI.supplychains.push(d.manifest); break;
			case 'gsheet': d = this.ManifestGraph(this.Supplychain.Map(this.Supplychain.Setup(this.FormatGSHEET({index:index, manifest:d, options:options, data:{}})))); 
				MI.supplychains.push(d.manifest);			
				d.manifest.setOptions = this.ProcessOptions(d.manifest.setOptions, d.manifest); break;
		}
		MI.Interface.OnProcessComplete(index, d.manifest.details.id, d.data); 
		if (MI.supplychains.length > 0 && !(MI.initialized)) {
			MI.Interface.CleanupInterface(); document.dispatchEvent( new Event("Manifested"));
			if (MI.options.demoMode) { MI.ManifestTests(); }   
		}
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
		if (d.setOptions.timerange && MI.Interface.timeslider) { 	
			MI.Interface.timeslider.lower = MI.options.timerange.lower;
			MI.Interface.timeslider.upper = MI.options.timerange.upper;
			MI.Interface.OnTimeUpdate();
	
			document.getElementById('timer-lower-value').innerHTML = ManifestUtilities.PrintUTCDate(MI.options.timerange.lower);
			document.getElementById('timer-upper-value').innerHTML = ManifestUtilities.PrintUTCDate(MI.options.timerange.upper);
		}
		
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
	FormatMANIFEST(m) {	
		let index = m.index, manifest = m.manifest, options = m.options, data = m.data;
		let setOptions = {};
		for (let o in manifest.options) { setOptions[manifest.options[o].type] = {'value':manifest.options[o].value, 'parameters':manifest.options[o].parameters}; }
		
		let d = {type: 'FeatureCollection', mtype: 'manifest', raw: manifest, mapper: {}, setOptions: setOptions, options: options, details: {id: options.id, url: (options.url === '' || options.url === '#manifest-') ? '' : ('#manifest-'+options.url).split('#')[0]+'#'+('#manifest-'+options.url).split('#')[1], layers: [], measures: []}, properties: {title: manifest.summary.name, description: MI.Util.markdowner.makeHtml(manifest.summary.description)}, features: [], stops: [], hops: []};
		
		if (d.details.url === '#manifest-') { d.details.url = '#'; }
		for (let n of manifest.nodes) {
			let ft = {type: 'Feature', properties: {index: n.overview.index, scid: options.id, title: n.overview.name, description: MI.Util.markdowner.makeHtml(n.overview.description), placename: n.location.address, category: n.attributes.category ? n.attributes.category : '', images: n.attributes.image.map(function(s) { return s;}), icon: n.attributes.icon ? n.attributes.icon : '', color: n.attributes.color ? n.attributes.color : '', measures: n.measures.measures, sources: n.attributes.sources.map(function(s) { return s.source;}), notes: MI.Util.markdowner.makeHtml(n.notes.markdown)}, geometry: {type:'Point', coordinates:[n.location.geocode.split(',')[1] ? n.location.geocode.split(',')[1] : '', n.location.geocode.split(',')[0] ? n.location.geocode.split(',')[0] : '']}};
			
			// Measure Setup
			for	(let m in ft.properties.measures) { 
				let moptions = {};
				if (ft.properties.measures[m].series || typeof ft.properties.measures[m].mvalue === 'object') { moptions.series = true; }
				ft.properties.measures[m] = new Measure(ft.properties.measures[m].mtype, ft.properties.measures[m].mvalue, ft.properties.measures[m].munit, moptions);
			}
			ft.properties.measures = ft.properties.measures.sort(function(a,b) { return a.GetType().localeCompare(b.GetType()); });
						
			let measureobject = [];
			for	(let m of ft.properties.measures) { 
				if (!ft.properties.time && ['starttime','start','endtime','end'].includes(m.GetType())) { ft.properties.time = new Time(); if (!d.details.time) { d.details.time = new Time(); }}
				if (['starttime','start'].includes(m.GetType())) { 
					ft.properties.time.SetStart(m.GetValue()); 
					d.details.time.SetStart(d.details.time.GetStart() ? Math.min(Number(d.details.time.GetStart()), m.GetValue()) : m.GetValue());
					d.details.time.SetEnd(d.details.time.GetEnd() ? Math.max(Number(d.details.time.GetEnd()), m.GetValue()) : m.GetValue());
				} if (['endtime','end'].includes(m.GetType())) { 
					ft.properties.time.SetEnd(m.GetValue());
					d.details.time.SetStart(d.details.time.GetStart() ? Math.min(Number(d.details.time.GetStart()), m.GetValue()) : m.GetValue());
					d.details.time.SetEnd(d.details.time.GetEnd() ? Math.max(Number(d.details.time.GetEnd()), m.GetValue()) : m.GetValue());
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
		if (d.details.time && (d.details.time.GetStart() === d.details.time.GetEnd())) { d.details.time = null;}

		for (let h of d.hops) {
			h.from = d.features[h.from_stop_id-1]; h.to = d.features[h.to_stop_id-1];
			let ft = {type: 'Feature', properties: {title: h.from.properties.title+'|'+h.to.properties.title, category: [...new Set([... h.from.properties.category.split(','),...h.to.properties.category.split(',')])].join(','), connections: {from: {scid: h.from.properties.scid, index: h.from.properties.index}, to: {scid:h.to.properties.scid, index:h.to.properties.index}}}, geometry: {type:"Line", coordinates:[h.from.geometry.coordinates,h.to.geometry.coordinates]}};
			d.features.push(ft);
		}	
		
		return {index:index, manifest:d, options:options, data:data};		
	}

	/** Format a legacy Sourcemap file so Manifest can understand it */
	FormatSMAP(m) {
		let index = m.index, d = m.manifest, options = m.options, data = m.data;
		
		d.raw = JSON.parse(JSON.stringify(d)); d.mtype = 'smap';
		d.details = options; d.setOptions = {}; d.details.layers = []; d.details.measures = {}; d.mapper = {}; 
		d.details.url = options.idref ? '#smap-'+options.idref : '#smap-'+options.id;
		for (let ft of d.features) { ft.properties.category = ''; ft.properties.images = []; ft.properties.sources = ['']; }
		
		Object.assign(options, {style: d.details.style});
		d.options = options;
		return {index:index, manifest:d, options:options, data:data};				
	}

	/** Format a google sheet file so Manifest can understand it */
	FormatGSHEET(m) {
		let index = m.index, d = m.manifest, options = m.options, data = m.data;
		
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
				let ft = {type: 'Feature', properties: {index: n.index, scid: options.id, title: n.name, description: MI.Util.markdowner.makeHtml(n.description), placename: n.location, category: n.category, images: n.images.split('),('), icon: n.icon ? n.icon : '', color: n.color ? n.color : '', sources: n.sources.split('),('), notes: MI.Util.markdowner.makeHtml(typeof n.additionalnotes !== 'undefined' ? n.additionalnotes : '')}, geometry: {type:'Point', coordinates:[n.geocode.split(',')[1] ? n.geocode.split(',')[1] : '', n.geocode.split(',')[0] ? n.geocode.split(',')[0] : '']}};
				if (ft.properties.sources.length !== 1 || (ft.properties.sources[0].charAt(0) === '(' && ft.properties.sources[ft.properties.sources.length-1].slice(-1) === ')')) { 
					ft.properties.sources[0] = ft.properties.sources[0].slice(1); 
					ft.properties.sources[ft.properties.sources.length-1] = ft.properties.sources[ft.properties.sources.length-1].slice(0,-1);
				}
				ft.properties.measures = [];
				
				if (typeof n.measure !== 'undefined' && n.measure !== '') {
					ft.properties.measures = n.measure.split('),(').map(function(s) { 
						if (typeof s !== 'undefined' && (s.split(',').length >= 3)) { 
							let series = s.includes(':');
							let rawmeasure = s.split(',');
							let type = rawmeasure.shift().replace(/[^a-z0-9]/gi,'');
							let unit = rawmeasure.pop().replace(/[^a-z0-9\-]/gi,'');
							
							let value = series ? rawmeasure.map(function(t) { return {[t.split(':')[0].replace(/[^a-z0-9]/gi,'')]: t.split(':')[1].replace(/[^a-z0-9\-]/gi,'')}; }) : rawmeasure.pop().replace(/[^a-z0-9\-]/gi,'');
							return {mtype:type, mvalue:value, munit:unit, options:{series:series}};
						}
					});
				} 
				
				if (ft.properties.measures.length !== 0 && ft.properties.measures[0].mtype.charAt(0) === '(' && ft.properties.measures[ft.properties.measures.length-1].munit.slice(-1) === ')') { 
					ft.properties.measures[0].mtype = ft.properties.measures[0].mtype.slice(1); 
					ft.properties.measures[ft.properties.measures.length-1].munit = ft.properties.measures[ft.properties.measures.length-1].munit.slice(0,-1);
				}
				for	(let m in ft.properties.measures) { 
					ft.properties.measures[m] = new Measure(ft.properties.measures[m].mtype, ft.properties.measures[m].mvalue, ft.properties.measures[m].munit, ft.properties.measures[m].options);
				}
				ft.properties.measures = ft.properties.measures.sort(function(a,b) { return a.GetType().localeCompare(b.GetType()); });
				for	(let m of ft.properties.measures) { 
					if (!ft.properties.time && ['starttime','start','endtime','end'].includes(m.GetType())) { ft.properties.time = new Time(); if (!sheetsc.details.time) { sheetsc.details.time = new Time(); }}
					if (['starttime','start'].includes(m.GetType())) { 
						ft.properties.time.SetStart(m.GetValue()); 
						sheetsc.details.time.SetStart(sheetsc.details.time.GetStart() ? Math.min(Number(sheetsc.details.time.GetStart()), m.GetValue()) : m.GetValue());
						sheetsc.details.time.SetEnd(sheetsc.details.time.GetEnd() ? Math.max(Number(sheetsc.details.time.GetEnd()), m.GetValue()) : m.GetValue());
					} if (['endtime','end'].includes(m.GetType())) { 
						ft.properties.time.SetEnd(m.GetValue());
						sheetsc.details.time.SetStart(sheetsc.details.time.GetStart() ? Math.min(Number(sheetsc.details.time.GetStart()), m.GetValue()) : m.GetValue());
						sheetsc.details.time.SetEnd(sheetsc.details.time.GetEnd() ? Math.max(Number(sheetsc.details.time.GetEnd()), m.GetValue()) : m.GetValue());
					}
				}

				if (ft.properties.images.length !== 1 || (ft.properties.images[0].charAt(0) === '(' && ft.properties.images[ft.properties.images.length-1].slice(-1) === ')')) { 
				
					ft.properties.images[0] = ft.properties.images[0].slice(1); 
					ft.properties.images[ft.properties.images.length-1] = ft.properties.images[ft.properties.images.length-1].slice(0,-1);
				}
				ft.properties.images = ft.properties.images.map(function(i) { 
					let icap = i.split('|'); if (icap.length <= 1) { return { URL: icap[0] }; } else { return {URL: icap[0], caption: icap[1] }; }});
								
				
				sheetsc.stops.push({ local_stop_id:Number(n.index), id:Number(n.index), attributes:ft.properties, geometry:ft.geometry });
				if (n.destinationindex !== '') {
					let hops = n.destinationindex.replace(' ', '').split(',');
					for (let h in hops) { if (typeof indexmap[hops[h]] !== 'undefined') {
						sheetsc.hops.push({ from_stop_id:Number(n.index), to_stop_id:Number(indexmap[hops[h]]), attributes:ft.properties}); 
					}}
				}		
				sheetsc.features.push(ft);
			}
			if (sheetsc.details.time && (sheetsc.details.time.GetStart() === sheetsc.details.time.GetEnd())) { sheetsc.details.time = null;}
			
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
		return {index:index, manifest:sheetsc, options:options, data:data};		
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
	
	/** Setup the graph relationships for Manifest files **/
	ManifestGraph(m) {
		let index = m.index, manifest = m.manifest, options = m.options, data = m.data;
		
		manifest.graph = {nodes:[], links:[]}; 

		if (typeof manifest.stops !== 'undefined') {
			for (let i = 0; i < manifest.stops.length; ++i) {
			
				let title = (manifest.stops[i].attributes.title) ? manifest.stops[i].attributes.title : 'Node';
				let place = (manifest.stops[i].attributes.placename) ? manifest.stops[i].attributes.placename : 
							((manifest.stops[i].attributes.address) ? manifest.stops[i].attributes.address : '');
				let loc = place.split(', ').pop();
				let localstopid = Number(manifest.stops[i].local_stop_id-1);
				let newNode = { id: options.id+'-'+localstopid, name: title, loc: loc, place: place, group: options.id, links: [], ref: manifest.mapper[localstopid],
					color: options.style.color, fillColor: options.style.fillColor };
				manifest.graph.nodes[manifest.stops[i].local_stop_id - 1] = newNode;
			}
		}
		
		if (typeof manifest.hops !== 'undefined' && manifest.hops.length > 0) {
			manifest.graph.type = 'directed';
			for (let j = 0; j < manifest.hops.length; ++j) {	
				manifest.graph.nodes[manifest.hops[j].to_stop_id - 1].links.push(manifest.graph.nodes[manifest.hops[j].from_stop_id - 1].loc);
				let newLink = { source: Number(manifest.hops[j].from_stop_id - 1), target: Number(manifest.hops[j].to_stop_id - 1),
					 color: options.style.color, fillColor: options.style.fillColor};
				manifest.graph.links.push(newLink);

			} 	
			for (let k = 0; k < manifest.hops.length; ++k) {
				manifest.graph.nodes[manifest.hops[k].from_stop_id - 1].links.push(manifest.graph.nodes[manifest.hops[k].to_stop_id - 1].loc);
			}
		} else { manifest.graph.type = 'undirected'; }

		for (let l = 0; l < manifest.graph.links.length; l++) {
			manifest.graph.links[l].source = String(options.id)+'-'+(manifest.graph.links[l].source);
			manifest.graph.links[l].target = String(options.id)+'-'+(manifest.graph.links[l].target);		
		}
		for (let l = 0; l < manifest.graph.nodes.length; l++) {
			if (typeof manifest.graph.nodes[l] !== 'undefined') {
				let id = manifest.graph.nodes[l].id.split('-');
				manifest.graph.nodes[l].id = id[0]+'-'+(Number(id[1]));				
			}
		}	
		return {index:index, manifest:manifest, options:options, data:data};		
	}
	
	SMAPGraph(m) {
		let index = m.index, d = m.manifest, options = m.options, data = m.data;
		
		let sc = {nodes:[], links:[]};

		let digits = null;
		if (typeof data.graph.supplychain.stops !== 'undefined') {
			//data.graph.supplychain.stops = data.graph.supplychain.stops.reverse();
			for (let i = 0; i < data.graph.supplychain.stops.length; ++i) {
			
				let title = (data.graph.supplychain.stops[i].attributes.title) ? data.graph.supplychain.stops[i].attributes.title : 'Node';
				let place = (data.graph.supplychain.stops[i].attributes.placename) ? data.graph.supplychain.stops[i].attributes.placename : 
							((data.graph.supplychain.stops[i].attributes.address) ? data.graph.supplychain.stops[i].attributes.address : '');
				let loc = place.split(', ').pop();

				// Correct local stop id
				digits = (Math.round(100*Math.log(data.graph.supplychain.stops.length)/Math.log(10))/100)+1;
				data.graph.supplychain.stops[i].local_stop_id = Number((''+data.graph.supplychain.stops[i].local_stop_id).slice(-1*digits));

				let ref = d.mapper['map'+place.replace(/[^a-zA-Z0-9]/g, '')+title.replace(/[^a-zA-Z0-9]/g, '')];
				let newNode = { id: options.id+'-'+Number(data.graph.supplychain.stops[i].local_stop_id-1), name: title, loc: loc, place: place, group: options.id, links: [], ref: ref,
					color: options.style.color, fillColor: options.style.fillColor };
				sc.nodes[data.graph.supplychain.stops[i].local_stop_id - 1] = newNode;
			}
		} delete d.mapper; // Remove Mapper
	
		if (typeof data.graph.supplychain.hops !== 'undefined' && data.graph.supplychain.hops.length > 0) {
			sc.type = 'directed';
			for (let j = 0; j < data.graph.supplychain.hops.length; ++j) {
				// Correct stop ids
				data.graph.supplychain.hops[j].to_stop_id = Number((''+data.graph.supplychain.hops[j].to_stop_id).slice(-1*digits));
				data.graph.supplychain.hops[j].from_stop_id = Number((''+data.graph.supplychain.hops[j].from_stop_id).slice(-1*digits));
			
				sc.nodes[data.graph.supplychain.hops[j].to_stop_id - 1].links.push(sc.nodes[data.graph.supplychain.hops[j].from_stop_id - 1].loc);
				let newLink = { source: Number(data.graph.supplychain.hops[j].from_stop_id - 1), target: Number(data.graph.supplychain.hops[j].to_stop_id - 1),
					 color: options.style.color, fillColor: options.style.fillColor};
				sc.links.push(newLink);

			} 	
			for (let k = 0; k < data.graph.supplychain.hops.length; ++k) {
				sc.nodes[data.graph.supplychain.hops[k].from_stop_id - 1].links.push(sc.nodes[data.graph.supplychain.hops[k].to_stop_id - 1].loc);
			}
		} else { sc.type = 'undirected'; }

		let offset = 0;
		for (let l = 0; l < sc.nodes.length; l++) { if (typeof sc.nodes[l] === 'undefined') { offset++; } }
		for (let l = 0; l < sc.links.length; l++) {
			sc.links[l].source = String(options.id)+'-'+(sc.links[l].source - offset);
			sc.links[l].target = String(options.id)+'-'+(sc.links[l].target - offset);		
		}
		for (let l = 0; l < sc.nodes.length; l++) {
			if (typeof sc.nodes[l] !== 'undefined') {
				let id = sc.nodes[l].id.split('-');
				sc.nodes[l].id = id[0]+'-'+(Number(id[1])-offset);				
			}
		}		
		let adjgraph = [];
		for (let l = 0; l < sc.nodes.length; l++) { if (typeof sc.nodes[l] !== 'undefined') { adjgraph.push(sc.nodes[l]); } }
		sc.nodes = adjgraph.reverse();
		d.graph = sc;	
		return {index:index, manifest:d, options:options, data:data};			
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
		} else if(format === 'embed') {
			let ecode = `<iframe src="${mbaseurl}${ManifestUtilities.Slugify(d.details.url)}?embed" width="560" height="340" frameborder="0"></iframe>`;
			navigator.clipboard.writeText(ecode);
			MI.Interface.ShowMessage('Embed code copied to clipboard.');
		}
	}

	_gsheetToManifest(d) {
		let s = {summary:{name:d.properties.title, description:d.properties.description}, nodes:[]};
		let off = 0;
		for (let node of d.graph.nodes) {
			if (off === 0) { off = Number(node.id.split('-')[1]); } if (off >= Number(node.id.split('-')[1])) { off = Number(node.id.split('-')[1]); }
			let n = {overview:{index:Number(node.id.split('-')[1])+1,name:node.ref.properties.title,description:node.ref.properties.description},
				location:{address:node.ref.properties.placename,geocode:node.ref.geometry.coordinates[1]+','+node.ref.geometry.coordinates[0]},
				attributes:{destinationindex:[],category:node.ref.properties.category,image:node.ref.properties.images,icon:node.ref.properties.icon,sources:node.ref.properties.sources.map(s => ({'source':s}))}, measures:{measures:[]},notes:{markdown:'',keyvals:[{key:'',value:''}]}};
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
		fetch(url).then(c => c.json()).then(d => callback(d)).then(obj => {this.objects[obj.oid] = obj; console.dir(this.objects);}); 
	}
	
	AddObject(oid) {
		let call = MI.options.serviceurl+'aprsfi/vessel/'+oid;
		this.Add(call, function(d) {
			console.dir(d);
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
