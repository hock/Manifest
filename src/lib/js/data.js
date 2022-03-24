function Start() { 	
	fetch('json/smapindex.json').then(r => r.json()).then(d => SetTable(JSON.parse(d))); 
	
	document.querySelectorAll('#minfo-hamburger, #minfo').forEach(el => { 
		el.addEventListener('click', (e) => { document.getElementById('minfodetail').classList.toggle('closed'); }); });	
}

function SetTable(data) {	
	var options = {
	  valueNames: ['id','nm','dc'],
	    item: function(values) {
			let colorchoice = [["#3498DB","#dbedf9"],["#FF0080","#f9dbde"],["#34db77","#dbf9e7"],["#ff6500","#f6d0ca"],["#4d34db","#dfdbf9"]];	
			
			return `<li class="entry">
						<div class="id dot" style="background:${colorchoice[values.id%5][0]}; color:${colorchoice[values.id%5][1]}; border-color:${colorchoice[values.id%5][1]}">${values.id}</div>
						<div class="actions">
							<a href="https://raw.githubusercontent.com/hock/smapdata/master/data/${values.id}.json"><i class="far fa-book"></i></a>
							<a href="https://raw.githubusercontent.com/hock/smapdata/master/data/${values.id}.geojson"><i class="far fa-atlas"></i></a>
						</div>
						<div class="name">
							<a href="#smap-${values.id}">${values.nm}</a></div>
						<div class="description">${values.dc}</div>
						<div class="clear"></div>
					</li>`;
		},
		page:50,
	    pagination: [ { paginationClass: "pagination", innerWindow: 2, left: 1, right: 1, item: '<li><a class="page"></a></li>'}]	
	};

	let list = new List('datalist', options, data);
}