document.addEventListener("DOMContentLoaded", function(event) {
	MI = new Manifest();
	MI.serviceurl = "https://supplystudies.com/manifest/services/";
		
	if (typeof(location.hash) !== 'undefined' && location.hash !== '') { 
		let hash = location.hash.substr(1).split("-"), hashtype = hash[0], hashid = [hash.shift(), hash.join('-')][1];
		if (hashtype === "collection") { LoadCollection(hashid, true); }
		else { 
			switch (hashtype) {
				case "smap": fetch(MI.serviceurl + '?type=smap&id=' + hashid).then(r => r.json())
					.then(data => MI.Process('smap', data, {id: hashid})).then(r => Start()).catch(e => LoadError(e)); break;
				case "gsheet": fetch(MI.serviceurl + '?type=gsheet&id=' + hashid).then(r => r.json())
					.then(data => MI.Process('gsheet', data, {id: hashid.hashCode()})).then(r => Start()).catch(e => LoadError(e)); break;
				case "manifest": fetch(hashid).then(r => r.json())
					.then(data => MI.Process('manifest', data, {id: (data.summary.name).hashCode()})).then(r => Start()).catch(e => LoadError(e)); break;
				default: LoadError('Option not supported');
			}  LoadCollection("json/samples.json", false);
		}
	} else { LoadCollection("json/samples.json", true); }

	function LoadError(msg) { 
		document.getElementById('loadermessage').innerHTML = '['+msg+']'; 
		document.getElementById('loadermessage').style.color = 'red';
		document.getElementById('loaderspinner').remove();
	}
	
	function LoadCollection(collection, start) {
		if (start) { 
			fetch(collection).then(c => c.json()) .then(data => LoadSample(data) ).then(starter => fetch(starter.url)
				.then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, start:true})).then(r => Start())).catch(e => LoadError(e));
		} else {
			fetch(collection).then(c => c.json()) .then(data => LoadSample(data) );
		}		
	}
	//MI.functions.process("yeti", yeti, {"id": ("casper sleep").hashCode()});
	//	var starters = [5333,2239,602,5228,4532,2737,5228]; ... if(d.featured)


	function LoadSample(d) {
		document.getElementById('collection-description').innerHTML = d.description;
		for (var s in d.collection) { 
			let option = document.createElement('option');
			option.value = d.collection[s].id; option.innerHTML = d.collection[s].title;
			document.getElementById('load-samples-group').appendChild(option);
		} 
		let urloption =  document.createElement('option'), fileoption = document.createElement('option');
		urloption.value = 'url'; urloption.innerHTML = 'URL'; fileoption.value = 'file'; fileoption.innerHTML = 'FILE';
		document.getElementById('load-samples-custom').appendChild(urloption); document.getElementById('load-samples-custom').appendChild(fileoption);

		let starterstring =  d.collection[Math.floor(Math.random() * d.collection.length)].id.split("-"); 
		let startertype = starterstring[0], starterid = [starterstring.shift(), starterstring.join('-')][1];		
		return {url: (startertype === 'manifest') ? starterid : MI.serviceurl + "?type="+startertype+"&id=" + starterid, type:startertype, ref:starterid, id:((startertype !== 'smap') ? starterid.hashCode() : starterid)};
	}	
	
	function Start() {
		MI.Atlas.map.fitBounds(MI.Atlas.map.getBounds());
		MI.Atlas.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
				
		if (MI.supplychains.length > 0) {
			if (MI.Atlas.active_point === null) { MI.Atlas.SetView(); }
			if (!(MI.initialized)) { MI.Interface.CleanupInterface(); }   
		}
	}
	
	// Do Testing
	// ManifestTests();
});	