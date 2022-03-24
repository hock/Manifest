Manifest
========

Manifest is an investigative toolkit intended for researchers, journalists, students, and scholars interested in visualizing, analyzing, and documenting supply chains, production lines, and trade networks.

<img src="https://github.com/hock/Manifest/raw/master/dist/images/about-splash.png" />

Professional logistics platforms developed by companies like SAP, Oracle, and IBM are incredibly complex, suited to global networks with hundreds of suppliers in dozens of countries. These systems interface with numerous data sources, offering powerful capabilities for controlling the world's material distribution in the name of "supply chain management." Manifest is not one of these. Similarly, there are many powerful tools available for detailed statistical evaluation, graph analysis, and geospatial modeling. And while Manifest can work in concert with these tools, the project's primary purpose is to: 

* Provide common data standards for describing and sharing supply chains or similar material networks, along with a simple editor modeled on these standards.
* Develop a flexible geospatial viewer for supply chain data that is transparent, interactive, and simple to understand, with support for additional, specialized data views (graph relationships, etc.).
* Support basic analytic tools for evaluating and comparing critical supply chain measures.													

Manifest is available at https://supplystudies.com/manifest/ For more information, visit https://supplystudies.com/manifest/about/

#### Configuration Options
Manifest is configured with a set of options passed in main.js.
		
	let options = { 
		serviceurl: 'https://manifest.supplystudies.com/services/', // Nodejs server location for services
		hoverHighlight: false, // On mouseover hides nodes unconnected to target
		retinaTiles: false, // Forces load of retina (2x) tiles (can impact performance)
		simpleLines: false // Instead of 60+ point line segements, uses 3 point quadratic bezier curves
	};
	
	MI = new Manifest(options);
	
Individual manifests can support their own options. 