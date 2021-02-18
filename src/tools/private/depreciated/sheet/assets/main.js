var serviceURL = "http://free.sourcemap.com/services/";

data = {}, data.details = {}; data.nodes = [], data.links = [];
is = {}, is.cvis = {}, is.svis = {}, is.gvis = {};
var smap_id;

function init(id) {
	initVars(id);
	initUI();
	d3.json(serviceURL+"supplychains/"+id, function(json) {
		console.log(json);
		data.rawjson = json;
		data.details = json.supplychain.attributes;
		data.details.owner = json.supplychain.owner;

		data.details.created = new Date(0);
		data.details.created.setUTCSeconds(json.supplychain.created);

		data.details.stats = {};
		data.details.stats.places = [], data.details.stats.countries = [], data.details.stats.parts = [];

	  if(typeof(json.supplychain.stops) != 'undefined') {
		  for (var i=0; i<json.supplychain.stops.length; ++i) {
			  var place = (typeof(json.supplychain.stops[i].attributes.placename) != 'undefined') ? json.supplychain.stops[i].attributes.placename : json.supplychain.stops[i].attributes.address;
			  loc = place.split(", ");
		 	  loc = loc[loc.length-1];
			  if(loc == "USA") { loc = "United States";}

			  var newNode = {
				  "name": json.supplychain.stops[i].attributes.title,
				  "loc": loc,
				  "place": place,
				  "color":is.colors(i),
				  "group":json.supplychain.stops[i].local_stop_id-1,
				  "links": [],
				  "weight":10,
				  "size": 10
			  }
	  		  data.details.stats.places.push(place);
	  		  data.details.stats.countries.push(loc);
	  		  data.details.stats.parts.push(newNode.name);

			  data.nodes[json.supplychain.stops[i].local_stop_id-1] = newNode;
		  }
	  }
	  if(typeof(json.supplychain.hops) != 'undefined') {
		  for (var i=0; i<json.supplychain.hops.length; ++i) {
			  data.nodes[json.supplychain.hops[i].to_stop_id-1].links.push( data.nodes[json.supplychain.hops[i].from_stop_id-1].loc);
			  var newLink = {
							"source": Number(json.supplychain.hops[i].from_stop_id-1),
							"target": Number(json.supplychain.hops[i].to_stop_id-1),
							"value": 10,
							"size": 4
						};
			  data.links.push(newLink);

		  }
	  }
	  if(typeof(json.supplychain.hops) != 'undefined') {
		  for (var i=0; i<json.supplychain.hops.length; ++i) {
			  data.nodes[json.supplychain.hops[i].from_stop_id-1].links.push( data.nodes[json.supplychain.hops[i].to_stop_id-1].loc);
		  }
	  }
	  calculateStatistics();

	  for (var i=0; i<data.nodes.length; i++) {
		  if(typeof(data.nodes[i]) == 'undefined') {
			  console.log("undefined");
			  data.nodes[i] = { "name": "", "loc": "", "place": "", "color":is.colors(i), "group":i, "links": [], "weight":10, "size": 10}
		  }
	  }
	  if(data.details.stats.countries.length == 1) {
		  data.nodes.forEach(function(d) {
			  d.loc = d.place;
		  });
		  if(typeof(data.rawjson.supplychain.hops) != 'undefined') {
			  for (var i=0; i<data.rawjson.supplychain.hops.length; ++i) {
				  data.nodes[data.rawjson.supplychain.hops[i].to_stop_id-1].links = data.nodes[data.rawjson.supplychain.hops[i].from_stop_id-1].links = [];
				  data.nodes[data.rawjson.supplychain.hops[i].to_stop_id-1].links.push( data.nodes[data.rawjson.supplychain.hops[i].from_stop_id-1].place);
				  data.nodes[data.rawjson.supplychain.hops[i].from_stop_id-1].links.push( data.nodes[data.rawjson.supplychain.hops[i].to_stop_id-1].place);
			  }
		  }
	  }

	  render();
	});
}

