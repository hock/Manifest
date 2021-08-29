/** Initialize a Spatial Atlas **/
class ManifestAtlas {
	constructor(options) {
		let pop = !(options.mobile) ? true : false;
		this.map = new L.Map('map', { 
			preferCanvas: true, minZoom: 2, worldCopyJump: false, center: new L.LatLng(40.730610,-73.935242), zoom: 3, zoomControl: false, 
			scrollWheelZoom: false, closePopupOnClick: pop 
		});
		this.maplayer = null;
		this.active_point = null;
		this.homecontrol = null;
		
		this.colorsets = [['#3498DB','#dbedf9', '#dbedf9'],['#FF0080','#f9dbde','#f9dbde'],['#34db77','#dbf9e7','#dbf9e7'],['#ff6500','#f6d0ca','#f6d0ca'],['#4d34db','#dfdbf9','#dfdbf9'],  ['#5E2BFF','#E0D6FF','#E0D6FF'],['#EE4266','#FAC7D2','#FAC7D2'],['#3BCEAC','#CEF3EA','#CEF3EA'],['#00ABE7','#C2EFFF','#C2EFFF'],['#F85A3E','#FEDDD8','#FEDDD8']];
			
		this.tiletypes = {
			GOOGLE: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
			DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',	
			LIGHT: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}',	
			TERRAIN: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}',
			SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',	
			
