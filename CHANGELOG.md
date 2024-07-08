##Release Notes Version 0.4.0

###New Features
* Visualizations: Visualizations have been rewritten, and a new visualization (chart) has been added.
* Time series data: Manifest now supports time data and displays a time slider control when needed.
* Image support: Better image support for nodes.
* New Manifests: New sample manifests have been added (mines, ports, apple suppliers, etc.).

###Bug Fixes
* Numerous bug fixes.
* Viewer panel has been adjusted to more reliably position map interface.

##Release Notes Version 0.3.1

###New Features
* External data: Manifest now supports loading external geojson and pmtiles.
* Vector tiles: Manifest now uses vector tiles and defaults to Maptiler tilesets.

##Release Notes Version 0.2.4
###New Features

* Improved search: The search interface now completely removes unmatched features and stops events activating on hidden features. 
* Improved zoom: The map now supports smoother zooming controls.
* Category toggles: The map view panel now supports hiding nodes, lines, and categories.
* Marker customization: Markers can have icons, drawn from a predefined list (see images/markers) and colors. Work in google sheet imports with an "icon" and "color" column, colors are defined by three hex codes (#3498DB,#dbedf9,#dbedf9).
* List visualization: Added visualization for a basic spreadsheet-like list view.
* Added url options and programmatic manifest options for customization.
* Early programmatic support for "storymap" style visualizations.

###Bug Fixes
* Improved regular expressions for url matching.
* Google sheet import now has parity with manifest files.