function calculateStatistics() {
 	  data.details.stats.places = data.details.stats.places.unique();
 	  data.details.stats.countries = data.details.stats.countries.unique();
 	  data.details.stats.parts = data.details.stats.parts.unique();
}
function render() {
	  buildMatrix();
	  renderDetails();

	  renderChord();
	  renderSankey();
	  renderGraph();
	  console.log(data);
}

function initUI() {
	$("#tabs li").click(function() {
		$("#tabs li").removeClass("active");
		var target = $(this).attr("class");
		$(this).addClass("active");
		$("#contentTabs .tab").css("display","none");
		$("#contentTabs #"+target).css("display","block");
	});
}
function initVars(id) {
	smap_id = id;

	is.cvis.width = 420,
	    is.cvis.height = 420,
	    is.cvis.outerRadius = Math.min(is.cvis.width, is.cvis.height) / 2 - 10,
	    is.cvis.innerRadius = is.cvis.outerRadius - 24;

	is.cvis.formatPercent = d3.format(".1%");

	is.cvis.arc = d3.svg.arc()
	    .innerRadius(is.cvis.innerRadius)
	    .outerRadius(is.cvis.outerRadius);

	is.cvis.layout = d3.layout.chord()
	    .padding(.02)
	    .sortSubgroups(d3.descending)
	    .sortChords(d3.ascending);

	is.cvis.path = d3.svg.chord()
	    .radius(is.cvis.innerRadius);

	is.colors = d3.scale.ordinal()
		.domain(d3.range(7))
	   	.range(["#35A297", "#547F8A", "#735C7C", "#92396E", "#B01560", "#BD3A4F", "#E2A919"]);

	is.cvis.chordsvg = d3.select("#chord").append("svg")
	    .attr("width", is.cvis.width)
	    .attr("height", is.cvis.height)
	  	.append("g")
	    .attr("id", "circle")
	    .attr("transform", "translate(" + is.cvis.width / 2 + "," + is.cvis.height / 2 + ")");

		is.cvis.chordsvg.append("circle")
	    .attr("r", is.cvis.outerRadius);

	is.svis.margin = {top: 1, right: 1, bottom: 6, left: 1},
	    is.svis.width = 848 - is.svis.margin.left - is.svis.margin.right,
	    is.svis.height = 400 - is.svis.margin.top - is.svis.margin.bottom;

	is.svis.sankeysvg = d3.select("#sankey").append("svg")
	    .attr("width", is.svis.width + is.svis.margin.left + is.svis.margin.right)
	    .attr("height", is.svis.height + is.svis.margin.top + is.svis.margin.bottom)
	  	.append("g")
	    .attr("transform", "translate(" + is.svis.margin.left + "," + is.svis.margin.top + ")");

	is.svis.sankey = d3.sankey()
	    .nodeWidth(15)
	    .nodePadding(20)
	    .size([is.svis.width, is.svis.height]);

	is.svis.path = is.svis.sankey.link();

	is.gvis.w = 848,
	is.gvis.h = 500;
	is.gvis.graphsvg = d3.select("#graph").append("svg")
	   .attr("width", is.gvis.w)
	   .attr("height", is.gvis.h);

}

function buildMatrix() {
  is.cvis.indexByLoc = {},
  is.cvis.locByIndex = {},
  is.cvis.matrix = [];

  var n = 0;

  data.nodes.forEach(function(d) {
  	if (!(d.loc in is.cvis.indexByLoc)) {
    	is.cvis.locByIndex[n] = d;
    	is.cvis.indexByLoc[d.loc] = n++;
  	}
  });

  data.nodes.forEach(function(d) {
  	var source = is.cvis.indexByLoc[d.loc],
      	row = is.cvis.matrix[source];
  	  if (!row) {
   	   row = is.cvis.matrix[source] = [];
   	   for (var i = -1; ++i < n;) row[i] = 0;
  	  }
  	d.links.forEach(function(d) { row[is.cvis.indexByLoc[d]] = is.cvis.locByIndex[is.cvis.indexByLoc[d]].weight; });
  });
}

