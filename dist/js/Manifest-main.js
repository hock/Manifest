/*
 * Leaflet.markercluster 1.4.1+master.37ab9a2,
 * Provides Beautiful Animated Marker Clustering functionality for Leaflet, a JS library for interactive maps.
 * https://github.com/Leaflet/Leaflet.markercluster
 * (c) 2012-2017, Dave Leaver, smartrak
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.Leaflet = global.Leaflet || {}, global.Leaflet.markercluster = global.Leaflet.markercluster || {})));
}(this, (function (exports) { 'use strict';

/*
 * L.MarkerClusterGroup extends L.FeatureGroup by clustering the markers contained within
 */

var MarkerClusterGroup = L.MarkerClusterGroup = L.FeatureGroup.extend({

	options: {
		maxClusterRadius: 0, //A cluster will cover at most this many pixels from its center
		iconCreateFunction: null,
		clusterPane: L.Marker.prototype.options.pane,

		spiderfyOnMaxZoom: true,
		showCoverageOnHover: false,
		zoomToBoundsOnClick: true,
		singleMarkerMode: true,

		disableClusteringAtZoom: null,

		// Setting this to false prevents the removal of any clusters outside of the viewpoint, which
		// is the default behaviour for performance reasons.
		removeOutsideVisibleBounds: false,

		// Set to false to disable all animations (zoom and spiderfy).
		// If false, option animateAddingMarkers below has no effect.
		// If L.DomUtil.TRANSITION is falsy, this option has no effect.
		animate: false,

		//Whether to animate adding markers after adding the MarkerClusterGroup to the map
		// If you are adding individual markers set to true, if adding bulk markers leave false for massive performance gains.
		animateAddingMarkers: false,

		//Increase to increase the distance away that spiderfied markers appear from the center
		spiderfyDistanceMultiplier: 1.75,

		// Make it possible to specify a polyline options on a spider leg
		spiderLegPolylineOptions: { weight: 2, color: '#fff', opacity: 0.7 },

		// When bulk adding layers, adds markers in chunks. Means addLayers may not add all the layers in the call, others will be loaded during setTimeouts
		chunkedLoading: false,
		chunkInterval: 200, // process markers for a maximum of ~ n milliseconds (then trigger the chunkProgress callback)
		chunkDelay: 50, // at the end of each interval, give n milliseconds back to system/browser
		chunkProgress: null, // progress callback: function(processed, total, elapsed) (e.g. for a progress indicator)

		//Options to pass to the L.Polygon constructor
		polygonOptions: {color:"#eeeeee",fillcolor:"#f5f5f5"}
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
		if (!this.options.iconCreateFunction) {
			this.options.iconCreateFunction = this._defaultIconCreateFunction;
		}

		this._featureGroup = L.featureGroup();
		this._featureGroup.addEventParent(this);

		this._nonPointGroup = L.featureGroup();
		this._nonPointGroup.addEventParent(this);

		this._inZoomAnimation = 0;
		this._needsClustering = [];
		this._needsRemoving = []; //Markers removed while we aren't on the map need to be kept track of
		//The bounds of the currently shown area (from _getExpandedVisibleBounds) Updated on zoom/move
		this._currentShownBounds = null;

		this._queue = [];

		this._childMarkerEventHandlers = {
			'dragstart': this._childMarkerDragStart,
			'move': this._childMarkerMoved,
			'dragend': this._childMarkerDragEnd,
		};

		// Hook the appropriate animation methods.
		var animate = L.DomUtil.TRANSITION && this.options.animate;
		L.extend(this, animate ? this._withAnimation : this._noAnimation);
		// Remember which MarkerCluster class to instantiate (animated or not).
		this._markerCluster = animate ? L.MarkerCluster : L.MarkerClusterNonAnimated;
	},

	addLayer: function (layer) {
		if (layer instanceof L.LayerGroup) {
			return this.addLayers([layer]);
		}

		//Don't cluster non point data
		if (!layer.getLatLng) {
			this._nonPointGroup.addLayer(layer);
			this.fire('layeradd', { layer: layer });
			return this;
		}

		if (!this._map) {
			this._needsClustering.push(layer);
			this.fire('layeradd', { layer: layer });
			return this;
		}

		if (this.hasLayer(layer)) {
			return this;
		}


		//If we have already clustered we'll need to add this one to a cluster

		if (this._unspiderfy) {
			this._unspiderfy();
		}

		this._addLayer(layer, this._maxZoom);
		this.fire('layeradd', { layer: layer });

		// Refresh bounds and weighted positions.
		this._topClusterLevel._recalculateBounds();

		this._refreshClustersIcons();

		//Work out what is visible
		var visibleLayer = layer,
		    currentZoom = this._zoom;
		if (layer.__parent) {
			while (visibleLayer.__parent._zoom >= currentZoom) {
				visibleLayer = visibleLayer.__parent;
			}
		}

		if (this._currentShownBounds.contains(visibleLayer.getLatLng())) {
			if (this.options.animateAddingMarkers) {
				this._animationAddLayer(layer, visibleLayer);
			} else {
				this._animationAddLayerNonAnimated(layer, visibleLayer);
			}
		}
		return this;
	},

	removeLayer: function (layer) {

		if (layer instanceof L.LayerGroup) {
			return this.removeLayers([layer]);
		}

		//Non point layers
		if (!layer.getLatLng) {
			this._nonPointGroup.removeLayer(layer);
			this.fire('layerremove', { layer: layer });
			return this;
		}

		if (!this._map) {
			if (!this._arraySplice(this._needsClustering, layer) && this.hasLayer(layer)) {
				this._needsRemoving.push({ layer: layer, latlng: layer._latlng });
			}
			this.fire('layerremove', { layer: layer });
			return this;
		}

		if (!layer.__parent) {
			return this;
		}

		if (this._unspiderfy) {
			this._unspiderfy();
			this._unspiderfyLayer(layer);
		}

		//Remove the marker from clusters
		this._removeLayer(layer, true);
		this.fire('layerremove', { layer: layer });

		// Refresh bounds and weighted positions.
		this._topClusterLevel._recalculateBounds();

		this._refreshClustersIcons();

		layer.off(this._childMarkerEventHandlers, this);

		if (this._featureGroup.hasLayer(layer)) {
			this._featureGroup.removeLayer(layer);
			if (layer.clusterShow) {
				layer.clusterShow();
			}
		}

		return this;
	},

	//Takes an array of markers and adds them in bulk
	addLayers: function (layersArray, skipLayerAddEvent) {
		if (!L.Util.isArray(layersArray)) {
			return this.addLayer(layersArray);
		}

		var fg = this._featureGroup,
		    npg = this._nonPointGroup,
		    chunked = this.options.chunkedLoading,
		    chunkInterval = this.options.chunkInterval,
		    chunkProgress = this.options.chunkProgress,
		    l = layersArray.length,
		    offset = 0,
		    originalArray = true,
		    m;

		if (this._map) {
			var started = (new Date()).getTime();
			var process = L.bind(function () {
				var start = (new Date()).getTime();
				for (; offset < l; offset++) {
					if (chunked && offset % 200 === 0) {
						// every couple hundred markers, instrument the time elapsed since processing started:
						var elapsed = (new Date()).getTime() - start;
						if (elapsed > chunkInterval) {
							break; // been working too hard, time to take a break :-)
						}
					}

					m = layersArray[offset];

					// Group of layers, append children to layersArray and skip.
					// Side effects:
					// - Total increases, so chunkProgress ratio jumps backward.
					// - Groups are not included in this group, only their non-group child layers (hasLayer).
					// Changing array length while looping does not affect performance in current browsers:
					// http://jsperf.com/for-loop-changing-length/6
					if (m instanceof L.LayerGroup) {
						if (originalArray) {
							layersArray = layersArray.slice();
							originalArray = false;
						}
						this._extractNonGroupLayers(m, layersArray);
						l = layersArray.length;
						continue;
					}

					//Not point data, can't be clustered
					if (!m.getLatLng) {
						npg.addLayer(m);
						if (!skipLayerAddEvent) {
							this.fire('layeradd', { layer: m });
						}
						continue;
					}

					if (this.hasLayer(m)) {
						continue;
					}

					this._addLayer(m, this._maxZoom);
					if (!skipLayerAddEvent) {
						this.fire('layeradd', { layer: m });
					}

					//If we just made a cluster of size 2 then we need to remove the other marker from the map (if it is) or we never will
					if (m.__parent) {
						if (m.__parent.getChildCount() === 2) {
							var markers = m.__parent.getAllChildMarkers(),
							    otherMarker = markers[0] === m ? markers[1] : markers[0];
							fg.removeLayer(otherMarker);
						}
					}
				}

				if (chunkProgress) {
					// report progress and time elapsed:
					chunkProgress(offset, l, (new Date()).getTime() - started);
				}

				// Completed processing all markers.
				if (offset === l) {

					// Refresh bounds and weighted positions.
					this._topClusterLevel._recalculateBounds();

					this._refreshClustersIcons();

					this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds);
				} else {
					setTimeout(process, this.options.chunkDelay);
				}
			}, this);

			process();
		} else {
			var needsClustering = this._needsClustering;

			for (; offset < l; offset++) {
				m = layersArray[offset];

				// Group of layers, append children to layersArray and skip.
				if (m instanceof L.LayerGroup) {
					if (originalArray) {
						layersArray = layersArray.slice();
						originalArray = false;
					}
					this._extractNonGroupLayers(m, layersArray);
					l = layersArray.length;
					continue;
				}

				//Not point data, can't be clustered
				if (!m.getLatLng) {
					npg.addLayer(m);
					continue;
				}

				if (this.hasLayer(m)) {
					continue;
				}

				needsClustering.push(m);
			}
		}
		return this;
	},

	//Takes an array of markers and removes them in bulk
	removeLayers: function (layersArray) {
		var i, m,
		    l = layersArray.length,
		    fg = this._featureGroup,
		    npg = this._nonPointGroup,
		    originalArray = true;

		if (!this._map) {
			for (i = 0; i < l; i++) {
				m = layersArray[i];

				// Group of layers, append children to layersArray and skip.
				if (m instanceof L.LayerGroup) {
					if (originalArray) {
						layersArray = layersArray.slice();
						originalArray = false;
					}
					this._extractNonGroupLayers(m, layersArray);
					l = layersArray.length;
					continue;
				}

				this._arraySplice(this._needsClustering, m);
				npg.removeLayer(m);
				if (this.hasLayer(m)) {
					this._needsRemoving.push({ layer: m, latlng: m._latlng });
				}
				this.fire('layerremove', { layer: m });
			}
			return this;
		}

		if (this._unspiderfy) {
			this._unspiderfy();

			// Work on a copy of the array, so that next loop is not affected.
			var layersArray2 = layersArray.slice(),
			    l2 = l;
			for (i = 0; i < l2; i++) {
				m = layersArray2[i];

				// Group of layers, append children to layersArray and skip.
				if (m instanceof L.LayerGroup) {
					this._extractNonGroupLayers(m, layersArray2);
					l2 = layersArray2.length;
					continue;
				}

				this._unspiderfyLayer(m);
			}
		}

		for (i = 0; i < l; i++) {
			m = layersArray[i];

			// Group of layers, append children to layersArray and skip.
			if (m instanceof L.LayerGroup) {
				if (originalArray) {
					layersArray = layersArray.slice();
					originalArray = false;
				}
				this._extractNonGroupLayers(m, layersArray);
				l = layersArray.length;
				continue;
			}

			if (!m.__parent) {
				npg.removeLayer(m);
				this.fire('layerremove', { layer: m });
				continue;
			}

			this._removeLayer(m, true, true);
			this.fire('layerremove', { layer: m });

			if (fg.hasLayer(m)) {
				fg.removeLayer(m);
				if (m.clusterShow) {
					m.clusterShow();
				}
			}
		}

		// Refresh bounds and weighted positions.
		this._topClusterLevel._recalculateBounds();

		this._refreshClustersIcons();

		//Fix up the clusters and markers on the map
		this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds);

		return this;
	},

	//Removes all layers from the MarkerClusterGroup
	clearLayers: function () {
		//Need our own special implementation as the LayerGroup one doesn't work for us

		//If we aren't on the map (yet), blow away the markers we know of
		if (!this._map) {
			this._needsClustering = [];
			this._needsRemoving = [];
			delete this._gridClusters;
			delete this._gridUnclustered;
		}

		if (this._noanimationUnspiderfy) {
			this._noanimationUnspiderfy();
		}

		//Remove all the visible layers
		this._featureGroup.clearLayers();
		this._nonPointGroup.clearLayers();

		this.eachLayer(function (marker) {
			marker.off(this._childMarkerEventHandlers, this);
			delete marker.__parent;
		}, this);

		if (this._map) {
			//Reset _topClusterLevel and the DistanceGrids
			this._generateInitialClusters();
		}

		return this;
	},

	//Override FeatureGroup.getBounds as it doesn't work
	getBounds: function () {
		var bounds = new L.LatLngBounds();

		if (this._topClusterLevel) {
			bounds.extend(this._topClusterLevel._bounds);
		}

		for (var i = this._needsClustering.length - 1; i >= 0; i--) {
			bounds.extend(this._needsClustering[i].getLatLng());
		}

		bounds.extend(this._nonPointGroup.getBounds());

		return bounds;
	},

	//Overrides LayerGroup.eachLayer
	eachLayer: function (method, context) {
		var markers = this._needsClustering.slice(),
			needsRemoving = this._needsRemoving,
			thisNeedsRemoving, i, j;

		if (this._topClusterLevel) {
			this._topClusterLevel.getAllChildMarkers(markers);
		}

		for (i = markers.length - 1; i >= 0; i--) {
			thisNeedsRemoving = true;

			for (j = needsRemoving.length - 1; j >= 0; j--) {
				if (needsRemoving[j].layer === markers[i]) {
					thisNeedsRemoving = false;
					break;
				}
			}

			if (thisNeedsRemoving) {
				method.call(context, markers[i]);
			}
		}

		this._nonPointGroup.eachLayer(method, context);
	},

	//Overrides LayerGroup.getLayers
	getLayers: function () {
		var layers = [];
		this.eachLayer(function (l) {
			layers.push(l);
		});
		return layers;
	},

	//Overrides LayerGroup.getLayer, WARNING: Really bad performance
	getLayer: function (id) {
		var result = null;

		id = parseInt(id, 10);

		this.eachLayer(function (l) {
			if (L.stamp(l) === id) {
				result = l;
			}
		});

		return result;
	},

	//Returns true if the given layer is in this MarkerClusterGroup
	hasLayer: function (layer) {
		if (!layer) {
			return false;
		}

		var i, anArray = this._needsClustering;

		for (i = anArray.length - 1; i >= 0; i--) {
			if (anArray[i] === layer) {
				return true;
			}
		}

		anArray = this._needsRemoving;
		for (i = anArray.length - 1; i >= 0; i--) {
			if (anArray[i].layer === layer) {
				return false;
			}
		}

		return !!(layer.__parent && layer.__parent._group === this) || this._nonPointGroup.hasLayer(layer);
	},

	//Zoom down to show the given layer (spiderfying if necessary) then calls the callback
	zoomToShowLayer: function (layer, callback) {

		if (typeof callback !== 'function') {
			callback = function () {};
		}

		var showMarker = function () {
			if ((layer._icon || layer.__parent._icon) && !this._inZoomAnimation) {
				this._map.off('moveend', showMarker, this);
				this.off('animationend', showMarker, this);

				if (layer._icon) {
					callback();
				} else if (layer.__parent._icon) {
					this.once('spiderfied', callback, this);
					layer.__parent.spiderfy();
				}
			}
		};

		if (layer._icon && this._map.getBounds().contains(layer.getLatLng())) {
			//Layer is visible ond on screen, immediate return
			callback();
		} else if (layer.__parent._zoom < Math.round(this._map._zoom)) {
			//Layer should be visible at this zoom level. It must not be on screen so just pan over to it
			this._map.on('moveend', showMarker, this);
			this._map.panTo(layer.getLatLng());
		} else {
			this._map.on('moveend', showMarker, this);
			this.on('animationend', showMarker, this);
			layer.__parent.zoomToBounds();
		}
	},

	//Overrides FeatureGroup.onAdd
	onAdd: function (map) {
		this._map = map;
		var i, l, layer;

		if (!isFinite(this._map.getMaxZoom())) {
			throw "Map has no maxZoom specified";
		}

		this._featureGroup.addTo(map);
		this._nonPointGroup.addTo(map);

		if (!this._gridClusters) {
			this._generateInitialClusters();
		}

		this._maxLat = map.options.crs.projection.MAX_LATITUDE;

		//Restore all the positions as they are in the MCG before removing them
		for (i = 0, l = this._needsRemoving.length; i < l; i++) {
			layer = this._needsRemoving[i];
			layer.newlatlng = layer.layer._latlng;
			layer.layer._latlng = layer.latlng;
		}
		//Remove them, then restore their new positions
		for (i = 0, l = this._needsRemoving.length; i < l; i++) {
			layer = this._needsRemoving[i];
			this._removeLayer(layer.layer, true);
			layer.layer._latlng = layer.newlatlng;
		}
		this._needsRemoving = [];

		//Remember the current zoom level and bounds
		this._zoom = Math.round(this._map._zoom);
		this._currentShownBounds = this._getExpandedVisibleBounds();

		this._map.on('zoomend', this._zoomEnd, this);
		this._map.on('moveend', this._moveEnd, this);

		if (this._spiderfierOnAdd) { //TODO FIXME: Not sure how to have spiderfier add something on here nicely
			this._spiderfierOnAdd();
		}

		this._bindEvents();

		//Actually add our markers to the map:
		l = this._needsClustering;
		this._needsClustering = [];
		this.addLayers(l, true);
	},

	//Overrides FeatureGroup.onRemove
	onRemove: function (map) {
		map.off('zoomend', this._zoomEnd, this);
		map.off('moveend', this._moveEnd, this);

		this._unbindEvents();

		//In case we are in a cluster animation
		this._map._mapPane.className = this._map._mapPane.className.replace(' leaflet-cluster-anim', '');

		if (this._spiderfierOnRemove) { //TODO FIXME: Not sure how to have spiderfier add something on here nicely
			this._spiderfierOnRemove();
		}

		delete this._maxLat;

		//Clean up all the layers we added to the map
		this._hideCoverage();
		this._featureGroup.remove();
		this._nonPointGroup.remove();

		this._featureGroup.clearLayers();

		this._map = null;
	},

	getVisibleParent: function (marker) {
		var vMarker = marker;
		while (vMarker && !vMarker._icon) {
			vMarker = vMarker.__parent;
		}
		return vMarker || null;
	},

	//Remove the given object from the given array
	_arraySplice: function (anArray, obj) {
		for (var i = anArray.length - 1; i >= 0; i--) {
			if (anArray[i] === obj) {
				anArray.splice(i, 1);
				return true;
			}
		}
	},

	/**
	 * Removes a marker from all _gridUnclustered zoom levels, starting at the supplied zoom.
	 * @param marker to be removed from _gridUnclustered.
	 * @param z integer bottom start zoom level (included)
	 * @private
	 */
	_removeFromGridUnclustered: function (marker, z) {
		var map = this._map,
		    gridUnclustered = this._gridUnclustered,
			minZoom = Math.floor(this._map.getMinZoom());

		for (; z >= minZoom; z--) {
			if (!gridUnclustered[z].removeObject(marker, map.project(marker.getLatLng(), z))) {
				break;
			}
		}
	},

	_childMarkerDragStart: function (e) {
		e.target.__dragStart = e.target._latlng;
	},

	_childMarkerMoved: function (e) {
		if (!this._ignoreMove && !e.target.__dragStart) {
			var isPopupOpen = e.target._popup && e.target._popup.isOpen();

			this._moveChild(e.target, e.oldLatLng, e.latlng);

			if (isPopupOpen) {
				e.target.openPopup();
			}
		}
	},

	_moveChild: function (layer, from, to) {
		layer._latlng = from;
		this.removeLayer(layer);

		layer._latlng = to;
		this.addLayer(layer);
	},

	_childMarkerDragEnd: function (e) {
		var dragStart = e.target.__dragStart;
		delete e.target.__dragStart;
		if (dragStart) {
			this._moveChild(e.target, dragStart, e.target._latlng);
		}		
	},


	//Internal function for removing a marker from everything.
	//dontUpdateMap: set to true if you will handle updating the map manually (for bulk functions)
	_removeLayer: function (marker, removeFromDistanceGrid, dontUpdateMap) {
		var gridClusters = this._gridClusters,
			gridUnclustered = this._gridUnclustered,
			fg = this._featureGroup,
			map = this._map,
			minZoom = Math.floor(this._map.getMinZoom());

		//Remove the marker from distance clusters it might be in
		if (removeFromDistanceGrid) {
			this._removeFromGridUnclustered(marker, this._maxZoom);
		}

		//Work our way up the clusters removing them as we go if required
		var cluster = marker.__parent,
			markers = cluster._markers,
			otherMarker;

		//Remove the marker from the immediate parents marker list
		this._arraySplice(markers, marker);

		while (cluster) {
			cluster._childCount--;
			cluster._boundsNeedUpdate = true;

			if (cluster._zoom < minZoom) {
				//Top level, do nothing
				break;
			} else if (removeFromDistanceGrid && cluster._childCount <= 1) { //Cluster no longer required
				//We need to push the other marker up to the parent
				otherMarker = cluster._markers[0] === marker ? cluster._markers[1] : cluster._markers[0];

				//Update distance grid
				gridClusters[cluster._zoom].removeObject(cluster, map.project(cluster._cLatLng, cluster._zoom));
				gridUnclustered[cluster._zoom].addObject(otherMarker, map.project(otherMarker.getLatLng(), cluster._zoom));

				//Move otherMarker up to parent
				this._arraySplice(cluster.__parent._childClusters, cluster);
				cluster.__parent._markers.push(otherMarker);
				otherMarker.__parent = cluster.__parent;

				if (cluster._icon) {
					//Cluster is currently on the map, need to put the marker on the map instead
					fg.removeLayer(cluster);
					if (!dontUpdateMap) {
						fg.addLayer(otherMarker);
					}
				}
			} else {
				cluster._iconNeedsUpdate = true;
			}

			cluster = cluster.__parent;
		}

		delete marker.__parent;
	},

	_isOrIsParent: function (el, oel) {
		while (oel) {
			if (el === oel) {
				return true;
			}
			oel = oel.parentNode;
		}
		return false;
	},

	//Override L.Evented.fire
	fire: function (type, data, propagate) {
		if (data && data.layer instanceof L.MarkerCluster) {
			//Prevent multiple clustermouseover/off events if the icon is made up of stacked divs (Doesn't work in ie <= 8, no relatedTarget)
			if (data.originalEvent && this._isOrIsParent(data.layer._icon, data.originalEvent.relatedTarget)) {
				return;
			}
			type = 'cluster' + type;
		}

		L.FeatureGroup.prototype.fire.call(this, type, data, propagate);
	},

	//Override L.Evented.listens
	listens: function (type, propagate) {
		return L.FeatureGroup.prototype.listens.call(this, type, propagate) || L.FeatureGroup.prototype.listens.call(this, 'cluster' + type, propagate);
	},

	//Default functionality
	_defaultIconCreateFunction: function (cluster) {
		var childCount = cluster.getChildCount();

		var c = ' marker-cluster-';
		if (childCount < 10) {
			c += 'small';
		} else if (childCount < 100) {
			c += 'medium';
		} else {
			c += 'large';
		}

		return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
	},

	_bindEvents: function () {
		var map = this._map,
		    spiderfyOnMaxZoom = this.options.spiderfyOnMaxZoom,
		    showCoverageOnHover = this.options.showCoverageOnHover,
		    zoomToBoundsOnClick = this.options.zoomToBoundsOnClick;

		//Zoom on cluster click or spiderfy if we are at the lowest level
		if (spiderfyOnMaxZoom || zoomToBoundsOnClick) {
			this.on('clusterclick', this._zoomOrSpiderfy, this);
		}

		//Show convex hull (boundary) polygon on mouse over
		if (showCoverageOnHover) {
			this.on('clustermouseover', this._showCoverage, this);
			this.on('clustermouseout', this._hideCoverage, this);
			map.on('zoomend', this._hideCoverage, this);
		}
	},

	_zoomOrSpiderfy: function (e) {
		for(var c in MI.clusters) {
			MI.clusters[c].unspiderfy();
		}
		var cluster = e.layer,
		    bottomCluster = cluster;

		while (bottomCluster._childClusters.length === 1) {
			bottomCluster = bottomCluster._childClusters[0];
		}

		if (bottomCluster._zoom === this._maxZoom &&
			bottomCluster._childCount === cluster._childCount &&
			this.options.spiderfyOnMaxZoom) {

			// All child markers are contained in a single cluster from this._maxZoom to this cluster.
			cluster.spiderfy();
		} else if (this.options.zoomToBoundsOnClick) {
			cluster.zoomToBounds();
		}

		// Focus the map again for keyboard users.
		if (e.originalEvent && e.originalEvent.keyCode === 13) {
			this._map._container.focus();
		}
	},

	_showCoverage: function (e) {
		var map = this._map;
		if (this._inZoomAnimation) {
			return;
		}
		if (this._shownPolygon) {
			map.removeLayer(this._shownPolygon);
		}
		if (e.layer.getChildCount() > 2 && e.layer !== this._spiderfied) {
			this._shownPolygon = new L.Polygon(e.layer.getConvexHull(), this.options.polygonOptions);
			map.addLayer(this._shownPolygon);
		}
	},

	_hideCoverage: function () {
		if (this._shownPolygon) {
			this._map.removeLayer(this._shownPolygon);
			this._shownPolygon = null;
		}
	},

	_unbindEvents: function () {
		var spiderfyOnMaxZoom = this.options.spiderfyOnMaxZoom,
			showCoverageOnHover = this.options.showCoverageOnHover,
			zoomToBoundsOnClick = this.options.zoomToBoundsOnClick,
			map = this._map;

		if (spiderfyOnMaxZoom || zoomToBoundsOnClick) {
			this.off('clusterclick', this._zoomOrSpiderfy, this);
		}
		if (showCoverageOnHover) {
			this.off('clustermouseover', this._showCoverage, this);
			this.off('clustermouseout', this._hideCoverage, this);
			map.off('zoomend', this._hideCoverage, this);
		}
	},

	_zoomEnd: function () {
		for(var c in MI.clusters) {
			MI.clusters[c].unspiderfy();
		}
		
		if (!this._map) { //May have been removed from the map by a zoomEnd handler
			return;
		}
		this._mergeSplitClusters();

		this._zoom = Math.round(this._map._zoom);
		this._currentShownBounds = this._getExpandedVisibleBounds();
		
		// TODO : Improve this cludge for researching clustered markers
		MI.functions.search();
	},

	_moveEnd: function () {
		if (this._inZoomAnimation) {
			return;
		}

		var newBounds = this._getExpandedVisibleBounds();

		//this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), this._zoom, newBounds);
		this._topClusterLevel._recursivelyAddChildrenToMap(null, Math.round(this._map._zoom), newBounds);

		this._currentShownBounds = newBounds;
		MI.functions.search();
		
		return;
	},

	_generateInitialClusters: function () {
		var maxZoom = Math.ceil(this._map.getMaxZoom()),
			minZoom = Math.floor(this._map.getMinZoom()),
			radius = this.options.maxClusterRadius,
			radiusFn = radius;

		//If we just set maxClusterRadius to a single number, we need to create
		//a simple function to return that number. Otherwise, we just have to
		//use the function we've passed in.
		if (typeof radius !== "function") {
			radiusFn = function () { return radius; };
		}

		if (this.options.disableClusteringAtZoom !== null) {
			maxZoom = this.options.disableClusteringAtZoom - 1;
		}
		this._maxZoom = maxZoom;
		this._gridClusters = {};
		this._gridUnclustered = {};

		//Set up DistanceGrids for each zoom
		for (var zoom = maxZoom; zoom >= minZoom; zoom--) {
			this._gridClusters[zoom] = new L.DistanceGrid(radiusFn(zoom));
			this._gridUnclustered[zoom] = new L.DistanceGrid(radiusFn(zoom));
		}

		// Instantiate the appropriate L.MarkerCluster class (animated or not).
		this._topClusterLevel = new this._markerCluster(this, minZoom - 1);
	},

	//Zoom: Zoom to start adding at (Pass this._maxZoom to start at the bottom)
	_addLayer: function (layer, zoom) {
		var gridClusters = this._gridClusters,
		    gridUnclustered = this._gridUnclustered,
			minZoom = Math.floor(this._map.getMinZoom()),
		    markerPoint, z;

		if (this.options.singleMarkerMode) {
			this._overrideMarkerIcon(layer);
		}

		layer.on(this._childMarkerEventHandlers, this);

		//Find the lowest zoom level to slot this one in
		for (; zoom >= minZoom; zoom--) {
			markerPoint = this._map.project(layer.getLatLng(), zoom); // calculate pixel position

			//Try find a cluster close by
			var closest = gridClusters[zoom].getNearObject(markerPoint);
			if (closest) {
				closest._addChild(layer);
				layer.__parent = closest;
				return;
			}

			//Try find a marker close by to form a new cluster with
			closest = gridUnclustered[zoom].getNearObject(markerPoint);
			if (closest) {
				var parent = closest.__parent;
				if (parent) {
					this._removeLayer(closest, false);
				}

				//Create new cluster with these 2 in it

				var newCluster = new this._markerCluster(this, zoom, closest, layer);
				gridClusters[zoom].addObject(newCluster, this._map.project(newCluster._cLatLng, zoom));
				closest.__parent = newCluster;
				layer.__parent = newCluster;

				//First create any new intermediate parent clusters that don't exist
				var lastParent = newCluster;
				for (z = zoom - 1; z > parent._zoom; z--) {
					lastParent = new this._markerCluster(this, z, lastParent);
					gridClusters[z].addObject(lastParent, this._map.project(closest.getLatLng(), z));
				}
				parent._addChild(lastParent);

				//Remove closest from this zoom level and any above that it is in, replace with newCluster
				this._removeFromGridUnclustered(closest, zoom);

				return;
			}

			//Didn't manage to cluster in at this zoom, record us as a marker here and continue upwards
			gridUnclustered[zoom].addObject(layer, markerPoint);
		}

		//Didn't get in anything, add us to the top
		this._topClusterLevel._addChild(layer);
		layer.__parent = this._topClusterLevel;
		return;
	},

	/**
	 * Refreshes the icon of all "dirty" visible clusters.
	 * Non-visible "dirty" clusters will be updated when they are added to the map.
	 * @private
	 */
	_refreshClustersIcons: function () {
		this._featureGroup.eachLayer(function (c) {
			if (c instanceof L.MarkerCluster && c._iconNeedsUpdate) {
				c._updateIcon();
			}
		});
	},

	//Enqueue code to fire after the marker expand/contract has happened
	_enqueue: function (fn) {
		this._queue.push(fn);
		if (!this._queueTimeout) {
			this._queueTimeout = setTimeout(L.bind(this._processQueue, this), 300);
		}
	},
	_processQueue: function () {
		for (var i = 0; i < this._queue.length; i++) {
			this._queue[i].call(this);
		}
		this._queue.length = 0;
		clearTimeout(this._queueTimeout);
		this._queueTimeout = null;
	},

	//Merge and split any existing clusters that are too big or small
	_mergeSplitClusters: function () {
		var mapZoom = Math.round(this._map._zoom);

		//In case we are starting to split before the animation finished
		this._processQueue();

		if (this._zoom < mapZoom && this._currentShownBounds.intersects(this._getExpandedVisibleBounds())) { //Zoom in, split
			this._animationStart();
			//Remove clusters now off screen
			this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), this._zoom, this._getExpandedVisibleBounds());

			this._animationZoomIn(this._zoom, mapZoom);

		} else if (this._zoom > mapZoom) { //Zoom out, merge
			this._animationStart();

			this._animationZoomOut(this._zoom, mapZoom);
		} else {
			this._moveEnd();
		}
	},

	//Gets the maps visible bounds expanded in each direction by the size of the screen (so the user cannot see an area we do not cover in one pan)
	_getExpandedVisibleBounds: function () {
		if (!this.options.removeOutsideVisibleBounds) {
			return this._mapBoundsInfinite;
		} else if (L.Browser.mobile) {
			return this._checkBoundsMaxLat(this._map.getBounds());
		}

		return this._checkBoundsMaxLat(this._map.getBounds().pad(1)); // Padding expands the bounds by its own dimensions but scaled with the given factor.
	},

	/**
	 * Expands the latitude to Infinity (or -Infinity) if the input bounds reach the map projection maximum defined latitude
	 * (in the case of Web/Spherical Mercator, it is 85.0511287798 / see https://en.wikipedia.org/wiki/Web_Mercator#Formulas).
	 * Otherwise, the removeOutsideVisibleBounds option will remove markers beyond that limit, whereas the same markers without
	 * this option (or outside MCG) will have their position floored (ceiled) by the projection and rendered at that limit,
	 * making the user think that MCG "eats" them and never displays them again.
	 * @param bounds L.LatLngBounds
	 * @returns {L.LatLngBounds}
	 * @private
	 */
	_checkBoundsMaxLat: function (bounds) {
		var maxLat = this._maxLat;

		if (maxLat !== undefined) {
			if (bounds.getNorth() >= maxLat) {
				bounds._northEast.lat = Infinity;
			}
			if (bounds.getSouth() <= -maxLat) {
				bounds._southWest.lat = -Infinity;
			}
		}

		return bounds;
	},

	//Shared animation code
	_animationAddLayerNonAnimated: function (layer, newCluster) {
		if (newCluster === layer) {
			this._featureGroup.addLayer(layer);
		} else if (newCluster._childCount === 2) {
			newCluster._addToMap();

			var markers = newCluster.getAllChildMarkers();
			this._featureGroup.removeLayer(markers[0]);
			this._featureGroup.removeLayer(markers[1]);
		} else {
			newCluster._updateIcon();
		}
	},

	/**
	 * Extracts individual (i.e. non-group) layers from a Layer Group.
	 * @param group to extract layers from.
	 * @param output {Array} in which to store the extracted layers.
	 * @returns {*|Array}
	 * @private
	 */
	_extractNonGroupLayers: function (group, output) {
		var layers = group.getLayers(),
		    i = 0,
		    layer;

		output = output || [];

		for (; i < layers.length; i++) {
			layer = layers[i];

			if (layer instanceof L.LayerGroup) {
				this._extractNonGroupLayers(layer, output);
				continue;
			}

			output.push(layer);
		}

		return output;
	},

	/**
	 * Implements the singleMarkerMode option.
	 * @param layer Marker to re-style using the Clusters iconCreateFunction.
	 * @returns {L.Icon} The newly created icon.
	 * @private
	 */
	_overrideMarkerIcon: function (layer) {
		var icon = layer.options.icon = this.options.iconCreateFunction({
			getChildCount: function () {
				return 1;
			},
			getAllChildMarkers: function () {
				return [layer];
			}
		});

		return icon;
	}
});

