/** Initialize a Spatial Atlas **/
class ManifestAtlas {
	constructor(options) {
		let pop = !(options.mobile) ? true : false;
		this.map = new L.Map('map', { 
			preferCanvas: true, minZoom: 3, maxZoom: 18, worldCopyJump: false, maxBoundsViscosity: 1, center: new L.LatLng(options.position.lat,options.position.lng), maxBounds: new L.LatLngBounds(new L.LatLng(-90, 180), new L.LatLng(90, -180)), zoom: options.zoom, zoomControl: false, scrollWheelZoom: false, smoothSensitivity:1, closePopupOnClick: pop 
		});
		this.maplayer = [];
		this.active_point = null;
		this.homecontrol = null;
		this.glMapLoaded = false;
		this.playlist = {index: 0, list: [], runtime: null};
		
		this.clusterimg = { el: document.createElement('img') }; this.clusterimg.el.src = 'images/markers/cluster.png';
		this.highlightimg = { el: document.createElement('img') }; this.highlightimg.el.src = 'images/markers/star.png';
		this.baselayer = options.map ? options.map : options.darkmode ? 'dark' : 'default';

		this.colorsets = [['#3498DB','#dbedf9', '#dbedf9'],['#FF0080','#f9dbde','#f9dbde'],['#34db77','#dbf9e7','#dbf9e7'],['#ff6500','#f6d0ca','#f6d0ca'],['#4d34db','#dfdbf9','#dfdbf9'],  ['#5E2BFF','#E0D6FF','#E0D6FF'],['#EE4266','#FAC7D2','#FAC7D2'],['#3BCEAC','#CEF3EA','#CEF3EA'],['#00ABE7','#C2EFFF','#C2EFFF'],['#F85A3E','#FEDDD8','#FEDDD8']];
		
		let map_tiler_key = 'v6o4lBqX0HjNRonNxTdr';
		map_tiler_key = '3l62IEM16L7oUgCXLpag';
		
		this.tiletypes = {
			DEFAULT: 'services/maps/maptiler.json',	
			//DEFAULT: 'https://tiles.stadiamaps.com/styles/osm_bright.json',
			//PROTO: 'https://api.protomaps.com/tiles/v2/{z}/{x}/{y}.mvt?key=e66d42174e71874a',
			SATELLITE:  options.serviceurl + 'maptiler/' + 'satellite',
			//ESRI_WORLD: 'services/maps/esri-world-imagery.json',	
			TOPO: options.serviceurl + 'maptiler/' + 'topo-v2',				
			GRAYSCALE: options.serviceurl + 'maptiler/' + 'backdrop',				
			BW: options.serviceurl + 'maptiler/' + 'toner-v2',		
			DARK: options.serviceurl + 'maptiler/' + 'dataviz-dark',		
			MARINE: 'https://tiles.marinetraffic.com/ais_helpers/shiptilesingle.aspx?output=png&sat=1&grouping=shiptype&tile_size=256&legends=1&X={x}&Y={y}&zoom={z}',
		};
		
		maplibregl.addProtocol("pmtiles",new pmtiles.Protocol().tile);
        maplibregl.setRTLTextPlugin('services/maps/mapbox-gl-rtl-text.js');
		 		
		/* Define Layers */
		this.layerdefs = {
			default:	{ description: 'Default', noWrap: true, layer: new L.maplibreGL({  interactive: true, style: this.tiletypes.DEFAULT, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			topo:	{ description: 'Topographic', layer: new L.maplibreGL({ style: this.tiletypes.TOPO, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			satellite:	{ description: 'Satellite Image', layer: new L.maplibreGL({ style: this.tiletypes.SATELLITE, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			grayscale:	{ description: 'Grayscale', layer: new L.maplibreGL({ style: this.tiletypes.GRAYSCALE, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			dark:	{ description: 'Dark', layer: new L.maplibreGL({ style: this.tiletypes.DARK, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			bw:	{ description: 'Black and White', layer: new L.maplibreGL({ style: this.tiletypes.BW, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })},
			//proto: 		{ description:'Proto', layer: protomaps.leafletLayer({url:'services/protomaps.pmtiles'})},
		};		

		this.vdatalayers = {
			shippinglanes: {id: 'shippinglanes', url: 'pmtiles://services/data/shippinglanes.pmtiles', type: 'vector', sourcelayer: 'Shipping_Lanes_v1', paintrules: { 'line-color': '#1a3d68', 'line-width': 3, 'line-opacity': 0.1 }, layertype: 'line'},
			railroads: {id: 'railroads', url: 'pmtiles://services/data/railroads.pmtiles', type: 'vector', sourcelayer: 'globalrailways1', paintrules: { 'line-color': '#684519', 'line-width': 1, 'line-opacity': 0.6 }, layertype: 'line'},
			cables: {id: 'cables', data: 'services/data/cables.geojson', type: 'geojson', sourcelayer: 'cables', paintrules: { "fill-color": "#ff69b4", 'line-color': '#ff69b4', "circle-stroke-color": "#ffffff", 'line-width': 2, 'circle-radius': 4, 'circle-stroke-width': 2 }, layertype: 'line'},
			ais: {id: 'ais', data: 'services/data/ais.geojson', type: 'geojson', sourcelayer: 'cables', paintrules: { "fill-color": "#0096FF", 'line-color': '#0096FF', "circle-stroke-color": "#0047AB", 'line-width': 2, 'circle-radius': 4, 'circle-stroke-width': 2 }, layertype: 'line'}
			//marinetraffic: {id: 'marinetraffic', tiles: this.tiletypes.MARINE, type: 'raster', tileSize: 256, minZoom: 3, maxZoom: 18, paintrules: { 'raster-saturation': -1, 'raster-opacity': 0.75 }, layertype: 'line'}
		};
						  
		/* Styles */
		this.styles = {
			'point': { fillColor: '#eeeeee', color: '#999999', radius: 8, weight: 5, opacity: 1, fillOpacity: 1, fontsize: 9 },			
			'line': { color: '#dddddd', fillColor: '#dddddd', stroke: true, weight: 2, opacity: 0.2, smoothFactor: 1 },
			'arrow': { rotation: 0, width: 8, height: 5, color: '#dddddd', fillColor: '#dddddd', weight: 2, opacity: 0.4, fillOpacity: 1 },
			'live': { rotation: 0, width: 16, height: 10, color: '#dbedf9', fillColor: '#2196F3', weight: 2, opacity: 1, fillOpacity: 1 }	
		};
		this.radius = 10;
		
		// Map configuration
		this.homecontrol = L.Control.zoomHome().addTo(this.map);
		this.map.on('popupopen', (e) => { this.PopupOpen(e); });
		this.map.on('popupclose', (e) => { this.PopupClose(e); });
		this.map.on('tooltipopen', (e) => { this.TooltipOpen(e); });
		this.map.on('tooltipclose', (e) => { this.TooltipClose(e); });
		
		//if (document.body.classList.contains('dark')) { this.baselayer = 'dark'; }	
		this.map.addLayer(this.layerdefs[this.baselayer].layer); 
		
		for (let l in this.layerdefs) {	
			let option = document.createElement('option'); option.value = l; option.textContent = this.layerdefs[l].description; 
			document.getElementById('basemap-chooser').append(option);
		}
		// glMap Setup
		this.glMap = this.layerdefs[this.baselayer].layer.getMaplibreMap();
		this.glMap.on('load', (e) => { 
			for (let vl in MI.Atlas.vdatalayers) {
				if (MI.Atlas.vdatalayers[vl].type === 'vector' && MI.Atlas.glMap.getSource('mlayer-'+MI.Atlas.vdatalayers[vl].id) === undefined) {
					MI.Atlas.glMap.addSource('mlayer-'+MI.Atlas.vdatalayers[vl].id, {
				      type: 'vector',
				      url: 'pmtiles://services/data/'+MI.Atlas.vdatalayers[vl].id+'.pmtiles'
				  	});	
				} else if (MI.Atlas.vdatalayers[vl].type === 'geojson' && MI.Atlas.glMap.getSource('mlayer-'+MI.Atlas.vdatalayers[vl].id) === undefined) {
					MI.Atlas.glMap.addSource('mlayer-'+MI.Atlas.vdatalayers[vl].id, {
				      type: 'geojson',
					  data: MI.Atlas.vdatalayers[vl].data,
				  	});	
				} else if (MI.Atlas.vdatalayers[vl].type === 'raster' && MI.Atlas.glMap.getSource('mlayer-'+MI.Atlas.vdatalayers[vl].id) === undefined) {
					MI.Atlas.glMap.addSource('mlayer-'+MI.Atlas.vdatalayers[vl].id, {
						type: 'raster',
						tiles: [MI.Atlas.vdatalayers[vl].tiles],
						tileSize: MI.Atlas.vdatalayers[vl].tileSize
				  	});	
				}
			}
			
			document.getElementById('datalayers').querySelectorAll('input[type=checkbox]').forEach(el => { 
				MI.Atlas.ProcessDataLayerFromElement(el);
			}); 
			MI.Atlas.glMapLoaded = true;
		});		

	}
	
	Refresh() { this.map._renderer._redraw(); }
	
	
	Play(mode) {
		console.log("Playing Manifest");
		MI.Atlas.BuildPlaylist();
		MI.Atlas.playlist.runtime = setInterval(MI.Atlas.PlayStep, 10000, mode);
	}
	BuildPlaylist() {
		MI.Atlas.playlist.list = [];
		for (let i in MI.Atlas.map._layers) { 			
			if (MI.Atlas.map._layers[i].feature && MI.Atlas.map._layers[i].feature.geometry && MI.Atlas.map._layers[i].feature.properties.type === 'node') {
				//MI.Atlas.map._layers[i].setStyle({fillColor: MI.Atlas.map._layers[i].feature.properties.style.highlightColor});					
				MI.Atlas.playlist.list.push(MI.Atlas.map._layers[i]);
			}
		}
		MI.Atlas.playlist.list = MI.Atlas.playlist.list.sort(
		    (p1, p2) => (p1.feature.properties.lid > p2.feature.properties.lid) ? 1 : (p1.feature.properties.lid < p2.feature.properties.lid) ? -1 : 0);		
	}
	PlayStep(mode) {
		if (mode === 'tour') {
			let ft = MI.Atlas.playlist.list[MI.Atlas.playlist.index].feature;
	
			MI.Atlas.map.flyTo(ft.properties.latlng, 12, {
				animate: true, duration: 5}); 	
			let offset = 0;
			if (document.getElementById('node_'+ft.properties.lid).parentElement) {
				let prev = document.getElementById('node_'+ft.properties.lid).parentElement.previousElementSibling;
				while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
			}
			document.getElementById('sidepanel').scrollTo({left: 0, top: document.getElementById('node_'+ft.properties.lid).offsetTop + (-1*offset), behavior: 'smooth'});	
			
			MI.Atlas.playlist.list[MI.Atlas.playlist.index].setStyle({fillColor: MI.Atlas.playlist.list[MI.Atlas.playlist.index].feature.properties.style.highlightColor});	
		} else { // mode === highlight
			MI.Atlas.playlist.list[MI.Atlas.playlist.index].setStyle({fillColor: MI.Atlas.playlist.list[MI.Atlas.playlist.index].feature.properties.style.highlightColor});	
		}
		MI.Atlas.playlist.index++;
	}
	
	PopupOpen(e) {		
		this.UpdateCluster(document.getElementById('searchbar').value.toLowerCase(), e.popup._source.feature);
		
		this.PopupHandlers(e);	
		
		this.SetActivePoint(e.sourceTarget);
		this.map.setView(e.popup._latlng, this.map.getZoom());

		if (!e.popup._source.feature.properties.angle) { this.MapPointClick(this.active_point); }
		
		if (!e.popup._source.feature.properties.disabled) {
			e.popup._source.setStyle({fillColor: e.popup._source.feature.properties.style.highlightColor});	
		}			
	}
	
	PopupHandlers(e) {
		e.popup._contentNode.querySelectorAll('.mpopup').forEach(el => {
			let popup = el;
			let popid = el.id.split('-').pop();

			if (document.getElementById('node_'+popid).querySelectorAll('.node-images.multiple').length !== 0) {
				popup.querySelectorAll('.node-images.multiple')[0].dataset.index = document.getElementById('node_'+popid).querySelectorAll('.node-images.multiple')[0].dataset.index;
				MI.Interface.ImageScroll(popid, 0, document.getElementById('node_'+popid).querySelectorAll('.node-images.multiple')[0].dataset.index, false, popup);
			}
			popup.querySelectorAll('.images-display-left').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); MI.Interface.ImageScroll(el.id.split('_').pop(), -1, false, false, popup); }); });	
			popup.querySelectorAll('.images-display-right').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); MI.Interface.ImageScroll(el.id.split('_').pop(), 1, false, false, popup); }); });	
			popup.querySelectorAll('.images-spot').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); MI.Interface.ImageScroll(e.currentTarget.dataset.lid, 0, e.currentTarget.dataset.index, false, popup); }); });	
			popup.querySelectorAll('.ftimg').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('fullscreen-modal').classList.toggle('closed'); MI.Interface.ModalSet(el); }); });	
		});
			
	}
	
	PopupClose(e) {
		this.SetActivePoint(null); 		
		if (typeof e.popup._source !== 'undefined') {
			if (e.popup._source.feature.properties.type === 'node') {
				if (!e.popup._source.feature.properties.disabled) {
					e.popup._source.setStyle({fillColor: e.popup._source.feature.properties.style.fillColor});		
				}
			}
		}
	}
	
	TooltipOpen(e) { }
	TooltipClose(e) { }
	
	TagClick(id, lat, lng) {
		MI.Atlas.PointFocus(id); 
		MI.Atlas.map.setView(new L.LatLng(lat,lng), 16);
	}
	
	RenderIntro(feature, layer) {		
		let bgimg = MI.Atlas.GetTileImage(feature.properties.latlng.lat, feature.properties.latlng.lng, 13);
		let popupContent, fid = feature.properties.lid;		
				
		popupContent = `<div id="popup-${fid}" class="mpopup">
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
		</div>
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
		let popupContent, fid = feature.properties.lid;

		popupContent = `<div id="popup-${feature.properties.lid}" class="mpopup">
		<h2 id="popup-${fid}" class="poptitle" style="background: url('${bgimg}') ${feature.properties.style.fillColor} center center; color:${feature.properties.style.textColor};">
			<i class="fa-solid fa-circle-dot" onclick="MI.Atlas.TagClick(${fid},${feature.properties.latlng.lat},${feature.properties.latlng.lng});"></i> 
			<span onclick="MI.Atlas.MapPointClick(${fid});">${feature.properties.title}</span>
		</h2>
		<div class="node-images-wrap">
		${feature.properties.images.length !== 0 ? `<div class="node-images ${feature.properties.images.length > 1 ? `multiple` : ''}" ${feature.properties.images.length > 1 ? `data-index="1"` : ''}>
	
			${feature.properties.images.map((img,i) => img.URL ? (img.URL.substring(0,24) === 'https://www.youtube.com/' ? 
			`<iframe class="ftimg" src="${img.URL}?enablejsapi=1&origin=${window.location.origin}&color=white&controls=0" width="560" height="315" ${i !== 0 || feature.properties.mindex !== 1 ? `loading="lazy"` : ''} frameborder="0"></iframe>` : 
			`<img class="ftimg" ${i !== 0 || feature.properties.mindex !== 1 ? `loading="lazy"` : ''} src="${img.URL}" title="${img.caption ? img.caption : feature.properties.title}" alt="${img.caption ? img.caption : feature.properties.title} ${img.caption ? '' : `image`}"/>` ) : '').join('')} 
	
	
		</div>` : ''}

		${feature.properties.images.length > 1 ? 
		`<div class="images-controls">
			<button id="imgbutton-left_${feature.properties.lid}" tabindex="-1" class="images-button images-display-left" title="Left Image Button"><i class="fas fa-caret-left"></i></button>
			<div class="images-box">${(feature.properties.images.map((img,i) => { return `<div class="images-spot ${i === 0 ? `selected`: ''}" data-lid="${feature.properties.lid}" data-index="${Number(i+1)}"><i class="far fa-circle"></i></div>`; })).join('')}</div>
			<button id="imgbutton-right_${feature.properties.lid}" tabindex="-1" class="images-button images-display-right" title="Left Image Button"><i class="fas fa-caret-right"></i></button>
		</div>` : ''}

		${feature.properties.images.length !== 0 ? `<div class="images-caption">${feature.properties.images[0].caption ? feature.properties.images[0].caption : '' }</div>` : ''}
		</div>

		<div class="node-description">${MI.Atlas.PopMLink(ManifestUtilities.Linkify(feature.properties.description))}</>
		</div>`;
	
		if (feature.properties.clustered.length > 0) {
			let fts = [feature].concat(feature.properties.clustered);
			fts.sort((a, b) => (a.properties.lid > b.properties.lid) ? 1 : -1);
			let bg = 'linear-gradient(90deg, ' + fts.map((f, i, fts) => f.properties.style.fillColor + ' ' + 100*(i/fts.length) + '%' ).join(', ') + ')';
			popupContent = `
			<h2 id="popup-cluster" class="poptitle cluster" style="background: url('${bgimg}'), ${bg}; color: ${fts[0].properties.style.textColor}">
				<i class="fas fa-th"></i> Cluster of <span id="cluster-count" class="cluster-count">${feature.properties.clustered.length+1}</span> Nodes
			</h2>`;
			
			for (const ft of fts) {
				popupContent += `
				<div id="popup-${ft.properties.lid}" class="mpopup popuplink clusterbox">
					<h2 style="background: ${ft.properties.style.textColor}; color: ${ft.properties.style.fillColor}">
						<i class="fa-solid fa-circle-dot" onclick="MI.Atlas.TagClick(${ft.properties.lid},${ft.properties.latlng.lat},${ft.properties.latlng.lng});"></i> 
						<span onclick="MI.Atlas.MapPointClick(${ft.properties.lid});">${ft.properties.title}</span>
					</h2>
					<p class="closed">${ft.properties.category} | ${ft.properties.placename}</p>
				
					<div class="node-images-wrap">
					${ft.properties.images.length !== 0 ? `<div class="node-images cluster ${ft.properties.images.length > 1 ? `multiple` : ''}" ${ft.properties.images.length > 1 ? `data-index="1"` : ''}>
		
						${ft.properties.images.map((img,i) => img.URL ? (img.URL.substring(0,24) === 'https://www.youtube.com/' ? 
						`<iframe class="ftimg" src="${img.URL}?enablejsapi=1&origin=${window.location.origin}&color=white&controls=0" width="560" height="315" ${i !== 0 || ft.properties.mindex !== 1 ? `loading="lazy"` : ''} frameborder="0"></iframe>` : 
						`<img class="ftimg" ${i !== 0 || ft.properties.mindex !== 1 ? `loading="lazy"` : ''} src="${img.URL}" title="${img.caption ? img.caption : ft.properties.title}" alt="${img.caption ? img.caption : ft.properties.title} ${img.caption ? '' : `image`}"/>` ) : '').join('')} 
		
		
					</div>` : ''}
	
					${ft.properties.images.length > 1 ? 
					`<div class="images-controls cluster">
						<button id="imgbutton-left_${ft.properties.lid}" tabindex="-1" class="images-button images-display-left" title="Left Image Button"><i class="fas fa-caret-left"></i></button>
						<div class="images-box">${(ft.properties.images.map((img,i) => { return `<div class="images-spot ${i === 0 ? `selected`: ''}" data-lid="${ft.properties.lid}" data-index="${Number(i+1)}"><i class="far fa-circle"></i></div>`; })).join('')}</div>
						<button id="imgbutton-right_${ft.properties.lid}" tabindex="-1" class="images-button images-display-right" title="Left Image Button"><i class="fas fa-caret-right"></i></button>
					</div>` : ''}
	
					${ft.properties.images.length !== 0 ? `<div class="images-caption">${ft.properties.images[0].caption ? ft.properties.images[0].caption : '' }</div>` : ''}
					</div>
	
					<div class="node-description">${MI.Atlas.PopMLink(ManifestUtilities.Linkify(ft.properties.description))}</div>
	
				</div>`;
			}
		} 	
		layer.bindPopup(popupContent);

		layer.bindTooltip('');	
		
		layer.on('click', (e) => { let toolTip = layer.getTooltip(); if (toolTip) { layer.closeTooltip(toolTip);} });		
		layer.on('mouseover', (e, l=layer, f=feature) => { MI.Atlas.PointMouseOver(e, l, f); });
		layer.on('mouseout', (e, l=layer, f=feature) => { MI.Atlas.PointMouseOut(e, l, f); });	
				
		layer.setStyle(feature.properties.style); 	
		if (feature.properties.clustered.length > 0) { 
			layer.setStyle({weight: feature.properties.style.radius * 2, opacity:0.4}); 
		}
		 	
		MI.Atlas.MeasureSort(feature, layer);
	}

	PopMLink(str) { return str.replaceAll('class="manifest-link"','class="manifest-link" onclick="MI.Interface.Link(event.target.href, event);"'); }

	/** Render lines by setting up a GeoJSON feature for display **/
	RenderLine(feature, layer) {		
		let title = feature.properties.title === 'Node' ? '' : feature.properties.title, fid = feature.properties.lid;
		if (title !== '') {
			let popupContent = `
			<h2 id="popup-${fid}" class="popuphop" style="background: ${feature.properties.style.fillColor}; color: ${feature.properties.style.color}">${title.split('|').join('<br/><i class="fas fa-chevron-down"></i><br/>')}</h2>`;
			let tooltipContent = `<div id="tooltip-${fid}" class="mtooltip" style="background: ${feature.properties.style.fillColor}; color: ${MI.options.darkmode ? tinycolor(feature.properties.style.color).lighten(30).toString() : feature.properties.style.color}">${title.split('|').join('<br/><i class="fas fa-chevron-down"></i><br/>')}</div>`;
			layer.bindTooltip(tooltipContent);
			//layer.bindPopup(popupContent);
		}	
	}

	/** Focus on a point on the map and open its popup. **/
	PointFocus(pid, options) {	
		options = Object.assign({}, {fit: false, flyto: false, open: true, zoom:null}, options);
		
		for (let i in this.map._layers) {		
			let l = this.map._layers[i];
			if (typeof l.feature !== 'undefined') {			
				if (typeof l.feature !== 'undefined' && l.feature.properties.lid === Number(pid)) {
					if (MI.Visualization.type === 'map') { 
						this.SetActivePoint(l); 
						if (options.fit && typeof MI.supplychains[l.feature.properties.mindex-1] !== 'undefined') { 
							let sid = MI.supplychains[l.feature.properties.mindex-1].details.id;
							let mlayer = MI.Atlas.maplayer.find(function(e) { return e.id === this.id; }, {id: sid});	
							let zoomlevel = options.zoom ? options.zoom : Math.max(4, this.map._getBoundsCenterZoom(mlayer.points.getBounds()).zoom);
							this.map.setView(l._latlng, zoomlevel, {reset: true, animate:false}); 									
						}
						if (!options.flyto) {
							if (!MI.options.storyMap) { if (options.open) { l.openPopup(); } }
							else {  			
								if (this.map.getBounds().contains(l._latlng)) { this.map.flyTo(l._latlng, this.map.getZoom(), {updateWhenZooming: false, duration: 1});
								} else { this.map.setView(l._latlng, this.map.getZoom(), {animate: false}); }
							}						
						} else {
							if (!MI.options.storyMap) {
								this.map.flyTo(l._latlng, this.map.getZoom()); 		
							} else {
								let sid = MI.supplychains[0].details.id;
								let mlayer = MI.Atlas.maplayer.find(function(e) { return e.id === this.id; }, {id: sid});	
								let offset = l.feature.properties.lid % 2 === 0 ? document.documentElement.clientWidth/4 : document.documentElement.clientWidth/4 * -1;
								let zoomlevel = Math.max(4,MI.options.zoom);
								if (this.map.getZoom() === zoomlevel) { 
									let ll = this.map.unproject(this.map.project(new L.latLng(l._latlng.lat,l._latlng.lng),this.map.getZoom()),this.map.getZoom()); 
									ll = this.map.containerPointToLatLng([this.map.latLngToContainerPoint(ll).x+offset, this.map.latLngToContainerPoint(ll).y]);	
									this.map.flyTo(ll, zoomlevel); 
								} else { 
									this.map._stop(); 
									this.map.setView(l._latlng, zoomlevel, {animate: false}); 
									
									let ll = this.map.unproject(this.map.project(new L.latLng(l._latlng.lat,l._latlng.lng),this.map.getZoom()),this.map.getZoom()); 
									ll = this.map.containerPointToLatLng([this.map.latLngToContainerPoint(ll).x+offset, this.map.latLngToContainerPoint(ll).y]);	
									this.map.flyTo(ll, zoomlevel); 
								}								
							}
							this.SetActivePoint({_latlng: l.feature.properties.latlng}); 
							if (!l.feature.properties.disabled) {							
								l.setStyle({fillColor: l.feature.properties.style.highlightColor});	
							}
						}
						if (MI.options.storyMap || MI.options.embed) { l.bringToFront(); }
					} 
				}
				else if (options.flyto) { 
					if (!l.feature.properties.disabled) {							
						l.setStyle({fillColor: l.feature.properties.style.fillColor, color: l.feature.properties.style.color});
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
		
		if (typeof node === 'object' && node._popup) { 
			id = node._popup._source.feature.properties.lid; 
		} else { id = node; if (document.getElementById('node_'+id)) { MI.Atlas.PointFocus(id); } else { return; } }
	
		let offset = 0;
		
		if (document.getElementById('node_'+id) && document.getElementById('node_'+id).parentElement) {
			let prev = document.getElementById('node_'+id).parentElement.previousElementSibling;
			while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
		} else { MI.Atlas.active_point.closePopup(); return;}
		
		if (!MI.initialized) {
			document.getElementById('sidepanel').scrollTo({left: 0, top: 0, behavior: speed});	
		} else if (!MI.options.embed) {
			document.getElementById('sidepanel').scrollTo({left: 0, top: document.getElementById('node_'+id).offsetTop + (-1*offset), behavior: speed});	
		} else if (MI.options.embed){ 			
			document.getElementsByClassName('mlist')[0].scrollTo({left: document.getElementById('node_'+id).offsetLeft - ManifestUtilities.RemToPixels(1), top: 0, behavior:'instant'});		
		} 
	}
	
	PointMouseOver(e, layer, feature) { 
		if (!layer.feature.properties.disabled) {	
			layer.setStyle({fillColor: layer.feature.properties.style.highlightColor}); 
		}
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
			
			if (!['starttime','endtime','start','end','none'].includes(measuretype)) {
				let findmeasure = feature.properties.measures.find(m => m.GetType() === measuretype);		
				if (findmeasure && findmeasure.GetValue() !== '') { 
					measuretotal += Number(findmeasure.GetValue());
					let measureround = (Math.round((measuretotal + Number.EPSILON) * 100) / 100);
					measureround = (measureround === 0) ? ' > 0.01' : measureround; 
					tooltipDynamic = '('+new Measure(findmeasure.GetType(),measureround,findmeasure.GetUnit()).PrintValue()+findmeasure.PrintUnit()+' total)'; 
				}
			}
			
			if (!feature.properties.hidden) { ccount++; }
			for (let i in feature.properties.clustered) { if (!feature.properties.clustered[i].properties.hidden) { 
				ccount++; 
				if (!['starttime','endtime','start','end','none'].includes(measuretype)) {
					let findmeasure = feature.properties.clustered[i].properties.measures.find(m => m.GetType() === measuretype);
					if (findmeasure && findmeasure.GetValue() !== '') { 
						measuretotal += Number(findmeasure.GetValue());
						let measureround = (Math.round((measuretotal + Number.EPSILON) * 100) / 100);						
						measureround = (measureround === 0) ? ' > 0.01' : measureround; 
						tooltipDynamic = '('+new Measure(findmeasure.GetType(),measureround,findmeasure.GetUnit()).PrintValue()+findmeasure.PrintUnit()+' total)'; 
					}
				}
			} }
			
			let tooltipList = '{'+feature.properties.title;
			for (let i in feature.properties.clustered) { if (!feature.properties.clustered[i].properties.hidden) { 
				tooltipList += ', '+feature.properties.clustered[i].properties.title;	
			} }
			tooltipList += '}';
			
			let tooltipContent = `<div id="tooltip-${feature.properties.lid}" class="mtooltip" style="background: ${feature.properties.style.fillColor}; color: ${feature.properties.style.textColor}"><i class="fas fa-boxes"></i> <strong>Cluster of ${ccount} Nodes</strong> ${tooltipDynamic}<br>${tooltipList}</div>`;
			layer.setTooltipContent(tooltipContent);	
		} else {
			const measuretype = document.getElementById('measure-choices').value;	
			let tooltipTitle = feature.properties.title; 
			let tooltipDynamic = '';
			if (!['starttime','endtime','start','end','none'].includes(measuretype)) {
				let findmeasure = feature.properties.measures.find(m => m.GetType() === measuretype);
				if (findmeasure && findmeasure.GetValue() !== '') { 
					let measureround = (Math.round((Number(findmeasure.GetValue()) + Number.EPSILON) * 100) / 100);
					measureround = (measureround === 0) ? ' > 0.01' : measureround; 
					tooltipDynamic = '('+new Measure(findmeasure.GetType(),measureround,findmeasure.GetUnit()).PrintValue()+findmeasure.PrintUnit()+')'; 
				}
			}
			let tooltipContent = `<div id="tooltip-${feature.properties.lid}" class="mtooltip" style="background: ${feature.properties.style.fillColor}; color: ${feature.properties.style.textColor}">${tooltipTitle} ${tooltipDynamic}</div>`;
			layer.bindTooltip(tooltipContent);	
		}		
	}
	
	PointMouseOut(e, layer, feature) { 
		if (!layer.feature.properties.disabled) {
			layer.setStyle({fillColor: layer.feature.properties.style.fillColor, color: layer.feature.properties.style.color});
		}
		if (this.active_point !== null && typeof this.active_point._popup !== 'undefined') {
			if (this.active_point._popup._source._leaflet_id === e.sourceTarget._leaflet_id) {
				if (!feature.properties.hidden && !feature.properties.disabled) { layer.setStyle({fillColor: layer.feature.properties.style.highlightColor}); }
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
			let newRadius = this.GetScaledRadius(ft, measureSort);
			
			if (measureSort !== 'none' && !(ft.properties.measures.some(m => (m.GetType() === measureSort && m.GetValue() !== 0)))) {
				ft.properties.disabled = true;
				layer.setStyle({fillColor: tinycolor(ft.properties.style.fillColor).lighten(20).toString()}); 
				layer.setStyle({ radius: newRadius }); return;
			} else {
				ft.properties.disabled = false;		
				layer.setStyle(ft.properties.basestyle);
				if (ft.properties.clustered.length > 0) { layer.setStyle({weight: ft.properties.style.radius * 2, opacity:0.4}); }

				if (this.active_point !== null && typeof this.active_point._popup !== 'undefined') {
					if (this.active_point._popup._source.feature.properties.lid === ft.properties.lid) {
						layer.setStyle({fillColor: layer.feature.properties.style.highlightColor}); 
					}
				}
				layer.setStyle({ radius: newRadius });
				layer.bringToFront(); return;
			}
		}

		for (let l in this.map._layers) {			
			if (this.map._layers[l].feature && this.map._layers[l].feature.properties.type === 'node') {
				let newRadius = this.GetScaledRadius(this.map._layers[l].feature, measureSort);
				
				if (measureSort !== 'none' && !(this.map._layers[l].feature.properties.measures.some(m => (m.GetType() === measureSort && m.GetValue() !== 0)))) {
					this.map._layers[l].feature.properties.disabled = true;
					this.map._layers[l].setStyle({fillColor: tinycolor(this.map._layers[l].feature.properties.style.fillColor).lighten(30).toString()});
					this.map._layers[l].setStyle({ radius: newRadius });
					
				} else {
					this.map._layers[l].feature.properties.disabled = false;				
					this.map._layers[l].setStyle(this.map._layers[l].feature.properties.basestyle);
					if (this.map._layers[l].feature.properties.clustered.length > 0) { this.map._layers[l].setStyle({weight: this.map._layers[l].feature.properties.style.radius * 2, opacity:0.4}); }
					
					if (this.active_point !== null && typeof this.active_point._popup !== 'undefined') {
						if (this.active_point._popup._source.feature.properties.lid === this.map._layers[l].feature.properties.lid) {
							this.map._layers[l].setStyle({fillColor: this.map._layers[l].feature.properties.style.highlightColor}); 
						}
					}
					this.map._layers[l].setStyle({ radius: newRadius });
					this.map._layers[l].bringToFront();
				}
				
			}
		}
		MI.Visualization.Update();
		this.Refresh();
	}
	
	UpdateCluster(s, ft) {
		if (!ft && !MI.Atlas.active_point || MI.Visualization.type !== 'map') { return; } else { if (!ft && MI.Atlas.active_point._popup._source) { ft = MI.Atlas.active_point._popup._source.feature; }}	
		let ccount = 0, maxcount = 1;
		
		//let closedcats = [];
		//document.getElementById('supplycategories').querySelectorAll('.supplycat input').forEach(el => { if (!el.checked) { closedcats.push(el.value.split('-')[1]); }});
		//document.getElementById('map').querySelectorAll('.clusterbox').forEach(el => { 
		//	let text = el.textContent.toLowerCase();
	      //  if (text.indexOf(s) !== -1 && !(closedcats.some(text.includes.bind(text)))) { el.style.display = 'block'; } else { el.style.display = 'none'; }		
	    //});	
				
		if (!ft.properties.hidden) { ccount++; }
		for (let i in ft.properties.clustered) { 
			if (!ft.properties.clustered[i].properties.hidden) { 
				ccount++; 
				if (document.getElementById('popup-'+ft.properties.clustered[i].properties.lid)) {
					document.getElementById('popup-'+ft.properties.clustered[i].properties.lid).style.display = 'block'; }
			} 
			else { 
				if (document.getElementById('popup-'+ft.properties.clustered[i].properties.lid)) { 
					document.getElementById('popup-'+ft.properties.clustered[i].properties.lid).style.display = 'none'; } 
			}
			maxcount++; 
		}	

		if (ccount === 0) {  if (MI.Atlas.active_point) { MI.Atlas.active_point.closePopup(); }  return; }
		else if (ccount === maxcount) { document.getElementById('map').querySelectorAll('.cluster-count').forEach(el => { el.textContent = maxcount; }); } 
		else { document.getElementById('map').querySelectorAll('.cluster-count').forEach(el => { el.textContent = ccount+'/'+maxcount; }); }
		if (this.active_point) { this.MapPointClick(this.active_point); }
		
	}
	
	SetActivePoint(pt, clear=false) {
		if (clear === true) {
			if (this.active_point !== null && this.active_point.closePopup) { this.active_point.closePopup(); } 
			return null;
		} else {
			if (pt) {
				this.active_point = pt;
				let latlng = pt._latlng ? pt._latlng : pt._popup._latlng;
				this.homecontrol.setHomeCoordinates(latlng, 3);
			}
			else {
				this.active_point = null;
				this.homecontrol.setHomeCoordinates(new L.LatLng(MI.options.position.lat,MI.options.position.lng));		
			}	
			return this.active_point;
		}
	}
	
	/** A centering function that focuses on the first point of a supply chain **/
	SetView(type='interest', popup=true) {
		if (type === 'interest' || (MI.options.position.lat === 0 && MI.options.position.lng === 0)) {
			let index = MI.initialized ? document.getElementsByClassName('mlist').length-1 : 0;
			const mlistId = document.getElementsByClassName('mlist')[index].id.split('-')[1];
			const nodeId = document.getElementsByClassName('mlist')[index].childNodes[0].id.split('_')[1];

			if (MI.Visualization.type === 'map') { 
				if (MI.options.urlparams.zoom || MI.options.storyMap || (MI.supplychains.length === 1 && MI.supplychains[0].setOptions && MI.supplychains[0].setOptions.zoom)) {
					if (MI.options.storyMap) { 
						let sid = MI.supplychains[0].details.id, ll;
						
						for (let i in this.map._layers) {		
							if (typeof this.map._layers[i].feature !== 'undefined' && this.map._layers[i].feature.properties.lid === Number(nodeId)) {
		
								let eloff = window.innerHeight - document.querySelector('.mdetails').getBoundingClientRect().bottom;
								let offset = (-1 * window.innerHeight/2) + (eloff/2);
								//let offset = document.documentElement.clientHeight/4;

								ll = this.map.unproject(this.map.project(new L.latLng(this.map._layers[i].feature.geometry.coordinates[1],this.map._layers[i].feature.geometry.coordinates[0]),MI.options.zoom),MI.options.zoom); 
			
    							ll = this.map.containerPointToLatLng([this.map.latLngToContainerPoint(ll).x, this.map.latLngToContainerPoint(ll).y+offset]);								
							}
						}
						MI.Atlas.map.setView(ll, MI.options.zoom, {animate: false}); 
					} else { MI.Atlas.PointFocus(nodeId, {fit:true, zoom: MI.options.zoom, open: popup}); }	
				} else { MI.Atlas.PointFocus(nodeId, {fit: true, open: popup}); } 					
			}
		} else if (type === 'center') { MI.Atlas.map.setView(MI.options.position, MI.options.zoom, {animate:false}); }
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

	GetScaledRadius(ft, sort, cluster=true) {
		let measureVal = 0, measureMin = 1, measureMax = 1;
		const measureSort = sort;

		if (ft.properties.measures.some(m => m.GetType() === measureSort)) {
			measureVal += ft.properties.measures.filter(m => { return m.GetType() === measureSort; }).pop().GetValue();
			measureMin = MI.supplychains[ft.properties.index].details.measures[measureSort].min;		
			measureMax = MI.supplychains[ft.properties.index].details.measures[measureSort].max;
		}
		if (cluster && ft.properties.clustered.length > 0) {
			for (let cl of ft.properties.clustered) {
				if (cl.properties.measures.some(m => m.GetType() === measureSort)) {
					measureVal += cl.properties.measures.filter(m => { return m.GetType() === measureSort; }).pop().GetValue();
					measureMin = MI.supplychains[cl.properties.index].details.measures[measureSort].min;		
					measureMax = MI.supplychains[cl.properties.index].details.measures[measureSort].max;
				}
			}
		}
		
		if (measureSort === 'none') { return this.radius; } 
		else { return MI.Atlas._linearScale(measureVal,this.radius,(cluster && ft.properties.clustered.length > 0) ? 30 : 20,measureMin,measureMax); }
	}
	_linearScale(unscaledNum, minAllowed, maxAllowed, min, max) {
	  return Math.max(minAllowed,(maxAllowed - minAllowed) * (unscaledNum - min) / (max - min) + minAllowed || 0);
	}
	
	SwitchBasemap(map, tile) {
		let style = MI.Atlas.tiletypes[tile.toUpperCase()];
		let def = MI.Atlas.layerdefs[tile.toLowerCase()];
		
		if (MI.Atlas.glMapLoaded) {
		    fetch(style).then(r => r.json()).then(s => {
		        const newStyle = s;
			    const layers = map.getStyle().layers;
			    const sources = map.getStyle().sources;
			    const filteredLayers = layers.filter(obj => { return obj.source !== undefined ? obj.source.includes('mlayer-') : false; });

				const filteredSources = {};
				for (let src of (Object.keys(sources))) { if (src.substr(0, 6) === 'mlayer') { filteredSources[src] = sources[src]; }}
	
		        newStyle.layers = [...newStyle.layers, ...filteredLayers];
		        newStyle.sources = Object.assign(newStyle.sources, filteredSources); 
		        map.setStyle(newStyle);
				document.getElementById('map').querySelectorAll('.leaflet-control-attribution').forEach(el => { el.innerHTML = def.layer.options.attribution; });
			});
		}
	}
	
	ProcessDataLayerFromElement(el, clear=false) {
		let dlid = MI.Atlas.vdatalayers[el.value].id;
		
		// Vector Layers
		if (el.classList.contains('vector')) {
			if (el.checked && MI.Atlas.glMap.getLayer(dlid) === undefined) { 		
				MI.Atlas.glMap.addLayer({
					'id': dlid, 'type': MI.Atlas.vdatalayers[el.value].layertype, 'source': 'mlayer-'+dlid, 'source-layer': MI.Atlas.vdatalayers[el.value].sourcelayer, 'paint': MI.Atlas.vdatalayers[el.value].paintrules
				});	
			} 
			else if ( MI.Atlas.glMap.getLayer(dlid) !== undefined) { MI.Atlas.glMap.removeLayer(dlid); }  
		// Geojson Layers
		} else if (el.classList.contains('geojson')) {
			let point = MI.Atlas.glMap.getLayer(dlid+'-point');
			let line = MI.Atlas.glMap.getLayer(dlid+'-line');
			let poly = MI.Atlas.glMap.getLayer(dlid+'-poly');
		
			if (el.checked && point === undefined && line === undefined && poly === undefined) { 	
					MI.Atlas.glMap.addLayer({ 'id': dlid+'-point', 'type': 'circle', 'source': 'mlayer-'+dlid, 'paint': {'circle-radius': MI.Atlas.vdatalayers[el.value].paintrules['circle-radius'], 'circle-stroke-width': MI.Atlas.vdatalayers[el.value].paintrules['circle-stroke-width'], 'circle-color': MI.Atlas.vdatalayers[el.value].paintrules['fill-color'], 'circle-stroke-color': MI.Atlas.vdatalayers[el.value].paintrules['circle-stroke-color'] }, 'filter': ['==', '$type', 'Point'] });				
					MI.Atlas.glMap.addLayer({ 'id': dlid+'-line', 'type': 'line', 'source': 'mlayer-'+dlid, 'paint': { 'line-color': MI.Atlas.vdatalayers[el.value].paintrules['line-color'], 'line-width': MI.Atlas.vdatalayers[el.value].paintrules['line-width'] }, 'filter': ['==', '$type', 'LineString'] });				
					MI.Atlas.glMap.addLayer({ 'id': dlid+'-poly', 'type': 'fill', 'source': 'mlayer-'+dlid, 'paint': { "fill-color": MI.Atlas.vdatalayers[el.value].paintrules['fill-color'] }, 'filter': ['==', '$type', 'Polygon'] });
					// @TODO adding interactivity to geojson (see _onMouseMove in leaflet.js)

			        MI.Atlas.glMap.on('mouseenter', dlid+'-point', (e) => {
			            const coordinates = e.features[0].geometry.coordinates.slice();
			            const description = e.features[0].properties.name;
						const pos = MI.Atlas.map.latLngToContainerPoint(new L.LatLng(coordinates[1],coordinates[0]));
						if (description !== '') {
							const tooltip = document.createElement("div");
							tooltip.id = 'tooltip-geojson'; tooltip.classList.add('mtooltip'); tooltip.style.top = pos.y+'px'; tooltip.style.left = pos.x+10+'px'; 
							tooltip.textContent = e.features[0].properties.name;
							document.getElementById('map').appendChild(tooltip);
						}
			        });

			        MI.Atlas.glMap.on('mouseleave', dlid+'-point', () => {
						if (document.getElementById('tooltip-geojson')) {
			           		document.getElementById('tooltip-geojson').remove();
						}
			        });
					/*
					if (!MI.Atlas.glMap.hasImage('boat')) {
						MI.Atlas.glMap.loadImage('https://hockbook.local/Manifest/dist/images/markers/boat-angle.png', function(error, image) {
							if (error) { throw error; }
							MI.Atlas.glMap.addImage('boat', image); 
							MI.Atlas.glMap.addLayer({ 'id': dlid+'-point', 'type': 'symbol', 'source': 'mlayer-'+dlid, 'layout': { 'icon-image': 'boat', 'icon-size': 0.15, 'icon-rotate': ['get', 'heading'] }, 'filter': ['==', '$type', 'Point']});
						});
					} else {
						MI.Atlas.glMap.addLayer({ 'id': dlid+'-point', 'type': 'symbol', 'source': 'mlayer-'+dlid, 'layout': { 'icon-image': 'boat', 'icon-size': 0.15, 'icon-rotate': ['get', 'heading'] }, 'filter': ['==', '$type', 'Point']});
					}*/
			} 
			else if ( point !== undefined || line !== undefined || poly !== undefined) {			 
				MI.Atlas.glMap.removeLayer(dlid+'-point'); MI.Atlas.glMap.removeLayer(dlid+'-line'); MI.Atlas.glMap.removeLayer(dlid+'-poly');
			}  
		// Image Layers
		} else if (el.classList.contains('imagelayer')) {			
			if (el.checked && MI.Atlas.glMap.getLayer(dlid) === undefined) { 
				this.glMap.addLayer({ "id": dlid, "source": 'mlayer-'+dlid, "type": "raster", "paint": { "raster-opacity": 1 } }); 		
			} else if ( MI.Atlas.glMap.getLayer(dlid) !== undefined) { MI.Atlas.glMap.removeLayer(dlid); } 
		// Other Raster Layers
		} else {	
			if (el.checked && MI.Atlas.glMap.getLayer(dlid) === undefined) { 		
				MI.Atlas.glMap.addLayer({
					'id': dlid, 'type': 'raster', 'source': 'mlayer-'+dlid, 'paint': MI.Atlas.vdatalayers[el.value].paintrules, 'minzoom': MI.Atlas.vdatalayers[el.value].minZoom, 'maxzoom': MI.Atlas.vdatalayers[el.value].maxZoom
				});	
			} 
			else if ( MI.Atlas.glMap.getLayer(dlid) !== undefined) { MI.Atlas.glMap.removeLayer(dlid); }  
		}
	}
	
	LoadExternalDataLayer(type, ref, options=null) {
		switch(type) {
			case 'geojson': fetch(ref).then(r => r.json()).then(geojson => MI.Atlas._addGeojson(geojson,ref)); break;
			case 'json': fetch(ref).then(r => r.json()).then(geojson => MI.Atlas._addGeojson(geojson,ref)); break;
			case 'pmtiles': 
				const p = new pmtiles.PMTiles(ref);
				p.getMetadata().then(h => {					
					for (let l in h.tilestats.layers) {		
						let ltype = l.geometry === 'LineString' ? 'line' : 'fill';
						let lpaint = ltype === 'line' ? { 'line-color': '#ff69b4', 'line-width': 2 } : { "fill-color": "#ff69b4" };
						MI.Atlas._addPMTile(h.tilestats.layers[l], h.tilestats.layers[l].layer+'-'+l, ref, ltype, lpaint);
						
					}
				}); break;
			case 'png': MI.Atlas._addImagelayer(ref, options); break;
			case 'jpg': MI.Atlas._addImagelayer(ref, options); break;
			
		}	
	}
	_addPMTile(l, id, ref, type, paint) {
		if (MI.Atlas.glMap.getSource('mlayer-'+'udl_'+id) === undefined) {
			MI.Atlas.vdatalayers['udl_'+id] = {id: 'udl_'+id, url: 'pmtiles://'+ref, type: 'vector', layertype: type, sourcelayer: l.layer, paintrules: paint};			
			MI.Atlas.glMap.addSource('mlayer-'+'udl_'+id, { type: 'vector', url: "pmtiles://"+ref });
		
			let dlayer = document.createElement('div'), dcontainer = document.createElement('label'), dcheck = document.createElement('input');
			dlayer.id = 'lc-udl_'+id; dlayer.classList.add('layerrow'); dcontainer.classList.add('layercontainer'); dcontainer.innerHTML = `<span class="layercheckmark"><i class="fas"></i></span> ${id}`;
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
			dlayer.id = 'lc-udl_'+ref; dlayer.classList.add('layerrow'); dcontainer.classList.add('layercontainer'); dcontainer.innerHTML = `<span class="layercheckmark"><i class="fas"></i></span> ${ref}`;
			dcheck.type = 'checkbox'; dcheck.checked = true; dcheck.id = 'udl_'+ref; dcheck.value = 'udl_'+ref; dcheck.classList.add('geojson');

			dcheck.addEventListener('click', (e) => { MI.Atlas.ProcessDataLayerFromElement(dcheck);});		
			document.getElementById('userdatalayers').appendChild(dlayer); dlayer.appendChild(dcontainer); dcontainer.prepend(dcheck); 
		
			if (MI.Atlas.glMapLoaded) {MI.Atlas.ProcessDataLayerFromElement(dcheck);}
		} else {
			MI.Interface.ShowMessage('Data source already added.');
		}		
	}
	_addImagelayer(ref, options) {
		if (MI.Atlas.glMap.getSource('mlayer-udl_'+ref) === undefined) {
			MI.Atlas.vdatalayers['udl_'+ref] = {id: 'udl_'+ref, scid: options.scid, data: ref, type: 'image', sourcelayer: ref};	
			this.glMap.addSource('mlayer-udl_'+ref, { "type": "image", "url": ref, "coordinates": options.extents });
				
			let dlayer = document.createElement('div'), dcontainer = document.createElement('label'), dcheck = document.createElement('input');
			dlayer.id = 'lc-udl_'+ref; dlayer.classList.add('layerrow'); dcontainer.classList.add('layercontainer'); dcontainer.innerHTML = `<span class="layercheckmark"><i class="fas"></i></span> ${ref.split('/').pop()}`;
			dcheck.type = 'checkbox'; dcheck.checked = true; dcheck.id = 'udl_'+ref; dcheck.value = 'udl_'+ref; dcheck.classList.add('imagelayer');

			dcheck.addEventListener('click', (e) => { MI.Atlas.ProcessDataLayerFromElement(dcheck);});		
			document.getElementById('userdatalayers').appendChild(dlayer); dlayer.appendChild(dcontainer); dcontainer.prepend(dcheck); 
		
			if (MI.Atlas.glMapLoaded) {	MI.Atlas.ProcessDataLayerFromElement(dcheck);}
		} else {
			MI.Interface.ShowMessage('Data source already added.');
		}			
	}
	GetTileImage(lat, lon, zoom, type='toner-v2') {
	    let xtile = parseInt(Math.floor( (lon + 180) / 360 * (1<<zoom) ));
	    let ytile = parseInt(Math.floor( (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * (1<<zoom) ));
		return 'https://api.maptiler.com/maps/'+type+'/'+zoom+'/'+xtile+'/'+ytile+'.png?key=v6o4lBqX0HjNRonNxTdr'; 
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