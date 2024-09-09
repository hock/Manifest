class ManifestSupplyChain {
	constructor() {
		this.measures = [{measure: 'weight', unit: 'kg'}, {measure: 'co2e', unit: 'kg'}, {measure: 'water', unit: 'kl'},
		{measure: 'energy', unit: 'kj'}, {measure: 'cost', unit: 'dollars'}, {measure: 'percent', unit: '%'}];
		this.linetypes = { greatcircle: 'GREAT_CIRCLE_LINE', bezier: 'BEZIER_LINE', straight: 'STRAIGHT_LINE' };
	}
	/** Setup the supply chain rendering by adding it to the user interface */
	Setup(m) {	
		let index = m.index, manifest = m.manifest, options = m.options, data = m.data;
		
		const id = manifest.details.id;
		const defs = 	{ 
							type: 'FeatureCollection', 
							properties: { title: 'Supply Chain', description: ''}, 
							graph: { links: [], nodes: [] } 
						};	
		manifest.properties = Object.assign(defs.properties, manifest.properties); manifest.graph = Object.assign(defs.graph, manifest.graph);
		MI.Supplychain.SetupStyle(manifest); Object.assign(options, {style: manifest.details.style});
	
		let mobject = 	`<div id="mheader-${id}" style="${options.storymode ? `background-color: ${manifest.details.style.fillColor};` : ''}" class="mheader" data-scref="${manifest.details.id}">
							<div class="mtitle" style="${!options.storymode ? `background-color: ${manifest.details.style.fillColor};` : ''} color: ${manifest.details.style.textColor};">
								<i id="menumap-${id}" class="menumap fas fa-globe-${manifest.details.globe}"></i><a ${manifest.details.url !== '' ? `href="${ManifestUtilities.Slugify(manifest.details.url)}" onclick="event.preventDefault(); MI.Interface.URLSet('${manifest.details.url}');"` : ''}>${manifest.properties.title}</a>
								<div class="menu-options">
									<i id="share-${id}" class="share-button fas fa-share-square"></i>          
									<i id="closemap-${id}" class="fas fa-times-circle closemap" style="color: ${manifest.details.style.textColor};"></i>
								</div>
		
							</div>		
						</div>
						${options.storymode ? `<div id="storybanner" style="background-color: ${options.embed ? `${tinycolor(manifest.details.style.fillColor).setAlpha(0.8)}` :  `${manifest.details.style.fillColor}`}"><span id="minfo"><a ${manifest.details.url !== '' ? `href="${ManifestUtilities.Slugify(manifest.details.url)}?storymap=false&embed=false"` : ''}>${manifest.properties.title}</a> on <a href="./">Manifest</a></span></div>` : ''}

						<div id="mdetails-${id}" class="mdetails">
						    <div id="share-options-${id}" class="share-container closed">
							    <ul class="share-menu" style="color:${manifest.details.style.fillColor}; background:${manifest.details.style.lightColor};">
									<span>Share:</span>
							        <li><a onclick="window.open('${ManifestUtilities.Slugify(manifest.details.url)}', '_blank');">Open</a> <i class="fas fa-window-restore"></i></li>
							        <li><a onclick="MI.ExportManifest(${id}, ${id}, 'embed');">Embed</a> <i class="fas fa-window-restore"></i></li>		
							        <li><a onclick="MI.ExportManifest(${id}, ${id}, 'markdown');">Markdown</a> <i class="fas fa-file-download"></i></li>
							        <li><a onclick="MI.ExportManifest(${id}, ${id}, 'json');">JSON</a> <i class="fas fa-file-download"></i></li>
							    </ul>
							</div>
							<div class="mdescription">${ManifestUtilities.Linkify(manifest.properties.description)}</div>
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
	
	/** Setup the supply chain map **/
	Map(m) {
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
				let pointblob = this.SetupPoint(ft, manifest, index); 				
				nodelist.push(pointblob.li); 
				if (ft.geometry.coordinates[0] !== '' && ft.geometry.coordinates[1] !== '') { points.features.push(pointblob.ft); }
			} else { 
				let line = MI.options.simpleLines ? this.SetupSimpleLine(ft, manifest, index) : this.SetupLine(ft, manifest, index); 
					
				if (line !== false) {
					let arrow = MI.options.simpleLines ? 
						this.SetupSimpleArrow(line, manifest, index) : this.SetupArrow(line, manifest, index);
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
				
		let lineLayer = new L.geoJSON(lines, { style: MI.Atlas.styles.line });	
		manifest.details.layers.push(maplayergroup.addLayer(lineLayer));		

		let arrowLayer = new L.geoJSON(arrows, { onEachFeature: MI.Atlas.RenderLine, pointToLayer: function (feature, latlng) { 
			MI.Atlas.styles.arrow.rotation = feature.properties.angle;
			return L.triangleMarker(latlng, MI.Atlas.styles.arrow);
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
		
		// Reverse so cluster order makes sense
		points.features = points.features.reverse();
		let pointLayer = new L.geoJSON(points, { onEachFeature: MI.Atlas.RenderPoint, pointToLayer: function (feature, latlng) { 
			if (feature.properties.icon !== '') { feature.properties.style.img = { url: 'images/markers/'+feature.properties.icon+'.png' }; }
			return L.circleMarker(latlng, MI.Atlas.styles.point); 
		} });	
		
		for (let j in MI.Atlas.map._layers) { 
			if (MI.Atlas.map._layers[j].feature && MI.Atlas.map._layers[j].feature.properties.clustered) {
				MI.Atlas.RenderPoint(MI.Atlas.map._layers[j].feature,MI.Atlas.map._layers[j]);
			}	 
		}
		
		pointLayer.on('mouseup', function(e){	});
		
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
		return {index:index, manifest:manifest, options:options, data:data}; 
	}
		
	SetupStyle(d) {
		d.options = d.options ? d.options : {};
				
		let colors =  typeof d.setOptions.color !== 'undefined' ? d.setOptions.color.value.split(',').map(c => '#' + c) : typeof d.options.color !== 'undefined' ? d.options.color : (d.properties.title === 'Manifest' ? ['#4d34db','#dfdbf9','#dfdbf9'] : MI.Atlas.SupplyColor());
		let styling = {color: colors, style: Object.assign({}, MI.Atlas.styles.point)};	
		let globes = ['americas','asia','europe','africa'];
			
		Object.assign(d.details, {style: Object.assign(styling.style, {fillColor: styling.color[0], color: MI.options.darkmode ? tinycolor(styling.color[1]).darken(50).toString() : styling.color[1], textColor: styling.color[2], darkerColor: tinycolor(styling.color[0]).darken(30).toString(), darkColor: tinycolor(styling.color[0]).darken(10).toString(), highlightColor: tinycolor(styling.color[0]).spin(30).saturate(100).toString(), lightColor: styling.color[2]}), colorchoice: styling.color, globe: globes[Math.floor(Math.random() * globes.length)]});
	}
	
	SetupPoint(ft, d, index) {
		let setup = { index: index, type: 'node', style: JSON.parse(JSON.stringify(d.details.style)), basestyle: JSON.parse(JSON.stringify(d.details.style)), latlng: new L.LatLng(ft.geometry.coordinates[1], ft.geometry.coordinates[0]), measures: this.SetupMeasures(ft, d.details)};
		// Individual point color
		if ( ft.properties.color ) { 
			let ftcolors = ft.properties.color.split(',');
			setup.style = {fillColor: ftcolors[0], color: ftcolors[1], textColor: ftcolors[2], darkerColor: tinycolor(ftcolors[0]).darken(30).toString(), darkColor: tinycolor(ftcolors[0]).darken(10).toString(), highlightColor: tinycolor(ftcolors[0]).spin(30).saturate(100).toString(), lightColor: tinycolor(ftcolors[0]).setAlpha(0.1).toString()};
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
					  	
			<div class="node-description">${ft.properties.description !== '' ? ManifestUtilities.Linkify(ft.properties.description) : ''}</div>
			<details class="node-sources ${(ft.properties.sources.length === 1 && !(ft.properties.sources[0]) && !(ft.properties.notes)) ? "closed" : ""}" style="background: ${ MI.options.darkmode ? 'var(--alt-bg-2)' : d.details.style.lightColor};">
				<summary>Notes</summary>
				<ol>
					${ft.properties.sources.map(src => src ? `<li>${ManifestUtilities.Linkify(src)}</li>` : '').join("")}
					${ManifestUtilities.Linkify(ft.properties.notes)}
				</ol>
			</details>
		</li>`;
		return {'li':li, 'ft':ft};
	}
	
	SetupLine(ft, d, index) {		
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
	SetupSimpleLine(ft, d, index) {		
		let fromx = ft.geometry.coordinates[0][0]; let fromy = ft.geometry.coordinates[0][1];
		let tox = ft.geometry.coordinates[1][0]; let toy = ft.geometry.coordinates[1][1];		
		if (fromx === tox && fromy === toy) { return false; }
	
		ft.geometry.type = 'MultiLineString';
		ft.properties.type = 'line';
		ft.properties.clustered = null;

		if (fromx - tox >= 180) { let sign = Math.sign(tox); tox = -180 * sign; }
		else if (tox - fromx >= 180) { let sign = Math.sign(fromx); fromx = -180 * sign; }
		let multipass = Grate.great_circle_route([fromx, fromy], [tox, toy], 3); 
		ft.geometry.coordinates = multipass; 
	
		ft.geometry.raw = multipass;
		ft.properties.style = Object.assign(MI.Atlas.styles.line, {color: d.details.style.darkColor});
		ft.properties.basestyle = MI.Atlas.styles.line;
						
		return ft;
	}
	SetupArrow(ft, d, index) {	
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
	SetupSimpleArrow(ft, d, index) {	
		let start = ft.geometry.coordinates[0][0], mid = ft.geometry.coordinates[0][1], end = ft.geometry.coordinates[0][2];
	
		let cy = 2*mid[1] - start[1]/2 - end[1]/2, cx = 2*mid[0] - start[0]/2 - end[0]/2;
	
		let t = 0.5; // given example value
		let ax = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * cx + t * t * end[0];
		let ay = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * cy + t * t * end[1];
	
		let angle = Math.atan2(end[0] - ax, end[1] - ay) * 180 / Math.PI;

		let arrow = {
			type: 'Feature',
			properties: ft.properties,
			geometry: { type: 'Point', coordinates:  [ax,ay] }		
		};
		Object.assign(arrow.properties, { type: 'arrow', angle: angle, 
			style: Object.assign(MI.Atlas.styles.arrow, {color: d.details.style.darkColor, fillColor: d.details.style.color}),
			basestyle: Object.assign(MI.Atlas.styles.arrow, {color: d.details.style.darkColor, fillColor: d.details.style.color}) });
		return arrow;
	}	
	SetupMeasures(ft, sc) {
		let measure = ft.properties.measures, measure_list = Object.assign([], this.measures), measurecheck = false, smapmeasures = [];
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
	
	/** Removes a supply chain from the interface (along with its data) **/
	ReloadAll() {
		let chains = [];
		for (let s in MI.supplychains) {
			if (MI.supplychains[s].mtype === 'manifest') { chains.push({url:MI.supplychains[s].mtype+'-'+MI.supplychains[s].options.url,id:MI.supplychains[s].options.id}); }
			else if (MI.supplychains[s].mtype === 'gsheet') {
				chains.push({url:MI.supplychains[s].mtype+'-'+MI.supplychains[s].options.url.replaceAll('/','').slice(MI.supplychains[s].options.url.replaceAll('/','').lastIndexOf('gsheet') + ('gsheet').length),id:MI.supplychains[s].options.id}); 
			} else if (MI.supplychains[s].mtype === 'smap') { 
				let smapurl = MI.supplychains[s].details.url ? MI.supplychains[s].details.url.replace('#','').replace('smap-','') : MI.supplychains[s].options.id;
				chains.push({url:MI.supplychains[s].mtype+'-'+smapurl,id:MI.supplychains[s].details.id});
			} else { chains.push({url:MI.supplychains[s].mtype+'-'+MI.supplychains[s].options.url,id:MI.supplychains[s].options.id}); }
		}
		for (let c in chains) {
			MI.Supplychain.Remove(chains[c].id);
			MI.Interface.LoadFromLauncher(chains[c].url, true, true);
		}
	}
	Remove(id) {
		if (event) { event.stopPropagation(); }

		let offset = document.getElementById('mheader-'+id).offsetHeight;
		let targetid = 0;
	
		if (MI.supplychains.length > 1) {
			let prev = document.getElementById('mheader-'+id).previousElementSibling;
			while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
		
			let next = document.getElementById('mheader-'+id).nextElementSibling;
			while (next) { if (next.classList.contains('mheader')) { break; } next = next.nextElementSibling; }
		
			if (!next) {
				offset = 0;		
				next = prev = document.getElementById('mheader-'+id).previousElementSibling; 
				while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }

			 }
			targetid = next.id.split('-')[1];	
		}
		
		document.getElementById('manifestlist').querySelectorAll('#mdetails-'+id+',#mlist-'+id).forEach(el => { MI.Interface.observer.unobserve(el); });
		delete MI.Interface.paneldisplay[id];
		
		['mheader-'+id,'mdetails-'+id,'mlist-'+id,'supplycat-'+id,].map(document.getElementById, document).forEach(el => { el.remove(); }); 

		for (let s in MI.supplychains) {
			if (MI.supplychains[s].details.id === id) {
				for (let l of MI.supplychains[s].details.layers) { MI.Atlas.map.removeLayer(l); }
				delete MI.supplychains[s]; MI.supplychains.splice(s, 1);
			}
		}
		for (let s in MI.supplychains) { 
			for (let n in MI.supplychains[s].graph.nodes) { 
				if (MI.supplychains[s].graph.nodes[n].hasOwnProperty('ref')) { MI.supplychains[s].graph.nodes[n].ref.properties.index = s;   } 
			} 	// TODO can we just change the original and not the ref?
		}
		if (document.getElementById('samples-previews') !== null) {
			document.getElementById('samples-previews').querySelectorAll('.sample-preview').forEach(el => { if (Number(el.dataset.hash) === id) { el.classList.remove('loaded'); } });	
		}
		
		for (let l in MI.Atlas.maplayer) {
			if (MI.Atlas.maplayer[l].id === id) {
				delete MI.Atlas.maplayer[l]; MI.Atlas.maplayer.splice(l, 1);
			}
		}
		
		if (MI.supplychains.length !== 0) {
			MI.Interface.ShowHeader(targetid, true);
			if (document.getElementsByClassName('leaflet-popup').length > 0 && MI.Atlas.active_point) { MI.Atlas.MapPointClick(MI.Atlas.active_point, 'auto'); } 
		}
		else {
			// Close special Manifest Popup
			if (MI.Interface.active_element === '1029261216' && MI.Atlas.active_point) { MI.Atlas.active_point.closePopup(); }
			
			if (document.getElementById('minfodetail').classList.contains('closed')) { 
				MI.Interface.ShowLauncher(); 
				MI.Visualization.Set('map', MI.Interface.active_element);	
			}		
		}
	
		for (let i in MI.Atlas.map._layers) { 
			if (MI.Atlas.map._layers[i].feature && MI.Atlas.map._layers[i].feature.properties.clustered) {
				MI.Atlas.map._layers[i].feature.properties.clustered = [];	
				for (let j in MI.Atlas.map._layers) { 
					if (MI.Atlas.map._layers[j].feature && MI.Atlas.map._layers[j].feature.properties.clustered) {
						if (MI.Atlas.map._layers[i]._latlng.equals(MI.Atlas.map._layers[j]._latlng) && 
							MI.Atlas.map._layers[i]._leaflet_id !== MI.Atlas.map._layers[j]._leaflet_id) { 
							MI.Atlas.map._layers[i].feature.properties.clustered.push(MI.Atlas.map._layers[j].feature);
						}
					}
				}
				MI.Atlas.RenderPoint(MI.Atlas.map._layers[i].feature,MI.Atlas.map._layers[i]);
			}
		}
		
		for (let vl in MI.Atlas.vdatalayers) {			
			if (MI.Atlas.vdatalayers[vl].scid && MI.Atlas.vdatalayers[vl].scid === id) {
				if ( MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[vl].id) !== undefined) { MI.Atlas.glMap.removeLayer(MI.Atlas.vdatalayers[vl].id); }  	
				if ( MI.Atlas.glMap.getSource('mlayer-'+MI.Atlas.vdatalayers[vl].id) !== undefined) { MI.Atlas.glMap.removeSource('mlayer-'+MI.Atlas.vdatalayers[vl].id); }  
				document.getElementById('lc-'+MI.Atlas.vdatalayers[vl].id).remove();
				delete MI.Atlas.vdatalayers[vl];
			}
		}
		MI.Atlas.Refresh(); MI.Atlas.map.fitBounds(MI.Atlas.map.getBounds());
	
		MI.Interface.RefreshMeasureList(); 
		if (document.getElementById('blob-'+id)) { document.getElementById('blob-'+id).remove(); }

		MI.Interface.SetupTime();
		
		MI.Interface.SetVizOptions();
		MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element);			
	}
	
	Hide(id, hide, type='chain') {
		if (event) { event.stopPropagation(); }
		let offset = document.getElementById('mheader-'+id).offsetHeight, targetid = 0;
		
		if (type === 'chain') {	
			if (MI.supplychains.length > 1) {
				let prev = document.getElementById('mheader-'+id).previousElementSibling;
				while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
		
				let next = document.getElementById('mheader-'+id).nextElementSibling;
				while (next) { if (next.classList.contains('mheader')) { break; } next = next.nextElementSibling; }
		
				if (!next) {
					offset = 0;	next = prev = document.getElementById('mheader-'+id).previousElementSibling; 
					while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
				}
				targetid = next.id.split('-')[1];	
			}
		}
		let mlayer; for (let l of MI.Atlas.maplayer) { if (Number(l.id) === Number(id)) { mlayer = l; } }
		if (hide) {
			if (type === 'chain') { 
				document.getElementById('manifestlist').querySelectorAll('#mheader-'+id+', #mdetails-'+id+', #mlist-'+id).forEach(el => { el.style.display = 'none'; }); 
				MI.Atlas.map.removeLayer(mlayer.lines); MI.Atlas.map.removeLayer(mlayer.arrows); MI.Atlas.map.removeLayer(mlayer.points); 
				document.getElementById('supplycat-'+id).querySelectorAll('input').forEach(el =>  { el.checked = false; });
				//if (document.getElementsByClassName('pop-intro').length > 0) { MI.Atlas.SetActivePoint(null, true);}
			
				if (document.getElementsByClassName('leaflet-popup').length > 0 && MI.Atlas.active_point) { 
					let moffset = 0; document.getElementById('manifestlist').querySelectorAll('.mheader').forEach(el => { if (el.style.display !== 'none') { 
						el.style.top = moffset+'px'; moffset += el.offsetHeight; }});		
					let roffset = 0; Array.from(document.getElementById('manifestlist').querySelectorAll('.mheader')).reverse().forEach(el => { if (el.style.display !== 'none') { 
						el.style.bottom = roffset+'px'; roffset += el.offsetHeight;}});
					MI.Atlas.MapPointClick(MI.Atlas.active_point, 'auto'); } 
				else { MI.Interface.ShowHeader(targetid); }
	
			}
			if (type === 'nodes') { MI.Atlas.map.removeLayer(mlayer.points); }
			if (type === 'lines') { MI.Atlas.map.removeLayer(mlayer.lines); MI.Atlas.map.removeLayer(mlayer.arrows); }
			
		} else { 
			if (type === 'chain') { 
				document.getElementById('manifestlist').querySelectorAll('#mheader-'+id+', #mdetails-'+id+', #mlist-'+id+', #mlist-'+id+' li').forEach(el => { el.style.display = 'block'; }); 
				MI.Atlas.map.addLayer(mlayer.lines); MI.Atlas.map.addLayer(mlayer.arrows); MI.Atlas.map.addLayer(mlayer.points); 
				document.getElementById('supplycat-'+id).querySelectorAll('input').forEach(el =>  { el.checked = true; });
							
				if (!MI.options.storyMap && !MI.options.embed) { 
					if (document.getElementsByClassName('leaflet-popup').length > 0 && MI.Atlas.active_point) { 
						let moffset = 0; document.getElementById('manifestlist').querySelectorAll('.mheader').forEach(el => { if (el.style.display !== 'none') { 
							el.style.top = moffset+'px'; moffset += el.offsetHeight; }});		
						let roffset = 0; Array.from(document.getElementById('manifestlist').querySelectorAll('.mheader')).reverse().forEach(el => { if (el.style.display !== 'none') { 
							el.style.bottom = roffset+'px'; roffset += el.offsetHeight;}});
						MI.Atlas.MapPointClick(MI.Atlas.active_point, 'auto'); 
					} 
					else { MI.Interface.ShowHeader(id); }
				}
			}
			if (type === 'nodes') { MI.Atlas.map.addLayer(mlayer.points); }
			if (type === 'lines') { 
				MI.Atlas.map.addLayer(mlayer.lines); MI.Atlas.map.addLayer(mlayer.arrows); 
				document.getElementById('nodeheader-'+id).querySelectorAll('input').forEach(el => { if (el.checked) { 
					MI.Atlas.map.removeLayer(mlayer.points); MI.Atlas.map.addLayer(mlayer.points);} }); 	
			}
		}
		if (!MI.options.storyMap && !MI.options.embed) {  let searchvalue = document.getElementById('searchbar').value; MI.Interface.ClearSearch(); MI.Interface.Search(searchvalue, true); }
		if (!MI.options.storyMap && !MI.options.embed) { MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element); }			
		MI.Atlas.Refresh();
	}
}

