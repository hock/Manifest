document.addEventListener('DOMContentLoaded', function(event) { Start(); });

/** Initializes the user interface for (mostly) static pages. **/
function Start() {
	document.querySelectorAll('#minfo-hamburger, #minfo').forEach(el => { 
		el.addEventListener('click', (e) => { document.getElementById('minfodetail').classList.toggle('closed'); }); });	

	// Carousel for About Page
	if (document.body.classList.contains('aboutpage')) {
		const slidesContainer = document.getElementById('ft-slides-container');
		const prevButton = document.getElementById('ft-slide-arrow-prev');
		const nextButton = document.getElementById('ft-slide-arrow-next');
		
		let currentSlide = Number(slidesContainer.dataset.index);
		const minSlide = Number(slidesContainer.dataset.min);
		const maxSlide = Number(slidesContainer.dataset.max);
		
		nextButton.addEventListener('click', (e) => { e.stopPropagation(); currentSlide++; if (currentSlide > maxSlide) { currentSlide = minSlide; } SlideTo(currentSlide);});
		prevButton.addEventListener('click', (e) => { e.stopPropagation(); currentSlide--; if (currentSlide < minSlide) { currentSlide = maxSlide; } SlideTo(currentSlide);});
		
		let featuretick = setInterval((e) => { nextButton.click(); }, 10000);
	}
}

function SlideTo(index) {
	console.log("sliding to "+index);
	const slidesContainer = document.getElementById('ft-slides-container');
	const slide = document.querySelector('.ft-slide');

	const slideWidth = slide.clientWidth; 
	slidesContainer.scrollLeft = slideWidth * (index-1);
}