// Constant bounds used in case option "removeOutsideVisibleBounds" is set to false.
L.MarkerClusterGroup.include({
	_mapBoundsInfinite: new L.LatLngBounds(new L.LatLng(-Infinity, -Infinity), new L.LatLng(Infinity, Infinity))
});

L.MarkerClusterGroup.include({
	_noAnimation: {
		//Non Animated versions of everything
		_animationStart: function () {
			//Do nothing...
		},
		_animationZoomIn: function (previousZoomLevel, newZoomLevel) {
			//this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), previousZoomLevel);
			//this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());

			//We didn't actually animate, but we use this event to mean "clustering animations have finished"
			this.fire('animationend');
		},
		_animationZoomOut: function (previousZoomLevel, newZoomLevel) {
			//this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), previousZoomLevel);
			//this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());

			//We didn't actually animate, but we use this event to mean "clustering animations have finished"
			this.fire('animationend');
		},
		_animationAddLayer: function (layer, newCluster) {
			this._animationAddLayerNonAnimated(layer, newCluster);
		}
	},

	_withAnimation: {
		//Animated versions here
		_animationStart: function () {
			this._map._mapPane.className += ' leaflet-cluster-anim';
			this._inZoomAnimation++;
		},

		_animationZoomIn: function (previousZoomLevel, newZoomLevel) {
			var bounds = this._getExpandedVisibleBounds(),
			    fg = this._featureGroup,
				minZoom = Math.floor(this._map.getMinZoom()),
			    i;

			this._ignoreMove = true;

			//Add all children of current clusters to map and remove those clusters from map
			this._topClusterLevel._recursively(bounds, previousZoomLevel, minZoom, function (c) {
				var startPos = c._latlng,
				    markers  = c._markers,
				    m;

				if (!bounds.contains(startPos)) {
					startPos = null;
				}

				if (c._isSingleParent() && previousZoomLevel + 1 === newZoomLevel) { //Immediately add the new child and remove us
					fg.removeLayer(c);
					c._recursivelyAddChildrenToMap(null, newZoomLevel, bounds);
				} else {
					//Fade out old cluster
					c.clusterHide();
					c._recursivelyAddChildrenToMap(startPos, newZoomLevel, bounds);
				}

				//Remove all markers that aren't visible any more
				//TODO: Do we actually need to do this on the higher levels too?
				for (i = markers.length - 1; i >= 0; i--) {
					m = markers[i];
					if (!bounds.contains(m._latlng)) {
						fg.removeLayer(m);
					}
				}

			});

			this._forceLayout();

			//Update opacities
			this._topClusterLevel._recursivelyBecomeVisible(bounds, newZoomLevel);
			//TODO Maybe? Update markers in _recursivelyBecomeVisible
			fg.eachLayer(function (n) {
				if (!(n instanceof L.MarkerCluster) && n._icon) {
					n.clusterShow();
				}
			});

			//update the positions of the just added clusters/markers
			this._topClusterLevel._recursively(bounds, previousZoomLevel, newZoomLevel, function (c) {
				c._recursivelyRestoreChildPositions(newZoomLevel);
			});

			this._ignoreMove = false;

			//Remove the old clusters and close the zoom animation
			this._enqueue(function () {
				//update the positions of the just added clusters/markers
				this._topClusterLevel._recursively(bounds, previousZoomLevel, minZoom, function (c) {
					fg.removeLayer(c);
					c.clusterShow();
				});

				this._animationEnd();
			});
		},

		_animationZoomOut: function (previousZoomLevel, newZoomLevel) {
			this._animationZoomOutSingle(this._topClusterLevel, previousZoomLevel - 1, newZoomLevel);

			//Need to add markers for those that weren't on the map before but are now
			//this._topClusterLevel._recursivelyAddChildrenToMap(null, newZoomLevel, this._getExpandedVisibleBounds());
			//Remove markers that were on the map before but won't be now
			this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, Math.floor(this._map.getMinZoom()), previousZoomLevel, this._getExpandedVisibleBounds());
		},

		_animationAddLayer: function (layer, newCluster) {
			var me = this,
			    fg = this._featureGroup;

			fg.addLayer(layer);
			if (newCluster !== layer) {
				if (newCluster._childCount > 2) { //Was already a cluster

					newCluster._updateIcon();
					this._forceLayout();
					this._animationStart();

					layer._setPos(this._map.latLngToLayerPoint(newCluster.getLatLng()));
					layer.clusterHide();

					this._enqueue(function () {
						fg.removeLayer(layer);
						layer.clusterShow();

						me._animationEnd();
					});

				} else { //Just became a cluster
					this._forceLayout();

					me._animationStart();
					me._animationZoomOutSingle(newCluster, this._map.getMaxZoom(), this._zoom);
				}
			}
		}
	},

	// Private methods for animated versions.
	_animationZoomOutSingle: function (cluster, previousZoomLevel, newZoomLevel) {
		var bounds = this._getExpandedVisibleBounds(),
			minZoom = Math.floor(this._map.getMinZoom());

		//Animate all of the markers in the clusters to move to their cluster center point
		cluster._recursivelyAnimateChildrenInAndAddSelfToMap(bounds, minZoom, previousZoomLevel + 1, newZoomLevel);

		var me = this;

		//Update the opacity (If we immediately set it they won't animate)
		this._forceLayout();
		cluster._recursivelyBecomeVisible(bounds, newZoomLevel);

		//TODO: Maybe use the transition timing stuff to make this more reliable
		//When the animations are done, tidy up
		this._enqueue(function () {

			//This cluster stopped being a cluster before the timeout fired
			if (cluster._childCount === 1) {
				var m = cluster._markers[0];
				//If we were in a cluster animation at the time then the opacity and position of our child could be wrong now, so fix it
				this._ignoreMove = true;
				m.setLatLng(m.getLatLng());
				this._ignoreMove = false;
				if (m.clusterShow) {
					m.clusterShow();
				}
			} else {
				cluster._recursively(bounds, newZoomLevel, minZoom, function (c) {
					c._recursivelyRemoveChildrenFromMap(bounds, minZoom, previousZoomLevel + 1);
				});
			}
			me._animationEnd();
		});
	},

	_animationEnd: function () {
		if (this._map) {
			this._map._mapPane.className = this._map._mapPane.className.replace(' leaflet-cluster-anim', '');
		}
		this._inZoomAnimation--;
		this.fire('animationend');
	},

	//Force a browser layout of stuff in the map
	// Should apply the current opacity and location to all elements so we can update them again for an animation
	_forceLayout: function () {
		//In my testing this works, infact offsetWidth of any element seems to work.
		//Could loop all this._layers and do this for each _icon if it stops working

		L.Util.falseFn(document.body.offsetWidth);
	}
});

