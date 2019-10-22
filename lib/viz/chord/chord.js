var serviceURL = "https://raw.githubusercontent.com/hock/smapdata/master/data/";

data = {}, data.details = {};
data.nodes = [], data.links = [], cvis = {};
var smap_id;

$(window)
	.resize(function() {
	initVars(smap_id);
	buildMatrix();
	render();
});

function init(id) {
	initVars(id);
	fetchGeoJSON(id);
}

function fetchGeoJSON(id) {
	d3.json(serviceURL + id + ".json", function(json) {
		data.rawjson = json;
		data.details.stats = {};
		data.details.stats.places = [], data.details.stats.countries = [], data.details.stats.parts = [];

		if (typeof(json.supplychain.stops) != 'undefined') {
			for (var i = 0; i < json.supplychain.stops.length; ++i) {
				var place = (typeof(json.supplychain.stops[i].attributes.placename) != 'undefined') ? json.supplychain.stops[i].attributes.placename : json.supplychain.stops[i].attributes.address;
				loc = place.split(", ");
				loc = loc[loc.length - 1];
				if (loc == "USA") {
					loc = "United States";
				}

				var newNode = {
					"name": json.supplychain.stops[i].attributes.title,
					"loc": loc,
					"place": place,
					"color": colors(i),
					"group": json.supplychain.stops[i].local_stop_id - 1,
					"links": [],
					"weight": 10,
					"size": 10
				}
				data.details.stats.places.push(place);
				data.details.stats.countries.push(loc);
				data.details.stats.parts.push(newNode.name);

				data.nodes[json.supplychain.stops[i].local_stop_id - 1] = newNode;
			}
		}

		if (typeof(json.supplychain.hops) != 'undefined') {
			for (var i = 0; i < json.supplychain.hops.length; ++i) {
				data.nodes[json.supplychain.hops[i].to_stop_id - 1].links.push(data.nodes[json.supplychain.hops[i].from_stop_id - 1].loc);
				var newLink = {
					"source": Number(json.supplychain.hops[i].from_stop_id - 1),
					"target": Number(json.supplychain.hops[i].to_stop_id - 1),
					"value": 10,
					"size": 4
				};
				data.links.push(newLink);

			}
		}

		if (typeof(json.supplychain.hops) != 'undefined') {
			for (var i = 0; i < json.supplychain.hops.length; ++i) {
				data.nodes[json.supplychain.hops[i].from_stop_id - 1].links.push(data.nodes[json.supplychain.hops[i].to_stop_id - 1].loc);
			}
		}

		for (var i = 0; i < data.nodes.length; i++) {
			if (typeof(data.nodes[i]) == 'undefined') {
				data.nodes[i] = {
					"name": "",
					"loc": "",
					"place": "",
					"color": colors(i),
					"group": i,
					"links": [],
					"weight": 10,
					"size": 10
				}
			}
		}

		if (data.details.stats.countries.length == 1) {
			if (typeof(data.rawjson.supplychain.hops) != 'undefined') {
				for (var i = 0; i < data.rawjson.supplychain.hops.length; ++i) {
					data.nodes[data.rawjson.supplychain.hops[i].to_stop_id - 1].links = data.nodes[data.rawjson.supplychain.hops[i].from_stop_id - 1].links = [];
					data.nodes[data.rawjson.supplychain.hops[i].to_stop_id - 1].links.push(data.nodes[data.rawjson.supplychain.hops[i].from_stop_id - 1].place);
					data.nodes[data.rawjson.supplychain.hops[i].from_stop_id - 1].links.push(data.nodes[data.rawjson.supplychain.hops[i].to_stop_id - 1].place);
				}
			}
		}

		buildMatrix();
	});
}

function initVars(id) {
	smap_id = id;
	cvis = {};
	d3.select("#chord svg")
		.remove();

	cvis.width = Math.max(1, $(document)
		.width()),
	cvis.height = Math.max(1, $(document)
		.height()),
	cvis.outerRadius = Math.min(cvis.width, cvis.height) / 2 - 30,
	cvis.innerRadius = cvis.outerRadius - 24;

	cvis.formatPercent = d3.format(".1%");

	cvis.arc = d3.svg.arc()
		.innerRadius(cvis.innerRadius)
		.outerRadius(cvis.outerRadius);

	cvis.layout = d3.layout.chord()
		.padding(.02)
		.sortSubgroups(d3.descending)
		.sortChords(d3.ascending);

	cvis.path = d3.svg.chord()
		.radius(cvis.innerRadius);

	colors = d3.scale.ordinal()
		.domain(d3.range(4))
		.range(["#2980B9", "#ffffff", "#3498DB", "#34485E"]);

	cvis.chordsvg = d3.select("#chord")
		.append("svg")
		.attr("width", cvis.width)
		.attr("height", cvis.height)
		.append("g")
		.attr("id", "circle")
		.attr("transform", "translate(" + cvis.width / 2 + "," + cvis.height / 2 + ")");

	cvis.chordsvg.append("circle")
		.attr("r", Math.max(1, cvis.outerRadius));
}

