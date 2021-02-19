Manifest
========

<img src="https://github.com/hock/Manifest/blob/master/lib/css/images/logo-banner.png" />

Manifest is a digital humanities platform and investigative toolkit for visualizing, analyzing, and documenting historic and contemporary supply chains, production lines, and trade networks. Intended for scholars and researchers exploring the history of assembly and distribution logistics in commodity manufacture and other forms of production, Manifest provides common data standards for supply chain description while offering an attractive publishing capability for spatial narratives that leverage geographic and statistical means of evaluation. Logistics, Alberto Toscano has written, should be thought, “not just as the site of interruption, but as the stake of enduring and articulated struggles.” In this way, the means through which we articulate that struggle endure only so long as we are able to both catalogue and critique the reach of the global apparatus of production, its contemporary conditions, and its material history.

Supported by the <a href="http://steinhardt.nyu.edu/mcc/">Media, Culture, and Communication</a> department of <a href="http://www.nyu.edu/">New York University, Manifest is based on technologies originally developed as part of the <a href="http://supplystudies.com/sourcemap-org/">Sourcemap project</a>. Created at the MIT Media Lab in 2007 as a collaboration between the MIT Center for Civic Media and the Tangible Media Group, Sourcemap was designed to enable the dissemination of open supply chains and support the evaluation of their social and environmental impacts.

<img src="https://github.com/hock/Manifest/blob/master/lib/css/images/preview-screen.png" />

Necessary data sets and code repositories for Manifest, as well as <a href="https://github.com/supplychainstudies">supporting tools</a>, are made available under open source licenses and released on <a href="https://github.com/hock/Manifest">Github</a>. 

A demo of a sample Manifest view is <a href="https://rawcdn.githack.com/hock/Manifest/c89d3dc5fdf782eec173ac5563a279a74ec28ed4/index.html">available</a> which highlights its capabilities to view multiple supply chains. Manifest is also useful for viewing the repository of Sourcemap's user generated content. 




Manifest currently supports the following visualization schemes:
* Map:


* ForceGraph:
ForceGraph is a simple proof-of-concept graph visualization. The supply chain is rendered as a force-directed graph bounded by the visualization frame and rendered with simple labels.


Manifest currently supports the following data formats:

* Sourcemap Supply Chains: 
Manifest supports historic user-created supply chains from when Sourcemap.com was an opensource project at MIT. Because of the way these supply chains were originally created, Manifest expects to find two files (an [ID].geojson file and a corresponding [ID].json file, where [ID] is a numeric identifier for the supply chain) together in the same directory. An archived listing of these supply chains is available on the [smapdata repository]. These can be loaded by passing Manifest the URL [https://raw.githubusercontent.com/hock/smapdata/master/data/[ID].geojson], or making a request with the hash "#smap-[ID]" (for example, https://supplystudies.com/manifest/#smap-602).

Because the file formats of Sourcemap evolved significantly over its lifetime, these supply chains often contain inconsistent and nonstandard properties--which Manifest largely ignores.

* ImportYeti Company Profiles:
Manifest supports visualizations of the supplier list from ImportYeti's Company Profiles in a modified data format. Because ImportYeti does not include geocoded addresses for suppliers, these addresses must be geocoded before the can be processed. A small listing of these profiles is available on the [smapdata repository]. These can be loaded by passing Manifest the URL [https://raw.githubusercontent.com/hock/smapdata/master/data/[ID].json], or making a request with the hash "#yeti-[ID]" (for example, https://supplystudies.com/manifest/#yeti-casper_sleep).

* Manifest Simple Spreadsheets:
Manifests supports supply chains created as simple spreadsheet documents. It can import supply chains directly from Google Sheets that conform to a standard template []. For addresses to render on the map, the must be geocoded first (for example, with a tool like Awesome Table's Geocode [https://workspace.google.com/marketplace/app/geocode_by_awesome_table/904124517349])
