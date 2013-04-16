var serviceURL = "http://sourcemap.com/services/";
var offset = 0;
var limit = 2;

function init() {	
	$("#rewind").click(function() { rewind() });
	$("#advance").click( function() { advance() });
	fetchSearch();	
}

function advance() {
	offset = offset + limit;
	fetchSearch();	
}

function rewind() {
	offset = Math.max(0,offset - limit);
	fetchSearch();	
}
function fetchSearch() {
	$.getJSON(serviceURL+"search?o="+offset+"&l="+limit+"&callback=", function(s) {								
		console.log(s);
		$("#current").html('');
		for(r in s.results) {
			$("#current").append('<a target="_parent" href="../../index.html#'+s.results[r].id+'">'+s.results[r].attributes.title+'</a> ');
			if(r != limit-1) {
				$("#current").append('&bull; ');
			}
		}
	});
}
	