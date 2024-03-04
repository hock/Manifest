class ManifestVisualization {
	constructor(options) {
		this.type = 'map';
		this.last_active = null;
		this.interval = 0;
		this.listview = null;
		this.active_scid = null;
	}
	
	Set(type, scid, refresh=false) {
		if (scid !== MI.Visualization.active_scid || type !== MI.Visualization.type || MI.Interface.IsMobile() || refresh) {
			MI.Visualization.active_scid = scid; 
			
			MI.Visualization.Clear();
		
			this.type = type; document.getElementById('viz-choices').value = type;
			['map','forcegraph','flow','chord','listview','textview'].forEach(t => { document.body.classList.remove(t); }); document.body.classList.add(this.type);
			switch(type) {
				case 'map': MI.Visualization.MapViz(); break;
				case 'forcegraph': MI.Visualization.Graph(type); break;			
				case 'flow': MI.Visualization.Graph(type); break;			
				case 'chord': MI.Visualization.Graph(type); break;	
				case 'listview': MI.Visualization.ListViz(); break;			
				case 'textview': MI.Visualization.TextViz(); break;
			  	default: console.log('Visualization type not supported...');
			}
		}
	}
	
	MapViz() {
		document.querySelectorAll('#vizwrap, #textview, #listview').forEach(el => { el.classList.add('closed'); });
		MI.Atlas.DisplayLayers(true);
		document.querySelectorAll('.viz, #vizshell defs').forEach(el => { el.remove(); });

		if (!MI.Atlas.active_point && this.last_active !== null) { MI.Atlas.MapPointClick(this.last_active); this.last_active = null; }
		else if (MI.supplychains.length !== 0) { MI.Atlas.MapPointClick(MI.Atlas.active_point); }
	}
	
	Graph(type) {
		document.querySelectorAll('#vizwrap, #listview, #textview').forEach(el => { el.classList.add('closed'); }); 
		document.getElementById('vizwrap').classList.remove('closed');
		
		if (MI.Atlas.active_point && MI.Atlas.active_point._popup) { this.last_active = MI.Atlas.active_point._popup._source.feature.properties.lid; } else { this.last_active = null; }
		MI.Atlas.DisplayLayers(false);
		this.Resize();

		document.querySelectorAll('.viz').forEach(el => { el.remove(); }); 
		
		if (MI.supplychains.length > 0) {
			let graph = {nodes:[],links:[]};				
		
			for (let i in MI.supplychains) {
				if (MI.supplychains[i].graph !== undefined && document.getElementById('mheader-'+MI.supplychains[i].details.id).style.display !== 'none' && String(MI.supplychains[i].details.id) === MI.Visualization.active_scid) { 
					if (MI.supplychains[i].graph.links.length !== 0) {
						let sgraph = this.GraphCopy(MI.supplychains[i].graph); 
						let ngraph = {nodes: [], links:[]};
					
						if (sgraph.nodes.length >= 100) {
							sgraph.nodes = sgraph.nodes.sort((a, b) => (Number(a.id.split('-')[1]) > Number(b.id.split('-')[1])) ? 1 : -1);
							ngraph.nodes = sgraph.nodes.slice(0,100);
							for (let l of sgraph.links) {
								if (Number(l.source.split('-')[1]) < 100 && Number(l.target.split('-')[1]) < 100) { ngraph.links[ngraph.links.length] = l; }
							}
							MI.Interface.ShowMessage('Rendering first 100 nodes of "'+MI.supplychains[i].properties.title+'" ('+Number(sgraph.nodes.length-100)+' not shown).');
						} else { ngraph = sgraph; }

						graph.nodes = graph.nodes.concat(ngraph.nodes);
						graph.links = graph.links.concat(ngraph.links);
						graph.canvascolor = sgraph.canvascolor;
					} else {
						MI.Interface.ShowMessage('Skipped visualizing "'+MI.supplychains[i].properties.title+'" (an unconnected graph).');
					}
				} 
			}
			if (type === 'forcegraph') { this.forcegraph = new ForceGraph(graph);  this.forcegraph.Run(); 
			} else if (type === 'flow') { this.sankeydiagram = new SankeyDiagram(graph);
			} else if (type === 'chord') { this.chorddiagram = new ChordDiagram(graph); }
		}
	}
	
	TextViz() {
		document.querySelectorAll('#vizwrap, #listview, #textview').forEach(el => { el.classList.add('closed'); }); document.getElementById('textview').classList.remove('closed');
		document.querySelectorAll('.viz, #vizshell defs').forEach(el => { el.remove(); });
					
		for (let sc of MI.supplychains) { if (!(document.getElementById('blob-'+sc.details.id))) {		
			let scblob = document.createElement('div');
			let rawjson = sc.mtype === 'smap' ? MI._smapToManifest(sc) : sc.mtype === 'gsheet' ? MI._gsheetToManifest(sc) : sc.raw;
			
			scblob.id = 'blob-'+sc.details.id;
			scblob.classList.add('blob');
			scblob.innerHTML = `
				<h2 id="${sc.details.id}">
					<span class="rawtitle"><i class="fas fa-file"></i>${sc.properties.title}</span>
				</h2>
				<p class="raw-downloads">
					<i class="far fa-file-alt"></i> <a class="download-markdown" id="download-${sc.details.id}">Download Markdown</a> | 
					<i class="far fa-file-code"></i> <a class="download-json" id="download-${sc.details.id}">Download JSON</a>
				</p>
				<pre class="container">${MI.Visualization.HighlightSyntax(JSON.stringify(rawjson, null, 2))}</pre>`;
			document.getElementById('textview').appendChild(scblob);
		} }
		
		document.querySelectorAll('.download-json').forEach(el => { el.addEventListener('click', (e) => {
			let did = Number(el.id.split('-')[1]);
			for (let s in MI.supplychains) { if (MI.supplychains[s].details.id === did) { MI.ExportManifest(MI.supplychains[s], did, 'json'); } }
		 });}); 
		document.querySelectorAll('.download-markdown').forEach(el => { el.addEventListener('click', (e) => {
			let did = Number(el.id.split('-')[1]);
			for (let s in MI.supplychains) { if (MI.supplychains[s].details.id === did) { MI.ExportManifest(MI.Visualization.ManifestMarkdown(did), did, 'markdown'); } }
		});}); 
	}
	
	ListViz() {
		let values = [];
		
		for (let sc of MI.supplychains) {
		
			let rawvalues = sc.features.filter(e => e.geometry.type === 'Point');
			for (let val of rawvalues) {
				values.push({manifest: sc.properties.title, index: val.properties.index, name: val.properties.title, description: val.properties.description, placename: val.properties.placename, geocode: (val.geometry.coordinates[0] !== '' && val.geometry.coordinates[1] !== '') ? String(val.geometry.coordinates).replace(',',', ') : '', categories: val.properties.category ? val.properties.category.split(',').join(', ') : '', notes: val.properties.notes});
			}
		}
		document.querySelectorAll('#vizwrap, #listview, #textview').forEach(el => { el.classList.add('closed'); }); document.getElementById('listview').classList.remove('closed');

		let options = {
		    item: function(values) {			
				return `<li class="entry">
							<div class="manifest col">${values.manifest}</div>
				
							<div class="index col">${values.index}</div>
			
							<div class="name col">${values.name}</div>
							<div class="description col">${values.description}</div>
							<div class="placename col">${values.placename}</div>
							<div class="geocode col">${values.geocode}</div>
			
							<div class="categories col">${values.categories}</div>
							<div class="notes col">${values.notes}</div>
							<div class="clear"></div>
			
			
						</li>`;
			},
			page:50,
		    pagination: [ { paginationClass: "pagination", innerWindow: 1, left: 3, right: 3, item: '<li><a class="page"></a></li>'}]	
		};
		if (this.listview === null) { this.listview = new List('datalist', options, values); }
		else { this.listview.clear(); this.listview.add(values);}

	}
	
	ManifestMarkdown(id) {
		let md = '';
		for (let s in MI.supplychains) {
			if (MI.supplychains[s].details.id === id) {
				md += '# '+MI.supplychains[s].properties.title + '\n';
				md += ''+MI.supplychains[s].properties.description.replace(/(<([^>]+)>)/gi, '').replace(/(\r\n|\n|\r)/gm,'') + '\n\n';
		
				if (MI.supplychains[s].features.length >= 1) {
					for (let ft of MI.supplychains[s].features) {
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
				md += '\n';
			}
		}
		return md;
	}	
	
	HighlightSyntax(json) {
	    if (typeof json !== 'string') { json = JSON.stringify(json, undefined, 2); }
	    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
	        let cls = 'number';
	        if (/^"/.test(match)) { if (/:$/.test(match)) { cls = 'key'; } else { cls = 'string'; } } 
			else if (/true|false/.test(match)) { cls = 'boolean'; } else if (/null/.test(match)) { cls = 'null'; }
	        return '<span class="' + cls + '">' + match + '</span>';
	    });
	}
	
	Update() {
		if (MI.supplychains.length > 0) {		
			if (this.type === 'forcegraph' && this.forcegraph) { this.forcegraph._update(); }
			if (this.type === 'flow' && this.sankeydiagram) { this.sankeydiagram._update(); }
			if (this.type === 'chord' && this.chorddiagram) { this.chorddiagram._update(); }	
		}
	}
	
	Resize() {
		this.width = window.innerWidth; 
		this.height = window.innerHeight;
		if (MI.Interface.IsMobile()) { this.height = document.getElementById('vizshell').clientHeight; }	
		
		let svg = document.getElementById('vizshell');
		svg.setAttribute('width',this.width); svg.setAttribute('height',this.height); 
		this.Update();
	}
	Clear() {
		clearTimeout(MI.Visualization.interval);
	}
	GraphCopy(graph) {
		let ngraph = {nodes:[],links:[]};
		ngraph.canvascolor = graph.nodes[0].fillColor;
		let color_range = [
			tinycolor(ngraph.canvascolor).darken(25).toString(),tinycolor(ngraph.canvascolor).darken(20).toString(),tinycolor(ngraph.canvascolor).darken(15).toString(),tinycolor(ngraph.canvascolor).darken(10).toString(),tinycolor(ngraph.canvascolor).darken(5).toString(),tinycolor(ngraph.canvascolor).toString(),tinycolor(ngraph.canvascolor).brighten(5).toString(),tinycolor(ngraph.canvascolor).brighten(10).toString(),tinycolor(ngraph.canvascolor).brighten(15).toString(),tinycolor(ngraph.canvascolor).brighten(20).toString(),tinycolor(ngraph.canvascolor).brighten(25).toString()];
		let color_index = 0;	
		
		for (let node of graph.nodes) {
			let nnode = { group: node.group, id: node.id, name: node.name, ref: node.ref, linkcount: node.links.length, fillColor: color_range[color_index], color: tinycolor(color_range[color_index]).brighten(20).toString()};
			if ( node.links.length !== 0) {
				ngraph.nodes.push(nnode);
			}
			color_index++; if (color_index >= color_range.length) {color_index = 0;}
		}
		for (let link of graph.links) {
			let nlink = { source: link.source, target: link.target, color: link.color, fillColor: link.fillColor};
			ngraph.links.push(nlink);
		}		
		return ngraph;
	}
}   

// Force Directed Graph
class ForceGraph {
	constructor(graph) {
		this.graph = graph;
		MI.Visualization.interval = null;
		this.svg = d3.select('svg').attr('width', this.width).attr('height', this.height);
		this.viz = this.svg.append('g').attr('class', 'viz forcegraph');
				
		this.simulation = d3.forceSimulation(this.graph.nodes)
		.force('center', d3.forceCenter((this.width+this.xoffset)/2, this.height/2))
		.force('radial', d3.forceRadial((this.width+this.xoffset)/8, (this.width+this.xoffset)/2, this.height/2).strength(0.8))
		.force('y', d3.forceY(this.height / 2).strength(0.4))
		.force('collision', d3.forceCollide().radius(d => { 
			let collision = Number(MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value))*2 + 
				d.linkcount * 2; 
					return collision; }).strength(0.4))
		.force('link', d3.forceLink(this.graph.links).id(n => { return n.id;}).strength(1).distance(d => { return Math.max(d.source.linkcount,d.target.linkcount) * 2; }))
	    .force('charge', d3.forceManyBody().strength(d => { 
			let charge = -50 * (Number(MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value))+d.linkcount);
			return charge; }))
		.on('tick', e => this._tick());
		
		this.viz.append("rect").attr('width', '100%').attr('height', '100%').attr('fill', this.graph.canvascolor).attr('opacity','0.1');
		this.defs = this.svg.append('svg:defs');
		
		this.groups = this.viz.append('g').attr('class', 'groups');
		
		this.link = this.viz.append('g').attr('class', 'link').selectAll('path.link').data(this.graph.links).enter().append('path')
			.attr('opacity', 0.2).attr('stroke-width', 2).attr('stroke', d => d.color).style('fill', 'none');
		this.arrow = this.viz.append('g').attr('class', 'arrow').selectAll('path.arrow').data(this.graph.links).enter().append('path')
			.attr('stroke-width', 0).attr('opacity', 0.5).style('fill', 'none').attr('marker-end', d => this._marker(d.color));
	
		this.label = this.viz.append('g').attr('class', 'labels').selectAll('text').data(this.graph.nodes).enter().append('text').attr('pointer-events', 'none')
			.attr('fill', d => { if (d.ref !== undefined) {return d.ref.properties.basestyle.color; } })	
			.attr('x', d => MI.Atlas.map.latLngToContainerPoint(d.ref.properties.latlng, MI.Atlas.map.getZoom()).x) 
			.attr('y', d => MI.Atlas.map.latLngToContainerPoint(d.ref.properties.latlng, MI.Atlas.map.getZoom()).y) 	
			.attr('stroke','#000000').attr('stroke-width','0.2')
			.attr('font-family', '"Roboto", Arial, Helvetica, sans-serif')
			.text(d => d.name);
				
		this.node = this.viz.append('g').attr('class', 'nodes').selectAll('circle').data(this.graph.nodes).enter().append('circle') 
			.attr('cx', d => (this.width+this.xoffset)/2) 
			.attr('cy', d => this.height/2) 		
			.attr('r', d => MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)) 
			.style('fill', d => d.fillColor).style('stroke', d => d.color)
			.on("mouseover", (d,i) => { 
				d3.select('#viztooltip')
				.style('display','block').style("left", (d3.event.pageX + 10) + "px").style("top", (d3.event.pageY - 15) + "px")
				.style('background-color',d.color).style('border-color',d.fillColor).style('color',tinycolor.mostReadable(d.fillColor, [tinycolor(d.fillColor).darken(50), tinycolor(d.fillColor).brighten(50)]).toHexString())
				.html('<h3>'+d.ref.properties.title+'<h3>'+d.ref.properties.description);})
			.on("mousemove", (d,i) => { 
				d3.select('#viztooltip').style("left", (d3.event.pageX + 10) + "px")
					.style("top", (d3.event.pageY - 15) + "px");})
	        .on("mouseout", (d,i) => { d3.select('#viztooltip').style('display','none'); })
			.call(d3.drag().on('start', d => this._dragstarted(d)).on('drag', d => this._dragged(d)).on('end', d => this._dragended(d)));
			
		this.groupIds = d3.set(this.graph.nodes.map(n => +n.group)).values()
			.map( groupId => { return { groupId : groupId, count : this.graph.nodes.filter(n => Number(n.group) === Number(groupId)).length }; }) 
			.filter(group => group.count > 2).map(group => group.groupId);

		this.paths = this.groups.selectAll('path').data(this.groupIds, d => { return +d; }).enter().append('g').attr('class', 'paths').append('path')
			.attr('stroke', d => { for (let i in MI.supplychains) { if (Number(MI.supplychains[i].details.id) === Number(d)) { 
				return MI.supplychains[i].details.style.color; } } })
			.style('stroke-dasharray','3,3').style('stroke-opacity','0.5')
			.attr('fill', '#21222c')
			.attr('fill-opacity', 1);
 		this.groups.selectAll('path').call(d3.drag()
			.on('start', d => this._group_dragstarted(d)).on('drag', d => this._group_dragged(d)).on('end', d => this._group_dragended(d)) );
		
		this.polygonGenerator = function(groupId) {
		  let node_coords = this.node.filter(d => Number(d.group) === Number(groupId)).data().map(d => [d.x, d.y]);
		  return d3.polygonHull(node_coords);
		};
		this.valueline = d3.line().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRomClosed);	
	}
	
	get width() { return MI.Visualization.width; }
	get xoffset() {
		if (!(MI.Interface.IsMobile())) { 
			if (!document.body.classList.contains('fullscreen')) { return document.getElementById('sidepanel').clientWidth; }
			else { return 0; }} 
		else { return 0; }
	}
	get height() { return MI.Visualization.height; }
	get xpos() {
		if (!(MI.Interface.IsMobile())) { 
			if (!document.body.classList.contains('fullscreen')) { return (this.width + document.getElementById('sidepanel').clientWidth) / 2; }
			else { return this.width / 2; }} 
		else { return this.width / 2; }
	}
	get ypos() { return this.height / 2; }
	
	Run() {			
		this.simulation.alphaDecay(0.3);
	}
	
	_update() {
		this.simulation.force('center', d3.forceCenter((this.width+this.xoffset)/2, this.height/2))
		.force('radial', d3.forceRadial((this.width+this.xoffset)/8, (this.width+this.xoffset)/2, this.height/2).strength(0.8))
		.force('y', d3.forceY(this.height / 2).strength(0.4))
		.alpha(0.5).restart();
	}
	
	_tick() {
		this.node.attr('cx', d => Math.min(Math.max(d.x,MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)+10),this.width+this.xoffset-10-MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)))
			.attr('cy', d => Math.min(Math.max(d.y,MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)+10),this.height-10-MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)))		
			.attr('opacity', d => { if (d.ref.properties.hidden) {return 0.1; } else { return 1;} });
		
		this.arrow.attr('d', d => {	
			let dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, dr = Math.sqrt(dx * dx + dy * dy), 
				endX = (d.target.x + d.source.x) / 2, endY = (d.target.y + d.source.y) / 2, len = dr - ((dr/2) * Math.sqrt(3));
				endX = endX + (dy * len/dr); endY = endY + (-dx * len/dr); endX = isNaN(endX) ? 0 : endX; endY = isNaN(endY) ? 0 : endY; 
		
				return [ 'M',Math.max(0,d.source.x),Math.max(0,d.source.y), 'A',Math.max(0,dr),Math.max(0,dr),0,0,1,Math.max(0,endX),Math.max(0,endY)].join(' ');});

		this.link.attr('d', d => {
			let dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, dr = Math.sqrt(dx * dx + dy * dy);
				return [ 'M',d.source.x,d.source.y, 'A',Math.max(0,dr),Math.max(0,dr),0,0,1,d.target.x,d.target.y].join(' ');});

		this.label.attr('x', d => Math.min(Math.max(d.x,d.x+MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)+(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize))),this.width+this.xoffset-MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)-(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize))))
			.attr('y', d => Math.min(Math.max(d.y,d.y+MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)+(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize))),this.height-MI.Atlas.GetScaledRadius(d.ref, document.getElementById('measure-choices').value)-(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize))));	
				
		this._updategroups();		
	}
	
	_updategroups() {
		let polygon, centroid;
		this.groupIds.forEach(groupId => { let path = this.paths.filter(d => { return d === groupId;}).attr('transform', 'scale(1) translate(0,0)').attr('d', d => {
			polygon = this.polygonGenerator(d);          
			centroid = d3.polygonCentroid(polygon);
			return this.valueline( polygon.map(point => [ point[0] - centroid[0], point[1] - centroid[1] ]) );
		});
		d3.select(path.node().parentNode).attr('transform', 'translate('  + centroid[0] + ',' + (centroid[1]) + ') scale(' + '1.8' + ')');
	}); }
	
	_countdown() {
		MI.Visualization.Clear();
		MI.Visualization.interval = setTimeout(e => {this.simulation.stop(); }, 10000);
	}

	_marker(color) {
		this.defs.append('svg:marker').attr('id', color.replace('#', '')).attr('viewBox', '0 -5 10 10').attr('refX', 3.33)
			.attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto').attr('markerUnits', 'userSpaceOnUse').append('svg:path')
			.attr('d', 'M0,-5L10,0L0,5').style('fill', color);
		return 'url(' + color + ')';
	}

	_dragstarted(d) {
		MI.Visualization.Clear();
		if (d.ref !== undefined) { MI.Atlas.MapPointClick(d.ref.properties.lid); MI.Atlas.active_point = d.ref.properties.lid; }
		if (!d3.event.active) { this.simulation.alpha(0.1).alphaDecay(0).restart(); }
		d.fx = d.x; d.fy = d.y;
	}
	_dragged(d) { d.fx = d3.event.x; d.fy = d3.event.y; }
	_dragended(d) { if (!d3.event.active) { this.simulation.alphaDecay(0.3); } d.fx = null; d.fy = null; }
	

	 
}

