$( document ).ready(function() { 
	StaticInit();
});

/** Initializes the user interface for (mostly) static pages. **/
function StaticInit() {
	$("#minfo-hamburger, #minfo").click(function() { $("#minfodetail").toggleClass("closed");  });				
	$.getJSON("json/samples.json", function(d) { 
		$("#collection-description").html(d.description);
		for(var s in d.collection) { 
			$("#load-samples").append('<option value="'+d.collection[s].id+'">'+d.collection[s].title+'</option>');	
		} 
	});
	$("#load-samples-btn").click(function() {
		var id = $("#load-samples").val();
		window.location.href = "#"+id;
	});
}