L.markerClusterGroup = function (options) {
	return new L.MarkerClusterGroup(options);
};

var MarkerCluster = L.MarkerCluster = L.Marker.extend({
	options: L.Icon.prototype.options,

	initialize: function (group, zoom, a, b) {

		L.Marker.prototype.initialize.call(this, a ? (a._cLatLng || a.getLatLng()) : new L.LatLng(0, 0),
            { icon: this, pane: group.options.clusterPane });

		this._group = group;
		this._zoom = zoom;

		this._markers = [];
		this._childClusters = [];
		this._childCount = 0;
		this._iconNeedsUpdate = true;
		this._boundsNeedUpdate = true;

		this._bounds = new L.LatLngBounds();

		if (a) {
			this._addChild(a);
		}
		if (b) {
			this._addChild(b);
		}
	},

	//Recursively retrieve all child markers of this cluster
	getAllChildMarkers: function (storageArray, ignoreDraggedMarker) {
		storageArray = storageArray || [];

		for (var i = this._childClusters.length - 1; i >= 0; i--) {
			this._childClusters[i].getAllChildMarkers(storageArray);
		}

		for (var j = this._markers.length - 1; j >= 0; j--) {
			if (ignoreDraggedMarker && this._markers[j].__dragStart) {
				continue;
			}
			storageArray.push(this._markers[j]);
		}

		return storageArray;
	},

	//Returns the count of how many child markers we have
	getChildCount: function () {
		return this._childCount;
	},

	//Zoom to the minimum of showing all of the child markers, or the extents of this cluster
	zoomToBounds: function (fitBoundsOptions) {
		var childClusters = this._childClusters.slice(),
			map = this._group._map,
			boundsZoom = map.getBoundsZoom(this._bounds),
			zoom = this._zoom + 1,
			mapZoom = map.getZoom(),
			i;

		//calculate how far we need to zoom down to see all of the markers
		while (childClusters.length > 0 && boundsZoom > zoom) {
			zoom++;
			var newClusters = [];
			for (i = 0; i < childClusters.length; i++) {
				newClusters = newClusters.concat(childClusters[i]._childClusters);
			}
			childClusters = newClusters;
		}

		if (boundsZoom > zoom) {
			this._group._map.setView(this._latlng, zoom);
		} else if (boundsZoom <= mapZoom) { //If fitBounds wouldn't zoom us down, zoom us down instead
			this._group._map.setView(this._latlng, mapZoom + 1);
		} else {
			this._group._map.fitBounds(this._bounds, fitBoundsOptions);
		}
	},

	getBounds: function () {
		var bounds = new L.LatLngBounds();
		bounds.extend(this._bounds);
		return bounds;
	},

	_updateIcon: function () {
		this._iconNeedsUpdate = true;
		if (this._icon) {
			this.setIcon(this);
		}
	},

	//Cludge for Icon, we pretend to be an icon for performance
	createIcon: function () {
		if (this._iconNeedsUpdate) {
			this._iconObj = this._group.options.iconCreateFunction(this);
			this._iconNeedsUpdate = false;
		}
		return this._iconObj.createIcon();
	},
	createShadow: function () {
		return this._iconObj.createShadow();
	},


	_addChild: function (new1, isNotificationFromChild) {

		this._iconNeedsUpdate = true;

		this._boundsNeedUpdate = true;
		this._setClusterCenter(new1);

		if (new1 instanceof L.MarkerCluster) {
			if (!isNotificationFromChild) {
				this._childClusters.push(new1);
				new1.__parent = this;
			}
			this._childCount += new1._childCount;
		} else {
			if (!isNotificationFromChild) {
				this._markers.push(new1);
			}
			this._childCount++;
		}

		if (this.__parent) {
			this.__parent._addChild(new1, true);
		}
	},

	/**
	 * Makes sure the cluster center is set. If not, uses the child center if it is a cluster, or the marker position.
	 * @param child L.MarkerCluster|L.Marker that will be used as cluster center if not defined yet.
	 * @private
	 */
	_setClusterCenter: function (child) {
		if (!this._cLatLng) {
			// when clustering, take position of the first point as the cluster center
			this._cLatLng = child._cLatLng || child._latlng;
		}
	},

	/**
	 * Assigns impossible bounding values so that the next extend entirely determines the new bounds.
	 * This method avoids having to trash the previous L.LatLngBounds object and to create a new one, which is much slower for this class.
	 * As long as the bounds are not extended, most other methods would probably fail, as they would with bounds initialized but not extended.
	 * @private
	 */
	_resetBounds: function () {
		var bounds = this._bounds;

		if (bounds._southWest) {
			bounds._southWest.lat = Infinity;
			bounds._southWest.lng = Infinity;
		}
		if (bounds._northEast) {
			bounds._northEast.lat = -Infinity;
			bounds._northEast.lng = -Infinity;
		}
	},

	_recalculateBounds: function () {
		var markers = this._markers,
		    childClusters = this._childClusters,
		    latSum = 0,
		    lngSum = 0,
		    totalCount = this._childCount,
		    i, child, childLatLng, childCount;

		// Case where all markers are removed from the map and we are left with just an empty _topClusterLevel.
		if (totalCount === 0) {
			return;
		}

		// Reset rather than creating a new object, for performance.
		this._resetBounds();

		// Child markers.
		for (i = 0; i < markers.length; i++) {
			childLatLng = markers[i]._latlng;

			this._bounds.extend(childLatLng);

			latSum += childLatLng.lat;
			lngSum += childLatLng.lng;
		}

		// Child clusters.
		for (i = 0; i < childClusters.length; i++) {
			child = childClusters[i];

			// Re-compute child bounds and weighted position first if necessary.
			if (child._boundsNeedUpdate) {
				child._recalculateBounds();
			}

			this._bounds.extend(child._bounds);

			childLatLng = child._wLatLng;
			childCount = child._childCount;

			latSum += childLatLng.lat * childCount;
			lngSum += childLatLng.lng * childCount;
		}

		this._latlng = this._wLatLng = new L.LatLng(latSum / totalCount, lngSum / totalCount);

		// Reset dirty flag.
		this._boundsNeedUpdate = false;
	},

	//Set our markers position as given and add it to the map
	_addToMap: function (startPos) {
		if (startPos) {
			this._backupLatlng = this._latlng;
			this.setLatLng(startPos);
		}
		this._group._featureGroup.addLayer(this);
	},

	_recursivelyAnimateChildrenIn: function (bounds, center, maxZoom) {
		this._recursively(bounds, this._group._map.getMinZoom(), maxZoom - 1,
			function (c) {
				var markers = c._markers,
					i, m;
				for (i = markers.length - 1; i >= 0; i--) {
					m = markers[i];

					//Only do it if the icon is still on the map
					if (m._icon) {
						m._setPos(center);
						m.clusterHide();
					}
				}
			},
			function (c) {
				var childClusters = c._childClusters,
					j, cm;
				for (j = childClusters.length - 1; j >= 0; j--) {
					cm = childClusters[j];
					if (cm._icon) {
						cm._setPos(center);
						cm.clusterHide();
					}
				}
			}
		);
	},

	_recursivelyAnimateChildrenInAndAddSelfToMap: function (bounds, mapMinZoom, previousZoomLevel, newZoomLevel) {
		this._recursively(bounds, newZoomLevel, mapMinZoom,
			function (c) {
				c._recursivelyAnimateChildrenIn(bounds, c._group._map.latLngToLayerPoint(c.getLatLng()).round(), previousZoomLevel);

				//TODO: depthToAnimateIn affects _isSingleParent, if there is a multizoom we may/may not be.
				//As a hack we only do a animation free zoom on a single level zoom, if someone does multiple levels then we always animate
				if (c._isSingleParent() && previousZoomLevel - 1 === newZoomLevel) {
					c.clusterShow();
					c._recursivelyRemoveChildrenFromMap(bounds, mapMinZoom, previousZoomLevel); //Immediately remove our children as we are replacing them. TODO previousBounds not bounds
				} else {
					c.clusterHide();
				}

				c._addToMap();
			}
		);
	},

	_recursivelyBecomeVisible: function (bounds, zoomLevel) {
		this._recursively(bounds, this._group._map.getMinZoom(), zoomLevel, null, function (c) {
			c.clusterShow();
		});
	},

	_recursivelyAddChildrenToMap: function (startPos, zoomLevel, bounds) {
		this._recursively(bounds, this._group._map.getMinZoom() - 1, zoomLevel,
			function (c) {
				if (zoomLevel === c._zoom) {
					return;
				}

				//Add our child markers at startPos (so they can be animated out)
				for (var i = c._markers.length - 1; i >= 0; i--) {
					var nm = c._markers[i];

					if (!bounds.contains(nm._latlng)) {
						continue;
					}

					if (startPos) {
						nm._backupLatlng = nm.getLatLng();

						nm.setLatLng(startPos);
						if (nm.clusterHide) {
							nm.clusterHide();
						}
					}

					c._group._featureGroup.addLayer(nm);
				}
			},
			function (c) {
				c._addToMap(startPos);
			}
		);
	},

	_recursivelyRestoreChildPositions: function (zoomLevel) {
		//Fix positions of child markers
		for (var i = this._markers.length - 1; i >= 0; i--) {
			var nm = this._markers[i];
			if (nm._backupLatlng) {
				nm.setLatLng(nm._backupLatlng);
				delete nm._backupLatlng;
			}
		}

		if (zoomLevel - 1 === this._zoom) {
			//Reposition child clusters
			for (var j = this._childClusters.length - 1; j >= 0; j--) {
				this._childClusters[j]._restorePosition();
			}
		} else {
			for (var k = this._childClusters.length - 1; k >= 0; k--) {
				this._childClusters[k]._recursivelyRestoreChildPositions(zoomLevel);
			}
		}
	},

	_restorePosition: function () {
		if (this._backupLatlng) {
			this.setLatLng(this._backupLatlng);
			delete this._backupLatlng;
		}
	},

	//exceptBounds: If set, don't remove any markers/clusters in it
	_recursivelyRemoveChildrenFromMap: function (previousBounds, mapMinZoom, zoomLevel, exceptBounds) {
		var m, i;
		this._recursively(previousBounds, mapMinZoom - 1, zoomLevel - 1,
			function (c) {
				//Remove markers at every level
				for (i = c._markers.length - 1; i >= 0; i--) {
					m = c._markers[i];
					if (!exceptBounds || !exceptBounds.contains(m._latlng)) {
						c._group._featureGroup.removeLayer(m);
						if (m.clusterShow) {
							m.clusterShow();
						}
					}
				}
			},
			function (c) {
				//Remove child clusters at just the bottom level
				for (i = c._childClusters.length - 1; i >= 0; i--) {
					m = c._childClusters[i];
					if (!exceptBounds || !exceptBounds.contains(m._latlng)) {
						c._group._featureGroup.removeLayer(m);
						if (m.clusterShow) {
							m.clusterShow();
						}
					}
				}
			}
		);
	},

	//Run the given functions recursively to this and child clusters
	// boundsToApplyTo: a L.LatLngBounds representing the bounds of what clusters to recurse in to
	// zoomLevelToStart: zoom level to start running functions (inclusive)
	// zoomLevelToStop: zoom level to stop running functions (inclusive)
	// runAtEveryLevel: function that takes an L.MarkerCluster as an argument that should be applied on every level
	// runAtBottomLevel: function that takes an L.MarkerCluster as an argument that should be applied at only the bottom level
	_recursively: function (boundsToApplyTo, zoomLevelToStart, zoomLevelToStop, runAtEveryLevel, runAtBottomLevel) {
		var childClusters = this._childClusters,
		    zoom = this._zoom,
		    i, c;

		if (zoomLevelToStart <= zoom) {
			if (runAtEveryLevel) {
				runAtEveryLevel(this);
			}
			if (runAtBottomLevel && zoom === zoomLevelToStop) {
				runAtBottomLevel(this);
			}
		}

		if (zoom < zoomLevelToStart || zoom < zoomLevelToStop) {
			for (i = childClusters.length - 1; i >= 0; i--) {
				c = childClusters[i];
				if (c._boundsNeedUpdate) {
					c._recalculateBounds();
				}
				if (boundsToApplyTo.intersects(c._bounds)) {
					c._recursively(boundsToApplyTo, zoomLevelToStart, zoomLevelToStop, runAtEveryLevel, runAtBottomLevel);
				}
			}
		}
	},

	//Returns true if we are the parent of only one cluster and that cluster is the same as us
	_isSingleParent: function () {
		//Don't need to check this._markers as the rest won't work if there are any
		return this._childClusters.length > 0 && this._childClusters[0]._childCount === this._childCount;
	}
});