class Time {
	constructor(start=null, end=null) {
		this.start = start;
		this.end = end;
	}
	SetStart(start) {
		this.start = start;
	}
	SetEnd(end) {
		this.end = end;
	}
	GetStart() {
		return this.start === null ? false : this.start;
	}
	GetEnd() {
		return this.end === null ? false : this.end;
	}
	PrintStart() { 
		let utcstring = new Date(Number(this.start)*1000).toUTCString(); 
		let date = {weekday:utcstring.slice(0,3), month:utcstring.slice(8,11), day:utcstring.slice(5,7).replace(/^0/, ''), year:utcstring.slice(12,16)};
		utcstring = utcstring.slice(4,16);
		return date.month + ' ' + date.day + ' ' + date.year;
	}
	PrintEnd() { 
		let utcstring = new Date(Number(this.end)*1000).toUTCString(); 
		let date = {weekday:utcstring.slice(0,3), month:utcstring.slice(8,11), day:utcstring.slice(5,7).replace(/^0/, ''), year:utcstring.slice(12,16)};
		utcstring = utcstring.slice(4,16);
		return date.month + ' ' + date.day + ' ' + date.year;
	}
	InRange() {
		const starttime = this.GetStart() ? this.GetStart() : MI.Interface.timeslider.lowerBound;
		const endtime = this.GetEnd() ? this.GetEnd() : MI.Interface.timeslider.upperBound;
		
		if ( (starttime <= Number(MI.Interface.timeslider.lower) && endtime <= Number(MI.Interface.timeslider.lower)) || 
			 (starttime >= Number(MI.Interface.timeslider.upper) && endtime >= Number(MI.Interface.timeslider.upper))) { return false; }
		else { return true; }
	}
}
class Measure {
	constructor(type, value, unit, options={}) {
		this.mtype = type;
		this.mvalue = value;
		this.munit = unit;		
		this.series = options.series ? options.series : false;
	}