class SankeyDiagram { 
	constructor(graph) {
		this.graph = graph;
		let width = this.width - this.margin.left - this.margin.right, height = this.height - this.margin.top - this.margin.bottom;
		let nodeMap = {};
		this.graph.nodes.forEach(x => { if (typeof x.label !== 'string') {x.label = x.name; x.name = x.id;} nodeMap[x.id] = x; });
		this.graph.links = this.graph.links.map(x => {
			return {
				source: nodeMap[x.source], target: nodeMap[x.target],
				value: Number(MI.Atlas.GetScaledRadius(nodeMap[x.source].ref, document.getElementById('measure-choices').value))
			};
		});

		// TODO Phasing out viz slider
		let slide = Number(document.getElementById('viz-slider').value)/100; slide = 1;
		this.sankey = d3.sankeyCircular().nodeWidth(30).nodePaddingRatio(1)
			.size([width, height]).nodeId(d => d.label).nodeAlign(d3.sankeyCenter).iterations(32).circularLinkGap(2);
	
		this.viz = d3.select('svg').append('g').attr('class', 'viz sankeydiagram')
			.attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

		this.linkwrap = this.viz.append('g').attr('class', 'links').attr('fill', 'none').attr('stroke-opacity', 0.2).selectAll('path');
		this.nodewrap = this.viz.append('g').attr('class', 'nodes').attr('font-family', 'sans-serif').attr('font-size', 10) .selectAll('g');

		let sankeyData = this.sankey(this.graph);
		sankeyData = this.sankey.update(this.graph);  

		this._drawFlow(sankeyData);
		this._update();
	}
	_drawFlow(sankeyData) {
		let depthExtent = d3.extent(sankeyData.nodes, d => d.depth);

		this.nodes = this.nodewrap.data(sankeyData.nodes).enter().append('g').call(d3.drag().subject(d => d)
			.on('start', (d) => { if (d.ref !== undefined) { MI.Atlas.MapPointClick(d.ref.properties.lid); MI.Atlas.active_point = d.ref.properties.lid; }})
			.on('drag', (d, i, n) => { this._dragmove(d, i, n);}))
			.on('mouseover', (d) => {
				let thisName = d.name;
				this.nodes.selectAll('rect').style('opacity', d => this._highlightNodes(d, thisName));
				d3.selectAll('.sankey-link').style('opacity', l => { return l.source.name === thisName || l.target.name === thisName ? 1 : 0.3; });
				this.nodes.selectAll('text') .style('opacity', d => this._highlightNodes(d, thisName) );
			})
			.on('mouseout', function (d) {
				d3.selectAll('.noderect').style('opacity', 0.5);
				d3.selectAll('.sankey-link').style('opacity', 0.7);
				d3.selectAll('text').style('opacity', 1);
			})
			.attr('opacity', d => { if (d.ref.properties.hidden) {return 0.1; } else { return 1;} });	
			
	    this.nodes.append('rect').attr('class','noderect').attr('x', d => d.x0 ).attr('y', d => d.y0 ).attr('height', d => Math.max(5,d.y1 - d.y0) ) 
			.attr('width', d => d.x1 - d.x0 ).style('fill', d => d.ref.properties.style.fillColor ).style('opacity', 0.5)			
			.style('cursor','pointer').attr('rx',2);

		this.nodes.append('text').attr('x', d => (d.x0 + d.x1) / 2) .attr('y', d => d.y0 - 12 ).attr('dy', '0.35em')
			.attr('text-anchor', 'middle').text( d => d.label ) .attr('fill', d => d.ref.properties.style.color)
			.attr('font-family', '"Roboto", Arial, Helvetica, sans-serif') .attr('font-size', '10px').style('cursor','pointer');

		this.nodes.append('title').text( d => d.label + ' (' + (d.value) + ')' );

		this.links = this.linkwrap.data(sankeyData.links).enter().append('g');

		this.links.append('path').attr('class', 'sankey-link').attr('d', link => link.path)
			.style('stroke-width', d => Math.max(10, d.width) ) .style('opacity', 0.7)
			.style('stroke', (d, link) => link.circular ? 'red' : tinycolor(d.source.color).setAlpha(0.4).toString() )
			.style('fill', d => tinycolor(d.source.color).setAlpha(0.1).toString() );

		this.links.append('title').text( d => d.source.label + ' to ' + d.target.label );
	}
    _highlightNodes(node, name) {
		if ((d3.event.type !== 'drag')) {
			let opacity = 0.1;
			if (node.name === name) { opacity = 1; }
			node.sourceLinks.forEach(function (link) {
				if (link.target.name === name) { opacity = 1; }
			});
			node.targetLinks.forEach(function (link) {
				if (link.source.name === name) { opacity = 1; }
			});
			return opacity;
		}
    }
	_dragmove(d,i,n) { 
		let rectY = d3.select(n[i]).select('rect').attr('y'), rectX = d3.select(n[i]).select('rect').attr('x');
		d.y0 = d.y0 + d3.event.dy; d.x1 = d.x1 + d3.event.dx; d.x0 = d.x0 + d3.event.dx;
		let yTranslate = d.y0 - rectY, xTranslate = d.x0 - rectX;
	    
		d3.select(n[i]).attr('transform', 'translate(' + (xTranslate) + ',' + (yTranslate) + ')');
		let sankeyData = this.sankey.updatelinks(this.graph);
		this.links.remove();
		this.links = this.linkwrap.data(sankeyData.links).enter().append('g');
        
		this.links.append('path').attr('class', 'sankey-link').attr('d', link => link.path) 
			.style('stroke-width', d => Math.max(10, d.width)).style('opacity', 0.7)
			.style('stroke', (d, link) => { return link.circular ? 'red' : tinycolor(d.source.color).setAlpha(0.4).toString(); })
			.style('fill', d => tinycolor(d.source.color).setAlpha(0.1).toString());
			
		this.nodes.attr('opacity', d => { if (d.ref.properties.hidden) {return 0.1; } else { return 1;} });
	}
	get width() { return MI.Visualization.width; }
	get xoffset() {
		if (!(MI.Interface.IsMobile())) { if (!document.body.classList.contains('fullscreen')) { 
			return document.getElementById('sidepanel').clientWidth; }
			else { return 0; }}
	}
	get margin() {
		let off = 0;
		if (!(MI.Interface.IsMobile())) { if (!document.body.classList.contains('fullscreen')) { off = document.getElementById('sidepanel').clientWidth; } }
		return {top: ManifestUtilities.RemToPixels(5.5), right: ManifestUtilities.RemToPixels(1), 
			bottom: ManifestUtilities.RemToPixels(5.5), left: (ManifestUtilities.RemToPixels(4.2)+off)};
	}
	get height() { return MI.Visualization.height; }
	get xpos() {
		if (!(MI.Interface.IsMobile())) { 
			if (!document.body.classList.contains('fullscreen')) { return (this.width + document.getElementById('sidepanel').clientWidth) / 2; }
			else { return this.width / 2; }} 
		else { return this.width / 2; }
	}
	get ypos() { return this.height / 2; }
	
	
	_update() {
		let width = this.width - this.margin.left - this.margin.right, height = this.height - this.margin.top - this.margin.bottom;
		
		// TODO Phasing out viz slider
		let slide = Number(document.getElementById('viz-slider').value)/100; slide = 1;
		
		this.sankey.nodePaddingRatio(slide).size([width, height]);
		this.viz.attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
		
		this.graph.links.forEach(x => { x.value = Number(MI.Atlas.GetScaledRadius(x.source.ref, document.getElementById('measure-choices').value));});
		
		let sankeyData = this.sankey.update(this.graph);  
		this.links.remove();
		this.nodes.remove();
		this._drawFlow(sankeyData);
		this.nodes.attr('opacity', d => { if (d.ref.properties.hidden) {return 0.1; } else { return 1;} });	
	}
}