/*
* Extends L.Marker to include two extra methods: clusterHide and clusterShow.
* 
* They work as setOpacity(0) and setOpacity(1) respectively, but
* don't overwrite the options.opacity
* 
*/

L.Marker.include({
	clusterHide: function () {
		var backup = this.options.opacity;
		this.setOpacity(0);
		this.options.opacity = backup;
		return this;
	},
	
	clusterShow: function () {
		return this.setOpacity(this.options.opacity);
	}
});

L.DistanceGrid = function (cellSize) {
	this._cellSize = cellSize;
	this._sqCellSize = cellSize * cellSize;
	this._grid = {};
	this._objectPoint = { };
};

L.DistanceGrid.prototype = {

	addObject: function (obj, point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    grid = this._grid,
		    row = grid[y] = grid[y] || {},
		    cell = row[x] = row[x] || [],
		    stamp = L.Util.stamp(obj);

		this._objectPoint[stamp] = point;

		cell.push(obj);
	},

	updateObject: function (obj, point) {
		this.removeObject(obj);
		this.addObject(obj, point);
	},

	//Returns true if the object was found
	removeObject: function (obj, point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    grid = this._grid,
		    row = grid[y] = grid[y] || {},
		    cell = row[x] = row[x] || [],
		    i, len;

		delete this._objectPoint[L.Util.stamp(obj)];

		for (i = 0, len = cell.length; i < len; i++) {
			if (cell[i] === obj) {

				cell.splice(i, 1);

				if (len === 1) {
					delete row[x];
				}

				return true;
			}
		}

	},

	eachObject: function (fn, context) {
		var i, j, k, len, row, cell, removed,
		    grid = this._grid;

		for (i in grid) {
			row = grid[i];

			for (j in row) {
				cell = row[j];

				for (k = 0, len = cell.length; k < len; k++) {
					removed = fn.call(context, cell[k]);
					if (removed) {
						k--;
						len--;
					}
				}
			}
		}
	},

	getNearObject: function (point) {
		var x = this._getCoord(point.x),
		    y = this._getCoord(point.y),
		    i, j, k, row, cell, len, obj, dist,
		    objectPoint = this._objectPoint,
		    closestDistSq = this._sqCellSize,
		    closest = null;

		for (i = y - 1; i <= y + 1; i++) {
			row = this._grid[i];
			if (row) {

				for (j = x - 1; j <= x + 1; j++) {
					cell = row[j];
					if (cell) {

						for (k = 0, len = cell.length; k < len; k++) {
							obj = cell[k];
							dist = this._sqDist(objectPoint[L.Util.stamp(obj)], point);
							if (dist < closestDistSq ||
								dist <= closestDistSq && closest === null) {
								closestDistSq = dist;
								closest = obj;
							}
						}
					}
				}
			}
		}
		return closest;
	},

	_getCoord: function (x) {
		var coord = Math.floor(x / this._cellSize);
		return isFinite(coord) ? coord : x;
	},

	_sqDist: function (p, p2) {
		var dx = p2.x - p.x,
		    dy = p2.y - p.y;
		return dx * dx + dy * dy;
	}
};

/* Copyright (c) 2012 the authors listed at the following URL, and/or
the authors of referenced articles or incorporated external code:
http://en.literateprograms.org/Quickhull_(Javascript)?action=history&offset=20120410175256

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Retrieved from: http://en.literateprograms.org/Quickhull_(Javascript)?oldid=18434
*/

