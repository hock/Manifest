document.addEventListener("DOMContentLoaded", function(event) { Start(); });

/** Initializes the user interface for (mostly) static pages. **/
function Start() {
	document.querySelectorAll('#minfo-hamburger, #minfo').forEach(el => { 
		el.addEventListener('click', (e) => { document.getElementById('minfodetail').classList.toggle('closed'); }); });	
		
	// Carousel for About Page
	if (document.body.classList.contains('aboutpage')) {
		const slidesContainer = document.getElementById("ft-slides-container");
		const slide = document.querySelector(".ft-slide");
		const prevButton = document.getElementById("ft-slide-arrow-prev");
		const nextButton = document.getElementById("ft-slide-arrow-next");

		nextButton.addEventListener("click", (event) => { const slideWidth = slide.clientWidth; if (slidesContainer.scrollLeft + slideWidth === slidesContainer.scrollWidth) { slidesContainer.scrollLeft = 0; } else {slidesContainer.scrollLeft += slideWidth; }});
		prevButton.addEventListener("click", () => { const slideWidth = slide.clientWidth; if (slidesContainer.scrollLeft === 0) { slidesContainer.scrollLeft = slidesContainer.scrollWidth - slideWidth; } else { slidesContainer.scrollLeft -= slideWidth; }});
		let featuretick = setInterval((e) => { nextButton.click(); }, 10000);
	}
}