	GetType() {
		return this.mtype;
	}
	GetValue() {
		if (typeof this.mvalue === 'object') {
			if (MI.Interface.timeslider) {
				this.seriesval = this.seriesval ? this.seriesval : {time:Number(Object.keys(this.mvalue[0])[0]),value:Number(Object.values(this.mvalue[0])[0])};
				for (let v of this.mvalue) {
					if ( (Object.keys(v)[0] >= Number(MI.Interface.timeslider.lower) && Object.keys(v)[0] <= Number(MI.Interface.timeslider.upper))) { 
						this.seriesval.time = Number(Object.keys(v)[0]); this.seriesval.value = Number(Object.values(v)[0]);
					}

				}
				
				return Number(this.seriesval.value);
				
			} else { return Number(Object.values(this.mvalue[0])[0]); }
		} else if (typeof this.mvalue === 'string' && this.mvalue.substring(1).includes('-')) { // look for range but ignore negative numbers
			return (Number(this.mvalue.split('-')[0]) + Number(this.mvalue.split('-').pop())) / 2; 
		} else { 
			return Number(this.mvalue); 
		}
	}
	GetUnit() {
		return this.munit;
	}
	
	PrintType() {
		return this.mtype;
	}
	PrintValue() {
		const currencies = ['usd','eur','gbp'];
		const currency = this.munit.includes('-') ? currencies.filter(v => this.munit.split('-').includes(v)).pop() : currencies.find(v => v.includes(this.munit));
		
		if (typeof this.mvalue === 'object') {
			if (MI.Interface.timeslider) {
				this.seriesval = this.seriesval ? this.seriesval : {time:Number(Object.keys(this.mvalue[0])[0]),value:Number(Object.values(this.mvalue[0])[0])};
				for (let v of this.mvalue) {
					if ( (Object.keys(v)[0] >= Number(MI.Interface.timeslider.lower) && Object.keys(v)[0] <= Number(MI.Interface.timeslider.upper))) { 
						this.seriesval.time = Number(Object.keys(v)[0]); this.seriesval.value = Number(Object.values(v)[0]);
					}

				}
				return Number(this.seriesval.value);
				
			} else { return Number(Object.values(this.mvalue[0])[0]); }
		} else { 
			if (this.mtype === 'date') { return ManifestUtilities.PrintUTCDate(Number(this.mvalue)); } 
			else {
				if (currency !== undefined && this.munit !== '') {
					if (currency === 'usd') { return '$'+this.mvalue; }
					if (currency === 'eur') { return '€'+this.mvalue; }
					if (currency === 'gbp') { return '£'+this.mvalue; }				
				} 
				else { return this.mvalue; }
			}
		}
	}
	PrintUnit() {
		const currencies = ['usd','eur','gbp'];
		const currency = this.munit.includes('-') ? currencies.filter(v => this.munit.split('-').includes(v)).pop() : currencies.find(v => v.includes(this.munit));
		
		if (this.mtype === 'date') { return ''; }
		else if (currency !== undefined) { return this.munit.split('-').length > 1 ? ' '+this.munit.split('-')[0] : ''; } 
		else { return this.munit; }
	}
	
	SetType(type) {
		this.mtype = type;
	}
	SetValue(value) {
		this.mvalue = value;
	}
	SetUnit(unit) {
		this.munit = unit;
	}
}