(function () {
	L.QuickHull = {

		/*
		 * @param {Object} cpt a point to be measured from the baseline
		 * @param {Array} bl the baseline, as represented by a two-element
		 *   array of latlng objects.
		 * @returns {Number} an approximate distance measure
		 */
		getDistant: function (cpt, bl) {
			var vY = bl[1].lat - bl[0].lat,
				vX = bl[0].lng - bl[1].lng;
			return (vX * (cpt.lat - bl[0].lat) + vY * (cpt.lng - bl[0].lng));
		},

		/*
		 * @param {Array} baseLine a two-element array of latlng objects
		 *   representing the baseline to project from
		 * @param {Array} latLngs an array of latlng objects
		 * @returns {Object} the maximum point and all new points to stay
		 *   in consideration for the hull.
		 */
		findMostDistantPointFromBaseLine: function (baseLine, latLngs) {
			var maxD = 0,
				maxPt = null,
				newPoints = [],
				i, pt, d;

			for (i = latLngs.length - 1; i >= 0; i--) {
				pt = latLngs[i];
				d = this.getDistant(pt, baseLine);

				if (d > 0) {
					newPoints.push(pt);
				} else {
					continue;
				}

				if (d > maxD) {
					maxD = d;
					maxPt = pt;
				}
			}

			return { maxPoint: maxPt, newPoints: newPoints };
		},


		/*
		 * Given a baseline, compute the convex hull of latLngs as an array
		 * of latLngs.
		 *
		 * @param {Array} latLngs
		 * @returns {Array}
		 */
		buildConvexHull: function (baseLine, latLngs) {
			var convexHullBaseLines = [],
				t = this.findMostDistantPointFromBaseLine(baseLine, latLngs);

			if (t.maxPoint) { // if there is still a point "outside" the base line
				convexHullBaseLines =
					convexHullBaseLines.concat(
						this.buildConvexHull([baseLine[0], t.maxPoint], t.newPoints)
					);
				convexHullBaseLines =
					convexHullBaseLines.concat(
						this.buildConvexHull([t.maxPoint, baseLine[1]], t.newPoints)
					);
				return convexHullBaseLines;
			} else {  // if there is no more point "outside" the base line, the current base line is part of the convex hull
				return [baseLine[0]];
			}
		},

		/*
		 * Given an array of latlngs, compute a convex hull as an array
		 * of latlngs
		 *
		 * @param {Array} latLngs
		 * @returns {Array}
		 */
		getConvexHull: function (latLngs) {
			// find first baseline
			var maxLat = false, minLat = false,
				maxLng = false, minLng = false,
				maxLatPt = null, minLatPt = null,
				maxLngPt = null, minLngPt = null,
				maxPt = null, minPt = null,
				i;

			for (i = latLngs.length - 1; i >= 0; i--) {
				var pt = latLngs[i];
				if (maxLat === false || pt.lat > maxLat) {
					maxLatPt = pt;
					maxLat = pt.lat;
				}
				if (minLat === false || pt.lat < minLat) {
					minLatPt = pt;
					minLat = pt.lat;
				}
				if (maxLng === false || pt.lng > maxLng) {
					maxLngPt = pt;
					maxLng = pt.lng;
				}
				if (minLng === false || pt.lng < minLng) {
					minLngPt = pt;
					minLng = pt.lng;
				}
			}
			
			if (minLat !== maxLat) {
				minPt = minLatPt;
				maxPt = maxLatPt;
			} else {
				minPt = minLngPt;
				maxPt = maxLngPt;
			}

			var ch = [].concat(this.buildConvexHull([minPt, maxPt], latLngs),
								this.buildConvexHull([maxPt, minPt], latLngs));
			return ch;
		}
	};
}());

L.MarkerCluster.include({
	getConvexHull: function () {
		var childMarkers = this.getAllChildMarkers(),
			points = [],
			p, i;

		for (i = childMarkers.length - 1; i >= 0; i--) {
			p = childMarkers[i].getLatLng();
			points.push(p);
		}

		return L.QuickHull.getConvexHull(points);
	}
});

//This code is 100% based on https://github.com/jawj/OverlappingMarkerSpiderfier-Leaflet
//Huge thanks to jawj for implementing it first to make my job easy :-)

L.MarkerCluster.include({

	_2PI: Math.PI * 2,
	_circleFootSeparation: 25, //related to circumference of circle
	_circleStartAngle: 0,

	_spiralFootSeparation:  28, //related to size of spiral (experiment!)
	_spiralLengthStart: 11,
	_spiralLengthFactor: 5,

	_circleSpiralSwitchover: 9, //show spiral instead of circle from this marker count upwards.
								// 0 -> always spiral; Infinity -> always circle

	spiderfy: function () {
		if (this._group._spiderfied === this || this._group._inZoomAnimation) {
			return;
		}

		var childMarkers = this.getAllChildMarkers(null, true),
			group = this._group,
			map = group._map,
			center = map.latLngToLayerPoint(this._latlng),
			positions;

			
		// Disable action if all children are hidden.
		var hidden = true;
		for(var i in childMarkers) { if(childMarkers[i].options.opacity == 1) { hidden = false; } }
		if(hidden) { return; }
		
		this._group._unspiderfy();
		this._group._spiderfied = this;

		//TODO Maybe: childMarkers order by distance to center

		if (childMarkers.length >= this._circleSpiralSwitchover) {
			positions = this._generatePointsSpiral(childMarkers.length, center);
		} else {
			center.y += 10; // Otherwise circles look wrong => hack for standard blue icon, renders differently for other icons.
			positions = this._generatePointsCircle(childMarkers.length, center);
		}

		this._animationSpiderfy(childMarkers, positions);
	},

	unspiderfy: function (zoomDetails) {
		/// <param Name="zoomDetails">Argument from zoomanim if being called in a zoom animation or null otherwise</param>
		if (this._group._inZoomAnimation) {
			return;
		}
		this._animationUnspiderfy(zoomDetails);

		this._group._spiderfied = null;
	},

	_generatePointsCircle: function (count, centerPt) {
		var circumference = this._group.options.spiderfyDistanceMultiplier * this._circleFootSeparation * (2 + count),
			legLength = circumference / this._2PI,  //radius from circumference
			angleStep = this._2PI / count,
			res = [],
			i, angle;

		legLength = Math.max(legLength, 35); // Minimum distance to get outside the cluster icon.

		res.length = count;

		for (i = 0; i < count; i++) { // Clockwise, like spiral.
			angle = this._circleStartAngle + i * angleStep;
			res[i] = new L.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle))._round();
		}

		return res;
	},

	_generatePointsSpiral: function (count, centerPt) {
		var spiderfyDistanceMultiplier = this._group.options.spiderfyDistanceMultiplier,
			legLength = spiderfyDistanceMultiplier * this._spiralLengthStart,
			separation = spiderfyDistanceMultiplier * this._spiralFootSeparation,
			lengthFactor = spiderfyDistanceMultiplier * this._spiralLengthFactor * this._2PI,
			angle = 0,
			res = [],
			i;

		res.length = count;

		// Higher index, closer position to cluster center.
		for (i = count; i >= 0; i--) {
			// Skip the first position, so that we are already farther from center and we avoid
			// being under the default cluster icon (especially important for Circle Markers).
			if (i < count) {
				res[i] = new L.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle))._round();
			}
			angle += separation / legLength + i * 0.0005;
			legLength += lengthFactor / angle;
		}
		return res;
	},

	_noanimationUnspiderfy: function () {
		var group = this._group,
			map = group._map,
			fg = group._featureGroup,
			childMarkers = this.getAllChildMarkers(null, true),
			m, i;

		group._ignoreMove = true;

		this.setOpacity(1);
		for (i = childMarkers.length - 1; i >= 0; i--) {
			m = childMarkers[i];

			fg.removeLayer(m);

			if (m._preSpiderfyLatlng) {
				m.setLatLng(m._preSpiderfyLatlng);
				delete m._preSpiderfyLatlng;
			}
			if (m.setZIndexOffset) {
				m.setZIndexOffset(0);
			}

			if (m._spiderLeg) {
				map.removeLayer(m._spiderLeg);
				delete m._spiderLeg;
			}
		}

		group.fire('unspiderfied', {
			cluster: this,
			markers: childMarkers
		});
		group._ignoreMove = false;
		group._spiderfied = null;
	}
});

//Non Animated versions of everything
L.MarkerClusterNonAnimated = L.MarkerCluster.extend({
	_animationSpiderfy: function (childMarkers, positions) {
		var group = this._group,
			map = group._map,
			fg = group._featureGroup,
			legOptions = this._group.options.spiderLegPolylineOptions,
			i, m, leg, newPos;

		group._ignoreMove = true;

		// Traverse in ascending order to make sure that inner circleMarkers are on top of further legs. Normal markers are re-ordered by newPosition.
		// The reverse order trick no longer improves performance on modern browsers.
		for (i = 0; i < childMarkers.length; i++) {
			newPos = map.layerPointToLatLng(positions[i]);
			m = childMarkers[i];
			
			// Add the leg before the marker, so that in case the latter is a circleMarker, the leg is behind it.
			leg = new L.Polyline([this._latlng, newPos], legOptions);
			
			// TODO : Could hide the leg here, but we need a way to bring it back when search is cleared.
			//if(m.options.opacity != 0.1) {
				map.addLayer(leg);
			//}
			m._spiderLeg = leg;

			// Now add the marker.
			m._preSpiderfyLatlng = m._latlng;
			m.setLatLng(newPos);
			if (m.setZIndexOffset) {
				m.setZIndexOffset(1000000); //Make these appear on top of EVERYTHING
			}

			fg.addLayer(m);
		}
		this.setOpacity(1);

		group._ignoreMove = false;
		group.fire('spiderfied', {
			cluster: this,
			markers: childMarkers
		});
	},

	_animationUnspiderfy: function () {
		this._noanimationUnspiderfy();
	}
});

//Animated versions here
L.MarkerCluster.include({

	_animationSpiderfy: function (childMarkers, positions) {
		var me = this,
			group = this._group,
			map = group._map,
			fg = group._featureGroup,
			thisLayerLatLng = this._latlng,
			thisLayerPos = map.latLngToLayerPoint(thisLayerLatLng),
			svg = L.Path.SVG,
			legOptions = L.extend({}, this._group.options.spiderLegPolylineOptions), // Copy the options so that we can modify them for animation.
			finalLegOpacity = legOptions.opacity,
			i, m, leg, legPath, legLength, newPos;

		if (finalLegOpacity === undefined) {
			finalLegOpacity = L.MarkerClusterGroup.prototype.options.spiderLegPolylineOptions.opacity;
		}

		if (svg) {
			// If the initial opacity of the spider leg is not 0 then it appears before the animation starts.
			legOptions.opacity = 0;

			// Add the class for CSS transitions.
			legOptions.className = (legOptions.className || '') + ' leaflet-cluster-spider-leg';
		} else {
			// Make sure we have a defined opacity.
			legOptions.opacity = finalLegOpacity;
		}

		group._ignoreMove = true;

		// Add markers and spider legs to map, hidden at our center point.
		// Traverse in ascending order to make sure that inner circleMarkers are on top of further legs. Normal markers are re-ordered by newPosition.
		// The reverse order trick no longer improves performance on modern browsers.
		for (i = 0; i < childMarkers.length; i++) {
			m = childMarkers[i];

			newPos = map.layerPointToLatLng(positions[i]);

			// Add the leg before the marker, so that in case the latter is a circleMarker, the leg is behind it.
			leg = new L.Polyline([thisLayerLatLng, newPos], legOptions);
			map.addLayer(leg);
			m._spiderLeg = leg;

			// Explanations: https://jakearchibald.com/2013/animated-line-drawing-svg/
			// In our case the transition property is declared in the CSS file.
			if (svg) {
				legPath = leg._path;
				legLength = legPath.getTotalLength() + 0.1; // Need a small extra length to avoid remaining dot in Firefox.
				legPath.style.strokeDasharray = legLength; // Just 1 length is enough, it will be duplicated.
				legPath.style.strokeDashoffset = legLength;
			}

			// If it is a marker, add it now and we'll animate it out
			if (m.setZIndexOffset) {
				m.setZIndexOffset(1000000); // Make normal markers appear on top of EVERYTHING
			}
			if (m.clusterHide) {
				m.clusterHide();
			}
			
			// Vectors just get immediately added
			fg.addLayer(m);

			if (m._setPos) {
				m._setPos(thisLayerPos);
			}
		}

		group._forceLayout();
		group._animationStart();

		// Reveal markers and spider legs.
		for (i = childMarkers.length - 1; i >= 0; i--) {
			newPos = map.layerPointToLatLng(positions[i]);
			m = childMarkers[i];

			//Move marker to new position
			m._preSpiderfyLatlng = m._latlng;
			m.setLatLng(newPos);
			
			if (m.clusterShow) {
				m.clusterShow();
			}

			// Animate leg (animation is actually delegated to CSS transition).
			if (svg) {
				leg = m._spiderLeg;
				legPath = leg._path;
				legPath.style.strokeDashoffset = 0;
				//legPath.style.strokeOpacity = finalLegOpacity;
				leg.setStyle({opacity: finalLegOpacity});
			}
		}
		this.setOpacity(0.1);

		group._ignoreMove = false;

		setTimeout(function () {
			group._animationEnd();
			group.fire('spiderfied', {
				cluster: me,
				markers: childMarkers
			});
		}, 200);
	},

	_animationUnspiderfy: function (zoomDetails) {
		var me = this,
			group = this._group,
			map = group._map,
			fg = group._featureGroup,
			thisLayerPos = zoomDetails ? map._latLngToNewLayerPoint(this._latlng, zoomDetails.zoom, zoomDetails.center) : map.latLngToLayerPoint(this._latlng),
			childMarkers = this.getAllChildMarkers(null, true),
			svg = L.Path.SVG,
			m, i, leg, legPath, legLength, nonAnimatable;

		group._ignoreMove = true;
		group._animationStart();

		//Make us visible and bring the child markers back in
		this.setOpacity(1);
		for (i = childMarkers.length - 1; i >= 0; i--) {
			m = childMarkers[i];

			//Marker was added to us after we were spiderfied
			if (!m._preSpiderfyLatlng) {
				continue;
			}

			//Close any popup on the marker first, otherwise setting the location of the marker will make the map scroll
			m.closePopup();

			//Fix up the location to the real one
			m.setLatLng(m._preSpiderfyLatlng);
			delete m._preSpiderfyLatlng;

			//Hack override the location to be our center
			nonAnimatable = true;
			if (m._setPos) {
				m._setPos(thisLayerPos);
				nonAnimatable = false;
			}
			if (m.clusterHide) {
				m.clusterHide();
				nonAnimatable = false;
			}
			if (nonAnimatable) {
				fg.removeLayer(m);
			}

			// Animate the spider leg back in (animation is actually delegated to CSS transition).
			if (svg) {
				leg = m._spiderLeg;
				legPath = leg._path;
				legLength = legPath.getTotalLength() + 0.1;
				legPath.style.strokeDashoffset = legLength;
				leg.setStyle({opacity: 0});
			}
		}

		group._ignoreMove = false;

		setTimeout(function () {
			//If we have only <= one child left then that marker will be shown on the map so don't remove it!
			var stillThereChildCount = 0;
			for (i = childMarkers.length - 1; i >= 0; i--) {
				m = childMarkers[i];
				if (m._spiderLeg) {
					stillThereChildCount++;
				}
			}


			for (i = childMarkers.length - 1; i >= 0; i--) {
				m = childMarkers[i];

				if (!m._spiderLeg) { //Has already been unspiderfied
					continue;
				}

				if (m.clusterShow) {
					m.clusterShow();
				}
				if (m.setZIndexOffset) {
					m.setZIndexOffset(0);
				}

				if (stillThereChildCount > 1) {
					fg.removeLayer(m);
				}

				map.removeLayer(m._spiderLeg);
				delete m._spiderLeg;
			}
			group._animationEnd();
			group.fire('unspiderfied', {
				cluster: me,
				markers: childMarkers
			});
		}, 200);
	}
});


