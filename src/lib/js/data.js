let util = new ManifestUtilities();

function Start() { 	
	fetch('json/smapindex.json').then(r => r.json()).then(d => RenderSMAP(JSON.parse(d))); 
	fetch('json/samples.json').then(r => r.json()).then(d => RenderManifest(d.collection.sort(function(a, b) { return a.title.localeCompare(b.title); }))); 
}

function RenderSamples(data) {
	let samplelist = document.getElementById('samplelist');
	for (var s of data.collection) { 
		let thumb = s.id.split('/')[(s.id.split('/')).length-1].split('.')[0];
		//thumb = 'western-electric';
		let sample = document.createElement('li');
		sample.innerHTML += `
			<div class="samplewrap">
				<span class="sampletitle"><a href="./#${s.id}">${s.title}</a></span>
				<div class="sampletags">${s.categories}</div>
				<img src="json/samples/thumbnails/${thumb}.png" loading="lazy"/>
				<div class="sampledescription">${util.markdowner.makeHtml(s.description)}</div>
			</div>`;
		samplelist.appendChild(sample);
	} 
}
function RenderManifest(data) {	
	var options = {
	  valueNames: ['id','title','author', 'categories', 'description', 'date'],
	    item: function(values) {
			let thumb = values.id.split('/')[(values.id.split('/')).length-1].split('.')[0];
			return `<li class="entry">
						<div class="samplewrap">
							<span class="sampletitle"><a href="./${ManifestUtilities.Slugify(values.id)}">${values.title}</a></span>
							<div class="sampleauthor">${values.author}</div>			
							<div class="sampletags">${values.categories.split(',').map(s => `${s}`).join(', ')}</div>
							<img alt="${values.title}" src="json/samples/thumbnails/256/${thumb}.webp" onerror="this.onerror=null; this.src='json/samples/thumbnails/256/default.webp'" loading="lazy"/>
							<div class="sampledescription" title="${values.description.replace(/\[(.*?)\]\(.*?\)/g,'$1').replaceAll('**','')}">${util.markdowner.makeHtml(values.description)}</div>
							<div class="sampledate">${new Date(values.date).toLocaleDateString()}</div>
						</div>
					</li>`;
		},
		page:20,
	    pagination: [ { paginationClass: "pagination", innerWindow: 2, left: 1, right: 1, item: '<li><span class="page"></span></li>'}]	
	};

	let list = new List('manifestsamples', options, data);
}
function RenderSMAP(data) {	
	var options = {
	  valueNames: ['id','nm','dc'],
	    item: function(values) {
			let colorchoice = ["#346edb","#D10069","#157A3D","#B84900","#4d34db"];	
			
			return `<li class="entry">
						<div class="id dot" style="background:${colorchoice[values.id%5]};>${values.id}</div>
						<div class="actions">
							<a href="https://raw.githubusercontent.com/hock/smapdata/master/data/${values.id}.json">json</a> | 
							<a href="https://raw.githubusercontent.com/hock/smapdata/master/data/${values.id}.geojson">geojson</a>
						</div>
						<div class="name">
							<a href="sourcemap/${values.id}/">${values.nm}</a></div>
						<div class="description">${values.dc}</div>
						<div class="clear"></div>
					</li>`;
		},
		page:20,
	    pagination: [ { paginationClass: "pagination", innerWindow: 2, left: 1, right: 1, item: '<li><span class="page"></span></li>'}]	
	};

	let list = new List('datalist', options, data);
}