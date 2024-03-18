let util = new ManifestUtilities();

function Start() { 	
	fetch('json/smapindex.json').then(r => r.json()).then(d => SetTable(JSON.parse(d))); 
	fetch('json/samples.json').then(r => r.json()).then(d => RenderSamples(d)); 
	
	document.querySelectorAll('#minfo-hamburger, #minfo').forEach(el => { 
		el.addEventListener('click', (e) => { document.getElementById('minfodetail').classList.toggle('closed'); }); });	
}

function RenderSamples(data) {
	let samplelist = document.getElementById('samplelist');
	for (var s of data.collection) { 
		let thumb = s.id.split('/')[(s.id.split('/')).length-1].split('.')[0];
		//thumb = 'western-electric';
		let sample = document.createElement('li');
		sample.innerHTML += `
			<div class="samplewrap">
				<h3 class="sampletitle"><a href="./#${s.id}">${s.title}</a></h3>
				<div class="sampletags">${s.categories}</div>
				<img src="json/samples/thumbnails/${thumb}.png" loading="lazy"/>
				<div class="sampledescription">${util.markdowner.makeHtml(s.description)}</div>
			</div>`;
		samplelist.appendChild(sample);
	} 
}
function SetTable(data) {	
	var options = {
	  valueNames: ['id','nm','dc'],
	    item: function(values) {
			let colorchoice = [["#3498DB","#dbedf9"],["#FF0080","#f9dbde"],["#34db77","#dbf9e7"],["#ff6500","#f6d0ca"],["#4d34db","#dfdbf9"]];	
			
			return `<li class="entry">
						<div class="id dot" style="background:${colorchoice[values.id%5][0]}; color:${colorchoice[values.id%5][1]}; border-color:${colorchoice[values.id%5][1]}">${values.id}</div>
						<div class="actions">
							<a href="https://raw.githubusercontent.com/hock/smapdata/master/data/${values.id}.json">json</a> | 
							<a href="https://raw.githubusercontent.com/hock/smapdata/master/data/${values.id}.geojson">geojson</a>
						</div>
						<div class="name">
							<a href="#smap-${values.id}">${values.nm}</a></div>
						<div class="description">${values.dc}</div>
						<div class="clear"></div>
					</li>`;
		},
		page:10,
	    pagination: [ { paginationClass: "pagination", innerWindow: 2, left: 1, right: 1, item: '<li><a class="page"></a></li>'}]	
	};

	let list = new List('datalist', options, data);
}