L.MarkerClusterGroup.include({
	//The MarkerCluster currently spiderfied (if any)
	_spiderfied: null,

	unspiderfy: function () {
		this._unspiderfy.apply(this, arguments);
	},

	_spiderfierOnAdd: function () {
		this._map.on('click', this._unspiderfyWrapper, this);

		if (this._map.options.zoomAnimation) {
			//this._map.on('zoomstart', this._unspiderfyZoomStart, this);
		}
		//Browsers without zoomAnimation or a big zoom don't fire zoomstart
		//this._map.on('zoomend', this._noanimationUnspiderfy, this);

		if (!L.Browser.touch) {
			this._map.getRenderer(this);
			//Needs to happen in the pageload, not after, or animations don't work in webkit
			//  http://stackoverflow.com/questions/8455200/svg-animate-with-dynamically-added-elements
			//Disable on touch browsers as the animation messes up on a touch zoom and isn't very noticable
		}
	},

	_spiderfierOnRemove: function () {
		this._map.off('click', this._unspiderfyWrapper, this);
		//this._map.off('zoomstart', this._unspiderfyZoomStart, this);
		//this._map.off('zoomanim', this._unspiderfyZoomAnim, this);
		//this._map.off('zoomend', this._noanimationUnspiderfy, this);

		//Ensure that markers are back where they should be
		// Use no animation to avoid a sticky leaflet-cluster-anim class on mapPane
		this._noanimationUnspiderfy();
	},

	//On zoom start we add a zoomanim handler so that we are guaranteed to be last (after markers are animated)
	//This means we can define the animation they do rather than Markers doing an animation to their actual location
	_unspiderfyZoomStart: function () {
		if (!this._map) { //May have been removed from the map by a zoomEnd handler
			return;
		}

		//this._map.on('zoomanim', this._unspiderfyZoomAnim, this);
	},

	_unspiderfyZoomAnim: function (zoomDetails) {
		//Wait until the first zoomanim after the user has finished touch-zooming before running the animation
		if (L.DomUtil.hasClass(this._map._mapPane, 'leaflet-touching')) {
			return;
		}

		//this._map.off('zoomanim', this._unspiderfyZoomAnim, this);
		this._unspiderfy(zoomDetails);
	},

	_unspiderfyWrapper: function () {
		/// <summary>_unspiderfy but passes no arguments</summary>
		MI.scview.active_point = null;
		this._unspiderfy();
	},

	_unspiderfy: function (zoomDetails) {
		if (this._spiderfied) {
			this._spiderfied.unspiderfy(zoomDetails);
		}
	},

	_noanimationUnspiderfy: function () {
		if (this._spiderfied) {
			this._spiderfied._noanimationUnspiderfy();
		}
	},

	//If the given layer is currently being spiderfied then we unspiderfy it so it isn't on the map anymore etc
	_unspiderfyLayer: function (layer) {
		if (layer._spiderLeg) {
			this._featureGroup.removeLayer(layer);

			if (layer.clusterShow) {
				layer.clusterShow();
			}
				//Position will be fixed up immediately in _animationUnspiderfy
			if (layer.setZIndexOffset) {
				layer.setZIndexOffset(0);
			}

			this._map.removeLayer(layer._spiderLeg);
			delete layer._spiderLeg;
		}
	}
});

/**
 * Adds 1 public method to MCG and 1 to L.Marker to facilitate changing
 * markers' icon options and refreshing their icon and their parent clusters
 * accordingly (case where their iconCreateFunction uses data of childMarkers
 * to make up the cluster icon).
 */


L.MarkerClusterGroup.include({
	/**
	 * Updates the icon of all clusters which are parents of the given marker(s).
	 * In singleMarkerMode, also updates the given marker(s) icon.
	 * @param layers L.MarkerClusterGroup|L.LayerGroup|Array(L.Marker)|Map(L.Marker)|
	 * L.MarkerCluster|L.Marker (optional) list of markers (or single marker) whose parent
	 * clusters need to be updated. If not provided, retrieves all child markers of this.
	 * @returns {L.MarkerClusterGroup}
	 */
	refreshClusters: function (layers) {
		if (!layers) {
			layers = this._topClusterLevel.getAllChildMarkers();
		} else if (layers instanceof L.MarkerClusterGroup) {
			layers = layers._topClusterLevel.getAllChildMarkers();
		} else if (layers instanceof L.LayerGroup) {
			layers = layers._layers;
		} else if (layers instanceof L.MarkerCluster) {
			layers = layers.getAllChildMarkers();
		} else if (layers instanceof L.Marker) {
			layers = [layers];
		} // else: must be an Array(L.Marker)|Map(L.Marker)
		this._flagParentsIconsNeedUpdate(layers);
		this._refreshClustersIcons();

		// In case of singleMarkerMode, also re-draw the markers.
		if (this.options.singleMarkerMode) {
			this._refreshSingleMarkerModeMarkers(layers);
		}

		return this;
	},

	/**
	 * Simply flags all parent clusters of the given markers as having a "dirty" icon.
	 * @param layers Array(L.Marker)|Map(L.Marker) list of markers.
	 * @private
	 */
	_flagParentsIconsNeedUpdate: function (layers) {
		var id, parent;

		// Assumes layers is an Array or an Object whose prototype is non-enumerable.
		for (id in layers) {
			// Flag parent clusters' icon as "dirty", all the way up.
			// Dumb process that flags multiple times upper parents, but still
			// much more efficient than trying to be smart and make short lists,
			// at least in the case of a hierarchy following a power law:
			// http://jsperf.com/flag-nodes-in-power-hierarchy/2
			parent = layers[id].__parent;
			while (parent) {
				parent._iconNeedsUpdate = true;
				parent = parent.__parent;
			}
		}
	},

	/**
	 * Re-draws the icon of the supplied markers.
	 * To be used in singleMarkerMode only.
	 * @param layers Array(L.Marker)|Map(L.Marker) list of markers.
	 * @private
	 */
	_refreshSingleMarkerModeMarkers: function (layers) {
		var id, layer;

		for (id in layers) {
			layer = layers[id];

			// Make sure we do not override markers that do not belong to THIS group.
			if (this.hasLayer(layer)) {
				// Need to re-create the icon first, then re-draw the marker.
				layer.setIcon(this._overrideMarkerIcon(layer));
			}
		}
	}
});

L.Marker.include({
	/**
	 * Updates the given options in the marker's icon and refreshes the marker.
	 * @param options map object of icon options.
	 * @param directlyRefreshClusters boolean (optional) true to trigger
	 * MCG.refreshClustersOf() right away with this single marker.
	 * @returns {L.Marker}
	 */
	refreshIconOptions: function (options, directlyRefreshClusters) {
		var icon = this.options.icon;

		L.setOptions(icon, options);

		this.setIcon(icon);

		// Shortcut to refresh the associated MCG clusters right away.
		// To be used when refreshing a single marker.
		// Otherwise, better use MCG.refreshClusters() once at the end with
		// the list of modified markers.
		if (directlyRefreshClusters && this.__parent) {
			this.__parent._group.refreshClusters(this);
		}

		return this;
	}
});

exports.MarkerClusterGroup = MarkerClusterGroup;
exports.MarkerCluster = MarkerCluster;

}))); /* Native Grate Code */
Grate = {};
Grate.great_circle_route = function(pt1, pt2, ttl, bounds) {
    var gc = new arc.GreatCircle(new arc.Coord(pt1[0], pt1[1]), new arc.Coord(pt2[0], pt2[1]));	    
	var line = gc.Arc(200);	   
	return [bezier(line.geometries[0].coords)];
}

function bezier(pts) {
    function curve(points) {
        var c = [];
        var steps = 40;

        for (var i = 0; i <= steps; i++) {
            var t = i / steps;

            var pt = [
                Math.pow(1 - t, 3) * points[0][0]
                 + 3 * t * Math.pow(1 - t, 2) * points[1][0]
                 + 3 * (1 - t) * Math.pow(t, 2) * points[2][0]
                 + Math.pow(t, 3) * points[3][0],
                Math.pow(1 - t, 3) * points[0][1]
                 + 3 * t * Math.pow(1-t,2) * points[1][1]
                 + 3 * (1-t) * Math.pow(t,2) * points[2][1]
                 + Math.pow(t, 3) * points[3][1]
            ];
            c.push(pt);
        }
        return c;
    }

    var c = [];

    if (pts.length < 4) return pts;

    for (var i = 0; i < pts.length; i += 3) {
        if (i + 4 <= pts.length) {
            c = c.concat(curve(pts.slice(i, i + 4)));
        }
    }

    return c;
}

Grate.bezier_route = function(from, to) {
    var x0 = from[0];
    var y0 = from[1];
    var x1 = to[0];
    var y1 = to[1];

    var dx = x1 - x0;
    var dy = y1 - y0;

    var bzx = x0 + dx/4;
    var bzy = y1;

    var res = 100;

    var pts = [];
    for(var t=0.0; t<1.0; t += 1.0/res) {
        var x = (1-t) * (1-t) * x0 + 2 * (1-t) * t * bzx + t * t * x1;
        var y = (1-t) * (1-t) * y0 + 2 * (1-t) * t * bzy + t * t * y1;
        pts.push([x, y]);
    }
    if(!(to[0] == pts[pts.length-1][0] && to[1] == pts[pts.length-1][1])) {
		var to_clone = [to[0],to[1]];
        pts.push(to_clone);
		
	}
    return [pts];
}

// Arc.js Compatible Code
var D2R = Math.PI / 180;
var R2D = 180 / Math.PI;

var Coord = function(lon,lat) {
    this.lon = lon;
    this.lat = lat;
    this.x = D2R * lon;
    this.y = D2R * lat;
};

Coord.prototype.view = function() {
    return String(this.lon).slice(0, 4) + ',' + String(this.lat).slice(0, 4);
};

Coord.prototype.antipode = function() {

    var anti_lat = -1 * this.lat;
    if (this.lon < 0) {
        var anti_lon = 180 + this.lon;
    } else {
        var anti_lon = (180 - this.lon) * -1;
    }
    return new Coord(anti_lon, anti_lat);
};

var LineString = function() {
    this.coords = [];
    this.length = 0;
};

LineString.prototype.move_to = function(coord) {
    this.length++;
    this.coords.push(coord);
};

var Arc = function(properties) {
    this.properties = properties || {};
    this.geometries = []
};

Arc.prototype.json = function() {
    if (this.geometries.length <= 0) {
        return {'geometry': { 'type': 'LineString', 'coordinates': null },
                'type': 'Feature', 'properties': this.properties
               };
    } else if (this.geometries.length == 1) {
        return {'geometry': { 'type': 'LineString', 'coordinates': this.geometries[0].coords },
                'type': 'Feature', 'properties': this.properties
               };
    } else {
        var multiline = []
        for (i = 0; i < this.geometries.length; i++) {
            multiline.push(this.geometries[i].coords);
        }
        return {'geometry': { 'type': 'MultiLineString', 'coordinates': multiline },
                'type': 'Feature', 'properties': this.properties
               };
    }
};

Arc.prototype.wkt = function() {
    var wkt_string = '';
    for (i = 0; i < this.geometries.length; i++) {
        if (this.geometries[i].coords.length === 0) {
            return 'LINESTRING(empty)';
        } else {
            var wkt = 'LINESTRING(';
            this.geometries[i].coords.forEach(function(c,idx) {
                wkt += c[0] + ' ' + c[1] + ',';
            });
            wkt_string += wkt.substring(0, wkt.length - 1) + ')';
        }
    }
    return wkt_string;
};

/*
 * http://en.wikipedia.org/wiki/Great-circle_distance
 *
 */
var GreatCircle = function(start,end,properties) {

    this.start = start;
    this.end = end;
    this.properties = properties || {};

    var w = this.start.x - this.end.x;
    var h = this.start.y - this.end.y;
    var z = Math.pow(Math.sin(h / 2.0), 2) +
                Math.cos(this.start.y) *
                   Math.cos(this.end.y) *
                     Math.pow(Math.sin(w / 2.0), 2);
    this.g = 2.0 * Math.asin(Math.sqrt(z));

    if (this.g == Math.PI) {
        throw new Error('it appears ' + start.view() + ' and ' + end.view() + " are 'antipodal', e.g diametrically opposite, thus there is no single route but rather infinite");
    } else if (isNaN(this.g)) {
        throw new Error('could not calculate great circle between ' + start + ' and ' + end);
    }
};

/*
 * http://williams.best.vwh.net/avform.htm#Intermediate
 */
GreatCircle.prototype.interpolate = function(f) {
    var A = Math.sin((1 - f) * this.g) / Math.sin(this.g);
    var B = Math.sin(f * this.g) / Math.sin(this.g);
    var x = A * Math.cos(this.start.y) * Math.cos(this.start.x) + B * Math.cos(this.end.y) * Math.cos(this.end.x);
    var y = A * Math.cos(this.start.y) * Math.sin(this.start.x) + B * Math.cos(this.end.y) * Math.sin(this.end.x);
    var z = A * Math.sin(this.start.y) + B * Math.sin(this.end.y);
    var lat = R2D * Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
    var lon = R2D * Math.atan2(y, x);
    return [lon, lat];
};



/*
 * Generate points along the great circle
 */
