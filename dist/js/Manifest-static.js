document.addEventListener("DOMContentLoaded", function(event) { Start(); });

/** Initializes the user interface for (mostly) static pages. **/
function Start() {
	document.querySelectorAll('#minfo-hamburger, #minfo').forEach(el => { 
		el.addEventListener('click', (e) => { document.getElementById('minfodetail').classList.toggle('closed'); }); });	
}

//# sourceMappingURL=Manifest-static.js.map