document.addEventListener("DOMContentLoaded", function(event) {
	if (document.documentElement.classList.contains('no-js')) { LoadError("Browser Not Supported"); return; }
	console.log("Manifest v"+mversion);
	
	let options = {
		options: true,
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

	options = Object.assign(options, LoadParams(options));
	MI = new Manifest(options);
	console.log(options);
	
	if (MI.options.storyMap) { MI.Interface.Storyize(); }
	if (MI.options.embed) { MI.Interface.Embedize(); }
	document.documentElement.classList.remove('loading');
	
	if (MI.options.visualization) { MI.Visualization.type = MI.options.visualization; }
	
	let hash = false;
	
	// URL Mapping
	if (window.location.pathname.includes('/manifest/')) {
		hash = ['manifest','json/'+window.location.pathname.split('/manifest/').pop().split('/').filter((a) => a !== '').join('/')+'.json'];
	} else if (window.location.pathname.includes('/gsheet/')) {
		hash = ['gsheet',window.location.pathname.split('/gsheet/').pop().split('/').filter((a) => a !== '').join('/')];
	} else if (window.location.pathname.includes('/collection/')) {
		hash = ['collection',window.location.pathname.split('/collection/').pop().split('/').filter((a) => a !== '').join('/')+'.json'];
	} else if (typeof(location.hash) !== 'undefined' && location.hash !== '') { 
		hash = location.hash.substr(1).split("-");
	}

	if (hash) { 
		let hashtype = hash[0], hashid = [hash.shift(), hash.join('-')][1];
		if (hashtype === "collection") { LoadCollection(hashid, true); }
		else { 
			if (hashtype === 'gsheet' && hashid.toLowerCase().indexOf('https://docs.google.com/spreadsheets/d/') >= 0) { hashid = hashid.substring(39).split('/')[0]; }
			switch (hashtype) {
				case 'smap': fetch(MI.options.serviceurl + 'smap/' + hashid).then(r => r.json())
				.then(data => MI.Process('smap', data, {id: hashid, idref: hashid, url:MI.options.serviceurl + 'smap/' + hashid})); break;
				case 'gsheet': fetch(MI.options.serviceurl + 'gsheet/' + hashid).then(r => { if (!r.ok) { r.text().then(e => { LoadError(e); }); } else { r.json()
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
			} LoadCollection("json/samples.json", false);
			
		}
	} else { 
		fetch("CHANGELOG.md").then(c => c.text()).then(changelog => LoadIntroduction(changelog, !MI.options.storyMap) );
	}

	function LoadError(msg, status=0) { 
		if (status === 404) { msg = 'We couldn\'t find a valid Manifest format at that address.'; }
		console.log(msg);
		document.getElementById('loader').style.display = 'block';
		document.getElementById('loadermessage').innerHTML = ''+msg+''; 
	}
	
	function LoadCollection(collection, start) {
		if (start) { 
			fetch(collection).then(c => c.json()) .then(data => LoadSample(data) ).then(starter => fetch(starter.url)
				.then(s => s.json()).then(d => {
					if (starter.type === 'gsheet') { let gsheet = {g: d[0], r: d[1] }; MI.Process('gsheet', gsheet, {id: starter.id, idref: starter.ref, url: MI.options.serviceurl + '/gsheet' + starter.id}); } else { MI.Process(starter.type, d, {id: starter.id, idref: starter.ref, url: starter.url}); }
				})).catch(e => LoadError(e));
		} else {
			fetch(collection).then(c => c.json()) .then(data => LoadSample(data) );
		}		
	}
	
	function LoadIntroduction(changelog, sample) {
		MI.changelog = changelog;
		
		if (!MI.Interface.IsMobile()) {
			if (sample) {				
				fetch("json/samples.json").then(c => c.json()).then(data => LoadSample(data) ).then(starter => fetch(starter.url)
				.then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, url:starter.url}))).then(fetch("json/manifest.json")
				.then(r => r.json()).then(data => MI.Process('manifest', data, {delay: true, id: ManifestUtilities.Hash("json/manifest.json"), url: "json/manifest.json"})))
				.catch(e => LoadError(e));
			} else {				
				fetch("json/samples.json").then(c => c.json()).then(data => LoadSample(data) ).then(fetch("json/manifest.json")
				.then(r => r.json()).then(data => MI.Process('manifest', data, {id: ManifestUtilities.Hash("json/manifest.json"), url: "json/manifest.json"})))
				.catch(e => LoadError(e));
			}
		} else {
			fetch("json/samples.json").then(c => c.json()).then(data => LoadSample(data) ).then(starter => fetch(starter.url)
			.then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, url: starter.url}))).catch(e => LoadError(e));
		}
	}
	//MI.Process("yeti", yeti, {"id": ("casper sleep").hashCode()});

	function LoadSample(d) {
		document.getElementById('load-samples-group').innerHTML = document.getElementById('load-custom-group').innerHTML = '';
		for (let s in d.collection) { 
			let option = document.createElement('option');
			option.value = d.collection[s].id; option.innerHTML = d.collection[s].title;
			document.getElementById('load-samples-group').appendChild(option);
		}
		
		if (d.collected === false && !MI.Interface.IsMobile()) {
			document.getElementById('load-samples').classList.add('closed');
		    
			let samples = `<div id="samples-spacer" class="closed"></div><div id="samples-previews">`;	
			for (let s in d.collection) { 
				let option = document.createElement('option');
				option.value = d.collection[s].id; option.innerHTML = d.collection[s].title;
				document.getElementById('load-samples-group').appendChild(option);
				samples += `<div class="sample-preview ${(s === '0') ? 'selected' : ''}" tabindex="0" data-id="${d.collection[s].id}" data-hash="${ManifestUtilities.Hash(d.collection[s].id.split('-').splice(1).join('-'))}" id="sample-${ManifestUtilities.Slugify(d.collection[s].id)}" style="background-image:url(json/samples/thumbnails/48/${d.collection[s].id.split('/')[(d.collection[s].id.split('/')).length-1].split('.')[0]}.png);">
					<div class="sample-title">${d.collection[s].title}</div>
					<div class="sample-description">${d.collection[s].description.replaceAll('**','')}</div>
				</div>`;
			} 
			samples += `<div>`;
		
			document.getElementById('loadlist-group-samples').insertAdjacentHTML('afterbegin', samples);
		
			MI.Interface.SetupSamplelistHandlers();
		}
		
		let urloption =  document.createElement('option'), fileoption = document.createElement('option');
		urloption.value = 'url'; urloption.innerHTML = 'URL'; fileoption.value = 'file'; fileoption.innerHTML = 'FILE';
		document.getElementById('load-custom-group').appendChild(urloption); document.getElementById('load-custom-group').appendChild(fileoption);

		// Special view for collections
		if (d.description && d.description !== '' && d.collected !== false) { 
			document.getElementById('minfo').innerHTML = d.name;
			document.getElementById('mtagline').innerHTML = d.description;
			document.getElementById('minfomenu').classList.add('collected-description');
			document.getElementById('loadlist-group-samples').classList.add('collected-samples');
			document.getElementById('minfomenu').innerHTML = `This is a special collection on <a href="">Manifest</a>.`;
			document.getElementById('loadlist-custom-group').classList.add('closed'); 
			document.getElementById('load-samples-sampletext').classList.add('closed');
		}
		
		let starterstring =  d.collection[Math.floor(Math.random() * d.collection.length)].id.split("-"); 
		let startertype = starterstring[0], starterid = [starterstring.shift(), starterstring.join('-')][1];		
		return {url: (startertype === 'manifest') ? starterid : MI.options.serviceurl + startertype+"/" + starterid, type:startertype, ref:starterid, id:((startertype !== 'smap') ? ManifestUtilities.Hash(starterid) : starterid)};
	}	
	
	function LoadParams(o) {
		const urlParams = new URLSearchParams(window.location.search);
		const urlObject = Object.fromEntries(urlParams);

		for (const [key, value] of Object.entries(urlObject)) {
			if (key === 'color') { o[key] = value.split(','); o[key] = o[key].map(c => '#' + c); }
			if (key === 'position') { o[key].lat = value.split(',')[0]; o[key].lng = value.split(',')[1]; o.view = 'center'; }
			if (key === 'zoom') {  o.view = 'center'; }
			if (key === 'storyMap' || key === 'storymap') { if (!value) { o.storyMap = true; } else { o.storyMap = value === 'false' ? false : value === 'true' ? true : null; } if (o.storyMap && !urlObject.zoom) { o.zoom = 10; } }
			if (key === 'embed') { if (!value) { o[key] = true; } else { o[key] = value === 'false' ? false : value === 'true' ? true : null; } }
			
			if (['visualization','map','view','zoom'].includes(key)) { o[key] = value; }
			if (!value) { o[key] = true; }
		}
		o.urlparams = urlObject;
		return o;
	}
});	