function renderChord() {
  is.cvis.layout.matrix(is.cvis.matrix);

  is.cvis.group = is.cvis.chordsvg.selectAll(".group")
  	.data(is.cvis.layout.groups)
  	.enter().append("g")
  	.attr("class", "group")
  	.on("mouseover", mouseover);

  is.cvis.group.append("title").text(function(d, i) {
    return is.cvis.locByIndex[d.index].name;
  });

  is.cvis.groupPath = is.cvis.group.append("path")
	    .attr("id", function(d, i) { return "group" + i; })
	    .attr("d", is.cvis.arc)
	    .style("fill", function(d, i) { return is.cvis.locByIndex[d.index].color; });

  is.cvis.groupText = is.cvis.group.append("text")
	    .attr("x", 6)
	    .attr("dy", 15);

  is.cvis.groupText.append("textPath")
	    .attr("xlink:href", function(d, i) { return "#group" + i; })
	    .text(function(d, i) { return is.cvis.locByIndex[d.index].loc; });

  is.cvis.extraLabels = is.cvis.group.append("svg:text")
		      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
		      .attr("dy", ".35em")
			  .style("fill",function(d) { return is.cvis.locByIndex[d.index].color})
		      .attr("class", "littlelabel")
		      .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
		      .attr("transform", function(d) {
		        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
		            + "translate(" + (is.cvis.innerRadius + 30) + ")"
		            + (d.angle > Math.PI ? "rotate(180)" : "");
		      })
		      .text(function(d) { return is.cvis.locByIndex[d.index].loc; });

    is.cvis.extraLabels.filter(function(d, i) { return is.cvis.groupPath[0][i].getTotalLength() / 2 - 48 > this.getComputedTextLength(); }).remove();

    is.cvis.groupText.filter(function(d, i) { return is.cvis.groupPath[0][i].getTotalLength() / 2 - 24 < this.getComputedTextLength(); }).remove();

    is.cvis.chord = is.cvis.chordsvg.selectAll(".chord")
        .data(is.cvis.layout.chords)
        .enter().append("path")
        .attr("class", "chord")
        .style("fill", function(d) { return is.cvis.locByIndex[d.source.index].color; })
        .attr("d", is.cvis.path);

    is.cvis.chord.append("title").text(function(d) {
      return is.cvis.locByIndex[d.target.index].loc
             + "\u2192"+ is.cvis.locByIndex[d.source.index].loc
    });
}

