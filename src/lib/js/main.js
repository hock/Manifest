document.addEventListener("DOMContentLoaded", function(event) {
	if (document.documentElement.classList.contains('no-js')) { LoadError("Browser Not Supported"); return; }
	console.log("Manifest v"+mversion);
	
	let options = {
		options: true,
		darkmode: false,
		serviceurl: '<%= mserverurl %>',
		 //serviceurl: 'http://hockbook.local:3000/',
		
		view: 'interest', position: {lat: 0, lng: 0}, zoom: 3,
		 hoverHighlight: false, retinaTiles: false, simpleLines: false, storyMap: false, demoMode: false
		//		position: {lat: 40.730610, lng: -73.935242}, zoom: 3,

		// color: ['000000','999999','#999999'] - passed in url params as color=000000,999999,999999
		// visualization: ['map','forcegraph','flow','chord','listview','textview','chartview']
		// map = [default, satellite, bw] 
		// unimplemented options in loadparams: fontsize: 20,
		
	};

	// Load any url params into options
	options = Object.assign(options, LoadCookies(LoadParams(options)));
	
	MI = new Manifest(options);
	console.dir(options);
	
	// Begin setup for special modes (storymap and embed) if url param is set
	if (MI.options.storyMap) { MI.Interface.Storyize(); }
	if (MI.options.embed) { MI.Interface.Embedize(); }	
	if (MI.options.darkmode) { document.body.classList.add('dark'); document.getElementById('colorscheme-checkbox').setAttribute('checked',true); } 
	
	MI.Interface.Initialize();
	
	if (MI.options.visualization) { MI.Visualization.type = MI.options.visualization; }
	
	let hash = false;
	
	// URL Mapping
	if (window.location.pathname.includes('/manifest/')) {
		hash = ['manifest','json/'+window.location.pathname.split('/manifest/').pop().split('/').filter((a) => a !== '').join('/')+'.json'];
	} else if (window.location.pathname.includes('/gsheet/')) {
		hash = ['gsheet',window.location.pathname.split('/gsheet/').pop().split('/').filter((a) => a !== '').join('/')];
	} else if (window.location.pathname.includes('/sourcemap/')) {
		hash = ['smap',window.location.pathname.split('/sourcemap/').pop().split('/').filter((a) => a !== '').join('/')];
	} else if (window.location.pathname.includes('/collection/')) {
		hash = ['collection',window.location.pathname.split('/collection/').pop().split('/').filter((a) => a !== '').join('/')+'.json'];
	} else if (typeof(location.hash) !== 'undefined' && location.hash !== '') { 
		hash = location.hash.substr(1).split("-");
	}
	MI.options.initialurl = hash ? hash.slice(1).join('-') : '';
	
	// If a specific manifest has been requested, we see what kind it is and begin to load it
	if (hash) { 
		let hashtype = hash[0], hashid = [hash.shift(), hash.join('-')][1];
		
		if (hashtype === "collection") { LoadCollection(hashid, {start: true}); }
		else { 
			if (hashtype === 'gsheet' && hashid.toLowerCase().indexOf('https://docs.google.com/spreadsheets/d/') >= 0) { hashid = hashid.substring(39).split('/')[0]; }
			switch (hashtype) {
				case 'smap': fetch(MI.options.serviceurl + 'smap/' + hashid).then(r => r.json())
				.then(data => MI.Process('smap', data, {id: hashid, idref: hashid, url:MI.options.serviceurl + 'smap/' + hashid})); break;
				case 'gsheet': fetch(MI.options.serviceurl + 'gsheet/' + hashid).then(r => { if (!r.ok) { r.text().then(e => { LoadError(e, r.status); }); } else { r.json()
				.then(data => { let gsheet = {g: data[0], r: data[1] }; MI.Process('gsheet', gsheet, {id: ManifestUtilities.Hash(hashid), idref: hashid, url: MI.options.serviceurl + '/gsheet' + hashid});}).catch(e => LoadError(e));}}); break;
				case 'manifest': 
					if (hashid === 'json/manifest.json') {
						fetch("CHANGELOG.md").then(c => c.text()).then(changelog => LoadIntroduction(changelog, false) );
					} else { 
						fetch(hashid).then(r => {if (!r.ok) { r.text().then(e => { LoadError(e, r.status); }); } else { r.json()
						.then(data => MI.Process('manifest', data, {id: ManifestUtilities.Hash(hashid), url: hashid})).catch(e => LoadError(e));}}); 
					} break;
				default: LoadError(`<h3>This option is not supported.</h3>
									See the <a href="https://github.com/hock/Manifest/wiki/5.-Additional-Options">Manifest Wiki</a> section on 
									<a href="https://github.com/hock/Manifest/wiki/5.-Additional-Options">Additional Options</a> for the formats we support.`);
			} LoadCollection("json/samples.json", {start: false, manifest: hashid === 'json/manifest.json'});
			
		}
	} else { // No manifest has been requested, so we load the introduction sample setup
		LoadIntroduction((!MI.options.storyMap && !MI.options.embed));
	}

	function LoadError(error, status=0) { 
		if (typeof error === 'object') { error = 'ERROR: Manifest Encountered an Error (' + error.message + ')'; }
		let msg = error.substring(0,7) === 'ERROR: ' ? error.substring(7) : '';
		if ([400,401,403,404,405,408,409].includes(status)) { msg = `<h3>We couldn't find a valid Manifest format at that address.<br/>${msg}</h3><br/>
									If you think this is our fault, please <a href="https://github.com/hock/Manifest/issues/new">file an issue at Github</a> explaining what went wrong (and with as much detail as possible!).`; }
		if ([500,501,502,503,504,505].includes(status)) { msg = `<h3>There is a problem at the Manifest Server.<br/>${msg}</h3><br/>
									If you think this is our fault, please <a href="https://github.com/hock/Manifest/issues/new">file an issue at Github</a> explaining what went wrong (and with as much detail as possible!).`; }
		console.log('Status Code: ' + status);							
		console.log(error);
		console.dir(MI);
		console.trace();
		document.getElementById('loader').style.display = 'block';
		document.getElementById('loadermessage').innerHTML = ''+msg+''; 
	}
	
	// Loads a collections of manifests, where collection is the collection to be loaded
	// Options: start: if the initial loads have completed and the app should finish set up. manifest: special case if this is the manifest of manifest
	function LoadCollection(collection, o) {
		if (o.start) { 
			fetch(collection).then(c => c.json()).then(data => LoadSample(data) ).then(starter => fetch(starter.url)
				.then(s => s.json()).then(d => {
					if (starter.type === 'gsheet') { let gsheet = {g: d[0], r: d[1] }; MI.Process('gsheet', gsheet, {id: starter.id, idref: starter.ref, url: MI.options.serviceurl + '/gsheet' + starter.id}); } else { MI.Process(starter.type, d, {id: starter.id, idref: starter.ref, url: starter.url}); }
				})).catch(e => LoadError(e));
		} else if (!o.manifest) {
			fetch(collection).then(c => c.json()) .then(data => LoadSample(data) );
		}		
	}
	
	function LoadIntroduction(sample) {
		MI.changelog = mchanges;
	
		if (!MI.Interface.IsMobile()) {
			MI.Process('manifest', mstarter, {id: ManifestUtilities.Hash("json/manifest.json"), url: "json/manifest.json"});
			if (sample) {				
				const starter = LoadSample(msamples);
				fetch(starter.url).then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, url:starter.url})).catch(e => LoadError(e)).then(e => MI.Atlas.Surface(ManifestUtilities.Hash("json/manifest.json")));
			} else { LoadSample(msamples); }
		} else {
			const starter = LoadSample(msamples);
			fetch(starter.url).then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, url: starter.url})).catch(e => LoadError(e));
		}
	}

	// Processes a list of manifests to setup some ui for the list (default samples or a special collection) and returns a random starter
	function LoadSample(manifests) {		
		// Setup basic sample options list
		document.getElementById('load-samples-group').innerHTML = document.getElementById('load-custom-group').innerHTML = '';
		let optionblob = '';
		manifests.featured = manifests.collection.filter(function (entry) { return entry.featured === true; });
		
		manifests.collection.sort(function(a, b) { 
			if (a.featured && b.featured) { return a.title.localeCompare(b.title); }
			else if (a.featured || b.featured) { return a.featured ? -1 : 1; }
			else { return a.title.localeCompare(b.title); }
		});


		for (let s in manifests.collection) { optionblob += `<option value="${manifests.collection[s].id}">${manifests.collection[s].featured ? '&#11088; ' : ''}${manifests.collection[s].title}</option>`; }
		document.getElementById('load-samples-group').insertAdjacentHTML('beforeend', optionblob);
		
		// Setup fancy list if this isn't a special collection and we aren't in a mobile view
		if (manifests.collected === false && !MI.Interface.IsMobile()) {			
			document.getElementById('load-samples').classList.add('closed');
		    
			let samples = `<div id="samples-spacer" class="closed"></div><div id="samples-previews">`;	
			for (let s in manifests.collection) { 
				samples += `<div class="sample-preview ${(s === '0') ? 'selected' : ''}" tabindex="0" data-id="${manifests.collection[s].id}" data-hash="${ManifestUtilities.Hash(manifests.collection[s].id.split('-').splice(1).join('-'))}" id="sample-${ManifestUtilities.Slugify(manifests.collection[s].id)}" style="background-image:url(json/samples/thumbnails/48/${manifests.collection[s].id.split('/')[(manifests.collection[s].id.split('/')).length-1].split('.')[0]}.webp),url(json/samples/thumbnails/48/default.webp);">
					<div class="sample-title">${manifests.collection[s].featured ? '&#11088; ' : ''}${manifests.collection[s].title}</div>
					<div class="sample-description">${manifests.collection[s].description.replaceAll('**','')}</div>
				</div>`;
			} 
			samples += `<div>`;
		
			document.getElementById('loadlist-group-samples').insertAdjacentHTML('afterbegin', samples);	
			MI.Interface.SetupSamplelistHandlers();
		}
		
		// Setup user entry options (url, upload)
		let urloption =  document.createElement('option'), fileoption = document.createElement('option');
		urloption.value = 'url'; urloption.innerHTML = 'URL'; fileoption.value = 'file'; fileoption.innerHTML = 'FILE';
		document.getElementById('load-custom-group').appendChild(urloption); document.getElementById('load-custom-group').appendChild(fileoption);

		// Setup a special view for collections
		if (manifests.description && manifests.description !== '' && manifests.collected !== false) { 
			document.getElementById('minfo').innerHTML = manifests.name;
			document.getElementById('mtagline').innerHTML = manifests.description;
			document.getElementById('minfomenu').classList.add('collected-description');
			document.getElementById('loadlist-group-samples').classList.add('collected-samples');
			document.getElementById('minfomenu').innerHTML = `<div id="special-collection-message">This is a special collection on <a href="">Manifest</a>.</div>
			<div id="open-collection-btn" onclick="MI.Interface.LoadLauncherCollection();"><a>Open all Manifests</a></div>`;
			document.getElementById('loadlist-custom-group').classList.add('closed'); 
			document.getElementById('load-samples-sampletext').classList.add('closed');
		}
		
		//Return a starter from the collection of the sample manifest list
		let starterstring =  manifests.collection[Math.floor(Math.random() * manifests.collection.length)].id.split("-"); 
		let startertype = starterstring[0], starterid = [starterstring.shift(), starterstring.join('-')][1];		
		return { url: (startertype === 'manifest') ? starterid : MI.options.serviceurl + startertype+"/" + starterid, 
				 type:startertype, 
				 ref:starterid, 
				 id:((startertype !== 'smap') ? ManifestUtilities.Hash(starterid) : starterid)};
	}	
	
	function LoadCookies(o) {
		o.darkmode = o.darkmode ? o.darkmode : ManifestUtilities.GetCookie('darkmode') === 'true' ? true : false;
		return o;
		
	}
	function LoadParams(o) {
		const urlParams = new URLSearchParams(window.location.search);
		const urlObject = Object.fromEntries(urlParams);

		for (const [key, value] of Object.entries(urlObject)) {
			if (key === 'color') { o[key] = value.split(','); o[key] = o[key].map(c => '#' + c); }
			if (key === 'position') { o[key].lat = value.split(',')[0]; o[key].lng = value.split(',')[1]; o.view = 'center'; }
			if (key === 'zoom') {  o.view = 'center'; }
			if (key === 'timerange') {  o[key] = {lower: Number(value.split(':')[0]), upper: Number(value.split(':')[1])}; }
			if (key === 'storyMap' || key === 'storymap') { if (!value) { o.storyMap = true; } else { o.storyMap = value === 'false' ? false : value === 'true' ? true : null; } if (o.storyMap && !urlObject.zoom) { o.zoom = 10; } }
			if (key === 'embed') { if (!value) { o[key] = true; } else { o[key] = value === 'false' ? false : value === 'true' ? true : null; } }
			if (key === 'darkmode') { if (!value) { o[key] = true; } else { o[key] = value === 'false' ? false : value === 'true' ? true : null; } }
			
			if (['visualization','map','view','zoom'].includes(key)) { o[key] = value; }
			if (!value) { o[key] = true; }
		}
		o.urlparams = urlObject;
		return o;
	}
});	