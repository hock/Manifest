$( document ).ready(function() { 
	StaticInit();
});

/** Initializes the user interface for (mostly) static pages. **/
function StaticInit() {
	$("#minfo-hamburger, #minfo").click(function() { $("#minfodetail").toggleClass("closed");  });				
}