class ChordDiagram {	
	constructor(graph) {
		this.graph = graph;
		this.graph.nodes.forEach((node, index) => { node.index = index; });
		this.graph.links.forEach((link) => { 
			link.sourceid = this.graph.nodes.findIndex((el) => el.id === link.source); 
			link.targetid = this.graph.nodes.findIndex((el) => el.id === link.target);});
		this.svg = d3.select('svg').attr('width', this.width).attr('height', this.height);

		this.opacityDefault = 0.8;
		
		this._drawChord();
	}
	
	_drawChord() {
		this.adjacency = this._matrix(this.graph.nodes, this.graph.links);
		
		this.chord = d3.chord().padAngle(0.03).sortChords(d3.descending);
		this.arc = d3.arc().innerRadius(this.innerRadius).outerRadius(this.outerRadius+20);
		this.ribbon = d3.ribbon().radius(this.innerRadius);
		
		this.viz = d3.select('svg').append('g').attr('class', 'viz chorddiagram').attr('transform', 'translate(' + (this.xpos) + ',' + (this.height/2) + ')') .datum(this.chord(this.adjacency.matrix));
		
		this.outerArcs = this.viz.selectAll('g.group').data(chords => chords.groups).enter().append('g').attr('class', 'group') 
			.on('mouseover', this._fade(0.05,0)).on('mouseout', this._fade(this.opacityDefault,0));

		this.outerArcs.append('path').attr('id', d => 'group' + d.index).attr('d', this.arc).attr('stroke', (d,i) => { return this.adjacency.nodes[d.index].color; }) 
			.on('click', (d,i) => { if (this.adjacency.nodes[d.index].ref !== undefined) { MI.Atlas.MapPointClick(this.adjacency.nodes[d.index].ref.properties.lid); MI.Atlas.active_point = this.adjacency.nodes[d.index].ref.properties.lid; }})
			.attr('opacity', (d,i) => { if (this.adjacency.nodes[d.index].ref.properties.hidden) {return 0.1; } else { return 1;} })
			.attr('stroke-width', 1).attr('stroke-opacity', 0.8) .style('fill', (d,i) => { return this.adjacency.nodes[d.index].fillColor; })
			.style('cursor','pointer');

		this.outerArcs.append('text') .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; }).attr('class', 'titles')
			.attr('text-anchor', d => { return d.angle > Math.PI ? 'end' : null; })
			.attr('transform', d => { 
				return 'rotate(' + (d.angle * 180 / Math.PI - 90) + ')' + 'translate(' + (this.outerRadius + 30) + ')' + (d.angle > Math.PI ? 'rotate(180)' : ''); }) 
			.style('fill', (d,i) => { return this.adjacency.nodes[d.index].color; })
			.text((d,i) => { return this.adjacency.nodes[d.index].name; }).style('cursor','pointer').style('font-size', '12px') 
			.attr('opacity', (d,i) => { if (this.adjacency.nodes[d.index].ref.properties.hidden) {return 0.1; } else { return 1;} });

		this.viz.selectAll('path.chord').data(chords => chords).enter().append('path').attr('class', 'chord')
			.style('fill', (d,i) => {  return this.adjacency.nodes[d.source.index].fillColor; }).style('opacity', this.opacityDefault)
			.attr('stroke', (d,i) => { return this.adjacency.nodes[d.source.index].fillColor; }).attr('stroke-width', 1)
			.attr('stroke-opacity', 0.4).attr('d', this.ribbon);		
	}
	_fade(opacity, duration) {
	    return (d,i) => {
	      this.viz.selectAll('path.chord').filter(d => d.source.index !== i && d.target.index !== i).transition().duration(duration).style('opacity', opacity).style('stroke-opacity', opacity/2);
	  };
	}
	  
	_matrix(nodes, edges) {		
		let matrix = [];
		let total_items = nodes.length;
		    nodes.forEach(function(node) { node.count = 0; matrix[node.index] = d3.range(total_items).map(item_index => { return 0; }); });
		    edges.forEach(function(edge) {
				let sourceval = Number(MI.Atlas.GetScaledRadius(nodes[edge.sourceid].ref, document.getElementById('measure-choices').value));
				let targetval = Number(MI.Atlas.GetScaledRadius(nodes[edge.targetid].ref, document.getElementById('measure-choices').value));
		        matrix[edge.sourceid][edge.targetid] += sourceval; matrix[edge.targetid][edge.sourceid] += targetval;
		        nodes[edge.sourceid].count += sourceval; nodes[edge.targetid].count += targetval;
		    });
		
		return {matrix: matrix, nodes: nodes};
	}
	get outerRadius() { return Math.min(this.width, this.height/1.4) * 0.5 - 40; }
    get innerRadius() { return this.outerRadius - 10; }
	
	get width() { return MI.Visualization.width; }
	get xoffset() {
		if (!(MI.Interface.IsMobile())) { if (!document.body.classList.contains('fullscreen')) { 
			return document.getElementById('sidepanel').clientWidth; }
			else { return 0; }}
	}
	get height() { return MI.Visualization.height; }
	get xpos() {
		if (!(MI.Interface.IsMobile())) { 
			if (!document.body.classList.contains('fullscreen')) { return (this.width + document.getElementById('sidepanel').clientWidth) / 2; }
			else { return this.width / 2; }} 
		else { return this.width / 2; }
	}
	get ypos() { return this.height / 2; }
	
	
	_update() {
		this.viz.remove();
		this._drawChord();
	}
}
