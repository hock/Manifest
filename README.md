[Manifest](https://manifest.supplystudies.com) is an investigative toolkit intended for researchers, journalists, students, and scholars interested in visualizing, analyzing, and documenting supply chains, production lines, and trade networks.

For instructions on using Manifest and creating your own Manifest documents on [supplystudies.com](https://manifest.supplystudies.com), see the [Manifest Wiki](https://github.com/hock/Manifest/wiki).

![](https://github.com/hock/Inventory/blob/7ceafe311bd354fb40fa5c9b89d163a4e2e68c3a/ManifestWiki/Manifest-Splash.png)

## Project Goals
Professional logistics platforms developed by companies like SAP, Oracle, and IBM are incredibly complex, suited to global networks with hundreds of suppliers in dozens of countries. These systems interface with numerous data sources, with powerful capabilities for controlling the world's material distribution in the name of "supply chain management." Manifest is not one of these. Similarly, there are many tools available for detailed statistical evaluation, graph analysis, and geospatial modeling. And while Manifest can work in concert with these tools, its primary purpose is to:

* Provide common data standards for describing and sharing supply chains or other material networks, along with a simple editor modeled on these standards.
* Develop a flexible geospatial viewer for supply chain data that is transparent, interactive, and simple to understand, with support for specialized data views (graph relationships, etc.).
* Support basic analytic tools for evaluating and comparing critical supply chain measures.

The result, we hope, is a system flexible enough to meaningfully support a variety of different projects advancing the critical study of logistics.

## Design Principles
This flexibility is intended to allow someone using Manifest to map high level connections the same way they might catalogue fundamental details, or to include "materials" not normally present in an industrial logistics platform. It also means that Manifest should be as capable of producing rich supply chain narratives as it is facilitating supply chain analysis. In pursuit of these goals, Manifest has been developed with a number of core design principles:

* Manifest is not a database. While we can host Manifest documents and other datasets, the primary workflow for creating and viewing documents happens in the browser, where the Manifest neither sees nor stores the data.
* Supply chains in Manifest are not required to be complete, nor are they limited to discrete and self-contained accounts. Rather the interface was developed to support viewing multiple supply chains (or fragments of supply chains) in order to understand relationships between them.
* Manifest data tends to be descriptive, rather than rigidly structured. To this end, the Manifest format is designed to be open and general enough to contain information across a range of different contexts, irrespective of the rendering of a particular supply chain or single piece of data.

The goal is a system that rejects the collected and complete in favor of the distributed, the partial, and the temporary.

For some reflections on the origins of Manifest,see ["Manifest / Manifesto: Toward Supply Chain Reconciliation."](https://supplystudies.com/2021/09/29/manifest-manifesto-toward-supply-chain-reconciliation/) For updates, sign up for the Supply Studies [mailing list](https://supplystudies.com/updates/) or our [Patreon](http://patreon.com/manifestsupplychains). Manifest is provided free for noncommercial use, for any other uses, please get in touch.