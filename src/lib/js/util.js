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
	static Slugify(str) { 
		let slug = str; 
		if (slug.substring(0,1) === '#') { slug = slug.substring(1,slug.length); }
		if (slug.substring(0,14) === 'manifest-json/') { return 'manifest/'+slug.substring(14,slug.length).split('.')[0]+'/'; } 
		else { return str; } 
	}
	static URLMatch() { return /(?![^<]*>|[^<>]*<\/(?!(?:p|pre|li|span)>))(https?:\/\/[^\s"<]+)/gi; }
	static ManifestMatch() { return /(?![^<]*>|[^<>]*<\/(?!(?:p|pre|li|span)>))(manifest?:\/\/[^\s"]+)/gi; }
	static RemToPixels(rem) { return rem * parseFloat(getComputedStyle(document.documentElement).fontSize); }
	static PrintUTCDate(utc) { 
		let utcstring = new Date(Number(utc)*1000).toUTCString(); 
		let date = {weekday:utcstring.slice(0,3), month:utcstring.slice(8,11), day:utcstring.slice(5,7).replace(/^0/, ''), year:utcstring.slice(12,16)};
		utcstring = utcstring.slice(4,16);
		return date.month + ' ' + date.day + ' ' + date.year;
	}
}

function until(conditionFunction) {

  const poll = resolve => {
    if (conditionFunction()) { resolve(); }
    else { setTimeout(_ => poll(resolve), 400); }
  };

  return new Promise(poll);
}