GreatCircle.prototype.Arc = function(npoints,options) {
    var first_pass = [];
    //var minx = 0;
    //var maxx = 0;
    if (npoints <= 2) {
        first_pass.push([this.start.lon, this.start.lat]);
        first_pass.push([this.end.lon, this.end.lat]);
    } else {
        var delta = 1.0 / (npoints - 1);
        for (var i = 0; i < npoints; i++) {
            var step = delta * i;
            var pair = this.interpolate(step);
            //minx = Math.min(minx,pair[0]);
            //maxx = Math.max(maxx,pair[0]);
            first_pass.push(pair);
        }
    }
    /* partial port of dateline handling from:
      gdal/ogr/ogrgeometryfactory.cpp

      TODO - does not handle all wrapping scenarios yet
    */
    var bHasBigDiff = false;
    var dfMaxSmallDiffLong = 0;
    for (var i = 1; i < first_pass.length; i++) {
        //if (minx > 170 && maxx > 180) {
        // }
        var dfPrevX = first_pass[i-1][0];
        var dfX = first_pass[i][0];
        var dfDiffLong = Math.abs(dfX - dfPrevX);
        if (dfDiffLong > 350 &&
            ((dfX > 170 && dfPrevX < -170) || (dfPrevX > 170 && dfX < -170))) {
            bHasBigDiff = true;
        } else if (dfDiffLong > dfMaxSmallDiffLong) {
            dfMaxSmallDiffLong = dfDiffLong;
        }
    }

    var poMulti = []

    if (bHasBigDiff && dfMaxSmallDiffLong < 10) {
        var poNewLS = []
        poMulti.push(poNewLS);
        for (var i = 0; i < first_pass.length; i++) {
            var dfX = parseFloat(first_pass[i][0]);
            if (i > 0 &&  Math.abs(dfX - first_pass[i-1][0]) > 350) {
                var dfX1 = parseFloat(first_pass[i-1][0]);
                var dfY1 = parseFloat(first_pass[i-1][1]);
                var dfX2 = parseFloat(first_pass[i][0]);
                var dfY2 = parseFloat(first_pass[i][1]);
                if (dfX1 > -180 && dfX1 < -170 && dfX2 == 180 &&
                    i+1 < first_pass.length &&
                   first_pass[i-1][0] > -180 && first_pass[i-1][0] < -170)
                {
                     poNewLS.push([-180, first_pass[i][1]]);
                     i++;
                     poNewLS.push([first_pass[i][0], first_pass[i][1]]);
                     continue;
                } else if (dfX1 > 170 && dfX1 < 180 && dfX2 == -180 &&
                     i+1 < first_pass.length &&
                     first_pass[i-1][0] > 170 && first_pass[i-1][0] < 180)
                {
                     poNewLS.push([180, first_pass[i][1]]);
                     i++;
                     poNewLS.push([first_pass[i][0], first_pass[i][1]]);
                     continue;
                }

                if (dfX1 < -170 && dfX2 > 170)
                {
                    // swap dfX1, dfX2
                    var tmpX = dfX1;
                    dfX1 = dfX2;
                    dfX2 = tmpX;
                    // swap dfY1, dfY2
                    var tmpY = dfY1;
                    dfY1 = dfY2;
                    dfY2 = tmpY;
                }
                if (dfX1 > 170 && dfX2 < -170) {
                    dfX2 += 360;
                }

                if (dfX1 <= 180 && dfX2 >= 180 && dfX1 < dfX2)
                {
                    var dfRatio = (180 - dfX1) / (dfX2 - dfX1);
                    var dfY = dfRatio * dfY2 + (1 - dfRatio) * dfY1;
                    poNewLS.push([first_pass[i-1][0] > 170 ? 180 : -180, dfY]);
                    poNewLS = [];
                    poNewLS.push([first_pass[i-1][0] > 170 ? -180 : 180, dfY]);
                    poMulti.push(poNewLS);
                }
                else
                {
                    poNewLS = [];
                    poMulti.push(poNewLS);
                }
                poNewLS.push([dfX, first_pass[i][1]]);
            } else {
                poNewLS.push([first_pass[i][0], first_pass[i][1]]);
            }
        }
    } else {
       // add normally
        var poNewLS = []
        poMulti.push(poNewLS);
        for (var i = 0; i < first_pass.length; i++) {
            poNewLS.push([first_pass[i][0],first_pass[i][1]]);
        }
    }

    var arc = new Arc(this.properties);
    for (var i = 0; i < poMulti.length; i++) {
        var line = new LineString();
        arc.geometries.push(line);
        var points = poMulti[i];
        for (var j = 0; j < points.length; j++) {
            line.move_to(points[j]);
        }
    }
    return arc;
};