			SHIPPING: 'https://tiles.arcgis.com/tiles/nzS0F0zdNLvs7nc8/arcgis/rest/services/ShipRoutes/MapServer/WMTS/tile/1.0.0/ShipRoutes/default/default028mm/{z}/{y}/{x}.png',
			MARINE: 'https://tiles.marinetraffic.com/ais_helpers/shiptilesingle.aspx?output=png&sat=1&grouping=shiptype&tile_size=512&legends=1&zoom={z}&X={x}&Y={y}',
			RAIL: 'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'
		};
		
		/* Define Layers */
		this.layerdefs = {
			google: new L.TileLayer(this.tiletypes.GOOGLE, 
				{ maxZoom: 20, className: 'googlebase', detectRetina: true, subdomains:['mt0','mt1','mt2','mt3'], attribution: 'Terrain, Google' }),		
			light: new L.TileLayer(this.tiletypes.LIGHT, {detectRetina: true, subdomains: 'abcd', minZoom: 0, maxZoom: 20, ext: 'png', attribution: 'Toner, Stamen' }),
			terrain: new L.TileLayer(this.tiletypes.TERRAIN, { detectRetina: true, subdomains: 'abcd', minZoom: 0, maxZoom: 18, ext: 'png', attribution: 'Terrain, Stamen' }),	
			satellite: new L.TileLayer(this.tiletypes.SATELLITE, { detectRetina: true, maxZoom: 20, maxNativeZoom: 20, attribution: 'Satellite, ESRI' }),
		 	dark: new L.TileLayer(this.tiletypes.DARK, { subdomains: 'abcd', maxZoom: 19, detectRetina: true, attribution: 'Dark, CartoDB' }),

			shipping: new L.TileLayer(this.tiletypes.SHIPPING, 
				{ maxNativeZoom: 4, detectRetina: true, className: 'shippinglayer', bounds:L.latLngBounds( L.latLng(-60, -180), L.latLng(60, 180)), attribution: '[ARCGIS Data]' }),
			marine: new L.TileLayer(this.tiletypes.MARINE, { maxZoom: 19, tileSize: 512, detectRetina: false, className: 'marinelayer', attribution: '[Marinetraffic Data]' }),
			rail: new L.TileLayer(this.tiletypes.RAIL, { maxZoom: 19, className: 'raillayer', attribution: '[OpenStreetMap Data]' })		
		};
						  
		/* Styles */
		this.styles = {
			'point': { fillColor: '#eeeeee', color: '#999999', radius: 8, weight: 4, opacity: 1, fillOpacity: 1 },
			'highlight': { fillColor: '#ffffff' },
			'line': { color: '#dddddd', fillColor: '#dddddd', stroke: true, weight: 3, opacity: 0.2, smoothFactor: 1 },
			'arrow': { rotation: 0, width: 8, height: 5, color: '#dddddd', fillColor: '#dddddd', weight: 2, opacity: 1, fillOpacity: 1 },
			'live': { rotation: 0, width: 16, height: 10, color: '#f9dbde', fillColor: '#FF0080', weight: 2, opacity: 1, fillOpacity: 1 }	
		};
	
		// Map configuration
		this.homecontrol = L.Control.zoomHome().addTo(this.map);
		this.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
		this.map.on('popupopen', (e) => { this.PopupOpen(e); });
		this.map.on('popupclose', (e) => { this.PopupClose(e); });

		if (document.body.classList.contains('light')) { this.map.addLayer(this.layerdefs.google); } 
		else if (document.body.classList.contains('dark')) { this.map.addLayer(this.layerdefs.dark); }	
		
		// Add Shipping Layer
		this.map.addLayer(this.layerdefs.shipping);		
	}
	
	Refresh() { this.map._renderer._redraw(); }
	
	PopupOpen(e) {		
		let s = document.getElementById('searchbar').value.toLowerCase();
		if (s !== '') {
			let active = false;
			if (e.popup._source.options.fillOpacity !== 0.1) { active = true; }
			else {
				for (let i in e.popup._source.feature.properties.clustered) {
					if (e.popup._source.feature.properties.clustered[i].properties.hidden === false) { active = true; }
				}
			}
			if (!active) { e.sourceTarget.closePopup(); this.SetActivePoint(null); return; }

			this.UpdateCluster(document.getElementById('searchbar').value.toLowerCase(), e.popup._source.feature);
		}
		
		this.SetActivePoint(e.sourceTarget);
		this.map.setView(this.GetOffsetLatlng(e.popup._latlng));
		if (!e.popup._source.feature.properties.angle) { this.MapPointClick(this.active_point); }

		e.popup._source.setStyle(this.styles.highlight);			
		
	}
	
	PopupClose(e) {
		this.SetActivePoint(null); 		
		if (typeof e.popup._source !== 'undefined') {
			if (e.popup._source.feature.properties.type === 'node') {
				e.popup._source.setStyle({fillColor: e.popup._source.feature.properties.basestyle.fillColor});		
			}
		}
	}
	
	TagClick(id, lat, lng) {
		MI.Atlas.PointFocus(id); 
		MI.Atlas.map.setView(MI.Atlas.GetOffsetLatlng(new L.LatLng(lat,lng), 16), 16);
	}
	
	/** Render points by setting up a GeoJSON feature for display **/
	RenderPoint(feature, layer) {
		let bgimg = MI.Atlas.getTileImage(feature.properties.latlng.lat, feature.properties.latlng.lng, 13);
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
				Cluster of <span id="cluster-count" class="cluster-count">${feature.properties.clustered.length+1}</span> Nodes
			</h2>`;
			
			for (let ft of fts) {
				popupContent += `
				<div id="popup-${ft.properties.lid}" class="popuplink clusterbox">
					<h2 style="background: ${ft.properties.style.textColor}; color: ${ft.properties.style.fillColor}">
						<i class="fas fa-tag" onclick="MI.Atlas.TagClick(${ft.properties.lid},${ft.properties.latlng.lat},${ft.properties.latlng.lng});"></i> 
						<span onclick="MI.Atlas.MapPointClick(${ft.properties.lid});">${ft.properties.title}</span>
					</h2>
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
	PointFocus(pid) {	
		for (let i in this.map._layers) {		
			if (typeof this.map._layers[i].feature !== 'undefined') {							
				if (this.map._layers[i].feature.properties.lid === Number(pid)) {				
					if (MI.Visualization.type === 'map') { this.SetActivePoint(this.map._layers[i]); this.map._layers[i].openPopup(); }
				}
			} 
		} 
		if (document.getElementById('searchbar').value !== '') { this.UpdateCluster(document.getElementById('searchbar').value.toLowerCase()); }
	}
	
	/** The UI side of the focus function, scrolls the user interface to a point based on map (or functional) action **/
	MapPointClick(node, speed='smooth') {
		if (node === null) { return; }
		let id;		
		if ( typeof node === 'object' ) {
			if (node._popup._source.options.fillOpacity === 0.1) { return; }
			id = node._popup._source.feature.properties.lid;
		} else { id = node; if (document.getElementById('local_'+id)) {document.getElementById('local_'+id).click();} else { return; } }
	
		if (!document.body.classList.contains('fullscreen')) {
			let offset = 0;
			let prev = document.getElementById('local_'+id).parentElement.previousElementSibling;
			while (prev) { if (prev.classList.contains('mheader')) { offset += prev.offsetHeight; } prev = prev.previousElementSibling; }
		
			document.getElementById('sidepanel').scrollTo({left: 0, top: document.getElementById('local_'+id).offsetTop + (-1*offset), behavior: speed});	
		}
	}
	
	PointMouseOver(e, layer, feature) { 
		if (layer.options.fillOpacity !== 0.1) { layer.setStyle(this.styles.highlight); } 
		if (feature.properties.clustered.length > 0) {
			let ccount = 0;
			if (!feature.properties.hidden) { ccount++; }
			for (let i in feature.properties.clustered) { if (!feature.properties.clustered[i].properties.hidden) { ccount++; } }
				let tooltipContent = `<div id="tooltip-${feature.properties.lid}" class="mtooltip" style="background: ${feature.properties.style.color}; color: ${feature.properties.style.darkColor}"><i class="fas fa-boxes"></i> Cluster of ${ccount} Nodes</div>`;
			layer.setTooltipContent(tooltipContent);	
		}		
	}
	
	PointMouseOut(e, layer, feature) { 
		if (layer.feature.properties && layer.feature.properties.style && layer.options.fillOpacity !== 0.1) {
			layer.setStyle(layer.feature.properties.style);
			this.MeasureSort(feature, layer);
			// Not Great!
			if (document.getElementById('searchbar').value !== '') { MI.Interface.Search();}
	
		} 
		if (this.active_point !== null && typeof this.active_point._popup !== 'undefined') {
			if (this.active_point._popup._source._leaflet_id === e.sourceTarget._leaflet_id) {
				if (layer.options.fillOpacity !== 0.1) { layer.setStyle(this.styles.highlight); }
			}
		}
	}	
	
	/** Scales the map based on selected measure **/
	MeasureSort(ft, layer) {
		const measureSort = document.getElementById('measure-choices').value;
	
		if (ft && layer) {
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
		if (!ft && !MI.Atlas.active_point || MI.Visualization.type !== 'map') { return; } else { if (!ft) { ft = MI.Atlas.active_point._popup._source.feature; }}	
		let ccount = 0, maxcount = 1;
		
		document.querySelectorAll('.clusterbox').forEach(el => { 
	        if (el.textContent.toLowerCase().indexOf(s) !== -1)  { el.style.display = 'block'; } else { el.style.display = 'none'; }		
	    });	
				
		if (!ft.properties.hidden) { ccount++; }
		for (let i in ft.properties.clustered) { if (!ft.properties.clustered[i].properties.hidden) { ccount++; } maxcount++; }

		if (ccount === 0) { MI.Atlas.active_point.closePopup(); return; }
		else if (ccount === maxcount) { document.querySelectorAll('.cluster-count').forEach(el => { el.textContent = maxcount; }); } 
		else { document.querySelectorAll('.cluster-count').forEach(el => { el.textContent = ccount+'/'+maxcount; }); }
		if (this.active_point) { this.MapPointClick(this.active_point); }
		
	}
	GetOffsetLatlng(ll, z=0) {
		let targetPoint;
		if (z === 0) { z = this.map.getZoom(); }
		if (MI.Interface.IsMobile()) {
			targetPoint = this.map.project(ll, z).add([0, document.getElementById('sidepanel').offsetHeight/2]);
		    return this.map.unproject(targetPoint, z);
		} else if (!document.body.classList.contains('fullscreen')) {	
			targetPoint = this.map.project(ll, z).subtract([document.getElementById('sidepanel').offsetWidth/2,0]);
		   return this.map.unproject(targetPoint, z);			
		} else {
			return ll;
		}	
	}
	
	SetActivePoint(pt) {
		if (pt) {
			this.active_point = pt;
			let latlng = pt._latlng ? pt._latlng : pt._popup._latlng;
			this.homecontrol.setHomeCoordinates(this.GetOffsetLatlng(latlng, 3));
		}
		else {
			this.active_point = null;
			this.homecontrol.setHomeCoordinates(new L.LatLng(40.730610,-73.935242));		
		}	
		return this.active_point;
	}
	
	/** A centering function that focuses on the first point of a supply chain **/
	SetView(type='interest') {
		if (type === 'interest') {
			const mlistId = document.getElementsByClassName('mlist')[document.getElementsByClassName('mlist').length-1].id.split('-')[1];
			const nodeId = document.getElementsByClassName('mlist')[document.getElementsByClassName('mlist').length-1].childNodes[0].id.split('_')[1];
			if (MI.Visualization.type === 'map') {
				MI.Interface.ShowHeader(mlistId);
				MI.Atlas.PointFocus(nodeId);	
			}	
			else if (MI.Visualization.type === 'textview') {
				MI.Interface.ShowHeader(mlistId);
			}	
		} else if (type === 'center') {
			MI.Atlas.map.setView(new L.LatLng(40.730610,-73.935242), 3); 
		}
	}
	
	DisplayLayers(show=true) {
		if (show) {   
			document.querySelectorAll('.leaflet-overlay-pane, .leaflet-control-container, #mapcapture').forEach(el => { el.classList.remove('closed'); }); }
		else { if (this.active_point !== null && this.active_point.closePopup) { this.active_point.closePopup(); } 
			document.querySelectorAll('.leaflet-overlay-pane, .leaflet-control-container, #mapcapture').forEach(el => { el.classList.add('closed'); }); }	
		this.Refresh();
	}
	GetRadius(ft, cluster=true) {
		if (cluster) { return Math.min(ft.properties.clustered.length*5+8,30); } else { return 8; }
	}
	
	GetScaledRadius(ft, measureSort) {
		let newRadius = this.GetRadius(ft, measureSort === 'none');
		if (ft.properties.measures.some(m => m.mtype === measureSort)) {
			const measureVal = ft.properties.measures.filter(m => { return m.mtype === measureSort; }).pop().mvalue;
			const measureMax = MI.supplychains[ft.properties.index].details.measures[measureSort].max;				
			newRadius = (this.GetRadius(ft, measureSort === 'none') / 2) + 40 * (measureVal / measureMax);				
		}
		return newRadius;
	}

	getTileImage(lat, lon, zoom) {
	    let xtile = parseInt(Math.floor( (lon + 180) / 360 * (1<<zoom) ));
	    let ytile = parseInt(Math.floor( (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * (1<<zoom) ));
		
		return "https://stamen-tiles-c.a.ssl.fastly.net/toner-lite/"+zoom+"/"+xtile+"/"+ytile+".png";
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