function buildMatrix() {
	cvis.indexByLoc = {},
	cvis.locByIndex = {},
	cvis.matrix = [];

	var n = 0;

	data.nodes.forEach(function(d) {
		if (!(d.loc in cvis.indexByLoc)) {
			cvis.locByIndex[n] = d;
			cvis.indexByLoc[d.loc] = n++;
		}
	});

	data.nodes.forEach(function(d) {
		var source = cvis.indexByLoc[d.loc],
			row = cvis.matrix[source];
		if (!row) {
			row = cvis.matrix[source] = [];
			for (var i = -1; ++i < n;) row[i] = 0;
		}
		d.links.forEach(function(d) {
			row[cvis.indexByLoc[d]] = cvis.locByIndex[cvis.indexByLoc[d]].weight;
		});
	});
	render();

}

function render() {
	cvis.layout.matrix(cvis.matrix);

	cvis.group = cvis.chordsvg.selectAll(".group")
		.data(cvis.layout.groups)
		.enter()
		.append("g")
		.attr("class", "group")
		.on("mouseover", mouseover);

	cvis.group.append("title")
		.text(function(d, i) {
		return cvis.locByIndex[d.index].name;
	});

	cvis.groupPath = cvis.group.append("path")
		.attr("id", function(d, i) {
		return "group" + i;
	})
		.attr("d", cvis.arc)
		.style("fill", function(d, i) {
		return cvis.locByIndex[d.index].color;
	});

	cvis.groupText = cvis.group.append("text")
		.style("font-size", 12)
		.style("font-weight", "bold")
		.style("pointer-events", "none")
		.attr("x", 2)
		.attr("dy", 15);

	cvis.groupText.append("textPath")
		.attr("xlink:href", function(d, i) {
		return "#group" + i;
	})
		.text(function(d, i) {
		return cvis.locByIndex[d.index].loc;
	});

	cvis.extraLabels = cvis.group.append("svg:text")
		.each(function(d) {
		d.angle = (d.startAngle + d.endAngle) / 2;
	})
		.attr("dy", ".35em")
		.style("fill", function(d) {
		return cvis.locByIndex[d.index].color
	})
		.style("font-size", 18)

		.style("pointer-events", "none")
		.attr("class", "littlelabel")
		.attr("text-anchor", function(d) {
		return d.angle > Math.PI ? "end" : null;
	})
		.attr("transform", function(d) {
		return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + (cvis.innerRadius + 30) + ")" + (d.angle > Math.PI ? "rotate(180)" : "");
	})
		.text(function(d) {
		return cvis.locByIndex[d.index].loc;
	});

	cvis.extraLabels.filter(function(d, i) {
		return cvis.groupPath[0][i].getTotalLength() / 2 - 48 > this.getComputedTextLength();
	})
		.remove();

	cvis.groupText.filter(function(d, i) {
		return cvis.groupPath[0][i].getTotalLength() / 2 - 24 < this.getComputedTextLength();
	})
		.remove();

	cvis.chord = cvis.chordsvg.selectAll(".chord")
		.data(cvis.layout.chords)
		.enter()
		.append("path")
		.attr("class", "chord")
		.style("fill", function(d) {
		return cvis.locByIndex[d.source.index].color;
	})
		.style("opacity", "0.8")
		.attr("d", cvis.path);

	cvis.chord.append("title")
		.text(function(d) {
		return cvis.locByIndex[d.target.index].loc + "\u2192" + cvis.locByIndex[d.source.index].loc
	});
}

function mouseover(d, i) {
	cvis.chord.classed("fade", function(p) {
		return p.source.index != i && p.target.index != i;
	});
}

Array.prototype.unique = function() {
	var u = {}, a = [];
	for (var i = 0, l = this.length; i < l; ++i) {
		if (this[i] in u) continue;
		a.push(this[i]);
		u[this[i]] = 1;
	}
	return a;
}
