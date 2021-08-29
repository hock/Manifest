class ManifestSupplyChain {
	constructor() {
		this.measures = [{measure: 'weight', unit: 'kg'}, {measure: 'co2e', unit: 'kg'}, {measure: 'water', unit: 'kl'},
{measure: 'energy', unit: 'kj'}, {measure: 'cost', unit: 'dollars'}, {measure: 'percent', unit: '%'}];
	 	this.linetypes = { greatcircle: 'GREAT_CIRCLE_LINE', bezier: 'BEZIER_LINE', straight: 'STRAIGHT_LINE' };

	}
	/** Setup the supply chain rendering by adding it to the user interface */
	Setup(d) {	
		const index = MI.supplychains.push(d)-1, id = d.details.id;
		const defs = 	{ 
							type: 'FeatureCollection', 
							properties: { title: 'Supply Chain', description: ''}, 
							graph: { links: [], nodes: [] } 
						};	
		d.properties = Object.assign(defs.properties, d.properties); d.graph = Object.assign(defs.graph, d.graph);
		this.SetupStyle(d);
		
		let mheader = document.createElement('div');
		mheader.id = 'mheader-'+id; mheader.classList.add('mheader');
		mheader.innerHTML = `
		<div class="mtitle" style="background: ${d.details.style.fillColor}; color: ${d.details.style.textColor};">
			<i id="menumap-${id}" class="menumap fas fa-globe-${d.details.globe}"></i><a href="${d.details.url}">${d.properties.title}</a>
			<i id="closemap-${id}" class="fas fa-times-circle closemap" style="color: ${d.details.style.textColor};"></i>
		</div>`;
						
		let mdetails = document.createElement('div');
		mdetails.id = 'mdetails-'+id; mdetails.classList.add('mdetails');
		mdetails.innerHTML = `<div class="mdescription">${ManifestUtilities.Linkify(d.properties.description)}</div>`;
	
		let mlist = document.createElement('ul');
		mlist.id = 'mlist-'+id; mlist.classList.add('mlist');
	
		document.getElementById('manifestlist').append(mheader,mdetails,mlist);	
		
		document.getElementById('mheader-'+id).addEventListener('click', (e, nodeid=id) => { MI.Interface.ShowHeader(nodeid); });
		document.getElementById('closemap-'+id).addEventListener('click', (e, nodeid=id) => { MI.Supplychain.Remove(nodeid); });
	
		document.querySelectorAll('#datalayers input').forEach(el => { el.addEventListener('click', (e) => { 
			if (el.checked) { MI.Atlas.map.addLayer(MI.Atlas.layerdefs[el.value]); } 
			else { MI.Atlas.map.removeLayer(MI.Atlas.layerdefs[el.value]); } }); 
		});
	
		// Finalize UI
		let moffset = 0; document.querySelectorAll('.mheader').forEach(el => { el.style.top = moffset+'px'; moffset += el.offsetHeight; });		
		let roffset = 0; Array.from(document.querySelectorAll('.mheader')).reverse().forEach(el => { el.style.bottom = roffset+'px'; roffset += el.offsetHeight;});
	
		if (document.getElementById('searchbar').value !== '') { MI.Interface.ClearSearch(); MI.Interface.Search(); }
	
		if (MI.Interface.IsMobile()) { MI.Interface.Mobilify(id, index); }
		MI.Interface.SetDocumentTitle();
	
		return index;
	}

	/** Setup the supply chain map **/
	Map(index) {
		let d = MI.supplychains[index];
		let points = {type: 'FeatureCollection', features:[] }, lines = {type: 'FeatureCollection', features:[] }, arrows = {type: 'FeatureCollection', features:[] };
		
		for (let [i, ft] of d.features.entries()) {
			const defs = { type: 'Feature', properties: { lid: d.details.id * 10000 + Number(i), mindex: Number(i)+1, title: 'Node', description: '', placename: '', category: '', images: '', measures: [], sources: '', notes: '', clustered: [], latlng: '', hidden: false}, geometry: { type: 'Point', coordinates: [] } };
					   
			ft = { type: 'Feature', properties: Object.assign(defs.properties, ft.properties), geometry: Object.assign(defs.geometry, ft.geometry) };			
			for (let p of ['description','placename','category','images','sources']) { if (typeof ft.properties[p] === 'undefined') { ft.properties[p] = '';}}
	
			const expandedProperties = { categories: ft.properties.category.split(','), 
				images: ft.properties.images.split(','), 
				sources: ft.properties.sources.split(',') };	
							
			ft.properties = Object.assign(ft.properties, expandedProperties);
			ft.properties.placename = (ft.properties.placename !== '') ? ft.properties.placename : (ft.properties.address ? ft.properties.address : ''); 
			if (d.mapper) { d.mapper['map'+ft.properties.placename.replace(/[^a-zA-Z0-9]/g, '') + ft.properties.title.replace(/[^a-zA-Z0-9]/g, '')] = ft; }
				
			if (ft.geometry.type === 'Point') { 
				let point = this.SetupPoint(ft, d, index); points.features.push(point);
			} else { 
				let line = this.SetupLine(ft, d, index); let arrow = this.SetupArrow(line, d, index);
				lines.features.push(ft); arrows.features.push(arrow);
			}	
		}
		document.querySelectorAll('.cat-link').forEach(el => { el.addEventListener('click', (e) => {  MI.Interface.Search(el.textContent); e.stopPropagation(); }); });	
		document.querySelectorAll('#mlist-'+d.details.id+' li').forEach(el => { el.addEventListener('click', (e) => {  MI.Atlas.PointFocus(el.id.substring(6)); }); });
		document.querySelectorAll('.manifest-link').forEach(el => { el.addEventListener('click', (e) => {  MI.Interface.Link(el.href, e); }); });	
	
		// Prepare to add layers
		let maplayergroup = null;
		MI.Atlas.maplayer = maplayergroup = L.layerGroup();

		let lineLayer = new L.geoJSON(lines, { style: MI.Atlas.styles.line });	
		d.details.layers.push(maplayergroup.addLayer(lineLayer));		

		let arrowLayer = new L.geoJSON(arrows, { onEachFeature: MI.Atlas.RenderLine, pointToLayer: function (feature, latlng) { 
			MI.Atlas.styles.arrow.rotation = feature.properties.angle;
			return L.triangleMarker(latlng, MI.Atlas.styles.arrow);
		} });
		d.details.layers.push(maplayergroup.addLayer(arrowLayer));	
		
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
	
		let pointLayer = new L.geoJSON(points, { onEachFeature: MI.Atlas.RenderPoint, pointToLayer: function (feature, latlng) { 
			return L.circleMarker(latlng, MI.Atlas.styles.points); 
		} });	
		
		for (let j in MI.Atlas.map._layers) { 
			if (MI.Atlas.map._layers[j].feature && MI.Atlas.map._layers[j].feature.properties.clustered) {
				MI.Atlas.RenderPoint(MI.Atlas.map._layers[j].feature,MI.Atlas.map._layers[j]);
			}	 
		}
		
		pointLayer.on('mouseup', function(e){	});
		d.details.layers.push(maplayergroup.addLayer(pointLayer));
		d.details.layers.push(MI.Atlas.map.addLayer(maplayergroup));
	
		MI.Interface.RefreshMeasureList();
		document.getElementById('sidepanel').scrollTo(0, 0);	
	
		return d;
	}
	
	SetupStyle(d) {
		let styling = {color: d.properties.title === 'Manifest' ? ['#4d34db','#dfdbf9','#dfdbf9'] : MI.Atlas.SupplyColor(), style: Object.assign({}, MI.Atlas.styles.point)};	
		let globes = ['americas','asia','europe','africa'];
		Object.assign(d.details, {style: Object.assign(styling.style, {fillColor: styling.color[0], color: styling.color[1], textColor: styling.color[2], darkerColor: tinycolor(styling.color[0]).darken(30).toString(), darkColor: tinycolor(styling.color[0]).darken(10).toString(), lightColor: tinycolor(styling.color[0]).setAlpha(0.1).toString()}), colorchoice: styling.color, globe: globes[Math.floor(Math.random() * globes.length)]});
	}
	
	SetupPoint(ft, d, index) {
		let setup = { index: index, type: 'node', style: d.details.style, basestyle: d.details.style, latlng: new L.LatLng(ft.geometry.coordinates[1], ft.geometry.coordinates[0]), measures: this.SetupMeasures(ft, d.details)};
		Object.assign(ft.properties, setup);
	
		let li = document.createElement('li'); li.id = 'local_'+ft.properties.lid;

		li.innerHTML = `
		<div class="dot" style="background: ${d.details.style.fillColor}; border-color: ${d.details.style.color};">${ft.properties.mindex}</div>
		<h5 class="mdetail_title">${ft.properties.title}</h5>
		<div class="pdetails">
			<p class="placename" style="color: ${d.details.style.darkerColor}";>${ft.properties.placename}</p>
			<p class="category"> ${ft.properties.categories.map(cat => '<a class="cat-link">'+cat+'</a>').join(" ")}</p>
			<p class="measures"> ${ft.properties.measures.map(m => m ? '<span class="mtype">'+m.mtype+'</span>'+m.mvalue+''+m.munit : "").join(", ")}</p>

		</div> 
		<div class="featuredimages">${ft.properties.images.map(img => img ? '<img src="'+img+'" alt="'+ft.properties.title+' image"/>' : "").join("")}</div>
		<p class="description">${ManifestUtilities.Linkify(ft.properties.description)}</p>
		<details class="sources ${(ft.properties.sources.length === 1 && !(ft.properties.sources[0]) && !(ft.properties.notes)) ? "closed" : ""}" style="background: ${d.details.style.lightColor};">
			<summary>Notes</summary>
			<ol>
				${ft.properties.sources.map(src => src ? '<li>'+ManifestUtilities.Linkify(src)+'</li>' : "").join("")}
				${ManifestUtilities.Linkify(ft.properties.notes)}
			</ol>
		</details>`;
		
		document.getElementById('mlist-'+d.details.id).append(li);			
		document.querySelectorAll('#local_'+ft.properties.lid+' .pdetails p, #local_'+ft.properties.lid+' div.featuredimages', '#local_'+ft.properties.lid+' p.description')
			.forEach(el => { if (!el.textContent.replace(/\s/g, '').length && el.children.length === 0) {
				el.remove();
	  	} }); 
		
		return ft;
	}

	SetupLine(ft, d, index) {		
		let fromx = ft.geometry.coordinates[0][0]; let fromy = ft.geometry.coordinates[0][1];
		let tox = ft.geometry.coordinates[1][0]; let toy = ft.geometry.coordinates[1][1];		
		if (fromx === tox && fromy === toy) { fromx = tox = fromy = toy = 0; }
		
		ft.geometry.type = 'MultiLineString';
		ft.properties.type = 'line';
		ft.properties.clustered = null;
		
		let multipass = null;
		let selectedlinetype = this.linetypes.greatcircle;
		if (selectedlinetype  === this.linetypes.greatcircle) { multipass = Grate.great_circle_route([fromx, fromy], [tox, toy], 7, MI.Atlas.map.getPixelBounds()); } 
		else if (selectedlinetype === this.linetypes.bezier) { multipass = Grate.bezier_route([fromx, fromy], [tox, toy], 7, MI.Atlas.map.getPixelBounds()); }
		
		let sign = Number(Math.sign(multipass[0][0][0] - multipass[0][1][0])), breakstart = 0, breakend = multipass.length, checksign = 0;
        for (let i = 0; i < multipass[0].length-1; i++) {		
			checksign = Math.sign(multipass[0][i][0] - multipass[0][i+1][0]);	
			if (checksign != sign && multipass[0][i][0] != multipass[0][i+1][0]) {
				if (breakstart === 0) { breakstart = i;} breakend = i;
			}  
		}
		
		if ( breakstart !== 0 && !isNaN(sign)) { 
			if (sign === 1) {
				let part1 = multipass[0].slice(0, breakstart); part1.push([-180, part1[part1.length-1][1]]);
				let part2 = multipass[0].slice(breakend+1,multipass[0].length); part2.unshift([180, part1[part1.length-1][1]]);
				//let extend1 = part1.map(x => [x[0]+360,x[1]]), extend2 = part2.map(x => [x[0]-360,x[1]]);
				//ft.geometry.coordinates = [extend1, part1, part2, extend2];
				ft.geometry.coordinates = [part1, part2];
				
			} else if (sign === -1) {
				let part1 = multipass[0].slice(0, breakstart); part1.push([180, part1[part1.length-1][1]]); 
				let part2 = multipass[0].slice(breakend+1,multipass[0].length); part2.unshift([-180, part1[part1.length-1][1]]);
				//let extend1 = part1.map(x => [x[0]-360,x[1]]), extend2 = part2.map(x => [x[0]+360,x[1]]);
				//ft.geometry.coordinates = [extend1, part1, part2, extend2];
				ft.geometry.coordinates = [part1, part2];
			}
		} 
		else { ft.geometry.coordinates = multipass; }
		
		ft.geometry.raw = multipass;
		ft.properties.style = Object.assign(MI.Atlas.styles.line, {color: d.details.style.darkColor});
		ft.properties.basestyle = MI.Atlas.styles.line;
				
		// Arrows	
		let midindex = Math.floor((multipass[0].length-1)*0.8);
		let middle = multipass[0][midindex];		
		let angle = Math.atan2(multipass[0][midindex+5][0] - multipass[0][midindex-5][0], multipass[0][midindex+5][1] - multipass[0][midindex-5][1]) * 180 / Math.PI;

		let arrow = {
			type: 'Feature',
			properties: ft.properties,
			geometry: { type: 'Point', coordinates:  multipass[0][midindex] }
		};
		Object.assign(arrow.properties, { type: 'arrow', angle: angle, 
			style: Object.assign(MI.Atlas.styles.arrow, {color: d.details.style.darkColor, fillColor: d.details.style.color}),
			basestyle: Object.assign(MI.Atlas.styles.arrow, {color: d.details.style.darkColor, fillColor: d.details.style.color}) });
					
		return ft;
	}

	SetupArrow(ft, d, index) {	
		let midindex = Math.floor((ft.geometry.raw[0].length-1)*0.8);
		let middle = ft.geometry.raw[0][midindex];		
		let angle = Math.atan2(ft.geometry.raw[0][midindex+5][0] - ft.geometry.raw[0][midindex-5][0], ft.geometry.raw[0][midindex+5][1] - ft.geometry.raw[0][midindex-5][1]) * 180 / Math.PI;

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

	SetupMeasures(ft, sc) {
		let measure = ft.properties.measures, measure_list = Object.assign([], this.measures), measurecheck = false, smapmeasures = [];
		for (let e in ft.properties.measures) {
			if (ft.properties.measures[e].mtype !== '') {
				let ftmeasure = ft.properties.measures[e], measurecheck = false;
			
				for (let l in measure_list) { if (l.measure === ftmeasure.mtype) { measurecheck = true; } }
				if (measurecheck === false) { measure_list.push({measure: ftmeasure.mtype, unit: ftmeasure.munit}); }
			
				if (typeof sc.measures[ftmeasure.mtype] === 'undefined') { sc.measures[ftmeasure.mtype] = {max: 1, min: 0}; }
				let mmax = Number(sc.measures[ftmeasure.mtype].max) > Number(ftmeasure.mvalue) ? Number(sc.measures[ftmeasure.mtype].max) : Number(ftmeasure.mvalue);
				sc.measures[ftmeasure.mtype] = { max: mmax, min: 0 };
			} 
		}
	
		for (let l in measure_list) {		
			if (typeof ft.properties[measure_list[l].measure] !== 'undefined') { 
				if (typeof sc.measures[measure_list[l].measure] === 'undefined') { sc.measures[measure_list[l].measure] = {max: 1, min: 0}; }
				sc.measures[measure_list[l].measure] = { max: Number(sc.measures[measure_list[l].measure].max) + Number(ft.properties[measure_list[l].measure]), min: 0 };
	
				measure[measure_list[l].measure] = ft.properties[measure_list[l].measure]; 
				smapmeasures.push({mtype: measure_list[l].measure, munit: measure_list[l].unit, mvalue: ft.properties[measure_list[l].measure]});
			}
		}		
		return smapmeasures.length > 0 ? smapmeasures : (Object.entries(ft.properties.measures).length === 0 ? [] : ft.properties.measures);
	}
	
	/** Removes a supply chain from the interface (along with its data) **/
	Remove(id) {
		event.stopPropagation();

		let offset = document.getElementById('mheader-'+id).offsetHeight;
		let targetid = 0;
	
		if (MI.supplychains.length > 1) {
			let prev = document.getElementById('mheader-'+id).previousElementSibling;
			while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
		
			let next = document.getElementById('mheader-'+id).nextElementSibling;
			while (next) { if (next.classList.contains('mheader')) break; next = next.nextElementSibling; }
		
			if (!next) {
				offset = 0;		
				next = prev = document.getElementById('mheader-'+id).previousElementSibling; 
				while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }

			 }
			targetid = next.id.split('-')[1];	
		}

		document.querySelectorAll('#mheader-'+id+', #mdetails-'+id+', #mlist-'+id).forEach(el => { el.remove(); }); 
	
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

		let moffset = 0; document.querySelectorAll('.mheader').forEach(el => { el.style.top = moffset+'px'; moffset += el.offsetHeight; });		
		let roffset = 0; Array.from(document.querySelectorAll('.mheader')).reverse().forEach(el => { el.style.bottom = roffset+'px'; roffset += el.offsetHeight;});

		if (MI.supplychains.length !== 0) {
			if (document.getElementsByClassName('leaflet-popup').length > 0 && MI.Atlas.active_point) { MI.Atlas.MapPointClick(MI.Atlas.active_point, 'auto'); }
			else { document.getElementById('sidepanel').scrollTo(0, document.getElementById('mdetails-'+targetid).offsetTop + (-1*offset)); }
			if (MI.Visualization.type === 'textview') { 
				document.getElementById('textview').scrollTo(0, document.getElementById('blob-'+targetid).offsetTop + (-1*offset));}
		}
		else if (document.getElementById('minfodetail').classList.contains('closed')) { 
			MI.Interface.ShowLauncher(); 
			MI.Visualization.Set('map');			
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
	
		MI.Atlas.Refresh(); MI.Atlas.map.fitBounds(MI.Atlas.map.getBounds());
	
		MI.Interface.RefreshMeasureList(); 
		if (document.getElementById('blob-'+id)) { document.getElementById('blob-'+id).remove(); }
		MI.Visualization.Set(MI.Visualization.type);			
		MI.Interface.SetDocumentTitle();	
	}
}