class ManifestUI {
	constructor() { 
		this.interval = null;
		this.filter = {clear: true, term: null};
		this.active_element = null; this.paneldisplay = {};
		this.observer = this.SetupObserver();

		document.getElementById('fullscreen-menu').addEventListener('click', (e) => { MI.Interface.ToggleFullscreen(); });
		document.getElementById('mapcapture').addEventListener('click', (e) => { MI.ExportManifest(null, document.title, 'map'); });
		document.getElementById('minfo').addEventListener('click', (e) => { MI.Interface.ShowLauncher(); });
		document.getElementById('minfo-hamburger').addEventListener('click', (e) => { MI.Interface.ShowLauncher(); });
	
		// CHECK used to also assign mouseup to first below
		document.getElementById('searchbar').addEventListener('keyup', (e) => { MI.Interface.Search(); });
		document.getElementById('searchclear').addEventListener('click', (e) => { MI.Interface.ClearSearch(); MI.Interface.Search(); });	
	}
	
	/** Called after Manifest has been initialized and the first supply chain loaded **/ 
	CleanupInterface() { 	
		console.log(MI); 
		document.getElementById('load-samples').addEventListener('change', function() {
			const selected = document.getElementById('load-samples').value;
		
			if (selected === 'url') { document.getElementById('loadlistpanel').className = document.getElementById('launcher-details').className = 'url'; 
				if (document.getElementById('manifestbar').classList.contains('open')) { 
					document.getElementById('sidepanel').style.top = document.getElementById('manifestbar').offsetHeight + ManifestUtilities.RemToPixels(1) + 'px'; 
				}} 
			else if (selected === 'file') { document.getElementById('loadlistpanel').className = document.getElementById('launcher-details').className = 'file'; 
				if (document.getElementById('manifestbar').classList.contains('open')) { 
					document.getElementById('sidepanel').style.top = document.getElementById('manifestbar').offsetHeight + ManifestUtilities.RemToPixels(1) + 'px'; 
				}} 
			else { document.getElementById('loadlistpanel').className = document.getElementById('launcher-details').className = ''; 
				if (document.getElementById('manifestbar').classList.contains('open')) { 
					document.getElementById('sidepanel').style.top = document.getElementById('manifestbar').offsetHeight + ManifestUtilities.RemToPixels(1) + 'px'; 
				}} 
		});
				
		document.getElementById('load-samples-btn').addEventListener('click', (e) => { MI.Interface.LoadFromLauncher(document.getElementById('load-samples').value); });	
		document.getElementById('basemap-chooser').addEventListener('change', (e) => { 
			this.SetBasemap(document.getElementById('basemap-chooser').value); 
		});
		
		document.getElementById('viz-choices').addEventListener('change', (e) => { MI.Visualization.Set(document.getElementById('viz-choices').value, MI.Interface.active_element); });
	
		document.getElementById('measure-choices').addEventListener('change', (e) => { 
			MI.Atlas.MeasureSort(); MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element, true); });
		document.getElementById('mapmenu').addEventListener('click', (e) => { document.getElementById('mapmenu-window').classList.remove('closed'); });
		document.getElementById('close-mapmenu').addEventListener('click', (e) => { document.getElementById('mapmenu-window').classList.add('closed'); });
		document.getElementById('load-datalayers-btn').addEventListener('click', (e) => { 
			this.AddDataLayer(document.getElementById('load-datalayers-input').value); 
		});
		document.getElementById('datalayers').querySelectorAll('input[type=checkbox]').forEach(el => { el.addEventListener('click', (e) => { 
			MI.Atlas.ProcessDataLayerFromElement(el);}); 
		});
		document.getElementById('fullscreen-modal').addEventListener('click', (e) => { 
			document.getElementById('fullscreen-modal').classList.toggle('closed');
		});
		let dropElement = document.getElementById('minfodetail');
		let dropArea = new jsondrop('minfodetail', { 
			onEachFile: function(file, start) { MI.Process('manifest', file.data, {id: ManifestUtilities.Hash(file.name), url: '', start:MI.supplychains.length === 0}); } 
		});	
		document.getElementById('file-input').addEventListener('change', (e) => { if (!MI.LoadManifestFile(e.target.files[0], e.target.value.split( '\\' ).pop())) { 
			this.ShakeAlert(document.getElementById('manifestbar'));
			// @TODO This should shake, but it mysteriously doesn't the function gets called but no animation (in Safari)
		}});
		if (MI.options.storyMap) { 
			for (let s in MI.supplychains) { 
				document.getElementById('storybanner').style.backgroundColor = MI.supplychains[s].details.style.fillColor; 
				document.getElementById('storybanner').style.borderColor = MI.supplychains[s].details.style.color; 
			}
			document.querySelectorAll('.mlist .featuredimages > .ftimg').forEach(el => { el.setAttribute("loading","eager"); });
		}
		for (let l in MI.Atlas.maplayer) {
			if (MI.Atlas.maplayer[l].id === 1029261216) { MI.Atlas.maplayer[l].points.bringToFront(); }	
		}