function renderSankey() {
  is.svis.sankey
      .nodes(data.nodes)
      .links(data.links)
      .layout(32);

  is.svis.link = is.svis.sankeysvg.append("g").selectAll(".link")
      .data(data.links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", is.svis.path)
      .style("stroke-width", function(d) { return Math.max(5, d.dy); })
      .style("stroke", function(d) { return d.color = d.source.color; })
      .sort(function(a, b) { return b.dy - a.dy; });

  is.svis.link.append("title")
      .text(function(d) { return d.source.name + " \u2192 " + d.target.name; });

  is.svis.node = is.svis.sankeysvg.append("g").selectAll(".node")
      .data(data.nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .call(d3.behavior.drag()
      .origin(function(d) { return d; })
      .on("dragstart", function() { this.parentNode.appendChild(this); })
      .on("drag", dragmove));

  is.svis.node.append("rect")
      .attr("height", function(d) { return Math.max(5,d.dy); })
      .attr("width", is.svis.sankey.nodeWidth())
      .style("fill", function(d) { return d3.rgb(d.color); })
      .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
      .append("title")
      .text(function(d) { return d.name; });

  is.svis.node.append("text")
      .attr("x", -6)
      .attr("y", function(d) { return d.dy / 2; })
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .attr("transform", null)
      .text(function(d) { return d.name; })
      .filter(function(d) { return d.x < swidth / 2; })
      .attr("x", 6 + is.svis.sankey.nodeWidth())
      .attr("text-anchor", "start");
}

function renderGraph() {
  is.gvis.force = d3.layout.force()
      .nodes(data.nodes)
      .links(data.links)
      .gravity(.05)
      .distance(100)
      .charge(-150)
      .size([is.gvis.w, is.gvis.h])
      .start();

  is.gvis.link = is.gvis.graphsvg.selectAll("line.link")
      .data(data.links)
      .enter().append("svg:line")
      .attr("class", "link")
      .style("stroke", function(d) { return d.source.color; })
	  .attr("stroke-width", function(d) { return d.size; })
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  is.gvis.link.append("title").text(function(d) { return d.source.place + " \u2192 " + d.target.place; });

  is.gvis.node = is.gvis.graphsvg.selectAll("g.node")
      .data(data.nodes)
      .enter().append("svg:g")
      .attr("class", "node")
      .call(is.gvis.force.drag);

  is.gvis.node.append("svg:circle")
      .attr("class", "stop")
	  .attr("r", function(d) { return d.size})
      .attr("x", "0")
      .attr("y", "0")
      .attr("fill",  function(d) { return d.color})
      .attr("width", "16px")
      .attr("height", "16px")
	  .append("title").text(function(d) { return d.name+" ("+d.place+")";});



  is.gvis.node.append("svg:text")
      .attr("class", "label")
      .style("fill", function(d) { return d.color; })
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name });

  is.gvis.force.on("tick", function() {
  		is.gvis.link.attr("x1", function(d) { return d.source.x; })
        	.attr("y1", function(d) { return d.source.y; })
        	.attr("x2", function(d) { return d.target.x; })
        	.attr("y2", function(d) { return d.target.y; });
    	is.gvis.node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  });

}
function renderDetails() {
	var letters = data.details.title.split(" "), symbol = "";
	if(letters.length > 1) {
		if(isAlpha(letters[0][0])) { symbol += letters[0][0]; }
		if(isAlpha(letters[1][0])) { symbol += letters[1][0]; }
	} else if(isAlpha(letters[0][0])) {
		symbol = letters[0][0];
	} else { symbol = "?"; }

	$("#mainTitle").html("<a href='http://sourcemap.com/view/"+smap_id+"'>"+data.details.title+"</a>");
	$("#byLine").text();
	if(data.details.description == "") {
		$("#userDescription, .userDescription").remove();
		$("#sourcemap").css("display","block");
		$(".sourcemap").addClass("active");
	} else {
		$("#userDescription").css("display","block");
		$("#userDescription").text(data.details.description);
	}
	$("#tabs li").css("display","inline");

	var parts = "part or process", places = "location", countries = "country";
	$("#details").append('<div id="description"><strong>'+data.details.title+'</strong> describes <em>'+data.details.stats.parts.length+'</em> '+parts.pluralize(data.details.stats.parts.length, "parts and processes")+' from <em>'+data.details.stats.places.length+'</em> '+places.pluralize(data.details.stats.places.length, "different locations")+' across <em>'+data.details.stats.countries.length+'</em> '+countries.pluralize(data.details.stats.countries.length, "countries")+'.</div>');
	$("#sankey").prepend("<div class='clear'></div>");
	$("#sourcemap").append("<image id='fullmap' src='http://sourcemap.com/static/"+smap_id+".l.png'/>");

}

function dragmove(d) {
  d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(is.svis.height - d.dy, d3.event.y))) + ")");
  is.svis.sankey.relayout();
  is.svis.link.attr("d", is.svis.path);
}

function mouseover(d, i) {
  is.cvis.chord.classed("fade", function(p) {
    return p.source.index != i
        && p.target.index != i;
  });
}

String.prototype.pluralize = function(count, plural) {
  if (plural == null)
    plural = this + 's';

  return (count == 1 ? this : plural)
}

String.prototype.properize = function() {
  return (this.charAt(this.length-1) == "s" ? this+"'" : this+"'s");
}

Date.prototype.pretty = function() {
	var m_names = new Array("January", "February", "March",
	"April", "May", "June", "July", "August", "September",
	"October", "November", "December");

	var curr_date = this.getDate();
	var curr_month = this.getMonth();
	var curr_year = this.getFullYear();
	return m_names[curr_month] + " " + curr_date + ", " + curr_year;
}

Array.prototype.unique = function(){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(this[i] in u)
         continue;
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
}

function isAlpha(val)
{
var re = /^([a-zA-Z])$/;
return (re.test(val));
}
