/** Initialize a Spatial Atlas **/
class ManifestAtlas {
	constructor(options) {
		let pop = !(options.mobile) ? true : false;
		this.map = new L.Map('map', { 
			preferCanvas: true, minZoom: 3, maxZoom: 18, worldCopyJump: false, center: new L.LatLng(options.position.lat,options.position.lng), zoom: options.zoom, zoomControl: false, scrollWheelZoom: false, smoothSensitivity:1, closePopupOnClick: pop 
		});
		this.maplayer = [];
		this.active_point = null;
		this.homecontrol = null;
		this.glMapLoaded = false;
		this.playlist = {index: 0, list: [], runtime: null};
		
		this.clusterimg = { el: document.createElement('img') }; this.clusterimg.el.src = 'images/markers/cluster.png';
		this.highlightimg = { el: document.createElement('img') }; this.highlightimg.el.src = 'images/markers/star.png';
		this.baselayer = options.map ? options.map : 'default';
		
		this.colorsets = [['#3498DB','#dbedf9', '#dbedf9'],['#FF0080','#f9dbde','#f9dbde'],['#34db77','#dbf9e7','#dbf9e7'],['#ff6500','#f6d0ca','#f6d0ca'],['#4d34db','#dfdbf9','#dfdbf9'],  ['#5E2BFF','#E0D6FF','#E0D6FF'],['#EE4266','#FAC7D2','#FAC7D2'],['#3BCEAC','#CEF3EA','#CEF3EA'],['#00ABE7','#C2EFFF','#C2EFFF'],['#F85A3E','#FEDDD8','#FEDDD8']];
		
		let map_tiler_key = 'v6o4lBqX0HjNRonNxTdr';
		map_tiler_key = '3l62IEM16L7oUgCXLpag';
		
		this.tiletypes = {
			DEFAULT: options.serviceurl + 'maptiler/' + 'bright-v2',			
			PROTO: 'https://api.protomaps.com/tiles/v2/{z}/{x}/{y}.mvt?key=e66d42174e71874a',
			SATELLITE:  options.serviceurl + 'maptiler/' + 'satellite',
			ESRI_WORLD: 'services/maps/esri-world-imagery.json',	
			TOPO: options.serviceurl + 'maptiler/' + 'topo-v2',				
			GRAYSCALE: options.serviceurl + 'maptiler/' + 'backdrop',				
			BW: options.serviceurl + 'maptiler/' + 'toner-v2',				
			MARINE: 'https://tiles.marinetraffic.com/ais_helpers/shiptilesingle.aspx?output=png&sat=1&grouping=shiptype&tile_size=256&legends=1&X={x}&Y={y}&zoom={z}',
		};
		
		maplibregl.addProtocol("pmtiles",new pmtiles.Protocol().tile);
        maplibregl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.1/mapbox-gl-rtl-text.js');
		 		
		/* Define Layers */
		this.layerdefs = {
			default:	{ description: 'Default', layer: new L.maplibreGL({ style: this.tiletypes.DEFAULT, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			topo:	{ description: 'Topographic', layer: new L.maplibreGL({ style: this.tiletypes.TOPO, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			satellite:	{ description: 'Satellite Image', layer: new L.maplibreGL({ style: this.tiletypes.SATELLITE, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			grayscale:	{ description: 'Grayscale', layer: new L.maplibreGL({ style: this.tiletypes.GRAYSCALE, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			bw:	{ description: 'Black and White', layer: new L.maplibreGL({ style: this.tiletypes.BW, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			//proto: 		{ description:'Proto', layer: protomaps.leafletLayer({url:'services/protomaps.pmtiles'})},
		};		

		this.vdatalayers = {
			shippinglanes: {id: 'shippinglanes', url: 'pmtiles://services/data/shippinglanes.pmtiles', type: 'vector', sourcelayer: 'Shipping_Lanes_v1', paintrules: { 'line-color': '#1a3d68', 'line-width': 3, 'line-opacity': 0.1 }, layertype: 'line'},
			railroads: {id: 'railroads', url: 'pmtiles://services/data/railroads.pmtiles', type: 'vector', sourcelayer: 'globalrailways1', paintrules: { 'line-color': '#684519', 'line-width': 1, 'line-opacity': 0.6 }, layertype: 'line'},
			marinetraffic: {id: 'marinetraffic', tiles: this.tiletypes.MARINE, type: 'raster', tileSize: 256, minZoom: 3, maxZoom: 18, paintrules: { 'raster-saturation': -1, 'raster-opacity': 0.75 }, layertype: 'line'}
		};
						  
		/* Styles */
		this.styles = {
			'point': { fillColor: '#eeeeee', color: '#999999', radius: 10, weight: 3, opacity: 1, fillOpacity: 1, fontsize: 9 },
			'disabled': { fillColor: '#eeeeee', color: '#999999', radius: 10, weight: 3, opacity: 1, fillOpacity: 1, fontsize: 9 },			
			'line': { color: '#dddddd', fillColor: '#dddddd', stroke: true, weight: 2, opacity: 0.2, smoothFactor: 1 },
			'arrow': { rotation: 0, width: 8, height: 5, color: '#dddddd', fillColor: '#dddddd', weight: 2, opacity: 0.4, fillOpacity: 1 },
			'live': { rotation: 0, width: 16, height: 10, color: '#dbedf9', fillColor: '#2196F3', weight: 2, opacity: 1, fillOpacity: 1 }	
		};
		this.radius = 10;
		
		// Map configuration
		this.homecontrol = L.Control.zoomHome().addTo(this.map);
		this.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
		this.map.on('popupopen', (e) => { this.PopupOpen(e); });
		this.map.on('popupclose', (e) => { this.PopupClose(e); });
		this.map.on('tooltipopen', (e) => { this.TooltipOpen(e); });
		this.map.on('tooltipclose', (e) => { this.TooltipOpen(e); });
		
		//if (document.body.classList.contains('dark')) { this.baselayer = 'dark'; }	
		this.map.addLayer(this.layerdefs[this.baselayer].layer); 
		
		for (let l in this.layerdefs) {	
			let option = document.createElement('option'); option.value = l; option.textContent = this.layerdefs[l].description; 
			document.getElementById('basemap-chooser').append(option);
		}
		// glMap Setup
		this.glMap = this.layerdefs[this.baselayer].layer._glMap;
		this.glMap.on('load', (e) => { 
			for (let vl in MI.Atlas.vdatalayers) {
				if (MI.Atlas.vdatalayers[vl].type === 'vector' && MI.Atlas.glMap.getSource('mlayer-'+MI.Atlas.vdatalayers[vl].id) === undefined) {
					MI.Atlas.glMap.addSource('mlayer-'+MI.Atlas.vdatalayers[vl].id, {
				      type: 'vector',
				      url: 'pmtiles://services/data/'+MI.Atlas.vdatalayers[vl].id+'.pmtiles'
				  	});	
				} else if (MI.Atlas.vdatalayers[vl].type === 'raster' && MI.Atlas.glMap.getSource('mlayer-'+MI.Atlas.vdatalayers[vl].id) === undefined) {
					MI.Atlas.glMap.addSource('mlayer-'+MI.Atlas.vdatalayers[vl].id, {
						type: 'raster',
						tiles: [MI.Atlas.vdatalayers[vl].tiles],
						tileSize: MI.Atlas.vdatalayers[vl].tileSize
				  	});	
				}
			}
			/* this.glMap.addSource("we-map-1927-source", { "type": "image", "url": "./json/samples/westernelectric/we-map-1927.png", "coordinates": [ [-180, 85], [180, 85], [180, -85], [-180, -85] ] }); this.glMap.addLayer({ "id": "overlay", "source": "we-map-1927-source", "type": "raster", "paint": { "raster-opacity": 1 } }); */
			
			document.getElementById('datalayers').querySelectorAll('input[type=checkbox]').forEach(el => { 
				MI.Atlas.ProcessDataLayerFromElement(el);
			}); 
			MI.Atlas.glMapLoaded = true;
		});		

	}
	
	Refresh() { this.map._renderer._redraw(); }
	
	Play(mode) {
		console.log("play");
		for (let i in MI.Atlas.map._layers) { 
			//console.log(MI.Atlas.map._layers[i]);
			
			if (MI.Atlas.map._layers[i].feature && MI.Atlas.map._layers[i].feature.geometry && MI.Atlas.map._layers[i].feature.geometry.type === 'Point') {
				//MI.Atlas.map._layers[i].setStyle({fillColor: MI.Atlas.map._layers[i].feature.properties.style.highlightColor});		
			
				//console.log(MI.Atlas.map._layers[i].feature);
				MI.Atlas.playlist.list.push(MI.Atlas.map._layers[i]);
			}
		}
		MI.Atlas.playlist.list = MI.Atlas.playlist.list.sort(
		    (p1, p2) => (p1.feature.properties.lid > p2.feature.properties.lid) ? 1 : (p1.feature.properties.lid < p2.feature.properties.lid) ? -1 : 0);
		
		MI.Atlas.playlist.runtime = setInterval(MI.Atlas.PlayStep, 10000, mode);
	}
	PlayStep(mode) {
		if (mode === 'tour') {
			let ft = MI.Atlas.playlist.list[MI.Atlas.playlist.index].feature;
	
			MI.Atlas.map.flyTo(MI.Atlas.GetOffsetLatlng(ft.properties.latlng, 12), 12, {
				animate: true, duration: 5}); 	
			let offset = 0;
			if (document.getElementById('local_'+ft.properties.lid).parentElement) {
				let prev = document.getElementById('local_'+ft.properties.lid).parentElement.previousElementSibling;
				while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
			}
			document.getElementById('sidepanel').scrollTo({left: 0, top: document.getElementById('local_'+ft.properties.lid).offsetTop + (-1*offset), behavior: 'smooth'});	
			
			MI.Atlas.playlist.list[MI.Atlas.playlist.index].setStyle({fillColor: MI.Atlas.playlist.list[MI.Atlas.playlist.index].feature.properties.style.highlightColor});	
		} else { // mode === highlight
			MI.Atlas.playlist.list[MI.Atlas.playlist.index].setStyle({fillColor: MI.Atlas.playlist.list[MI.Atlas.playlist.index].feature.properties.style.highlightColor});	
		}
		MI.Atlas.playlist.index++;
	}
	
	PopupOpen(e) {		
		this.UpdateCluster(document.getElementById('searchbar').value.toLowerCase(), e.popup._source.feature);
		this.SetActivePoint(e.sourceTarget);
		this.map.setView(this.GetOffsetLatlng(e.popup._latlng));

		if (!e.popup._source.feature.properties.angle) { this.MapPointClick(this.active_point); }
		e.popup._source.setStyle({fillColor: e.popup._source.feature.properties.style.highlightColor});				
	}
	
	PopupClose(e) {
		this.SetActivePoint(null); 		
		if (typeof e.popup._source !== 'undefined') {
			if (e.popup._source.feature.properties.type === 'node') {
				e.popup._source.setStyle({fillColor: e.popup._source.feature.properties.style.fillColor});		
			}
		}
	}
	
	TooltipOpen(e) { }
	TooltipClose(e) { }
	
	TagClick(id, lat, lng) {
		MI.Atlas.PointFocus(id); 
		MI.Atlas.map.setView(MI.Atlas.GetOffsetLatlng(new L.LatLng(lat,lng), 16), 16);
	}
	
	RenderIntro(feature, layer) {		
		let bgimg = MI.Atlas.GetTileImage(feature.properties.latlng.lat, feature.properties.latlng.lng, 13);
		let popupContent, fid = feature.properties.lid;		
				
		popupContent = `
		<h2 id="popup-${fid}" class="poptitle">
			<div id="intro-logo" onclick="MI.Atlas.TagClick(${fid},${feature.properties.latlng.lat},${feature.properties.latlng.lng});"></div> 
			<span onclick="MI.Atlas.MapPointClick(${fid});">Manifest</span>
		</h2>
		<div id="intro-version">v${mversion}</div>
		<div id="intro-content">
		
		<div id="intro-main">
		
		<p>${MI.Atlas.PopMLink(ManifestUtilities.Linkify(feature.properties.description))}</p>		
		</div>
		<div id="intro-readme"><div id="intro-content-log">${MI.Util.markdowner.makeHtml(MI.changelog)}</div></div>
		</div>`;
		layer.bindPopup(popupContent, { className: 'pop-intro'});
		
		layer.on('click', (e) => { let toolTip = layer.getTooltip(); if (toolTip) { layer.closeTooltip(toolTip);} });		
		layer.on('mouseover', (e, l=layer, f=feature) => { MI.Atlas.PointMouseOver(e, l, f); });
		layer.on('mouseout', (e, l=layer, f=feature) => { MI.Atlas.PointMouseOut(e, l, f); });	
		
		layer.setStyle(feature.properties.style); 	
		MI.Atlas.MeasureSort(feature, layer);
	}
	
	/** Render points by setting up a GeoJSON feature for display **/
	RenderPoint(feature, layer) {
		if (feature.properties.lid === 10292612160000) { MI.Atlas.RenderIntro(feature, layer); return; }
		
		let bgimg = MI.Atlas.GetTileImage(feature.properties.latlng.lat, feature.properties.latlng.lng, 13);
		let popupContent, tooltipTitle, fid = feature.properties.lid;

		popupContent = `
		<h2 id="popup-${fid}" class="poptitle" style="background: url('${bgimg}') ${feature.properties.style.fillColor}; color:${feature.properties.style.textColor};">
			<i class="fas fa-tag" onclick="MI.Atlas.TagClick(${fid},${feature.properties.latlng.lat},${feature.properties.latlng.lng});"></i> 
			<span onclick="MI.Atlas.MapPointClick(${fid});">${feature.properties.title}</span>
		</h2>
		<p>${MI.Atlas.PopMLink(ManifestUtilities.Linkify(feature.properties.description))}</p>`;
	
		if (feature.properties.clustered.length > 0) {
			let fts = [feature].concat(feature.properties.clustered);
			fts.sort((a, b) => (a.properties.lid > b.properties.lid) ? 1 : -1);
			let bg = 'linear-gradient(90deg, ' + fts.map((f, i, fts) => f.properties.style.fillColor + ' ' + 100*(i/fts.length) + '%' ).join(', ') + ')';
			popupContent = `
			<h2 id="popup-cluster" class="poptitle cluster" style="background: url('${bgimg}'), ${bg}; color: ${fts[0].properties.style.textColor}">
				<i class="fas fa-th"></i> Cluster of <span id="cluster-count" class="cluster-count">${feature.properties.clustered.length+1}</span> Nodes
			</h2>`;
			
			for (let ft of fts) {
				popupContent += `
				<div id="popup-${ft.properties.lid}" class="popuplink clusterbox">
					<h2 style="background: ${ft.properties.style.textColor}; color: ${ft.properties.style.fillColor}">
						<i class="fas fa-tag" onclick="MI.Atlas.TagClick(${ft.properties.lid},${ft.properties.latlng.lat},${ft.properties.latlng.lng});"></i> 
						<span onclick="MI.Atlas.MapPointClick(${ft.properties.lid});">${ft.properties.title}</span>
					</h2>
					<p class="closed">${ft.properties.category} | ${ft.properties.placename}</p>
					<p>${MI.Atlas.PopMLink(ManifestUtilities.Linkify(ft.properties.description))}</p>
				</div>`;
			}
		} 	
		layer.bindPopup(popupContent);

		if (feature.properties.clustered.length > 0) { tooltipTitle = '<i class="fas fa-boxes"></i> Cluster of '+(feature.properties.clustered.length+1)+' Nodes'; }
		else { tooltipTitle = feature.properties.title; }
		let tooltipContent = `<div id="tooltip-${fid}" class="mtooltip" style="background: ${feature.properties.style.color}; color: ${feature.properties.style.darkColor}">${tooltipTitle}</div>`;
		layer.bindTooltip(tooltipContent);	
		
		layer.on('click', (e) => { let toolTip = layer.getTooltip(); if (toolTip) { layer.closeTooltip(toolTip);} });		
		layer.on('mouseover', (e, l=layer, f=feature) => { MI.Atlas.PointMouseOver(e, l, f); });
		layer.on('mouseout', (e, l=layer, f=feature) => { MI.Atlas.PointMouseOut(e, l, f); });	
		
		layer.setStyle(feature.properties.style); 	
		MI.Atlas.MeasureSort(feature, layer);
	}
	PopMLink(str) { return str.replaceAll('class="manifest-link"','class="manifest-link" onclick="MI.Interface.Link(event.target.href, event);"'); }

	/** Render lines by setting up a GeoJSON feature for display **/
	RenderLine(feature, layer) {		
		let title = feature.properties.title === 'Node' ? '' : feature.properties.title, fid = feature.properties.lid;
		if (title !== '') {
			let popupContent = `
			<h2 id="popup-${fid}" class="popuphop" style="background: ${feature.properties.style.fillColor}; color: ${feature.properties.style.color}">${title.split('|').join('<br/><i class="fas fa-chevron-down"></i><br/>')}</h2>`;
			let tooltipContent = `<div id="tooltip-${fid}" class="mtooltip" style="background: ${feature.properties.style.fillColor}; color: ${feature.properties.style.color}">${title.split('|').join('<br/><i class="fas fa-chevron-down"></i><br/>')}</div>`;
			layer.bindTooltip(tooltipContent);
			//layer.bindPopup(popupContent);
		}	
	}

	/** Focus on a point on the map and open its popup. **/
	PointFocus(pid, fit=false, flyto=false) {	
		for (let i in this.map._layers) {		
			if (typeof this.map._layers[i].feature !== 'undefined') {			
				if (flyto) { 
					this.map._layers[i].setStyle({
						fillColor: this.map._layers[i].feature.properties.style.fillColor, 
						color: this.map._layers[i].feature.properties.style.color});		
				}
				if (this.map._layers[i].feature.properties.lid === Number(pid)) {		
					if (MI.Visualization.type === 'map') { 
						this.SetActivePoint(this.map._layers[i]); 
						
						if (fit) { 
							let sid = MI.supplychains[this.map._layers[i].feature.properties.mindex-1].details.id;
							let mlayer = MI.Atlas.maplayer.find(function(e) { return e.id === this.id; }, {id: sid});
							let zoomlevel = MI.options.storyMap ? 10 : this.map._getBoundsCenterZoom(mlayer.points.getBounds()).zoom+1;
							this.map.setView(this.GetOffsetLatlng(this.map._layers[i]._latlng), zoomlevel, {reset: true}); 
							
						}
						if (flyto) {
							this.map.flyTo(this.GetOffsetLatlng(this.map._layers[i]._latlng), 12); 		
							this.SetActivePoint({_latlng: this.map._layers[i].feature.properties.latlng}); 
							this.map._layers[i].setStyle({fillColor: this.map._layers[i].feature.properties.style.highlightColor});			
								
						} else {
							if (MI.options.storyMap && this.map.getZoom !== 10) { 
								if (this.map.getBounds().contains(this.map._layers[i]._latlng)) {
									this.map.flyTo(this.GetOffsetLatlng(this.map._layers[i]._latlng), 10, {duration: 1}); 		
								} else {
									this.map.setView(this.GetOffsetLatlng(this.map._layers[i]._latlng), 10, {reset: true}); 
								}
							} else {								
								this.map._layers[i].openPopup(); 
							}
						}
					}
				}
			} 
		} 
		if (document.getElementById('searchbar').value !== '' || document.getElementById('supplycategories').querySelectorAll('.supplycat input:not(:checked)').length > 0) {
			 this.UpdateCluster(document.getElementById('searchbar').value.toLowerCase()); 
		}
	}
	
	/** The UI side of the focus function, scrolls the user interface to a point based on map (or functional) action **/
	MapPointClick(node, speed='smooth') {
		if (node === null) { return; }
		let id = null;		
		
		if (typeof node === 'object') { id = node._popup._source.feature.properties.lid; 
		} else { id = node; if (document.getElementById('local_'+id)) { MI.Atlas.PointFocus(id); /* replacing: document.getElementById('local_'+id).click();*/ } else { return; } }
	
		let offset = 0;
		
		if (document.getElementById('local_'+id) && document.getElementById('local_'+id).parentElement) {
			let prev = document.getElementById('local_'+id).parentElement.previousElementSibling;
			while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
		} else { MI.Atlas.active_point.closePopup(); return;}
		
		if (!MI.initialized) {
			document.getElementById('sidepanel').scrollTo({left: 0, top: 0, behavior: speed});	
		} else {
			document.getElementById('sidepanel').scrollTo({left: 0, top: document.getElementById('local_'+id).offsetTop + (-1*offset), behavior: speed});	
		}
	}
	
	PointMouseOver(e, layer, feature) { 
		layer.setStyle({fillColor: layer.feature.properties.style.highlightColor}); 
		
		if (MI.options.hoverHighlight) {
		for (let l in MI.Atlas.map._layers) {
			if (MI.Atlas.map._layers[l].feature && typeof MI.Atlas.map._layers[l].feature.properties.connections === 'undefined' &&
				MI.Atlas.map._layers[l].feature.properties.lid !== feature.properties.lid) {
					if (!(this.active_point) || (this.active_point && 
						MI.Atlas.map._layers[l].feature.properties.lid !== this.active_point._popup._source.feature.properties.lid)) { 
							MI.Atlas.map._layers[l].setStyle({fillOpacity:0.5, opacity:0.5});
					}
			} else if (MI.Atlas.map._layers[l].feature && MI.Atlas.map._layers[l].feature.properties.connections && 
						MI.Atlas.map._layers[l].feature.properties.connections.from.properties.lid !== feature.properties.lid && 
						MI.Atlas.map._layers[l].feature.properties.connections.to.properties.lid !== feature.properties.lid) {
					MI.Atlas.map._layers[l].setStyle({fillOpacity:0.1, opacity:0.1});
				}
		}}
		if (feature.properties.clustered.length > 0) {
			let ccount = 0;
			const measuretype = document.getElementById('measure-choices').value;
			let measuretotal = 0;
			let tooltipDynamic = '';
			
			if (measuretype !== 'none' && measuretype !== 'starttime' && measuretype !== 'endtime') {
				let findmeasure = feature.properties.measures.find(m => m.mtype === measuretype);				
				if (findmeasure && findmeasure.mvalue !== '') { 
					measuretotal += Number(findmeasure.mvalue);
					let measureround = (Math.round((measuretotal + Number.EPSILON) * 100) / 100);
					measureround = (measureround === 0) ? ' > 0.01' : measureround; 
					tooltipDynamic = '('+measureround+findmeasure.munit+' total)'; 
				}
			}
			
			if (!feature.properties.hidden) { ccount++; }
			for (let i in feature.properties.clustered) { if (!feature.properties.clustered[i].properties.hidden) { 
				ccount++; 
				if (measuretype !== 'none' && measuretype !== 'starttime' && measuretype !== 'endtime') {
					let findmeasure = feature.properties.clustered[i].properties.measures.find(m => m.mtype === measuretype);
					if (findmeasure && findmeasure.mvalue !== '') { 
						measuretotal += Number(findmeasure.mvalue);
						let measureround = (Math.round((measuretotal + Number.EPSILON) * 100) / 100);						
						measureround = (measureround === 0) ? ' > 0.01' : measureround; 
						tooltipDynamic = '('+measureround+findmeasure.munit+' total)'; 
					}
				}
			} }
				let tooltipContent = `<div id="tooltip-${feature.properties.lid}" class="mtooltip" style="background: ${feature.properties.style.color}; color: ${feature.properties.style.darkColor}"><i class="fas fa-boxes"></i> Cluster of ${ccount} Nodes ${tooltipDynamic}</div>`;
			layer.setTooltipContent(tooltipContent);	
		} else {
			const measuretype = document.getElementById('measure-choices').value;	
			let tooltipTitle = feature.properties.title; 
			let tooltipDynamic = '';
			if (measuretype !== 'none' && measuretype !== 'starttime' && measuretype !== 'endtime') {
				let findmeasure = feature.properties.measures.find(m => m.mtype === measuretype);
				if (findmeasure && findmeasure.mvalue !== '') { 
					let measureround = (Math.round((Number(findmeasure.mvalue) + Number.EPSILON) * 100) / 100);
					measureround = (measureround === 0) ? ' > 0.01' : measureround; 
					tooltipDynamic = '('+measureround+findmeasure.munit+')'; 
				}
			}
			let tooltipContent = `<div id="tooltip-${feature.properties.lid}" class="mtooltip" style="background: ${feature.properties.style.color}; color: ${feature.properties.style.darkColor}">${tooltipTitle} ${tooltipDynamic}</div>`;
			layer.bindTooltip(tooltipContent);	
		}		
	}
	
	PointMouseOut(e, layer, feature) { 
		layer.setStyle({fillColor: layer.feature.properties.style.fillColor, color: layer.feature.properties.style.color});
		if (this.active_point !== null && typeof this.active_point._popup !== 'undefined') {
			if (this.active_point._popup._source._leaflet_id === e.sourceTarget._leaflet_id) {
				if (!feature.properties.hidden) { layer.setStyle({fillColor: layer.feature.properties.style.highlightColor}); }
			}
		}
		if (MI.options.hoverHighlight) {
		for (let l in MI.Atlas.map._layers) {
			if (MI.Atlas.map._layers[l].feature && typeof MI.Atlas.map._layers[l].feature.properties.connections === 'undefined') {
				MI.Atlas.map._layers[l].setStyle({fillOpacity:1, opacity:1});
			} else if (MI.Atlas.map._layers[l].feature && MI.Atlas.map._layers[l].feature.properties.connections) {
				if (MI.Atlas.map._layers[l].feature.properties.angle) {
					MI.Atlas.map._layers[l].setStyle({fillOpacity:1, opacity:1});
				} else {
					MI.Atlas.map._layers[l].setStyle({opacity:0.2});
				}
			}
		}}
	}	
	
	/** Scales the map based on selected measure **/
	MeasureSort(ft, layer) {
		const measureSort = document.getElementById('measure-choices').value;
	
		if (ft && layer) {
			//let newStyle = this.GetScaledProperties(ft, measureSort);
			//let newRadius = newStyle.radius; 
			//let newFill = newStyle.disabled ? MI.Atlas.styles.disabled.fillColor : ''; let newColor = newStyle.disabled ? MI.Atlas.styles.disabled.color : '';
			let newRadius = this.GetScaledRadius(ft, measureSort);
			layer.setStyle({ radius: newRadius }); return;
		}
		for (let l in this.map._layers) {
			if (this.map._layers[l].feature && this.map._layers[l].feature.properties.type === 'node') {
				let newRadius = this.GetScaledRadius(this.map._layers[l].feature, measureSort);
				this.map._layers[l].setStyle({ radius: newRadius });
			}
		}
		MI.Visualization.Update();
		this.Refresh();
	}
	
	UpdateCluster(s, ft) {
		if (!ft && !MI.Atlas.active_point || MI.Visualization.type !== 'map') { return; } else { if (!ft && MI.Atlas.active_point._popup._source) { ft = MI.Atlas.active_point._popup._source.feature; }}	
		let ccount = 0, maxcount = 1;
		
		let closedcats = [];
		document.getElementById('supplycategories').querySelectorAll('.supplycat input').forEach(el => { if (!el.checked) { closedcats.push(el.value.split('-')[1]); }});
		document.getElementById('map').querySelectorAll('.clusterbox').forEach(el => { 
			let text = el.textContent.toLowerCase();
	        if (text.indexOf(s) !== -1 && !(closedcats.some(text.includes.bind(text)))) { el.style.display = 'block'; } else { el.style.display = 'none'; }		
	    });	
				
		if (!ft.properties.hidden) { ccount++; }
		for (let i in ft.properties.clustered) { if (!ft.properties.clustered[i].properties.hidden) { ccount++; } maxcount++; }

		if (ccount === 0) { MI.Atlas.active_point.closePopup(); return; }
		else if (ccount === maxcount) { document.getElementById('map').querySelectorAll('.cluster-count').forEach(el => { el.textContent = maxcount; }); } 
		else { document.getElementById('map').querySelectorAll('.cluster-count').forEach(el => { el.textContent = ccount+'/'+maxcount; }); }
		if (this.active_point) { this.MapPointClick(this.active_point); }
		
	}
	GetOffsetLatlng(ll, z=0) {
		let targetPoint;
		if (z === 0) { z = this.map.getZoom(); }
		if (MI.Interface.IsMobile()) {
			targetPoint = this.map.project(ll, z).add([0, document.getElementById('sidepanel').offsetHeight/2]);
		    return this.map.unproject(targetPoint, z);
		} else if (!document.body.classList.contains('fullscreen') && !MI.options.storyMap) {	
			targetPoint = this.map.project(ll, z).subtract([document.getElementById('sidepanel').offsetWidth/2,0]);
		   return this.map.unproject(targetPoint, z);			
		} else {
			return ll;
		}	
	}
	
	SetActivePoint(pt, clear=false) {
		if (clear === true) {
			if (this.active_point !== null && this.active_point.closePopup) { this.active_point.closePopup(); } 
			return null;
		} else {
			if (pt) {
				this.active_point = pt;
				let latlng = pt._latlng ? pt._latlng : pt._popup._latlng;
				this.homecontrol.setHomeCoordinates(this.GetOffsetLatlng(latlng, 3));
			}
			else {
				this.active_point = null;
				this.homecontrol.setHomeCoordinates(new L.LatLng(MI.options.position.lat,MI.options.position.lng));		
			}	
			return this.active_point;
		}
	}
	
	/** A centering function that focuses on the first point of a supply chain **/
	SetView(type='interest', init=false) {
		if (type === 'interest') {
			let index = MI.initialized ? document.getElementsByClassName('mlist').length-1 : 0;
			const mlistId = document.getElementsByClassName('mlist')[index].id.split('-')[1];
			const nodeId = document.getElementsByClassName('mlist')[index].childNodes[0].id.split('_')[1];

			if (MI.Visualization.type === 'map') {
				if (!MI.options.storyMap) {
					MI.Atlas.PointFocus(nodeId, true);	
				}
			}	
			else if (MI.Visualization.type === 'textview') {
				MI.Interface.ShowHeader(mlistId);
			}	
		} else if (type === 'center') {
			MI.Atlas.map.setView(this.GetOffsetLatlng(new L.LatLng(MI.options.position.lat,MI.options.position.lng)), MI.options.zoom); 
		}
	}
	
	DisplayLayers(show=true) {
		if (show) {   
			document.getElementById('map').querySelectorAll('.leaflet-overlay-pane, .leaflet-control-container').forEach(el => { el.classList.remove('closed'); }); 
			document.getElementById('mapcapture').classList.remove('closed'); }
		else { if (this.active_point !== null && this.active_point.closePopup) { this.active_point.closePopup(); } 
			document.getElementById('map').querySelectorAll('.leaflet-overlay-pane, .leaflet-control-container').forEach(el => { el.classList.add('closed'); }); 
			document.getElementById('mapcapture').classList.add('closed'); }	
		this.Refresh();
	}
	GetRadius(ft, cluster=true) {
		if (cluster) { return Math.min(ft.properties.clustered.length*5+this.radius,30); } else { return this.radius; }
	}
	
	GetScaledRadius(ft, measureSort) {
		let newRadius = this.GetRadius(ft, measureSort === 'none');
		if (ft.properties.measures.some(m => m.mtype === measureSort)) {
			const measureVal = ft.properties.measures.filter(m => { return m.mtype === measureSort; }).pop().mvalue;
			const measureMax = MI.supplychains[ft.properties.index].details.measures[measureSort].max;				
			newRadius = Math.max((MI.Atlas.styles.point.radius - 2), (this.GetRadius(ft, measureSort === 'none') / 2) + 40 * (measureVal / measureMax));				
		}
		return newRadius;
	}
	
	GetScaledProperties(ft, measureSort) {
		let newRadius = this.GetRadius(ft, measureSort === 'none');
		let propMatch = false;
		if (ft.properties.measures.some(m => m.mtype === measureSort)) {
			const measureVal = ft.properties.measures.filter(m => { return m.mtype === measureSort; }).pop().mvalue;
			const measureMax = MI.supplychains[ft.properties.index].details.measures[measureSort].max;				
			newRadius = Math.max((MI.Atlas.styles.point.radius - 2), (this.GetRadius(ft, measureSort === 'none') / 2) + 40 * (measureVal / measureMax));	
			propMatch = true;			
		}
		return {radius: newRadius, disabled: !propMatch};
	}
	
	SwitchBasemap(map, tile) {
		let style = MI.Atlas.tiletypes[tile.toUpperCase()];
		let def = MI.Atlas.layerdefs[tile.toLowerCase()];
		
		if (MI.Atlas.glMapLoaded) {
		    const layers = map.getStyle().layers;
		    const sources = map.getStyle().sources;
		    const filteredLayers = layers.filter(obj => { return obj.source !== undefined ? obj.source.includes('mlayer-') : false; });

			const filteredSources = {};
			for (let src of (Object.keys(sources))) { if (src.substr(0, 6) === 'mlayer') { filteredSources[src] = sources[src]; }}
	
		    fetch(style).then(r => r.json()).then(s => {
		        const newStyle = s;
		        newStyle.layers = [...newStyle.layers, ...filteredLayers];
		        newStyle.sources = Object.assign(newStyle.sources, filteredSources); 
		        map.setStyle(newStyle);
				document.getElementById('map').querySelectorAll('.leaflet-control-attribution').forEach(el => { el.innerHTML = def.layer.options.attribution; });
			});
		}
	}
	
	ProcessDataLayerFromElement(el, clear=false) {
		if (el.classList.contains('vector')) {
			if (el.checked && MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id) === undefined) { 		
				MI.Atlas.glMap.addLayer({
					'id': MI.Atlas.vdatalayers[el.value].id,
					'type': MI.Atlas.vdatalayers[el.value].layertype,
					'source': 'mlayer-'+MI.Atlas.vdatalayers[el.value].id,
					'source-layer': MI.Atlas.vdatalayers[el.value].sourcelayer,
					'paint': MI.Atlas.vdatalayers[el.value].paintrules
				});	
			} 
			else { 
				if ( MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id) !== undefined) { MI.Atlas.glMap.removeLayer(MI.Atlas.vdatalayers[el.value].id); } } 
		} else if (el.classList.contains('geojson')) {
			if (el.checked && MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id+'-point') === undefined && 
				MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id+'-line') === undefined &&
				MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id+'-poly') === undefined) { 	
					MI.Atlas.glMap.addLayer({
						'id': MI.Atlas.vdatalayers[el.value].id+'-point',
						'type': 'circle',
						'source': 'mlayer-'+MI.Atlas.vdatalayers[el.value].id,
						'paint': {'circle-radius': 4, 'circle-stroke-width': 2, 'circle-color': '#ff69b4', 'circle-stroke-color': 'white' },
						'filter': ['==', '$type', 'Point']
					});	
				
					MI.Atlas.glMap.addLayer({
						'id': MI.Atlas.vdatalayers[el.value].id+'-line',
						'type': 'line',
						'source': 'mlayer-'+MI.Atlas.vdatalayers[el.value].id,
						'paint': { 'line-color': '#ff69b4', 'line-width': 2 },
						'filter': ['==', '$type', 'LineString']
					});	
				
					MI.Atlas.glMap.addLayer({
						'id': MI.Atlas.vdatalayers[el.value].id+'-poly',
						'type': 'fill',
						'source': 'mlayer-'+MI.Atlas.vdatalayers[el.value].id,
						'paint': { "fill-color": "#ff69b4" },
						'filter': ['==', '$type', 'Polygon']
					});	
			} 
			else { if ( MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id+'-point') !== undefined || 
					 MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id+'-line') !== undefined ||
					 MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id+'-poly') !== undefined) { 
						 
					 MI.Atlas.glMap.removeLayer(MI.Atlas.vdatalayers[el.value].id+'-point'); 
					 MI.Atlas.glMap.removeLayer(MI.Atlas.vdatalayers[el.value].id+'-line'); 
					 MI.Atlas.glMap.removeLayer(MI.Atlas.vdatalayers[el.value].id+'-poly'); 
				} 
			} 
		} else {
			if (el.checked && MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id) === undefined) { 		
				MI.Atlas.glMap.addLayer({
					'id': MI.Atlas.vdatalayers[el.value].id,
					'type': 'raster',
					'source': 'mlayer-'+MI.Atlas.vdatalayers[el.value].id,
					'paint': MI.Atlas.vdatalayers[el.value].paintrules,
					'minzoom': MI.Atlas.vdatalayers[el.value].minZoom,
					'maxzoom': MI.Atlas.vdatalayers[el.value].maxZoom
				});	
			} 
			else { if ( MI.Atlas.glMap.getLayer(MI.Atlas.vdatalayers[el.value].id) !== undefined) { MI.Atlas.glMap.removeLayer(MI.Atlas.vdatalayers[el.value].id); } } 
		}
	}
	LoadExternalDataLayer(type, ref) {
		switch(type) {
			case 'geojson': fetch(ref).then(r => r.json()).then(geojson => MI.Atlas._addGeojson(geojson,ref)); break;
			case 'pmtiles': 
				const p = new pmtiles.PMTiles(ref);
				p.getMetadata().then(h => {					
					for (let l in h.tilestats.layers) {		
						let ltype = l.geometry === 'LineString' ? 'line' : 'fill';
						let lpaint = ltype === 'line' ? { 'line-color': '#ff69b4', 'line-width': 2 } : { "fill-color": "#ff69b4" };
						MI.Atlas._addPMTile(h.tilestats.layers[l], h.tilestats.layers[l].layer+'-'+l, ref, ltype, lpaint);
						
					}
				}); break;
		}	
	}
	_addPMTile(l, id, ref, type, paint) {
		if (MI.Atlas.glMap.getSource('mlayer-'+'udl_'+id) === undefined) {
			MI.Atlas.vdatalayers['udl_'+id] = {id: 'udl_'+id, url: 'pmtiles://'+ref, type: 'vector', layertype: type, sourcelayer: l.layer, paintrules: paint};			
			MI.Atlas.glMap.addSource('mlayer-'+'udl_'+id, { type: 'vector', url: "pmtiles://"+ref });
		
			let dlayer = document.createElement('div'), dcontainer = document.createElement('label'), dcheck = document.createElement('input');
			dlayer.classList.add('layerrow'); dcontainer.classList.add('layercontainer'); dcontainer.innerHTML = `<span class="layercheckmark"><i class="fas"></i></span> ${id}`;
			dcheck.type = 'checkbox'; dcheck.checked = true; dcheck.id = 'udl_'+id; dcheck.value = 'udl_'+id; dcheck.classList.add('vector');

			dcheck.addEventListener('click', (e) => { MI.Atlas.ProcessDataLayerFromElement(dcheck);});		
			document.getElementById('userdatalayers').appendChild(dlayer); dlayer.appendChild(dcontainer); dcontainer.prepend(dcheck); 
		
			if (MI.Atlas.glMapLoaded) {MI.Atlas.ProcessDataLayerFromElement(dcheck);}
		} else {
			MI.Interface.ShowMessage('Data source already added.');
		}
	}
	_addGeojson(geojson, ref) {
		if (MI.Atlas.glMap.getSource('mlayer-udl_'+ref) === undefined) {
			MI.Atlas.vdatalayers['udl_'+ref] = {id: 'udl_'+ref, data: ref, type: 'geojson', sourcelayer: ref};			
			MI.Atlas.glMap.addSource('mlayer-udl_'+ref, { type: 'geojson', data: geojson });
		
			let dlayer = document.createElement('div'), dcontainer = document.createElement('label'), dcheck = document.createElement('input');
			dlayer.classList.add('layerrow'); dcontainer.classList.add('layercontainer'); dcontainer.innerHTML = `<span class="layercheckmark"><i class="fas"></i></span> ${ref}`;
			dcheck.type = 'checkbox'; dcheck.checked = true; dcheck.id = 'udl_'+ref; dcheck.value = 'udl_'+ref; dcheck.classList.add('geojson');

			dcheck.addEventListener('click', (e) => { MI.Atlas.ProcessDataLayerFromElement(dcheck);});		
			document.getElementById('userdatalayers').appendChild(dlayer); dlayer.appendChild(dcontainer); dcontainer.prepend(dcheck); 
		
			if (MI.Atlas.glMapLoaded) {MI.Atlas.ProcessDataLayerFromElement(dcheck);}
		} else {
			MI.Interface.ShowMessage('Data source already added.');
		}		
	}
	GetTileImage(lat, lon, zoom) {
	    let xtile = parseInt(Math.floor( (lon + 180) / 360 * (1<<zoom) ));
	    let ytile = parseInt(Math.floor( (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * (1<<zoom) ));
		return 'https://api.maptiler.com/maps/toner-v2/'+zoom+'/'+xtile+'/'+ytile+'.png?key=v6o4lBqX0HjNRonNxTdr'; 
	}
	
	/** Cycle through the colors for supply chains randomly **/
	SupplyColor() {
		let copy = this.colorsets.slice(0);
		if (copy.length < 1) { copy = this.colorsets.slice(0); }
		let index = Math.floor(Math.random() * copy.length);
		let item = copy[index];
		copy.splice(index, 1);
		return item;
	}
}