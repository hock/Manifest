/* Manifest Utility Class */
class ManifestUtilities {
	constructor() {
		this.markdowner = new showdown.Converter();	
		
		let customClassExt = {
		    type: 'output',
		    filter: function (text) {
		        return text
		            .replace(/<p>\[\.([a-z0-9A-Z\s]+)\]<\/p>[\n]?<(.+)>/g, `<$2 class="$1">`)
		            .replace(/<(.+)>\[\.([a-z0-9A-Z\s]+)\]/g, `<$1 class="$2">`)            
					.replace(/class="(.+)"/g, function (str) { if (str.indexOf("<em>") !== -1) { return str.replace(/<[/]?em>/g, '_'); } return str; });
		    }
		};
		this.markdowner.addExtension(customClassExt);
	}
	static Hash(str) { let hash = 0, i, chr; if (str.length === 0) { return hash; } for (let i = 0; i < str.length; i++) { 
		chr = str.charCodeAt(i); hash = ((hash << 5) - hash) + chr; hash |= 0; } return Math.abs(hash); }
	static Linkify(str) { return str.replaceAll(ManifestUtilities.URLMatch(), '<a href=\"$1\">$1</a>').replaceAll(ManifestUtilities.ManifestMatch(), '<a class="manifest-link" href="$1">$1</a>'); }
	static URLMatch() { return /(?![^<]*>|[^<>]*<\/(?!(?:p|pre|li|span)>))(https?:\/\/[^\s"]+)/gi; }
	static ManifestMatch() { return /(?![^<]*>|[^<>]*<\/(?!(?:p|pre|li|span)>))(manifest?:\/\/[^\s"]+)/gi; }
	static RemToPixels(rem) { return rem * parseFloat(getComputedStyle(document.documentElement).fontSize); }
}

function until(conditionFunction) {

  const poll = resolve => {
    if (conditionFunction()) { resolve(); }
    else { setTimeout(_ => poll(resolve), 400); }
  };

  return new Promise(poll);
}