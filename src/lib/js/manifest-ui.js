class ManifestUI {
	constructor() { 
		this.interval = null;
		this.filter = {clear: true, term: null};
		this.active_element = null; this.paneldisplay = {};
		this.timeslider = false;
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
		document.getElementById('load-custom').addEventListener('change', function() {
			const selected = document.getElementById('load-custom').value;
			if (selected === 'url') { 
				document.getElementById('loadlist-group-custom').className = 'url'; 
				document.getElementById('load-custom-urltext').classList.remove('closed');
				document.getElementById('load-custom-filetext').classList.add('closed');
				
			}
			else if (selected === 'file') { document.getElementById('loadlist-group-custom').className = 'file'; 
				document.getElementById('load-custom-urltext').classList.add('closed');
				document.getElementById('load-custom-filetext').classList.remove('closed');
			} 				
		});
				
		document.getElementById('load-samples-btn').addEventListener('click', (e) => { MI.Interface.LoadFromLauncher(document.getElementById('load-samples').value); });	
		document.getElementById('load-custom-btn').addEventListener('click', (e) => { MI.Interface.LoadFromLauncher(document.getElementById('load-custom').value); });	
		
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
			MI.Interface.StopVideoPlayback();
			document.getElementById('fullscreen-modal').classList.toggle('closed');
		});
		document.getElementById('full-modal-left').addEventListener('click', (e) => { e.stopPropagation(); MI.Interface.ModalScroll(-1); });
		document.getElementById('full-modal-right').addEventListener('click', (e) => { e.stopPropagation(); MI.Interface.ModalScroll(1); });
		
		let dropElement = document.getElementById('minfodetail');
		let dropArea = new jsondrop('minfodetail', { 
			onEachFile: function(file, start) { MI.Process('manifest', file.data, {id: ManifestUtilities.Hash(file.name), url: '', start:MI.supplychains.length === 0}); } 
		});	
		document.getElementById('file-input').addEventListener('change', (e) => { if (!MI.LoadManifestFile(e.target.files[0], e.target.value.split( '\\' ).pop())) { 
			this.ShakeAlert(document.getElementById('manifestbar'));
			// @TODO This should shake, but it mysteriously doesn't the function gets called but no animation (in Safari)
		} else { MI.Interface.ShowLauncher(); }});
		if (MI.options.storyMap || MI.options.embed) { 
			document.querySelectorAll('.mlist .node-images > .ftimg').forEach(el => { el.setAttribute("loading","eager"); });
		}
		for (let l in MI.Atlas.maplayer) {
			if (MI.Atlas.maplayer[l].id === 1029261216) { MI.Atlas.maplayer[l].points.bringToFront(); }	
		}

		['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(evt => dropElement.addEventListener(evt, (e) => { 
			e.preventDefault(); e.stopPropagation(); }));
		['dragover', 'dragenter'].forEach(evt => dropElement.addEventListener(evt, (e) => { dropElement.classList.add('is-dragover'); }));
		['dragleave', 'dragend', 'drop'].forEach(evt => dropElement.addEventListener(evt, (e) => { dropElement.classList.remove('is-dragover'); }));

		document.addEventListener("keydown", MI.Interface.KeyHandler);
		
		window.onresize = this.ManifestResize;	
		window.onbeforeprint = this.PrintBefore;
		window.onafterprint = this.PrintAfter;
		if (MI.Visualization.type !== 'map') { document.getElementById('vizwrap').classList.remove('closed'); MI.Visualization.Resize(); }
		document.getElementById('sidepanel').scrollTo(0,0);
		MI.initialized = true; 
	}
	
	PrintBefore() { document.querySelectorAll('.ftimg').forEach(el => { el.setAttribute('loading','eager'); }); }
	PrintAfter() {}
	
	Storyize() {
		document.body.classList.add('storymap');
		window.dispatchEvent(new Event('resize'));
		MI.Atlas.styles.point.fontsize = 0.1;
	} 
	Embedize() {
		document.body.classList.add('embedmap');
		window.dispatchEvent(new Event('resize'));
		MI.Atlas.styles.point.fontsize = 0.1;
	} 
	
	SetupTime() {
		let timeset = false, starttime, endtime;
		MI.Interface.timeslider = false;
		document.getElementById('time-slider').innerHTML = '';
		for (let s in MI.supplychains) { 
			if (MI.supplychains[s].details.time) {
				timeset = true;
				if (MI.supplychains[s].details.time.start) { starttime = Number(MI.supplychains[s].details.time.start); }
				if (MI.supplychains[s].details.time.end) { endtime = Number(MI.supplychains[s].details.time.end); }
			}
		}
		if (timeset) {
			document.getElementById('time-slider').innerHTML = `<div id="timer-lower-value"></div> <div id="time-control-wrap"><div id="time-control"></div></div> <div id="timer-upper-value"></div>`;
			MI.Interface.timeslider = new DualHRange('time-control', { lowerBound: starttime, upperBound:endtime, lower: starttime, upper: endtime });
			MI.Interface.timeslider.addEventListener('update', (event) => {
				let searchvalue = document.getElementById('searchbar').value; MI.Interface.ClearSearch(); MI.Interface.Search(searchvalue, true);
				
				document.getElementById('timer-lower-value').innerHTML = ManifestUtilities.PrintUTCDate(event.detail.lower);
				document.getElementById('timer-upper-value').innerHTML = ManifestUtilities.PrintUTCDate(event.detail.upper);	
			}, {passive: true} );
			document.getElementById('timer-lower-value').innerHTML = ManifestUtilities.PrintUTCDate(starttime);
			document.getElementById('timer-upper-value').innerHTML = ManifestUtilities.PrintUTCDate(endtime);
		}
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
					MI.Atlas.PointFocus(entry.target.parentElement.id.split('_')[1], {flyto: true});						
				}});
  	  	  	});
			observer.observe(el);
	  });
	}
	
	/** Handles header actions **/
	ShowHeader(id) {
		let mheader = document.getElementById('mheader-'+id);
		if (!mheader) { return; }
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
	
	ShowShare(id) {
		document.getElementById('share-options-'+id).classList.toggle('closed');
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
		else { if (document.getElementById('sidepanel').style.top !== 0) { document.getElementById('sidepanel').style.top = ''; } }
	}

	LoadFromLauncher(value, close=true) {
		let unloaded = false, loadurl, id, type, idref;
		
		if (value === 'url') {
			loadurl = document.getElementById('load-custom-input').value;
			if (loadurl.toLowerCase().indexOf('https://raw.githubusercontent.com/hock/smapdata/master/data/') >= 0) {
				type = 'smap'; id = loadurl.substring(60).split('.')[0]; idref = id; loadurl = MI.options.serviceurl + 'smap/' + id;
			} else if (loadurl.toLowerCase().indexOf('https://docs.google.com/spreadsheets/d/') >= 0) {
				type = 'gsheet'; id = loadurl.substring(39).split('/')[0]; idref = id; loadurl = MI.options.serviceurl + 'gsheet/' + id; id = ManifestUtilities.Hash(id);
			} else { type = 'manifest'; idref = loadurl; id = ManifestUtilities.Hash(loadurl);	}
		} else {
			let val = value ? value : document.getElementById('load-samples').value;
			let option = val.split('-');
			type = option[0];	
			option = [option.shift(), option.join('-')];
			id = option[1];
			if (type === 'smap') { loadurl = MI.options.serviceurl + 'smap/' + id; } 
			else if	(type === 'manifest') { 
				if (id === 'json/manifest.json') { fetch("CHANGELOG.md").then(c => c.text()).then(changelog => { MI.changelog = changelog;} ); }
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
				
				if (MI.Interface.timeslider && el.querySelectorAll('.node-time').length !== 0 && (el.querySelectorAll('.node-time')[0].dataset.start || el.querySelectorAll('.node-time')[0].dataset.end)) {
					let starttime = el.querySelectorAll('.node-time')[0].dataset.start ? Number(el.querySelectorAll('.node-time')[0].dataset.start) : MI.Interface.timeslider.lowerBound;
					let endtime = el.querySelectorAll('.node-time')[0].dataset.end ? Number(el.querySelectorAll('.node-time')[0].dataset.end) : starttime;
					
					if ( ( (endtime < Number(MI.Interface.timeslider.lower)) || (starttime > Number(MI.Interface.timeslider.upper))) || catcount >= cats.length || el.textContent.toLowerCase().indexOf(MI.Interface.filter.term) === -1 || closedcats.includes(uncat+'uncategorized') && cats.length === 1 && testcat === uncat) { el.style.display = 'none'; } 
					else { el.style.display = 'list-item'; }
				} else {
					if ( catcount >= cats.length || el.textContent.toLowerCase().indexOf(MI.Interface.filter.term) === -1 || closedcats.includes(uncat+'uncategorized') && cats.length === 1 && testcat === uncat) { el.style.display = 'none'; } 
					else { el.style.display = 'list-item'; }
				}
				
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
				if (MI.Interface.timeslider && MI.Atlas.map._layers[i].feature.properties.time) {
					let starttime = MI.Atlas.map._layers[i].feature.properties.time.start ? Number(MI.Atlas.map._layers[i].feature.properties.time.start) : MI.Interface.timeslider.lowerBound;
					let endtime = MI.Atlas.map._layers[i].feature.properties.time.end ? Number(MI.Atlas.map._layers[i].feature.properties.time.end) : starttime;
					
					if ( (starttime < Number(MI.Interface.timeslider.lower)) || (endtime > Number(MI.Interface.timeslider.upper))) { found = false; }
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
	
	SetupSamplelistHandlers() {
		const previews = document.getElementById('samples-previews'), spacer = document.getElementById('samples-spacer');
	
		previews.addEventListener('click', (e) => { 
			if (!previews.classList.contains('open')) {
				previews.classList.add('open'); spacer.classList.remove('closed');
				previews.style.height = (window.innerHeight - previews.offsetTop - ManifestUtilities.RemToPixels(5)) + "px";
				previews.querySelectorAll('.sample-preview').forEach(el => { 
					if (el.classList.contains('selected')) {
						previews.scrollTo(0, el.offsetTop - ManifestUtilities.RemToPixels(0.75)); 	
						el.focus();
					}
				});
			}			
		    e.stopPropagation();
		});
		window.addEventListener('click', (e) => { 
			if (previews.classList.contains('open')) { previews.classList.remove('open'); spacer.classList.add('closed'); previews.style.height = 'auto'; }			
		});
		previews.querySelectorAll('.sample-preview').forEach(el => { el.addEventListener('click', (e) => { 
			if (!el.classList.contains('selected')) {
				previews.querySelectorAll('.sample-preview').forEach(el => {el.classList.remove('selected');}); 
				el.classList.add('selected'); document.getElementById('load-samples').value = el.dataset.id;
			}	
			if (previews.classList.contains('open')) { previews.classList.remove('open'); spacer.classList.add('closed'); previews.style.height = 'auto'; e.stopPropagation(); }
		}); });
	}
	KeyHandler(e) {
		// Modal Keys
		if (document.getElementById('samples-previews').classList.contains('open')) {			
			if (e.key === 'ArrowDown') {  
				if (document.activeElement && document.activeElement.classList.contains('sample-preview')) {
					document.activeElement.nextSibling.focus();
				} else {
					document.getElementById('samples-previews').querySelectorAll('.sample-preview').forEach(el => { 
						if (el.classList.contains('selected')) { el.nextSibling.focus(); }
					});
				}
				e.stopImmediatePropagation();		
			}	
			if (e.key === 'ArrowUp') {  
				if (document.activeElement && document.activeElement.classList.contains('sample-preview')) {
					document.activeElement.previousSibling.focus();
				} else {
					document.getElementById('samples-previews').querySelectorAll('.sample-preview').forEach(el => { 
						if (el.classList.contains('selected')) { el.previousSibling.focus(); }
					});
				}
				e.stopImmediatePropagation();		
			}		
			if (e.key === 'Enter') {  
				if (document.activeElement && document.activeElement.classList.contains('sample-preview')) {
					const previews = document.getElementById('samples-previews'), spacer = document.getElementById('samples-spacer');
					
					if (!document.activeElement.classList.contains('selected')) {
						previews.querySelectorAll('.sample-preview').forEach(el => {el.classList.remove('selected');}); 
						document.activeElement.classList.add('selected'); document.getElementById('load-samples').value = document.activeElement.dataset.id;
						document.activeElement.blur();
					}	
					if (previews.classList.contains('open')) { previews.classList.remove('open'); spacer.classList.add('closed'); previews.style.height = 'auto'; e.stopPropagation(); }
				} 
				e.stopImmediatePropagation();		
			}				
		}
				
		if (!document.getElementById('fullscreen-modal').classList.contains('closed') && 
			!document.getElementById('full-modal-left').classList.contains('closed') && !document.getElementById('full-modal-right').classList.contains('closed')) {
			if (e.key === 'ArrowLeft') { e.stopImmediatePropagation(); MI.Interface.ModalScroll(-1); }
			if (e.key === 'ArrowRight') { e.stopImmediatePropagation(); MI.Interface.ModalScroll(1); }					
		}
		if (!document.getElementById('fullscreen-modal').classList.contains('closed')) {	
			if (e.key === 'Escape' || e.key === 'Enter') {  MI.Interface.StopVideoPlayback(); document.getElementById('fullscreen-modal').classList.toggle('closed'); }	
			e.stopImmediatePropagation();		
		}
	}
	Link(link, event) {
		event.preventDefault(); event.stopPropagation();
		let type;
		if (link.toLowerCase().indexOf('https://raw.githubusercontent.com/hock/smapdata/master/data/') >= 0) {
			type = 'smap'; link = link.substring(60).split('.')[0];
		} else if (link.toLowerCase().indexOf('https://docs.google.com/spreadsheets/d/') >= 0) {
			type = 'gsheet'; link = link.substring(39).split('/')[0];
		} else { type = 'manifest'; }
		if (link.includes('manifest://')) { link = link.replace('manifest://', type+'-https://'); } else { link = type+'-'+link; }
		
		if (MI.options.storyMap) { window.location = document.baseURI+'?storymap#'+link; } 
		if (MI.options.embed) { window.location = document.baseURI+'?embed#'+link; } 
		
		else {
			this.LoadFromLauncher(link, false);
		}
	}
	
	ImageScroll(lid, n, jump=false, modal=false, popup=null) {
	    let slideIndex = Number(document.getElementById('node_'+lid).querySelectorAll('.node-images')[0].getAttribute('data-index')) + n; 
		let slides = document.getElementById('node_'+lid).querySelectorAll('.node-images .ftimg'), popslides;
		let spots = document.getElementById('node_'+lid).querySelectorAll('.images-spot'), popspots;
		let pop = (popup !== null);
		
		if (popup === null && document.querySelectorAll('.leaflet-popup-content').length !== 0) { 
			document.querySelectorAll('.leaflet-popup-content')[0].querySelectorAll('.mpopup').forEach(p => {
				if (p.id.split('-').pop() === lid) { popup = p; pop = true; }
			});
		}
		if (pop) {
			popslides = popup.querySelectorAll('.node-images .ftimg');
			popspots = popup.querySelectorAll('.images-spot');
		}
		
	    if (slideIndex > slides.length) {slideIndex = 1;} 
	    if (slideIndex < 1) {slideIndex = slides.length; }
		if (jump) { slideIndex = jump; }
	    for (let i = 0; i < slides.length; i++) {
			slides[i].style.display = "none"; 
			spots[i].classList.remove('selected');
		  	if (pop) {	  
				popslides[i].style.display = "none"; 
				popspots[i].classList.remove('selected');
	  		}
	    }
		document.getElementById('node_'+lid).querySelectorAll('.images-caption')[0].textContent = slides[slideIndex-1].getAttribute('title');
	 	if (pop) { popup.querySelectorAll('.images-caption')[0].textContent = slides[slideIndex-1].getAttribute('title'); }
		
		if (modal) { MI.Interface.ModalSet(slides[slideIndex-1]); }
		
		slides[slideIndex-1].style.display = "block"; 
		spots[slideIndex-1].classList.add('selected');	
		
		if (pop) {	
			popslides[slideIndex-1].style.display = "block"; 
			popspots[slideIndex-1].classList.add('selected');
		}
		
		document.getElementById('node_'+lid).querySelectorAll('.node-images')[0].setAttribute('data-index', slideIndex);
		if (pop) { popup.querySelectorAll('.node-images')[0].setAttribute('data-index', slideIndex); }
		
		MI.Interface.StopVideoPlayback();
	}
	
	ModalSet(el) {		
		document.getElementById('fullscreen-modal').focus();
		if (el.parentElement.classList.contains('multiple')) {
			document.getElementById('full-modal-left').classList.remove('closed');
			document.getElementById('full-modal-right').classList.remove('closed');	
			document.getElementById('fullscreen-modal').dataset.id = (el.parentElement.parentElement.parentElement.id.split('_').length > 1) ? el.parentElement.parentElement.parentElement.id.split('_').pop() : el.parentElement.parentElement.parentElement.id.split('-').pop();
			document.getElementById('fullscreen-modal').dataset.index = el.parentElement.dataset.index;
		} else {
			document.getElementById('full-modal-left').classList.add('closed');
			document.getElementById('full-modal-right').classList.add('closed');
			document.getElementById('fullscreen-modal').dataset.id = '';
			document.getElementById('fullscreen-modal').dataset.index = '';
		}
		if (el.src.substring(0,24) === 'https://www.youtube.com/') {
			document.getElementById('full-modal-image').classList.add('closed');
			document.getElementById('full-modal-video').classList.remove('closed');
			document.getElementById('full-modal-video').setAttribute('src',el.src+'enablejsapi=1&origin='+window.location.origin+'&color=white&controls=0');
		} else {
			document.getElementById('full-modal-video').setAttribute('src','');		
			document.getElementById('full-modal-video').classList.add('closed');
			document.getElementById('full-modal-image').classList.remove('closed');
			document.getElementById('full-modal-image').style.backgroundImage = 'url('+el.src+')';
		}
		document.getElementById('full-modal-caption').textContent = el.getAttribute("title");			
	}
	ModalScroll(direction) {
		MI.Interface.ImageScroll(document.getElementById('fullscreen-modal').dataset.id, direction, false, true); 
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
		let directed = false, measured = false;
		for (let sc of MI.supplychains) { 
			if (sc.graph.type === 'directed') { directed = true;} 
			if (Object.keys(sc.details.measures).length > 0) { 
				measured = false;
				for (let measure of Object.keys(sc.details.measures)) { if (measure !== 'starttime' && measure !== 'endtime') { measured = true; } }
			}			
		}
		if (directed) { document.getElementById('viz-choices').querySelectorAll('.graph-dependent').forEach(el => { el.removeAttribute('hidden'); el.removeAttribute('disabled');});
		} else { document.getElementById('viz-choices').querySelectorAll('.graph-dependent').forEach(el => { el.setAttribute('hidden',''); el.setAttribute('disabled','');}); }
		
		if (measured) { document.getElementById('viz-choices').querySelectorAll('.measure-dependent').forEach(el => { el.removeAttribute('hidden'); el.removeAttribute('disabled');});
		} else { document.getElementById('viz-choices').querySelectorAll('.measure-dependent').forEach(el => { el.setAttribute('hidden',''); el.setAttribute('disabled','');}); }
		
		if (MI.Interface.IsMobile()) {
			 document.getElementById('viz-choices').querySelectorAll('.fullapp').forEach(el => { el.setAttribute('hidden',''); el.setAttribute('disabled','');}); 
		}
		
	}
	SetBasemap(tile) {
	    MI.Atlas.SwitchBasemap(MI.Atlas.glMap, tile);
	}
	
	AddDataLayer(ref) {	
		let type = ref.split('.').pop();
		if (type === 'geojson' || type === 'pmtiles' || type === 'jpg' || type === 'png') {
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
		
		MI.Atlas.map.invalidateSize({pan: false, animate: false, debounceMoveend: false});
		if (document.getElementsByClassName('leaflet-popup').length >= 1 && MI.Atlas.active_point !== null) { 			
			MI.Atlas.map.setView(MI.Atlas.active_point._popup._source.feature.properties.latlng, MI.Atlas.map.getZoom(), {animate: false});							
		}
		MI.Atlas.homecontrol.setHomeCoordinates();
		MI.Interface.ManifestResize();
	}
	
	SetDocumentTitle() {
		let scTitles = [], setTitle = '';
		for (let sc of MI.supplychains) { scTitles.push(sc.properties.title); }
		
		if (scTitles.length === 1 && scTitles[0] === 'Manifest') { setTitle = 'Manifest'; } 
		else { setTitle = scTitles.length > 0 ? scTitles.join(' + ') + ' - Manifest' : 'Manifest'; }
		
		document.title = setTitle;
		document.querySelector('meta[property="og:title"]').setAttribute("content", setTitle);
		
		if (scTitles.length === 1) {
			let description = MI.supplychains[0].properties.description.replace(/(<([^>]+)>)/ig,'');
			document.querySelector('meta[name="description"]').setAttribute("content", description);
			document.querySelector('meta[property="og:description"]').setAttribute("content", description);
		} else {
			let description = document.querySelector('meta[name="manifest-description"]').getAttribute("content");
			document.querySelector('meta[name="description"]').setAttribute("content", description);
			document.querySelector('meta[property="og:description"]').setAttribute("content", description);
		}
		
	}
	
	URLSet(url) {
		window.history.pushState({}, '', ManifestUtilities.Slugify(url));
	}
	ManifestResize() { 
		if (MI.Interface.IsMobile()) {
			while (MI.supplychains.length > 1) { MI.Supplychain.Remove(MI.supplychains[0].details.id); }
			if (document.getElementById('viz-choices').querySelector('option[value='+document.getElementById('viz-choices').value+']').disabled) {
				MI.Visualization.type = 'map';
			}
			MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element);
		}
		MI.Visualization.Resize(); 
	}
	
	ShowMessage(msg) {
		clearTimeout(this.interval);
		document.getElementById('messages').classList.remove("closed");
		document.getElementById('messages-text').innerHTML = msg;
		this.interval = setTimeout((e) => {document.getElementById('messages-text').innerHTML = ''; document.getElementById('messages').classList.add("closed");}, 5000);
	}
	ClearMessages() {
		clearTimeout(this.interval);
		document.getElementById('messages-text').innerHTML = ''; 
		document.getElementById('messages').classList.add("closed");
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
		if ( !(document.getElementById('sidewrap').classList.contains('top') || document.getElementById('sidewrap').classList.contains('middle') || document.getElementById('sidewrap').classList.contains('bottom'))) {
			document.getElementById('sidewrap').classList.add('middle');
		}
		
		this.SetupSwipes('mheader-'+id, function(el,d) {
			const sidewrap = document.getElementById('sidewrap');
			const viewwrap = document.getElementById('view-wrapper');
			if (sidewrap.classList.contains('top')) {
				if (d === 'd') { sidewrap.classList.remove('top'); sidewrap.classList.add('middle'); viewwrap.classList.remove('top'); viewwrap.classList.add('middle'); }
			} else if (sidewrap.classList.contains('middle')) {
				if (d === 'u') { sidewrap.classList.remove('middle'); sidewrap.classList.add('top'); viewwrap.classList.remove('middle'); viewwrap.classList.add('top'); } 			
				else if (d === 'd') { sidewrap.classList.remove('middle'); sidewrap.classList.add('bottom'); viewwrap.classList.remove('middle'); viewwrap.classList.add('bottom'); }
			} else if (sidewrap.classList.contains('bottom')) {
				if (d === 'u') {  sidewrap.classList.remove('bottom'); sidewrap.classList.add('middle'); viewwrap.classList.remove('bottom'); viewwrap.classList.add('middle'); }
			}
			if (MI.Visualization.type !== 'map') { MI.Visualization.Set(MI.Visualization.type, MI.Interface.active_element); }					
		});
	}

	SetupSwipes(el,func) {
		let swipe_det = {sX: 0, sY: 0, eX: 0, eY: 0};
		const min_x = 30, max_x = 30, min_y = 50, max_y = 60;
		let ele = document.getElementById(el);

		ele.addEventListener('touchstart', (e) => { e.stopImmediatePropagation(); const t = e.touches[0]; swipe_det.sX = t.screenX; swipe_det.sY = t.screenY; });
		ele.addEventListener('touchmove', (e) => { e.preventDefault(); const t = e.touches[0]; swipe_det.eX = t.screenX; swipe_det.eY = t.screenY; });
		ele.addEventListener('touchend', (e) => { let direc = '';	
			if ((((swipe_det.eX - min_x > swipe_det.sX) || (swipe_det.eX + min_x < swipe_det.sX)) && ((swipe_det.eY < swipe_det.sY + max_y) && (swipe_det.sY > swipe_det.eY - max_y) && (swipe_det.eX > 0)))) { direc = (swipe_det.eX > swipe_det.sX) ? 'r' : 'l'; }
			else if ((((swipe_det.eY - min_y > swipe_det.sY) || (swipe_det.eY + min_y < swipe_det.sY)) && ((swipe_det.eX < swipe_det.sX + max_x) && (swipe_det.sX > swipe_det.eX - max_x) && (swipe_det.eY > 0)))) { direc = (swipe_det.eY > swipe_det.sY) ? 'd' : 'u'; }

			if (direc !== '') { if (typeof func === 'function') { func(el,direc); } }
			swipe_det.sX = 0; swipe_det.sY = 0; swipe_det.eX = 0; swipe_det.eY = 0;
		});
	}

	IsMobile(options=false) { 
		if (!options && typeof MI !== 'undefined') { options = MI.options; }
		if (options && (options.storyMap || options.embed)) { return false; } else { return window.innerWidth > 920 ? false : true; }
	}
	
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