		['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(evt => dropElement.addEventListener(evt, (e) => { 
			e.preventDefault(); e.stopPropagation(); }));
		['dragover', 'dragenter'].forEach(evt => dropElement.addEventListener(evt, (e) => { dropElement.classList.add('is-dragover'); }));
		['dragleave', 'dragend', 'drop'].forEach(evt => dropElement.addEventListener(evt, (e) => { dropElement.classList.remove('is-dragover'); }));

		window.onresize = this.ManifestResize;	
		window.onbeforeprint = this.PrintBefore;
		window.onafterprint = this.PrintAfter;
		if (MI.Visualization.type !== 'map') { document.getElementById('vizwrap').classList.remove('closed'); MI.Visualization.Resize(); }
		MI.Interface.ClearLoader();
	}
	
	ClearLoader() {
		document.getElementById('loader').style.display = 'none'; 
		document.getElementById('sidepanel').scrollTo(0,0);
		MI.initialized = true; 
	}
	
	PrintBefore() { document.querySelectorAll('.ftimg').forEach(el => { el.setAttribute('loading','eager'); }); }
	PrintAfter() {}
	
	Storyize() {
		document.body.classList.add('storymap');
		
		MI.Atlas.styles.point.fontsize = 0.1;
	
		let storybanner = document.createElement('div');
		storybanner.id = 'storybanner';
		storybanner.innerHTML = `M`;
	
		document.querySelectorAll('body.storymap').forEach(el => { el.append(storybanner); });
		
		document.getElementById('storybanner').addEventListener('click', (e) => { 
			const newUrl = window.location.origin+window.location.pathname+window.location.hash;
			window.location.replace(newUrl);
		});
		
	} 
	
	SetupObserver() {
		let io = new IntersectionObserver((entries) => { 	
				    entries.forEach((entry) => {
						let elemid = entry.target.id.split('-').pop();
					    if (entry.isIntersecting) {
							if (!MI.Interface.paneldisplay[elemid]) { MI.Interface.paneldisplay[elemid] = 0;}
							MI.Interface.paneldisplay[elemid]++;	
						} else { 
							if (!MI.Interface.paneldisplay[elemid]) { MI.Interface.paneldisplay[elemid] = 0;} else { MI.Interface.paneldisplay[elemid]--; }
						}
			   
						MI.Interface.active_element = Object.keys(MI.Interface.paneldisplay).reduce(function(a, b){ return MI.Interface.paneldisplay[a] > MI.Interface.paneldisplay[b] ? a : b; });
						if (MI.Visualization.type !== 'map') { MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element); }
					});
				}); 
		return io;
	}
	
	// storymap
	SetupStoryTrigger(selector){
		let els = document.querySelectorAll(selector);
		els = Array.from(els);
		els.forEach(el => {
  	    	let observer = new IntersectionObserver((entries, observer) => { 
				entries.forEach(entry => { if (entry.isIntersecting) { 
					MI.Atlas.PointFocus(entry.target.parentElement.id.split('_')[1], false, false);	
				}});
  	  	  	});
			observer.observe(el);
	  });
	}

	// Example usage
	
	/** Handles header actions **/
	ShowHeader(id) {
		let mheader = document.getElementById('mheader-'+id);
		let offset = mheader.clientHeight;

		while (mheader.previousSibling) {
			mheader = mheader.previousSibling;
			if (mheader.nodeType === 1 && mheader.classList.contains('mheader') && mheader.style.display !== 'none') { offset += mheader.clientHeight; }
		}
		
		let moffset = 0; document.getElementById('manifestlist').querySelectorAll('.mheader').forEach(el => { if (el.style.display !== 'none') { el.style.top = moffset+'px'; moffset += el.offsetHeight; }});		
		let roffset = 0; Array.from(document.getElementById('manifestlist').querySelectorAll('.mheader')).reverse().forEach(el => { if (el.style.display !== 'none') { el.style.bottom = roffset+'px'; roffset += el.offsetHeight;}});
		document.getElementById('sidepanel').scrollTo(0, document.getElementById('mdetails-'+id).offsetTop + (-1*offset)); 	
		if (MI.Visualization.type === 'textview') {
			document.getElementById('textview').scrollTo(0, document.getElementById('blob-'+id).offsetTop - ManifestUtilities.RemToPixels(1));
		}
	}

	/** Handles the Manifest information and loading menu **/
	ShowLauncher() {	
		document.getElementById('minfodetail').classList.toggle('closed');
		document.getElementById('manifestbar').classList.toggle('open');
	
		if (!MI.Interface.IsMobile()) {
			if (document.getElementById('manifestbar').classList.contains('open')) { 
				document.body.classList.add('launcher');
				document.getElementById('sidepanel').style.top = document.getElementById('manifestbar').offsetHeight + ManifestUtilities.RemToPixels(1) + 'px'; 
			} else { document.body.classList.remove('launcher'); document.getElementById('sidepanel').style.top = '4rem'; }
		}
	}

	LoadFromLauncher(value, close=true) {
		let unloaded = false, loadurl, id, type, idref;
		
		if (value === 'url') {
			loadurl = document.getElementById('load-samples-input').value;
			if (loadurl.toLowerCase().indexOf('https://raw.githubusercontent.com/hock/smapdata/master/data/') >= 0) {
				type = 'smap'; id = loadurl.substring(60).split('.')[0]; idref = id; loadurl = MI.options.serviceurl + 'smap/' + id;
			} else if (loadurl.toLowerCase().indexOf('https://docs.google.com/spreadsheets/d/') >= 0) {
				type = 'gsheet'; id = loadurl.substring(39).split('/')[0]; idref = id; loadurl = MI.options.serviceurl + 'gsheet/' + id; id = ManifestUtilities.Hash(id);
			} else {
				type = 'manifest'; idref = loadurl; id = ManifestUtilities.Hash(loadurl);			
			}
		} else {
			let val = value ? value : document.getElementById('load-samples').value;
			let option = val.split('-');
			type = option[0];	
			option = [option.shift(), option.join('-')];
			id = option[1];
		
			if (type === 'smap') { loadurl = MI.options.serviceurl + 'smap/' + id; } 
			else if	(type === 'manifest') { 
				if (id === 'json/manifest.json') {
					fetch("CHANGELOG.md").then(c => c.text()).then(changelog => { MI.changelog = changelog;} );
				}
				loadurl = id; id = ManifestUtilities.Hash(id); 
			} 
			else if (type === 'gsheet') { loadurl = MI.options.serviceurl + 'gsheet/' + id; idref = id; id = ManifestUtilities.Hash(id); }	
		}
		for (let s in MI.supplychains) { if (MI.supplychains[s].details.id === id) { unloaded = true; }}
			
		if (!unloaded && id) {
			if (MI.Interface.IsMobile()) { for (let s in MI.supplychains) { MI.Supplychain.Remove(MI.supplychains[s].details.id); } }
			fetch(loadurl).then(r => {
				if (r.status === 404) { this.ShakeAlert(document.getElementById('manifestbar'));  this.ShowMessage("We couldn't find a valid Manifest format at that address."); }
				else if (!r.ok) { this.ShakeAlert(document.getElementById('manifestbar')); r.text().then(e => { this.ShowMessage(e); }); } 
				else { r.json().then(d => { 
					let m = (type === 'gsheet') ? {
						g: d[0], r: d[1] } : d; MI.Process(type, m, {id: id, idref: idref, url:loadurl, start:(MI.supplychains.length === 0)});})
				.catch( err => {
					this.ShakeAlert(document.getElementById('manifestbar'));  this.ShowMessage("We couldn't find a valid Manifest format at that address.");
				}).then(function() { 
					if (MI.Visualization.type !== 'map') { MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element, true);}});}});
			if (close) { MI.Interface.ShowLauncher(); }
		} else { this.ShakeAlert(document.getElementById('manifestbar')); }
	}
	
	/** A simple text match search **/
	Search(term) {
		if (term) { document.getElementById('searchbar').value = term; }
		let s = document.getElementById('searchbar').value.toLowerCase();
		
		// Only do something if the search has changed.
		if (s !== MI.Interface.filter.term) {MI.Interface.filter.clear = false; }
		if (MI.Interface.filter.clear) { MI.Atlas.UpdateCluster(s); return; } else { MI.Interface.filter.term = s;}
		
		let closedcats = [];
		document.getElementById('supplycategories').querySelectorAll('.supplycat input').forEach(el => { if (!el.checked) { closedcats.push(el.value); }});
	
		if (!MI.Interface.filter.clear) {		
			document.getElementById('manifestlist').querySelectorAll('.mlist > li').forEach(el => { 
				let cats = el.querySelectorAll('.cat-link'), catcount = 0;
				for (let cc of closedcats) { for (let cat of cats) { cat = cat.dataset.cat.toLowerCase(); if (cc.toLowerCase() === cat) { catcount++; } } }

				let uncat = ('cat-'+el.parentElement.id.split('-')[1]+'-').toLowerCase();
				let testcat = cats[0].dataset.cat.toLowerCase();
				
				if ( catcount >= cats.length || el.textContent.toLowerCase().indexOf(MI.Interface.filter.term) === -1 || closedcats.includes(uncat+'uncategorized') && cats.length === 1 && testcat === uncat) { el.style.display = 'none'; } 
					else { el.style.display = 'list-item'; }
		    });
			MI.Interface.filter.clear = true;
		}

		let found = false;
		for (let i in MI.Atlas.map._layers) {
			if (typeof MI.Atlas.map._layers[i].feature !== 'undefined') {
				found = false;
				
				let cats = MI.Atlas.map._layers[i].feature.properties.category.split(','), catmatch = false, catcount = 0, 
					catid = MI.Atlas.map._layers[i].feature.properties.scid ? MI.Atlas.map._layers[i].feature.properties.scid : null;
				for (let cc of closedcats) { for (let cat of cats) { if (cc === 'cat-'+catid+'-'+cat) { catcount++; } } }

		        if (catcount >= cats.length) { found = false; }
				else {
					for (let k of ['title','description','category','placename']) {
						if (String(MI.Atlas.map._layers[i].feature.properties[k]).toLowerCase().indexOf(s) !== -1) { found = true; }
					}
				}
				
				let uncat = 'cat-'+catid+'-';
				
				if (closedcats.includes(uncat+'uncategorized') && cats.length === 1 && 'cat-'+catid+'-'+cats[0] === uncat) {
					found = false;
				}
				// TODO Ideally we hide lines if one of the nodes isn't present... for categories this is more complicated and probably requires some changes to the line feature structure to store more information about its connected nodes.
			
				if (!(found)) { 
					MI.Atlas.map._layers[i].feature.properties.hidden = true;
					if (MI.Atlas.active_point && MI.Visualization.type === 'map') {
						if (MI.Atlas.active_point._popup._source._leaflet_id === MI.Atlas.map._layers[i]._leaflet_id) {
							if (MI.Atlas.active_point._popup._source.feature.properties.clustered.length === 0) { MI.Atlas.active_point.closePopup(); } 
							else {				
								let id = MI.Atlas.active_point._popup._source.feature.properties.lid;
								let next = document.getElementById('popup-'+id).nextElementSibling;
								while (next) { if (next.classList.contains('clusterbox')) { break; } next = next.nextElementSibling; }
								if (next) { MI.Atlas.PointFocus(next.id.split('-')[1]);} 
							}
						}
					}
				} else { MI.Atlas.map._layers[i].feature.properties.hidden = false; }
			} 
		}	
		// Check Lines
		for (let i in MI.Atlas.map._layers) {
			if (typeof MI.Atlas.map._layers[i].feature !== 'undefined') {
				if (MI.Atlas.map._layers[i].feature.properties.connections) {
					if (MI.Atlas.map._layers[i].feature.properties.connections.from.properties.hidden === true ||
						MI.Atlas.map._layers[i].feature.properties.connections.to.properties.hidden === true) {
							MI.Atlas.map._layers[i].feature.properties.hidden = true;
					}
				}
			}
		}
		if (MI.Visualization.type === 'map' && MI.Atlas.map._renderer) {  MI.Atlas.UpdateCluster(s); MI.Atlas.Refresh(); } else { MI.Visualization.Update(); }
	}

	ClearSearch() {
		document.getElementById('searchbar').value = ''; 
		MI.Interface.filter = {term: null, clear: true};
	}
	
	Link(link, event) {
		event.preventDefault(); event.stopPropagation();
		if (link.includes('manifest://')) {
			this.LoadFromLauncher(link.replace('manifest://', 'manifest-https://'), false);
		} else {
			this.LoadFromLauncher('manifest-'+link, false);
		}
	}
	
	ImageScroll(lid, n, jump=false) {
	    let slideIndex = Number(document.getElementById('local_'+lid).querySelectorAll('div.featuredimages')[0].getAttribute('data-index')) + n; 
		let slides = document.getElementById('local_'+lid).querySelectorAll('div.featuredimages .ftimg');
		let spots = document.getElementById('local_'+lid).querySelectorAll('div.featuredimages .images-spot');
		
	    if (slideIndex > slides.length) {slideIndex = 1;} 
	    if (slideIndex < 1) {slideIndex = slides.length; }
		if (jump) { slideIndex = jump; }
	    for (let i = 0; i < slides.length; i++) {
	      slides[i].style.display = "none"; 
		  spots[i].classList.remove('selected');
	    }
	    slides[slideIndex-1].style.display = "block"; 
		spots[slideIndex-1].classList.add('selected');
		document.getElementById('local_'+lid).querySelectorAll('div.featuredimages')[0].setAttribute('data-index', slideIndex);
		MI.Interface.StopVideoPlayback();
	}
	/** Handles the measure sorting interface **/
	RefreshMeasureList() {
		const measurechoices = document.getElementById('measure-choices');
		let choices = {none:'none'};
		let previous = document.getElementById('measure-choices').value;

		for (let s in MI.supplychains) { for (let m in MI.supplychains[s].details.measures) { if (m !== 'starttime' && m !== 'endtime') {choices[m] = m;} }}
	    while (measurechoices.firstChild) { measurechoices.removeChild(measurechoices.lastChild); }
	
		for (let c in choices) { let option = document.createElement('option'); option.value = c; option.textContent = c; measurechoices.append(option); }
		Array.from(document.getElementById('measure-choices').querySelectorAll('option')).forEach((el) => { if (el.value === previous) { measurechoices.value = previous; } });
	}
	
	SetVizOptions() {
		let directed = false;
		for (let sc of MI.supplychains) { if (sc.graph.type === 'directed') { directed = true; } }
		if (directed) { document.getElementById('viz-choices').querySelectorAll('.graph-dependent').forEach(el => { el.removeAttribute('hidden'); el.removeAttribute('disabled');});
		} else { document.getElementById('viz-choices').querySelectorAll('.graph-dependent').forEach(el => { el.setAttribute('hidden',''); el.setAttribute('disabled','');}); }
		
	}
	SetBasemap(tile) {
	    MI.Atlas.SwitchBasemap(MI.Atlas.glMap, tile);
	}
	
	AddDataLayer(ref) {	
		let type = ref.split('.').pop();
		if (type === 'geojson' || type === 'pmtiles') {
			/*let dlayer = document.createElement('div');
			let lclass = type === 'geojson' ? 'geojson' : 'vector';
			dlayer.classList.add('layerrow');

			dlayer.innerHTML = `<label class="layercontainer"><input type="checkbox" checked class="${lclass}" value="${ref}"><span class="layercheckmark"><i class="fas"></i></span> ${ ref.replace(/(^\w+:|^)\/\//, '')}</label>`;
			document.getElementById('userdatalayers').append(dlayer);
			dlayer.querySelectorAll('#datalayers input[type=checkbox]').forEach(el => { el.addEventListener('click', (e) => { 
				MI.Atlas.ProcessDataLayerFromElement(el);
			}); 
			});*/
			MI.Atlas.LoadExternalDataLayer(type, ref);

		} else {
			this.ShowMessage("This kind of data layer is not supported. Manifest currently supports geojson and pmtiles data.");
		}
	}
	/** Sets interface to full screen mode **/
	ToggleFullscreen() {
		if (document.body.classList.contains('fullscreen')) {
			document.body.classList.remove('fullscreen');
		} else { document.body.classList.add('fullscreen'); }
		if (document.getElementsByClassName('leaflet-popup').length >= 1 && MI.Atlas.active_point !== null) { 
			MI.Atlas.map.setView(MI.Atlas.GetOffsetLatlng( MI.Atlas.active_point._popup._source.feature.properties.latlng));				
		}
		MI.Atlas.homecontrol.setHomeCoordinates();
		MI.Visualization.Resize();
	}
	
	SetDocumentTitle() {
		let scTitles = [], setTitle = '';
		for (let sc of MI.supplychains) { scTitles.push(sc.properties.title); }
		
		if (scTitles.length === 1 && scTitles[0] === 'Manifest') { setTitle = 'Manifest'; } 
		else { setTitle = scTitles.length > 0 ? scTitles.join(' + ') + ' - Manifest' : 'Manifest'; }
		
		document.title = setTitle;
		document.querySelector('meta[property="og:title"]').setAttribute("content", setTitle);
		
	}
	
	ManifestResize() { MI.Visualization.Resize(); }

	ShowLoader() {
		document.getElementById('loader').style.background = 'rgba(0,0,0,0.8)';
		document.getElementById('loader').style.display = 'block'; 
	}
	
	ShowMessage(msg) {
		clearTimeout(this.interval);
		document.getElementById('messages').classList.remove("closed");
		document.getElementById('messages').innerHTML = msg;
		this.interval = setTimeout((e) => {document.getElementById('messages').innerHTML = ''; document.getElementById('messages').classList.add("closed");}, 5000);
	}
	
	ShakeAlert(element, time=20, coefficient=50){
	    element.style.transition = '0.1s';
    
	    let interval = setInterval(() => {
	    	let randomInt1 = Math.floor((Math.random() * 3) + 1);
	        let randomInt2 = Math.floor((Math.random() * 3) + 1);
	        let randomInt3 = Math.floor((Math.random() * 2) + 1);
        
	        let phase1 = (randomInt1 % 2) === 0 ? '+' : '-';
	        let phase2 = (randomInt2 % 2) === 0 ? '+' : '-';
	        let phase3 = (randomInt3 % 2) === 0 ? '+' : '-';
        
	        let transitionX = ((phase1 + randomInt1) * (coefficient / 10)) + 'px';
               
	        element.style.transform = 'translate('+transitionX+',0)';  
	    }, time);
		setTimeout((i=interval, el=element) => { clearInterval(i);  element.style.transform = '';}, 300); 
	}
	
	/* Mobile Functions /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */
	Mobilify(id, index) {
		document.getElementById('sidepanel').classList.add('middle');
		this.SetupSwipes('mheader-'+id, function(el,d) {
			const sidepanel = document.getElementById('sidepanel');
			const viewwrap = document.getElementById('view-wrapper');
			if (sidepanel.classList.contains('top')) {
				if (d === 'd') { sidepanel.classList.remove('top'); sidepanel.classList.add('middle'); viewwrap.classList.remove('top'); viewwrap.classList.add('middle'); }
			} else if (sidepanel.classList.contains('middle')) {
				if (d === 'u') { sidepanel.classList.remove('middle'); sidepanel.classList.add('top'); viewwrap.classList.remove('middle'); viewwrap.classList.add('top'); } 			
				else if (d === 'd') { sidepanel.classList.remove('middle'); sidepanel.classList.add('bottom'); viewwrap.classList.remove('middle'); viewwrap.classList.add('bottom'); }
			} else if (sidepanel.classList.contains('bottom')) {
				if (d === 'u') {  sidepanel.classList.remove('bottom'); sidepanel.classList.add('middle'); viewwrap.classList.remove('bottom'); viewwrap.classList.add('middle'); }
			}
			if (MI.Visualization.type !== 'map') { MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element); }					
		});
	}

	SetupSwipes(el,func) {
		let swipe_det = {sX: 0, sY: 0, eX: 0, eY: 0};
		const min_x = 30, max_x = 30, min_y = 50, max_y = 60;
		let ele = document.getElementById(el);

		ele.addEventListener('touchstart', (e) => {  const t = e.touches[0]; swipe_det.sX = t.screenX; swipe_det.sY = t.screenY; });
		ele.addEventListener('touchmove', (e) => {  e.preventDefault(); const t = e.touches[0]; swipe_det.eX = t.screenX; swipe_det.eY = t.screenY; });
		ele.addEventListener('touchend', (e) => {  
			let direc = '';
		
			if ((((swipe_det.eX - min_x > swipe_det.sX) || (swipe_det.eX + min_x < swipe_det.sX)) && ((swipe_det.eY < swipe_det.sY + max_y) && (swipe_det.sY > swipe_det.eY - max_y) && (swipe_det.eX > 0)))) { direc = (swipe_det.eX > swipe_det.sX) ? 'r' : 'l'; }
			else if ((((swipe_det.eY - min_y > swipe_det.sY) || (swipe_det.eY + min_y < swipe_det.sY)) && ((swipe_det.eX < swipe_det.sX + max_x) && (swipe_det.sX > swipe_det.eX - max_x) && (swipe_det.eY > 0)))) { direc = (swipe_det.eY > swipe_det.sY) ? 'd' : 'u'; }

			if (direc !== '') { if (typeof func === 'function') { func(el,direc); } }
			swipe_det.sX = 0; swipe_det.sY = 0; swipe_det.eX = 0; swipe_det.eY = 0;
		});
	}

	IsMobile() { return window.innerWidth > 920 ? false : true; }
	
	StopVideoPlayback() {
	  let iframes = document.querySelectorAll('iframe');
	  Array.prototype.forEach.call(iframes, iframe => { 
		  if (iframe.contentWindow) {
	    	  iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', 
			  func: 'pauseVideo' }), '*');
		}
	 });
	}
}