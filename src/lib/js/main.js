document.addEventListener("DOMContentLoaded", function(event) {
	if (document.documentElement.classList.contains('no-js')) { LoadError("Browser Not Supported"); return; }
	console.log("Manifest v"+mversion);
	
	let options = {
		options: true,
		serviceurl: '<%= mserverurl %>',
		 //serviceurl: 'http://hockbook.local:3000/',
		
		view: 'interest', position: {lat: 40.730610, lng: -73.935242}, zoom: 3,
		 hoverHighlight: false, retinaTiles: false, simpleLines: false, storyMap: false, demoMode: false
		//		position: {lat: 40.730610, lng: -73.935242}, zoom: 3,

		// color: ['000000','999999','#999999'] - passed in url params as color=000000,999999,999999
		// visualization: ['map','forcegraph','flow','chord','listview','textview']
		// map = [default, satellite, bw] 
		// unimplemented options in loadparams: fontsize: 20,
		
	};
	options = Object.assign(options, LoadParams(options));
	MI = new Manifest(options);
	
	console.log(options);

	if (MI.options.storyMap) { MI.Interface.Storyize(); }
	if (MI.options.visualization) { MI.Visualization.type = MI.options.visualization; }

	if (typeof(location.hash) !== 'undefined' && location.hash !== '') { 
		let hash = location.hash.substr(1).split("-"), hashtype = hash[0], hashid = [hash.shift(), hash.join('-')][1];
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
						fetch(hashid).then(r => r.json())
						.then(data => MI.Process('manifest', data, {id: ManifestUtilities.Hash(hashid), url: hashid})).catch(e => LoadError(e)); 
					} break;
				default: LoadError(`<h3>This option is not supported.</h3>
									See the <a href="https://github.com/hock/Manifest/wiki/5.-Additional-Options">Manifest Wiki</a> section on 
									<a href="https://github.com/hock/Manifest/wiki/5.-Additional-Options">Additional Options</a> for the formats we support.`);
			} LoadCollection("json/samples.json", false);
			
		}
	} else { 
		fetch("CHANGELOG.md").then(c => c.text()).then(changelog => LoadIntroduction(changelog, true) );
	}

	function LoadError(msg) { 
		console.log(msg);
		document.getElementById('loadermessage').innerHTML = ''+msg+''; 
		document.getElementById('loadermessage').style.color = 'white';
		document.getElementById('loaderspinner').remove();
	}
	
	function LoadCollection(collection, start) {
		if (start) { 
			fetch(collection).then(c => c.json()) .then(data => LoadSample(data) ).then(starter => fetch(starter.url)
				.then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, idref: starter.ref, url: starter.url}))).catch(e => LoadError(e));
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
		document.getElementById('load-samples-group').innerHTML = document.getElementById('load-samples-custom').innerHTML = '';
		
		for (var s in d.collection) { 
			let option = document.createElement('option');
			option.value = d.collection[s].id; option.innerHTML = d.collection[s].title;
			document.getElementById('load-samples-group').appendChild(option);
		} 
		let urloption =  document.createElement('option'), fileoption = document.createElement('option');
		urloption.value = 'url'; urloption.innerHTML = 'URL'; fileoption.value = 'file'; fileoption.innerHTML = 'FILE';
		document.getElementById('load-samples-custom').appendChild(urloption); document.getElementById('load-samples-custom').appendChild(fileoption);

		// Special view for collections
		if (d.description && d.description !== '' && d.collected !== false) { 
			document.getElementById('minfo').innerHTML = d.name;
			document.getElementById('mtagline').innerHTML = d.description;
			document.getElementById('minfomenu').classList.add('collected-description');
			document.getElementById('minfomenu').innerHTML = `This is a special collection on <a href="">Manifest</a>.`;
			document.getElementById('load-samples-custom').remove(); document.getElementById('load-samples-sampletext').remove();
		}
		
		let starterstring =  d.collection[Math.floor(Math.random() * d.collection.length)].id.split("-"); 
		let startertype = starterstring[0], starterid = [starterstring.shift(), starterstring.join('-')][1];		
		return {url: (startertype === 'manifest') ? starterid : MI.options.serviceurl + startertype+"/" + starterid, type:startertype, ref:starterid, id:((startertype !== 'smap') ? ManifestUtilities.Hash(starterid) : starterid)};
	}	
	
	function LoadParams(o) {
		const urlParams = new URLSearchParams(window.location.search);
		const urlObject = Object.fromEntries(urlParams);
		for (const [key, value] of Object.entries(urlObject)) {

			if (key === 'color') { 
				o[key] = value.split(','); 
				o[key] = o[key].map(c => '#' + c); 
			}
			if (key === 'position') { 
				o[key].lat = value.split(',')[0]; 
				o[key].lng = value.split(',')[1]; 
			}
			if (['visualization','map','view','zoom'].includes(key)) { o[key] = value; }
			if (!value) { o[key] = true; }
		}
		return o;
	}
});	