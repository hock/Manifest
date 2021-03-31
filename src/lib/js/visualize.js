function visualize(type) {
	switch(type) {
		case "map":
			MI.visualization = "map";
			$(".map").removeClass("closed");
			$(".vizwrap").addClass("closed");
			MI.scview.map.invalidateSize();
			viz_cleanup();
			break;
		case "forcegraph":
			MI.visualization = "forcegraph";		
			viz_cleanup();
			$(".map").addClass("closed");
			$(".vizwrap").removeClass("closed");
			for(var i in MI.supplychains) {
				if(MI.supplychains[i].graph != undefined) { 
					viz_forcegraph(MI.supplychains[i].graph, MI.supplychains[i].details.id); 
				}
			}
	    	break;
	  	default:
			console.log("Visualization type not supported...");
	}
}

function viz_cleanup() {
	$(".vizwrap .viz").remove();
	if($(window).width() <= 920) {
		$(".vizwrap svg").attr("viewBox","0 0 "+$(window).width()+" "+$(window).width());
	} else {
		$(".vizwrap svg").attr("viewBox","0 0 "+$(window).width()+" "+$(window).height());
	}
	if(MI.scview.active_point && MI.visualization != "map") { MI.scview.active_point.closePopup(); MI.scview.active_point = null; }
}

function viz_resize() {
	visualize(MI.visualization);
}


// Force Directed Graph
function viz_forcegraph(graph, id) {	
	var width = $(window).width(),
	    height = $(window).height(),
	    radius = 12;
	
		var adj = 0;
	if(width > 920) {
		if(!($("body").hasClass("fullscreen"))) {
			adj = $(".sidepanel").width();
		} else {
			adj = 0;
		}
	}  else {
		height = $(window).width();
	}
	//Math.ceil(Math.random() * 300) * (Math.round(Math.random()) ? 1 : -1)
	var simulation = d3.forceSimulation()
	    .velocityDecay(0.5)
	    .force("x", d3.forceX((width+adj) / 2).strength(0.1))
	    .force("y", d3.forceY(height / 2).strength(0.1))
	    .force("charge", d3.forceManyBody().strength( function(d) { 
			var measure_sort = $("#measure-choices").val();

			var linkd = 0;
			if(d.ref != undefined) {
				linkd = d.ref.properties.measures[measure_sort] != undefined ? 
					10000 * (d.ref.properties.measures[measure_sort] / MI.supplychains[d.ref.properties.scid].details.measures[measure_sort].max) : 
					0;
			}
			return -240 - linkd;
		}))
	    .force("link", d3.forceLink().distance(100).strength(0.5));

	var svg = d3.select("svg")
	    .attr("width", width)
	    .attr("height", height);

	var viz = svg.append("g")
		.attr("class", "viz forcegraph");

	var link = viz.selectAll("line")
	  	.data(graph.links)
		.enter().append("line");

	var node = viz.selectAll("circle")
	  	.data(graph.nodes)
		.enter().append("circle")
	  	.attr("r", radius - 0.75)
		.style("fill", function(d) { if(d.ref != undefined) { return $("#mlist-"+id+" .dot").css("background-color");} })
		.style("stroke", function(d) { if(d.ref != undefined) { return $("#mlist-"+id+" .dot").css("border-color");} })
		.call(d3.drag()
			.on("start", dragstarted)
			.on("drag", dragged)
			.on("end", dragended));  
			
	var labels = viz.selectAll("text")
	  	.data(graph.nodes)
		.enter().append('text')
		.attr("fill", function(d) { if(d.ref != undefined) {return $("#mlist-"+id+" .dot").css("background-color");} })
		.attr("pointer-events", "none")
		.text(function (d){return d.name;});

	simulation
		.nodes(graph.nodes)
		.on("tick", tick);

	simulation.force('link')
		.links(graph.links);
  
	function tick() {
		node.attr("cx", function(d) { d.x = Math.max(radius, Math.min(width - radius, d.x)); return d.x; })
		.attr("cy", function(d) { d.y = Math.max(radius, Math.min(height - radius, d.y)); return d.y; });

		link.attr("x1", function(d) { return d.source.x; })
		    .attr("y1", function(d) { return d.source.y; })
		    .attr("x2", function(d) { return d.target.x; })
		    .attr("y2", function(d) { return d.target.y; });

		labels.attr('x', function(d) { return d.x+radius+(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize)); })
			  .attr('y', function(d) { return d.y+(radius+(0.2 * parseFloat(getComputedStyle(document.documentElement).fontSize)))/2; });
		
		width = $(window).width();
		height = $(window).height();
		if(width > 920) {
			if(!($("body").hasClass("fullscreen"))) {
				adj = $(".sidepanel").width();
			} else {
				adj = 0;
			}
		}  else {
			height = $(window).width();
		}
	}
  
	force_scale();

	function dragstarted(d) {
		if(d.ref != undefined) {
			ui_pointclick(undefined, d.ref.properties.lid);
		}
		if (!d3.event.active) simulation.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
	}

	function dragged(d) {
		d.fx = d3.event.x;
		d.fy = d3.event.y;
	}

	function dragended(d) {
		if (!d3.event.active) simulation.alphaTarget(0);
		d.fx = null;
		d.fy = null;
	}
	
	function force_scale() {		
		d3.select("svg").selectAll("circle")
		.attr("r", function(d) { 
			var measure_sort = $("#measure-choices").val();
			var radius = 8;
			if(d.ref != undefined) {
				if(d.ref.properties.measures != undefined) {	
					if(d.ref.properties.measures[measure_sort] != undefined) {
							if(measure_sort != "None" && MI.supplychains[d.ref.properties.scid].details != undefined) {							
								radius = d.ref.properties.style.radius = 8 + 100 * 
								(d.ref.properties.measures[measure_sort] / MI.supplychains[d.ref.properties.scid].details.measures[measure_sort].max);
							}
					}
				}		
			}			
			return radius;
		});
	}
} // End Forcegraph


/* Image Creation */
