addEventListener('message', event => {
	let m = event.data;

	let index = m.index, manifest = m.manifest, options = m.options, data = m.data;
	let measures = [{measure: 'weight', unit: 'kg'}, {measure: 'co2e', unit: 'kg'}, {measure: 'water', unit: 'kl'},
	{measure: 'energy', unit: 'kj'}, {measure: 'cost', unit: 'dollars'}, {measure: 'percent', unit: '%'}];
	let linetypes = { greatcircle: 'GREAT_CIRCLE_LINE', bezier: 'BEZIER_LINE', straight: 'STRAIGHT_LINE' };
	let colorsets = [['#3498DB','#dbedf9', '#dbedf9'],['#FF0080','#f9dbde','#f9dbde'],['#34db77','#dbf9e7','#dbf9e7'],['#ff6500','#f6d0ca','#f6d0ca'],['#4d34db','#dfdbf9','#dfdbf9'],  ['#5E2BFF','#E0D6FF','#E0D6FF'],['#EE4266','#FAC7D2','#FAC7D2'],['#3BCEAC','#CEF3EA','#CEF3EA'],['#00ABE7','#C2EFFF','#C2EFFF'],['#F85A3E','#FEDDD8','#FEDDD8']];
	let mapstyles = {
			'point': { fillColor: '#eeeeee', color: '#999999', radius: 8, weight: 5, opacity: 1, fillOpacity: 1, fontsize: 9 },			
			'line': { color: '#dddddd', fillColor: '#dddddd', stroke: true, weight: 2, opacity: 0.2, smoothFactor: 1 },
			'arrow': { rotation: 0, width: 8, height: 5, color: '#dddddd', fillColor: '#dddddd', weight: 2, opacity: 0.4, fillOpacity: 1 },
			'live': { rotation: 0, width: 16, height: 10, color: '#dbedf9', fillColor: '#2196F3', weight: 2, opacity: 1, fillOpacity: 1 }	
		};
		
	function Format(m) {	
		let index = m.index, manifest = m.manifest, options = m.options, data = m.data;
		let setOptions = {};
		for (let o in manifest.options) { setOptions[manifest.options[o].type] = {'value':manifest.options[o].value, 'parameters':manifest.options[o].parameters}; }
	
		let d = {type: 'FeatureCollection', mtype: 'manifest', raw: manifest, mapper: {}, setOptions: setOptions, options: options, details: {id: options.id, url: (options.url === '' || options.url === '#manifest-') ? '' : ('#manifest-'+options.url).split('#')[0]+'#'+('#manifest-'+options.url).split('#')[1], layers: [], measures: []}, properties: {title: manifest.summary.name, description: /*MI.Util.markdowner.makeHtml(manifest.summary.description)*/manifest.summary.description}, features: [], stops: [], hops: []};
	
		if (d.details.url === '#manifest-') { d.details.url = '#'; }
		for (let n of manifest.nodes) {
			let ft = {type: 'Feature', properties: {index: n.overview.index, scid: options.id, title: n.overview.name, description: /*MI.Util.markdowner.makeHtml(n.overview.description)*/n.overview.description, placename: n.location.address, category: n.attributes.category ? n.attributes.category : '', images: n.attributes.image.map(function(s) { return s;}), icon: n.attributes.icon ? n.attributes.icon : '', color: n.attributes.color ? n.attributes.color : '', measures: n.measures.measures, sources: n.attributes.sources.map(function(s) { return s.source;}), notes: /*MI.Util.markdowner.makeHtml(n.notes.markdown)*/n.notes.markdown}, geometry: {type:'Point', coordinates:[n.location.geocode.split(',')[1] ? n.location.geocode.split(',')[1] : '', n.location.geocode.split(',')[0] ? n.location.geocode.split(',')[0] : '']}};
		
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
	function Setup(m) {	
		console.log('setup');
		let index = m.index, manifest = m.manifest, options = m.options, data = m.data;
	
		const id = manifest.details.id;
		const defs = 	{ 
							type: 'FeatureCollection', 
							properties: { title: 'Supply Chain', description: ''}, 
							graph: { links: [], nodes: [] } 
						};	
		manifest.properties = Object.assign(defs.properties, manifest.properties); manifest.graph = Object.assign(defs.graph, manifest.graph);
		SetupStyle(manifest); Object.assign(options, {style: manifest.details.style});

		let mobject = 	`<div id="mheader-${id}" style="${options.storymode ? `background-color: ${manifest.details.style.fillColor};` : ''}" class="mheader" data-scref="${manifest.details.id}">
							<div class="mtitle" style="${!options.storymode ? `background-color: ${manifest.details.style.fillColor};` : ''} color: ${manifest.details.style.textColor};">
								<i id="menumap-${id}" class="menumap fas fa-globe-${manifest.details.globe}"></i><a ${manifest.details.url !== '' ? `href="${/*ManifestUtilities.Slugify(manifest.details.url)*/manifest.details.url}" onclick="event.preventDefault(); MI.Interface.URLSet('${manifest.details.url}');"` : ''}>${manifest.properties.title}</a>
								<div class="menu-options">
									<i id="share-${id}" class="share-button fas fa-share-square"></i>          
									<i id="closemap-${id}" class="fas fa-times-circle closemap" style="color: ${manifest.details.style.textColor};"></i>
								</div>
	
							</div>		
						</div>
						${options.storymode ? `<div id="storybanner" style="background-color: ${options.embed ? `${/*tinycolor(manifest.details.style.fillColor).setAlpha(0.8)*/manifest.details.style.fillColor}` :  `${manifest.details.style.fillColor}`}"><span id="minfo"><a ${manifest.details.url !== '' ? `href="${/*ManifestUtilities.Slugify(manifest.details.url)*/manifest.details.url}?storymap=false&embed=false"` : ''}>${manifest.properties.title}</a> on <a href="./">Manifest</a></span></div>` : ''}

						<div id="mdetails-${id}" class="mdetails">
						    <div id="share-options-${id}" class="share-container closed">
							    <ul class="share-menu" style="color:${manifest.details.style.fillColor}; background:${manifest.details.style.lightColor};">
									<span>Share:</span>
							        <li><a onclick="window.open('${/*ManifestUtilities.Slugify(manifest.details.url)*/manifest.details.url}', '_blank');">Open</a> <i class="fas fa-window-restore"></i></li>
							        <li><a onclick="MI.ExportManifest(${id}, ${id}, 'embed');">Embed</a> <i class="fas fa-window-restore"></i></li>		
							        <li><a onclick="MI.ExportManifest(${id}, ${id}, 'markdown');">Markdown</a> <i class="fas fa-file-download"></i></li>
							        <li><a onclick="MI.ExportManifest(${id}, ${id}, 'json');">JSON</a> <i class="fas fa-file-download"></i></li>
							    </ul>
							</div>
							<div class="mdescription">${/*ManifestUtilities.Linkify(manifest.properties.description)*/manifest.properties.description}</div>
						</div>
						<ul id="mlist-${id}" class="mlist"></ul>
					`;
				
		let supplycatmap = {}, supplycats = {};
		for (let ft of manifest.features) {
			if (ft.geometry.type === 'Point') {
				if (ft.properties.category) { for (let cat of ft.properties.category.split(',')) {
					if (cat !== '') {
						supplycatmap[String(cat)] = true;
					}
				}}
			}
		}
	
		let supplycat = `<div id="supplycat-${id}" class="supplycatgroup"><span class="supplyrow"><label for="chain-${id}" class="supplycatheader"><input type="checkbox" id="chain-${id}" value="chain-${id}" checked><span class="chaincheckmark"><i class="fas"></i></span> ${manifest.properties.title}</label><span id="supplytoggle-${id}" class="supplytoggle plus"><i class="fas fa-plus-circle"></i></span></span>`;
		supplycat += `<div id="supplycatsub-${id}" class="supplycatsub closed">`;
		supplycat += 
			`<span class="supplyrow"><label id="nodeheader-${id}" for="nodes-${id}" class="nodelineheader nodes"><input id="nodes-${id}" type="checkbox" value="nodes-${id}" checked><span class="nodelinecheckmark"><i class="fas"></i></span> Nodes for ${manifest.properties.title}</label></span>`;
		supplycat += 
			`<span class="supplyrow"><label id="lineheader-${id}" for="lines-${id}" class="nodelineheader lines"><input id="lines-${id}" type="checkbox" value="lines-${id}" checked><span class="nodelinecheckmark"><i class="fas"></i></span> Lines for ${manifest.properties.title} </label></span>`;
	
		// TODO: Shouldn't show this if all nodes are categorized. 
		if (Object.entries(supplycatmap).length > 1) {
			supplycat += `<span class="supplyrow"><label for="cat-${id}-uncategorized" class="supplycat"><input id="cat-${id}-uncategorized" type="checkbox" value="cat-${id}-uncategorized" checked><span class="supplycatcheckmark"><i class="fas"></i></span> Uncategorized Nodes</label></span>`;			
		}	 
		for (const [key, value] of Object.entries(supplycatmap)) {
			supplycat += `<span class="supplyrow"><label for="cat-${id}-${key}" class="supplycat"><input id="cat-${id}-${key}" type="checkbox" value="cat-${id}-${key}" checked><span class="supplycatcheckmark"><i class="fas"></i></span> ${key}</label></span>`;
			supplycats[key] = [];
		}
		supplycat += '</span></div></div>';
		manifest.categories = supplycats;
					
		data.id = id; data.supplycat = supplycat; data.mobject = mobject;
		return {index:index, manifest:manifest, options:options, data:data};
	}
	function SetupStyle(d) {
		d.options = d.options ? d.options : {};
				
		let colors =  typeof d.setOptions.color !== 'undefined' ? d.setOptions.color.value.split(',').map(c => '#' + c) : typeof d.options.color !== 'undefined' ? d.options.color : (d.properties.title === 'Manifest' ? ['#4d34db','#dfdbf9','#dfdbf9'] : SupplyColor());
		let styling = {color: colors, style: Object.assign({}, mapstyles.point)};	
		let globes = ['americas','asia','europe','africa'];
			
		/*Object.assign(d.details, {style: Object.assign(styling.style, {fillColor: styling.color[0], color: options.darkmode ? tinycolor(styling.color[1]).darken(50).toString() : styling.color[1], textColor: styling.color[2], darkerColor: tinycolor(styling.color[0]).darken(30).toString(), darkColor: tinycolor(styling.color[0]).darken(10).toString(), highlightColor: tinycolor(styling.color[0]).spin(30).saturate(100).toString(), lightColor: styling.color[2]}), colorchoice: styling.color, globe: globes[Math.floor(Math.random() * globes.length)]});*/
		Object.assign(d.details, {style: Object.assign(styling.style, {fillColor: styling.color[0], color: options.darkmode ? styling.color[1] : styling.color[1], textColor: styling.color[2], darkerColor: styling.color[0], darkColor: styling.color[0], highlightColor: styling.color[0], lightColor: styling.color[2]}), colorchoice: styling.color, globe: globes[Math.floor(Math.random() * globes.length)]});
	}
	function SupplyColor() {
		let copy = colorsets.slice(0);
		if (copy.length < 1) { copy = this.colorsets.slice(0); }
		let index = Math.floor(Math.random() * copy.length);
		let item = copy[index];
		copy.splice(index, 1);
		return item;
	}
	function Map(m) {
		console.log('map');
		let index = m.index, manifest = m.manifest, options = m.options, data = m.data;
	
		let points = {type: 'FeatureCollection', features:[] }, lines = {type: 'FeatureCollection', features:[] }, arrows = {type: 'FeatureCollection', features:[] };
		let nodelist = [];
	
		for (let [i, ft] of manifest.features.entries()) {
			const defs = { type: 'Feature', properties: { lid: manifest.details.id * 10000 + Number(i), mindex: Number(i)+1, title: 'Node', description: '', placename: '', category: '', images: '', icon: '', color: '', measures: [], sources: '', notes: '', clustered: [], latlng: '', hidden: false, disabled: false}, geometry: { type: 'Point', coordinates: [] } };
				   
			ft = { type: 'Feature', properties: Object.assign(defs.properties, ft.properties), geometry: Object.assign(defs.geometry, ft.geometry) };			
			for (let p of ['description','placename','category','images','icon','sources']) { if (typeof ft.properties[p] === 'undefined') { ft.properties[p] = '';}}

			const expandedProperties = { categories: ft.properties.category.split(',') };	
			if (ft.properties.images.length === 1 && ft.properties.images[0].URL === '') { ft.properties.images = []; }				
			ft.properties = Object.assign(ft.properties, expandedProperties);
			ft.properties.placename = (ft.properties.placename !== '') ? ft.properties.placename : (ft.properties.address ? ft.properties.address : ''); 
		
			if (manifest.mapper) { 
				if (ft.properties.index) { manifest.mapper[Number(ft.properties.index-1)] = ft; } // manifest
				else { manifest.mapper['map'+ft.properties.placename.replace(/[^a-zA-Z0-9]/g, '') + ft.properties.title.replace(/[^a-zA-Z0-9]/g, '')] = ft; } // smap
			}
		
			if (ft.geometry.type === 'Point') {				
				let pointblob = SetupPoint(ft, manifest, index); 				
				nodelist.push(pointblob.li); 
				if (ft.geometry.coordinates[0] !== '' && ft.geometry.coordinates[1] !== '') { points.features.push(pointblob.ft); }
			} else { 
				let line = SetupLine(ft, manifest, index); 
				
				if (line !== false) {
					let arrow = SetupArrow(JSON.parse(JSON.stringify(line)), manifest, index);
					lines.features.push(line); arrows.features.push(arrow);
				}
			}				
		}

		for (let i in lines.features) { 
			for (let j in points.features) {
				if (typeof lines.features[i].properties.connections !== 'undefined') { 
					if (lines.features[i].properties.connections.from.scid === points.features[j].properties.scid && 
						lines.features[i].properties.connections.from.index === points.features[j].properties.mindex) {
						lines.features[i].properties.connections.from = arrows.features[i].properties.connections.from = points.features[j];
					} 
					else if (lines.features[i].properties.connections.to.scid === points.features[j].properties.scid && 
						lines.features[i].properties.connections.to.index === points.features[j].properties.mindex) {
						lines.features[i].properties.connections.to = arrows.features[i].properties.connections.to = points.features[j];
					} 
				}
			}
		}	
		// Prepare to add layers
		let maplayergroup =  L.layerGroup();
			
		let lineLayer = new L.geoJSON(lines, { style: mapstyles.line });	
		manifest.details.layers.push(maplayergroup.addLayer(lineLayer));		

		let arrowLayer = new L.geoJSON(arrows, { onEachFeature: MI.Atlas.RenderLine, pointToLayer: function (feature, latlng) { 
			mapstyles.arrow.rotation = feature.properties.angle;
			return L.triangleMarker(latlng, mapstyles.arrow);
		} });
		manifest.details.layers.push(maplayergroup.addLayer(arrowLayer));	
	
		// Setup Pointlayer
		for (let i in points.features) { 
			for (let j in points.features) { 	
				if (i !== j && points.features[i].properties.latlng.equals(points.features[j].properties.latlng)) { 
					points.features[i].properties.clustered.push(points.features[j]); 
				} 
			}
		}	
			
	
		// Reverse so cluster order makes sense
		points.features = points.features.reverse();
		let pointLayer = new L.geoJSON(points, { onEachFeature: MI.Atlas.RenderPoint, pointToLayer: function (feature, latlng) { 
			if (feature.properties.icon !== '') { feature.properties.style.img = { url: 'images/markers/'+feature.properties.icon+'.png' }; }
			return L.circleMarker(latlng, mapstyles.point); 
		} });	
	
		for (let i in points.features) { 
			for (let j in MI.Atlas.map._layers) { 
				if (MI.Atlas.map._layers[j].feature && MI.Atlas.map._layers[j].feature.properties.clustered) {
					if (points.features[i].properties.latlng.equals(MI.Atlas.map._layers[j]._latlng)) { 
						points.features[i].properties.clustered.push(MI.Atlas.map._layers[j].feature);	
						MI.Atlas.map._layers[j].feature.properties.clustered.push(points.features[i]);
					}
				 }
			}
		}
		for (let j in MI.Atlas.map._layers) { 
			if (MI.Atlas.map._layers[j].feature && MI.Atlas.map._layers[j].feature.properties.clustered) {
				MI.Atlas.RenderPoint(MI.Atlas.map._layers[j].feature,MI.Atlas.map._layers[j]);
			}	 
		}
		
		MI.Atlas.maplayer.push({id: manifest.details.id, points: pointLayer, lines: lineLayer, arrows: arrowLayer});
	
		manifest.details.layers.push(maplayergroup.addLayer(pointLayer));
		manifest.details.layers.push(MI.Atlas.map.addLayer(maplayergroup));
	
		for (let l in MI.Atlas.maplayer) { if (MI.Atlas.maplayer[l].points) { MI.Atlas.maplayer[l].points.bringToFront(); } }

	
		// UI
		if (lines.features.length === 0) { document.querySelectorAll('.nodelineheader.lines').forEach(el => { 
			let inputs = el.querySelectorAll('input');
			for (let inp of inputs) { if (inp.value.split('-')[1] === String(manifest.details.id)) { el.remove(); } }
		}); }
		
		data.nodelist = nodelist;
		console.log('end map');
		return {index:index, manifest:manifest, options:options, data:data}; 
	}
	function SetupPoint(ft, d, index) {
		let setup = { index: index, type: 'node', style: JSON.parse(JSON.stringify(d.details.style)), basestyle: JSON.parse(JSON.stringify(d.details.style)), latlng: new L.LatLng(ft.geometry.coordinates[1], ft.geometry.coordinates[0]), measures: SetupMeasures(ft, d.details)};
		// Individual point color
		if ( ft.properties.color ) { 
			let ftcolors = ft.properties.color.split(',');
			/*setup.style = {fillColor: ftcolors[0], color: ftcolors[1], textColor: ftcolors[2], darkerColor: tinycolor(ftcolors[0]).darken(30).toString(), darkColor: tinycolor(ftcolors[0]).darken(10).toString(), highlightColor: tinycolor(ftcolors[0]).spin(30).saturate(100).toString(), lightColor: tinycolor(ftcolors[0]).setAlpha(0.1).toString()};*/
			
			setup.style = {fillColor: ftcolors[0], color: ftcolors[1], textColor: ftcolors[2], darkerColor: ftcolors[0], darkColor: ftcolors[0], highlightColor: ftcolors[0], lightColor: ftcolors[0]};
		}
		// Customized point colors for storymap 
		Object.assign(ft.properties, setup);
		// Could add an image like: `<li id="node_${ft.properties.lid}" class="mnode" data-scref="${d.details.id}" style="position:relative;">
		//	<img style="opacity:5%; z-index:-1; position:absolute; top:0; left:-1rem; width:calc(100% + 2rem); height:100%; object-fit:cover;" src="${MI.Atlas.GetTileImage(ft.properties.latlng.lat, ft.properties.latlng.lng, 13)}">
		let li = 
		`<li id="node_${ft.properties.lid}" class="mnode" data-scref="${d.details.id}" tabindex="0">
			<div class="node-dot" style="background: ${ft.properties.style.fillColor}; border-color: ${ft.properties.style.color};">${ft.properties.mindex}</div>
			<h5 class="node-title">${ft.properties.title}</h5>
			${ ft.properties.placename !== '' ? `<div class="node-place" style="color: ${MI.options.darkmode ? d.details.style.lightColor : d.details.style.darkerColor};">${ft.properties.placename}</div>` : ''}
			${ ft.properties.time ? `<div class="node-time" ${ft.properties.time.GetStart() ? `data-start="${ft.properties.time.GetStart()}"` : ``} ${ft.properties.time.GetEnd() ? `data-end="${ft.properties.time.GetEnd()}"` : ``} style="color: ${MI.options.darkmode ? d.details.style.lightColor : d.details.style.darkerColor};">${ft.properties.time.GetStart() ? `<span class="time-start">${ft.properties.time.PrintStart()}</span>` : ''}<span class="time-separator"> — </span>${ft.properties.time.GetEnd() ? `<span class="time-end">${ft.properties.time.PrintEnd()}</span>` : ''}</div>` : ''}
		
			<div class="node-details">
				${ ft.properties.categories.length !== 0 ? `<div class="category ${(ft.properties.categories.length === 1 && ft.properties.categories[0] === '') ? 'closed' : ''}"><i class="fa-solid fa-tags"></i> ${ft.properties.categories.map(cat => `<a class="cat-link" data-cat="cat-${d.details.id}-${cat}">${cat}</a>`).join('')}</div>` : ''}${ ft.properties.measures.filter(m => m && !['starttime','start','endtime','end'].includes(m.GetType())).length !== 0 ? `<div class="measures"><i class="fa-solid fa-calculator"></i> ${ft.properties.measures.filter(m => m && m.GetValue()).map(m => ['starttime','start','endtime','end'].includes(m.GetType()) ? '' : m.GetType() !== 'date' ? `<a class="measure-link" data-measure="${m.GetType()}"><span class="mtype">${m.PrintType()}</span><span class="mvalue">${m.PrintValue()}</span><span class="munit">${m.PrintUnit()}</span></a>` : `<span class="mtype">${m.PrintType()}</span>${m.PrintValue()}${m.PrintUnit()}`).join('')}</div>` : ''}
			</div> 
		
			<div class="node-images-wrap">
			${ft.properties.images.length !== 0 ? `<div class="node-images ${ft.properties.images.length > 1 ? `multiple` : ''}" ${ft.properties.images.length > 1 ? `data-index="1"` : ''}>
			
				${ft.properties.images.map((img,i) => img.URL ? (img.URL.substring(0,24) === 'https://www.youtube.com/' ? 
				`<iframe class="ftimg" src="${img.URL}?si=N9SHiMo-QTcPyqdP&enablejsapi=1&origin=${window.location.origin}&color=white&controls=0" width="560" height="315" ${i !== 0 || ft.properties.mindex !== 1 ? `loading="lazy"` : ''} frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` : 
				`<img class="ftimg" ${i !== 0 || ft.properties.mindex !== 1 ? `loading="lazy"` : ''} src="${img.URL}" title="${img.caption ? img.caption : ft.properties.title}" alt="${img.caption ? img.caption : ft.properties.title}${img.caption ? '' : ` image`}"/>` ) : '').join('')} 	
			</div>` : ''}
		
			${ft.properties.images.length > 1 ? 
			`<div class="images-controls">
				<button id="imgbutton-left_${ft.properties.lid}" tabindex="-1" class="images-button images-display-left" title="Left Image Button"><i class="fas fa-caret-left"></i></button>
				<div class="images-box">${(ft.properties.images.map((img,i) => { return `<div class="images-spot ${i === 0 ? `selected`: ''}" data-lid="${ft.properties.lid}" data-index="${Number(i+1)}"><i class="far fa-circle"></i></div>`; })).join('')}</div>
				<button id="imgbutton-right_${ft.properties.lid}" tabindex="-1" class="images-button images-display-right" title="Left Image Button"><i class="fas fa-caret-right"></i></button>
			</div>` : ''}
		
			${ft.properties.images.length !== 0 ? `<div class="images-caption">${ft.properties.images[0].caption ? ft.properties.images[0].caption : '' }</div>` : ''}
			</div>
				  	
			<div class="node-description">${ft.properties.description !== '' ? /*ManifestUtilities.Linkify(ft.properties.description)*/ft.properties.description : ''}</div>
			<details class="node-sources ${(ft.properties.sources.length === 1 && !(ft.properties.sources[0]) && !(ft.properties.notes)) ? "closed" : ""}" style="background: ${ MI.options.darkmode ? 'var(--alt-bg-2)' : d.details.style.lightColor};">
				<summary>Notes</summary>
				<ol>
					${ft.properties.sources.map(src => src ? `<li>${/*ManifestUtilities.Linkify(src)*/src}</li>` : '').join("")}
					${/*ManifestUtilities.Linkify(ft.properties.notes)*/ft.properties.notes}
				</ol>
			</details>
		</li>`;
		return {'li':li, 'ft':ft};
	}

	function SetupLine(ft, d, index) {		
		let fromx = ft.geometry.coordinates[0][0]; let fromy = ft.geometry.coordinates[0][1];
		let tox = ft.geometry.coordinates[1][0]; let toy = ft.geometry.coordinates[1][1];		
		if (fromx === tox && fromy === toy) { return false; }
	
		ft.geometry.type = 'MultiLineString';
		ft.properties.type = 'line';
		ft.properties.clustered = null;
	

		let multipass = Grate.great_circle_route([fromx, fromy], [tox, toy], 60, MI.Atlas.map.getPixelBounds());  
	
		let sign = Number(Math.sign(multipass[0][0][0] - multipass[0][1][0])), breakstart = 0, breakend = multipass.length, checksign = 0;
        for (let i = 0; i < multipass[0].length-1; i++) {		
			checksign = Math.sign(multipass[0][i][0] - multipass[0][i+1][0]);	
			if (checksign !== sign && multipass[0][i][0] !== multipass[0][i+1][0]) {
				if (breakstart === 0) { breakstart = i;} breakend = i;
			}  
		}
	
		if ( breakstart !== 0 && !isNaN(sign)) { 
			if (sign === 1) {
				let part1 = multipass[0].slice(0, breakstart); 
				// needs y coord interpolation to look right
				// TODO Angle and zoom to fit popup
				//let angle = Math.atan2(p1.x - pt2.y, pt2.x - pt2.y) * 180 / Math.PI;
			
				part1.push([-180, part1[part1.length-1][1]+1]);
				let part2 = multipass[0].slice(breakend+1,multipass[0].length); 
				// needs y coord interpolation to look right
				part2.unshift([180, part1[part1.length-1][1]+1]);
				ft.geometry.coordinates = [part1, part2];
			
			} else if (sign === -1) {
				let part1 = multipass[0].slice(0, breakstart); 
				// needs y coord interpolation to look right
				part1.push([180, part1[part1.length-1][1]+1]); 
				let part2 = multipass[0].slice(breakend+1,multipass[0].length); 
				// needs y coord interpolation to look right
				part2.unshift([-180, part1[part1.length-1][1]+1]);
				ft.geometry.coordinates = [part1, part2];
			}
		} 
		else { ft.geometry.coordinates = multipass; }
	
		ft.geometry.raw = multipass;
		ft.properties.style = Object.assign(MI.Atlas.styles.line, {color: d.details.style.darkColor});
		ft.properties.basestyle = MI.Atlas.styles.line;
						
		return ft;
	}
	function SetupArrow(ft, d, index) {	
		let midindex = Math.floor((ft.geometry.raw[0].length-1)*0.8);
		let middle = ft.geometry.raw[0][midindex];	
		let angle = Math.atan2(ft.geometry.raw[0][Math.min(midindex+5,ft.geometry.raw[0].length-1)][0] - ft.geometry.raw[0][Math.max(midindex-5,0)][0], ft.geometry.raw[0][Math.min(midindex+5,ft.geometry.raw[0].length-1)][1] - ft.geometry.raw[0][Math.max(midindex-5,0)][1]) * 180 / Math.PI;

		let arrow = {
			type: 'Feature',
			properties: ft.properties,
			geometry: { type: 'Point', coordinates:  ft.geometry.raw[0][midindex] }
		};
		Object.assign(arrow.properties, { type: 'arrow', angle: angle, 
			style: Object.assign(MI.Atlas.styles.arrow, {color: d.details.style.darkColor, fillColor: d.details.style.color}),
			basestyle: Object.assign(MI.Atlas.styles.arrow, {color: d.details.style.darkColor, fillColor: d.details.style.color}) });
		return arrow;
	}	
	function SetupMeasures(ft, sc) {
		let measure = ft.properties.measures, measure_list = Object.assign([], measures), measurecheck = false, smapmeasures = [];
		for (let e in ft.properties.measures) {
			if (ft.properties.measures[e].GetType() !== '') {
				let ftmeasure = ft.properties.measures[e], measurecheck = false;
		
				for (let l in measure_list) { if (l.measure === ftmeasure.GetType()) { measurecheck = true; } }
				if (measurecheck === false) { measure_list.push({measure: ftmeasure.GetType(), unit: ftmeasure.munit}); }
				if (ftmeasure.GetType() === 'length') {ftmeasure.SetType("Length"); }
				if (typeof sc.measures[ftmeasure.GetType()] === 'undefined') { sc.measures[ftmeasure.GetType()] = {cum: 0, max: ftmeasure.GetValue(), min: ftmeasure.GetValue()}; }

				sc.measures[ftmeasure.GetType()] = { 
					cum: sc.measures[ftmeasure.GetType()].cum + ftmeasure.GetValue(), 
					max: ftmeasure.GetValue() > sc.measures[ftmeasure.GetType()].max ? ftmeasure.GetValue() : sc.measures[ftmeasure.GetType()].max,
					min: ftmeasure.GetValue() < sc.measures[ftmeasure.GetType()].min ? ftmeasure.GetValue() : sc.measures[ftmeasure.GetType()].min,
					series: ftmeasure.series 
				};
			} 
		}

		for (let l in measure_list) {		
			if (typeof ft.properties[measure_list[l].measure] !== 'undefined') { 
				if (typeof sc.measures[measure_list[l].measure] === 'undefined') { sc.measures[measure_list[l].measure] = {cum: 0, max: Number(ft.properties[measure_list[l].measure]), min: Number(ft.properties[measure_list[l].measure])}; }
				sc.measures[measure_list[l].measure] = { 
					cum: Number(sc.measures[measure_list[l].measure].cum) + Number(ft.properties[measure_list[l].measure]),
					max: Number(ft.properties[measure_list[l].measure]) > Number(sc.measures[measure_list[l].measure].max) ? Number(ft.properties[measure_list[l].measure]) : Number(sc.measures[measure_list[l].measure].max),
					min: Number(ft.properties[measure_list[l].measure]) < Number(sc.measures[measure_list[l].measure].min) ? Number(ft.properties[measure_list[l].measure]) : Number(sc.measures[measure_list[l].measure].min)
				};

				measure[measure_list[l].measure] = ft.properties[measure_list[l].measure]; 
			
				// Map SMAP Measures
				if (Number(ft.properties[measure_list[l].measure]) !== 0) { 
					smapmeasures.push(new Measure(measure_list[l].measure, Number(ft.properties[measure_list[l].measure]), measure_list[l].unit));
				}
			}
		}		
		return smapmeasures.length > 0 ? smapmeasures : (Object.entries(ft.properties.measures).length === 0 ? [] : ft.properties.measures);
	}
	function Graph(m) {
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
	let result = Graph(Map(Setup(Format({index:index, manifest:manifest, options:options, data:{}}))));
    postMessage(result);
});