if (typeof window === 'undefined') {
  // nodejs
  module.exports.Coord = Coord;
  module.exports.Arc = Arc;
  module.exports.GreatCircle = GreatCircle;

} else {
  // browser
  var arc = {};
  arc.Coord = Coord;
  arc.Arc = Arc;
  arc.GreatCircle = GreatCircle;
} /* Manifest =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
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
	this.map = new L.Map('map', { preferCanvas: true, worldCopyJump: false, center: new L.LatLng(40.730610,-73.935242), zoom: 3, scrollWheelZoom: false });
	this.clustergroup = this.active_point = null;
	
	/* Define Layers */
	var layerdefs = {
	 	'dark': new L.TileLayer(TILETYPES.DARK, { maxZoom: 18, detectRetina: true, attribution: 'Dark, MapBox' }),
		'light': new L.TileLayer(TILETYPES.LIGHT, { maxZoom: 18, detectRetina: true, attribution: 'Light, Mapbox' }),
		'terrain': new L.TileLayer(TILETYPES.TERRAIN, { maxZoom: 12, detectRetina: true, attribution: 'Terrain, Stamen' }),
		'satellite': new L.TileLayer(TILETYPES.SATELLITE, { maxZoom: 16, detectRetina: true, attribution: 'Satellite, ESRI' })
	};

	var layerlist = { "Dark Tiles": layerdefs.dark, "Light Tiles": layerdefs.light, "Terrain": layerdefs.terrain, "Satellite": layerdefs.setellite };

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
	this.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
	this.map.on("popupclose", function(e) { console.log("popupclose"); MI.scview.active_point = null; });
	
	if($("body").hasClass("light")) {
		this.map.addLayer(layerdefs.terrain);
	} else if($("body").hasClass("dark")) { 
		this.map.addLayer(layerdefs.dark);		
	}
	
	// General UI
	$(".fullscreen-menu").click(function() { ui_fullscreen(); });	
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
			if($(window).width() <= 920) { return; }
		
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
				MI.scview.map.setView(MI.scview.map._layers[i]._latlng, MI.scview.map.getZoom());
			}
		} else if (typeof(MI.scview.map._layers[i].getAllChildMarkers) != 'undefined') {				
			var childmarkers = MI.scview.map._layers[i].getAllChildMarkers();
			for (var j in childmarkers) {
				if (typeof(childmarkers[j].feature) != 'undefined') {
					if (childmarkers[j].feature.properties.lid == id) {
						MI.scview.map._layers[i].spiderfy();
						MI.scview.active_point = childmarkers[j];
						childmarkers[j].openPopup();
						MI.scview.map.setView(childmarkers[j]._latlng, MI.scview.map.getZoom());
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
	if(type == "SourcemapAPI") { 
		d = FormatSMAP(d, options); 
		scid = SetupSC(d, options); 
		MapSC(d, scid);
	
		// GraphSC
		var smapurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/"; var smapid = d.details.id;
		$.getJSON(smapurl + smapid + ".json", function(d) { SMAPGraph(d, {"id": smapid});});
	} 
	else if(type == "YetiAPI") { 
		//YetiAPI(d, options);
		d = FormatYETI(d, options); 
		scid = SetupSC(d, options); 
		MapSC(d, scid);
	
		YETIGraph(d, {"id": d.details.id});		
	}
	else if(type == "GoogleSheets") { GoogleSheets(d, options);}
	
}

/** Setup the supply chain rendering by adding it to the user interface */
function SetupSC(d, options) {	
	var scid = MI.supplychains.push(d);
	MI.attributes.scrollpos = $(".sidepanel").scrollTop();
	console.log(MI.attributes.scrollpos);
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
				var pdesc = d.features[i].properties.description ? "<p class='description'>" + d.features[i].properties.description + "</p>" : "";
				d.features[i].properties.placename = d.features[i].properties.placename ? d.features[i].properties.placename : (d.features[i].properties.address ? d.features[i].properties.address : ""); 
				var pplace = d.features[i].properties.placename;
				
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
					"<h5 class='mdetail_title'>" + ptitle + "</h5> " + "<p class='placename'>"+pplace + "</p>" + Autolinker.link(pdesc) + 
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
	pointLayer.on('click', function(e){	
		if(!(e.sourceTarget._preSpiderfyLatlng)){		
			for(var c in MI.clusters) {
				MI.clusters[c].unspiderfy();
			}
		}
		
		ui_pointclick(e); 
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
		// TODO Change the ui_pointclick method so this is not needed
		var fevent = {sourceTarget: MI.scview.active_point, layer: {options:{fillOpacity:MI.scview.active_point.feature.properties.style.fillOpacity}, _popup: {_source: {feature: {properties: {lid: MI.scview.active_point.feature.properties.lid}}}}}};
		ui_pointclick(fevent, MI.scview.active_point.feature.properties.lid, 0);
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

function GoogleSheets(gsheet, options) {
	var d = {"type":"FeatureCollection"};
	d.details = options; d.details.layers = []; d.details.measures = {}; d.features = {};
	d.properties = {"title": gsheet.name, "description": gsheet.description};	
	for(var item in gsheet){ d.properties[item] = gsheet[item]; }	

	d.tempFeatures = gsheet.points;
	
	var scid = MI.supplychains.push(d);

	var globe = GLOBES[Math.floor(Math.random() * GLOBES.length)];
	var moffset = 0;
	$('.mheader').each(function(i) { moffset += $(this).outerHeight(); });
		
	// Set default layerstyle
	if(!options.style) { 
		options.style = Object.assign({}, MI.scview.styles.point); 
		var color = MI.scview.colorchoice();
		options.style.fillColor = color[0];
		options.style.color = color[1];
	}
		
	$("#manifestlist").append(
		'<div class="mheader" id="mheader-'+d.details.id+'"style="top:'+moffset+'px;">'+
			'<div class="mtitle" style="background:'+d.details.style.fillColor+'; color:'+d.details.style.color+';">'+
				'<i class="menu-map fas fa-globe-'+globe+'"></i><a>' + d.properties.title + '</a>' +
				'<i class="fas fa-times-circle close-map"></i>'+
			'</div>'+
		'</div>'				
	);
	
	// UI Setup
	$("#mheader-"+d.details.id).click(function() { ui_mheader(d.details.id);});	
	$("#mheader-"+d.details.id+" .close-map").click(function() { ui_mclose(d.details.id);});	
	$("#mheader-"+d.details.id+" .menu-map").click(function() { ui_mmenu(d.details.id);});	
	
	temptitle = "";
	$( ".mtitle").text(function(i, t){ temptitle += i == 0 ? t : ' + ' + t; });
	document.title = temptitle + " - Manifest";
	
	$("#manifestlist").append('<div class="mdetails" id="mdetails-'+d.details.id+'"></div>');	
	if (typeof(d.properties.description) != 'undefined' && d.properties.description != "") { $("#mdetails-"+d.details.id).append(
		'<p class="mdescription">'+Autolinker.link(d.properties.description)+'</p>'
	);}
	$("#manifestlist").append('<ul class="mlist" id="mlist-'+d.details.id+'"></ul>');
	
	// Setup Layer
	d.features = [];
	
	for (var i in d.tempFeatures) {
		// TODO This templid should be based off of a numeric id, which Google doesn't have right 
		templid = 1000*MI.supplychains.length+Number(i);
		var j = i-1;
		if (typeof(d.tempFeatures[i]) != 'undefined') {
			d.features[j] = {"type": "Feature"};			
			d.features[j].properties = {};	
			d.features[j].properties.title = d.tempFeatures[i].Name;
			d.features[j].properties.description = d.tempFeatures[i].Description;
			d.features[j].properties.placename = d.tempFeatures[i].Location;
			d.features[j].lat = Number(d.tempFeatures[i].Geocode.split(",")[0]);
			d.features[j].lng = Number(d.tempFeatures[i].Geocode.split(",")[1]);
			var ptitle = d.features[j].properties.title;
			var pdesc = "<p class='description'>" + d.features[j].properties.description + "</p>";
			var pplace = "<p class='placename'>" + d.features[j].properties.placename + "</p>";

		
			// Setup Measures
			/*
			d.features[j].properties.measures = {};
			d.features[j].properties.measures.percent = d.tempFeatures[i].shipments_percents_company;
			d.details.measures.percent = {"max":100,"min":0};
			pdesc += "<p class='measures'>"+d.features[j].properties.measures.percent+"% of shipments.</p>";
			*/
			d.features[j].properties.scid = scid-1;
			
			// Set Style
			d.features[j].properties.style=d.details.style;
			
			var li = $(						
				"<li id='local_" + templid + "'>"+
					"<div class='dot' style='background:"+d.details.style.fillColor+"; border-color:"+d.details.style.color+";'></div>"+
				"<h5 class='mdetail_title'>" + ptitle + "</h5> " + pplace + Autolinker.link(pdesc) + 
				"</li>"						
			);
			li.delegate( li, "click", MI.scview.focus);
			$("#mlist-"+d.details.id).append(li);
			
			d.features[j].properties.lid = templid;

			d.features[j].geometry = {"type":"Point","coordinates":[d.features[j].lng, d.features[j].lat]};
		}
	}
	
	//ui_measurelist();
	
	delete d.tempFeatures;

	var points = {
		"type":"FeatureCollection",
		"details": d.details,
		"features": d.features,
		"properties": {}
	};

	// Setup Pointlayer
	var pointLayer = new L.geoJSON(points, { onEachFeature: MI.scview.pointrender, pointToLayer: function (feature, latlng) { 
		return L.circleMarker(latlng, MI.scview.styles.points); 
	} });	
	pointLayer.on('click', function(e){	ui_pointclick(e); });

	// Prepare to add layers
	maplayergroup = L.layerGroup();
	
	MI.scview.detailstyle = "points";
	
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
		d.details.layers.push(maplayergroup.addLayer(MI.scview.clustergroup));		
	} else {
		d.details.layers.push(maplayergroup.addLayer(pointLayer));
	}
		
	// Final Layer Setup
	d.details.layers.push(MI.scview.map.addLayer(maplayergroup));
	pointLayer.bringToFront();
	
	// Finalize Map
	//$('.sidepanel').scrollTo( $(".mdetails").last(),  50, { offset: -1* moffset } );
	
	//MI.functions.graph("GoogleGraph", d, {"id": d.details.id});
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

/* Miscellaneous functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

/** Called after Manifest has been initialized and the first supply chain loaded **/ 
function Cleanup() { 
	console.log(MI); 
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

	$("#load-samples-btn").click(function() {
		var loadurl = "";
		var loaded = false;
		var id = null;
		var type = null;
		
		if($("#load-samples").val() == "other") {
			loadurl = $("#load-samples-input").val();
			if (loadurl.toLowerCase().indexOf("https://raw.githubusercontent.com/hock/smapdata/master/data/") >= 0) {
				id = loadurl.substring(60).split(".")[0];
			}
		} else {
			type = $("#load-samples").val().split("-")[0];		
			id = $("#load-samples").val().split("-")[1];
			if(type == "smap") {
				loadurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/" + id + ".geojson";				
			}		
		}
		for(var s in MI.supplychains) { if(MI.supplychains[s].details.id == id) { loaded = true; }}
				
		if(!loaded) {
			$.getJSON(loadurl, function(d) { MI.functions.process("SourcemapAPI", d, {"id": id});});					
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
	console.log("interest");
	if(MI.visualization == "map") {
		for(var c in MI.clusters) {
			MI.clusters[c].unspiderfy();
		}
		ui_mheader($(".mlist").last().attr("id").split("-")[1]);
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
function SimpleSearch() {
	s = $("#searchbar").val().toLowerCase();
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
					if(MI.scview.active_point == MI.scview.map._layers[i]) { MI.scview.active_point.closePopup(); MI.scview.active_point = null; }
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

		if($(".leaflet-popup").length > 0 && MI.scview.active_point) {
			MI.scview.map.panTo(new L.LatLng(MI.scview.active_point._latlng.lat, MI.scview.active_point._latlng.lng));
		} else if(MI.scview.map.getZoom() == 3) { 
			MI.scview.map.panTo(new L.LatLng(40.730610, 0)); 
		}
			
	} else {
		$("body").removeClass("fullscreen");	

		if($(".leaflet-popup").length > 0 && MI.scview.active_point) {
			MI.scview.map.panTo(new L.LatLng(MI.scview.active_point._latlng.lat, MI.scview.active_point._latlng.lng));

			var fevent = {sourceTarget: MI.scview.active_point, layer: {options:{fillOpacity:MI.scview.active_point.feature.properties.style.fillOpacity}, _popup: {_source: {feature: {properties: {lid: MI.scview.active_point.feature.properties.lid}}}}}};
			ui_pointclick(fevent, MI.scview.active_point.feature.properties.lid);				
		} else if(MI.scview.map.getZoom() == 3) { 
			MI.scview.map.panTo(new L.LatLng(40.730610,-73.935242)); 
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
			var fevent = {sourceTarget: MI.scview.active_point, layer: {options:{fillOpacity:MI.scview.active_point.feature.properties.style.fillOpacity}, _popup: {_source: {feature: {properties: {lid: MI.scview.active_point.feature.properties.lid}}}}}};
			ui_pointclick(fevent, MI.scview.active_point.feature.properties.lid, 0);		
		} else {		
			$('.sidepanel').scrollTo($("#mdetails-"+target_id),  0, { offset: -1*offset}); 	
		}
	} else {
		MI.scview.active_point = null; 
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
function ui_pointclick(e, slid, speed) {
	if($(window).width() <= 920) { return; }
	
	if(e) {MI.scview.active_point = e.sourceTarget;}
	
	if(speed == undefined) { speed = 500; }
	if(e != undefined) {
		slid = e.layer._popup._source.feature.properties.lid;
		if(e.layer.options.fillOpacity == 0.1) { return; }
	}
	if($("li#local_"+slid).parent().length > 0) {
		gid = $("li#local_"+slid).parent().attr("id").split("-")[1];

		if(!($("body").hasClass("fullscreen"))) {
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
	
			if(e != undefined) {
				if(e.sourceTarget._popup._container != undefined) {
					if(ui_collide($(e.sourceTarget._popup._container), $(".sidepanel"))) {
						e.layer._map.setView(e.layer._latlng, e.layer._map.getZoom());
						
						/* TODO would be nice to handle edge case where popup is slighty out of frame */
						/*if(ui_collide($(e.sourceTarget._popup._container), $(".sidepanel"))) {
							e.layer._map.setView(e.layer._latlng, e.layer._map.getZoom()+1);
							e.layer.openPopup();												
						} */
					}
				}
			}
		}
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
	'DARK': 'https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaG9jayIsImEiOiJXcDZvWTFVIn0.DDAXuVl0361Bfsb9chrH-A',
	'LIGHT': 'https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaG9jayIsImEiOiJXcDZvWTFVIn0.DDAXuVl0361Bfsb9chrH-A',
	'TERRAIN': 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
	'SATELLITE': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

GLOBES = ["americas","asia","europe","africa"]; function visualize(type) {
	switch(type) {
		case "map":
			MI.visualization = "map";
			$(".map").removeClass("closed");
			$(".vizwrap").addClass("closed");
			MI.scview.map.invalidateSize();
			viz_cleanup();
			break;
		case "forcegraph":
			MI.visualization = "forcegraph";		
			viz_cleanup();
			for(var c in MI.clusters) {
				MI.clusters[c].unspiderfy();
			}
			$(".map").addClass("closed");
			$(".vizwrap").removeClass("closed");
			for(var i in MI.supplychains) {
				if(MI.supplychains[i].graph != undefined) { 
					viz_forcegraph(MI.supplychains[i].graph, MI.supplychains[i].details.id); 
				}
			}
	    	break;
	  	default:
			console.log("Visualization type not supported...");
	}
}

function viz_cleanup() {
	$(".vizwrap .viz").remove();
	if($(window).width() <= 920) {
		$(".vizwrap svg").attr("viewBox","0 0 "+$(window).width()+" "+$(window).width());
	} else {
		$(".vizwrap svg").attr("viewBox","0 0 "+$(window).width()+" "+$(window).height());
	}
	if(MI.scview.active_point && MI.visualization != "map") { MI.scview.active_point.closePopup(); MI.scview.active_point = null; }
}

function viz_resize() {
	visualize(MI.visualization);
}


// Force Directed Graph
function viz_forcegraph(graph, id) {	
	var width = $(window).width(),
	    height = $(window).height(),
	    radius = 12;
	
		var adj = 0;
	if(width > 920) {
		if(!($("body").hasClass("fullscreen"))) {
			adj = $(".sidepanel").width();
		} else {
			adj = 0;
		}
	}  else {
		height = $(window).width();
	}
	//Math.ceil(Math.random() * 300) * (Math.round(Math.random()) ? 1 : -1)
	var simulation = d3.forceSimulation()
	    .velocityDecay(0.5)
	    .force("x", d3.forceX((width+adj) / 2).strength(0.1))
	    .force("y", d3.forceY(height / 2).strength(0.1))
	    .force("charge", d3.forceManyBody().strength( function(d) { 
			var measure_sort = $("#measure-choices").val();

			var linkd = 0;
			if(d.ref != undefined) {
				linkd = d.ref.properties.measures[measure_sort] != undefined ? 
					10000 * (d.ref.properties.measures[measure_sort] / MI.supplychains[d.ref.properties.scid].details.measures[measure_sort].max) : 
					0;
			}
			return -240 - linkd;
		}))
	    .force("link", d3.forceLink().distance(100).strength(0.5));

	var svg = d3.select("svg")
	    .attr("width", width)
	    .attr("height", height);

	var viz = svg.append("g")
		.attr("class", "viz forcegraph");

	var link = viz.selectAll("line")
	  	.data(graph.links)
		.enter().append("line");

	var node = viz.selectAll("circle")
	  	.data(graph.nodes)
		.enter().append("circle")
	  	.attr("r", radius - 0.75)
		.style("fill", function(d) { if(d.ref != undefined) { return $("#mlist-"+id+" .dot").css("background-color");} })
		.style("stroke", function(d) { if(d.ref != undefined) { return $("#mlist-"+id+" .dot").css("border-color");} })
		.call(d3.drag()
			.on("start", dragstarted)
			.on("drag", dragged)
			.on("end", dragended));  
			
	var labels = viz.selectAll("text")
	  	.data(graph.nodes)
		.enter().append('text')
		.attr("fill", function(d) { if(d.ref != undefined) {return $("#mlist-"+id+" .dot").css("background-color");} })
		.attr("pointer-events", "none")
		.text(function (d){return d.name;});

	simulation
		.nodes(graph.nodes)
		.on("tick", tick);

	simulation.force('link')
		.links(graph.links);
  
	function tick() {
		node.attr("cx", function(d) { d.x = Math.max(radius, Math.min(width - radius, d.x)); return d.x; })
		.attr("cy", function(d) { d.y = Math.max(radius, Math.min(height - radius, d.y)); return d.y; });

		link.attr("x1", function(d) { return d.source.x; })
		    .attr("y1", function(d) { return d.source.y; })
		    .attr("x2", function(d) { return d.target.x; })
		    .attr("y2", function(d) { return d.target.y; });

		labels.attr('x', function(d) { return d.x+radius+(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize)); })
			  .attr('y', function(d) { return d.y+(radius+(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize)))/2; });
		
		width = $(window).width();
		height = $(window).height();
		if(width > 920) {
			if(!($("body").hasClass("fullscreen"))) {
				adj = $(".sidepanel").width();
			} else {
				adj = 0;
			}
		}  else {
			height = $(window).width();
		}
	}
  
	force_scale();

	function dragstarted(d) {
		if(d.ref != undefined) {
			ui_pointclick(undefined, d.ref.properties.lid);
		}
		if (!d3.event.active) simulation.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
	}

	function dragged(d) {
		d.fx = d3.event.x;
		d.fy = d3.event.y;
	}

	function dragended(d) {
		if (!d3.event.active) simulation.alphaTarget(0);
		d.fx = null;
		d.fy = null;
	}
	
	function force_scale() {		
		d3.select("svg").selectAll("circle")
		.attr("r", function(d) { 
			var measure_sort = $("#measure-choices").val();
			var radius = 8;
			if(d.ref != undefined) {
				if(d.ref.properties.measures != undefined) {	
					if(d.ref.properties.measures[measure_sort] != undefined) {
							if(measure_sort != "None" && MI.supplychains[d.ref.properties.scid].details != undefined) {							
								radius = d.ref.properties.style.radius = 8 + 100 * 
								(d.ref.properties.measures[measure_sort] / MI.supplychains[d.ref.properties.scid].details.measures[measure_sort].max);
							}
					}
				}		
			}			
			return radius;
		});
	}
} // End Forcegraph


/* Image Creation */
 $( document ).ready(function() {
	var smapurl = "";
	if(typeof(location.hash) != 'undefined' && location.hash != "") { 
		// TODO handle bad hashes gracefully and still load the page.
		MI = new Manifest();

		smapurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/";
		var hashtype = location.hash.substr(1).split("-")[0]; 
		var hashid = location.hash.substr(1).split("-")[1]; 
		
		if(hashtype == "smap") { $.getJSON(smapurl + hashid + ".geojson", function(d) { MI.functions.process("SourcemapAPI", d, {"id": hashid});}); }
	} else {
		
		MI = new Manifest();

		smapurl = "https://raw.githubusercontent.com/hock/smapdata/master/data/";
		var starters = [5333,2239,602,5228,4532,2737,5228];
		var starter_id = starters[Math.floor(Math.random() * starters.length)];
		
		$.getJSON(smapurl + starter_id + ".geojson", function(d) { MI.functions.process("SourcemapAPI", d, {"id": starter_id});});
		MI.functions.process("YetiAPI", yeti, {"id": ("casper sleep").hashCode()});
		//MI.functions.process("GoogleSheets","1IsJ6_GEFXzPBWbMilEN--Ft20ryO88XynMoNVtFTUa4")
		
		/* Google Sheet Test */
		
		/*
		var sheetoverview = {};
		var sheetpoints = {};
		var so_offset = 5;
		var sp_offset = 8;
		var sheetid = "1IsJ6_GEFXzPBWbMilEN--Ft20ryO88XynMoNVtFTUa4"
		$.when(	
			$.getJSON("https://spreadsheets.google.com/feeds/cells/"+sheetid+"/"+"1"+"/public/full?alt=json", function(d) { sheetoverview = d;}) &&
			$.getJSON("https://spreadsheets.google.com/feeds/cells/"+sheetid+"/"+"2"+"/public/full?alt=json", function(d) { sheetpoints = d;})

		).then(function() {
			let sheetsc = {
				name: sheetoverview.feed.entry[so_offset].gs$cell.$t,
				description: sheetoverview.feed.entry[so_offset+1].gs$cell.$t,
				rootaddress: sheetoverview.feed.entry[so_offset+2].gs$cell.$t,
				rootgeocode: sheetoverview.feed.entry[so_offset+3].gs$cell.$t,
				measure: sheetoverview.feed.entry[so_offset+4].gs$cell.$t,
				points: {}				
			};
			
			for(let s in sheetpoints.feed.entry) {
				if(Number(sheetpoints.feed.entry[s].gs$cell.row) > 1) {
					if(sheetsc.points[Number(sheetpoints.feed.entry[s].gs$cell.row)-1] == undefined) { 
						sheetsc.points[Number(sheetpoints.feed.entry[s].gs$cell.row)-1] = {};
					}
					let position = (Number(sheetpoints.feed.entry[s].gs$cell.row)-1)*sp_offset-1+(Number(sheetpoints.feed.entry[s].gs$cell.col)+1);
					let header = position - (sp_offset*(Number(sheetpoints.feed.entry[s].gs$cell.row)-1));
				
					let point = sheetsc.points[Number(sheetpoints.feed.entry[s].gs$cell.row)-1];
					point[sheetpoints.feed.entry[header-1].gs$cell.$t] = sheetpoints.feed.entry[s].gs$cell.$t;
					
				}				
			}
			MI.functions.process("GoogleSheets", sheetsc, {"id": sheetid});
			console.log(sheetsc);
			
			// Do this manually since this Ajax request has to preprocessed right now.		
			// TODO What we should do is check in the "then" clause if the other ajax request is done. If it is, we can process in the callback
			// TODO ACTUALLY, maybe we shoudl make a discrete endpoint that does this processing, so here in the viewer we call only that..!!!
			MI.scview.map.fitBounds(MI.scview.map.getBounds());
			MI.scview.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
		
			viz_resize();
		
			if(MI.supplychains.length == 1) {
				MI.functions.cleanup();
			}
			
		});*/
	}			
	$.getJSON("lib/json/samples.json", function(d) { 
		for(var s in d) { 
			$("#load-samples").append('<option value="'+s+'">'+d[s]+'</option>');	
		} 
		$("#load-samples").append('<option value="other">Other...</option>');			
	});
	
	$(document).ajaxStop(function() {
		console.log(MI.scview.active_point);
		MI.scview.map.fitBounds(MI.scview.map.getBounds());
		MI.scview.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
		
		viz_resize();
		
		if(MI.scview.active_point == null) { console.log("trying center"); MI.functions.center(); }
		if(!(MI.attributes.initialized)) { MI.functions.cleanup(); }   
	});
	
	// Do Testing
	// ManifestTests();
});	