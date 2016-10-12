console.log("Manifest...");

var db = require('nano')('https://manifest.cloudant.com/supplychains/');
db.list(function(err, body) {
	if (err) { console.log(err); } 
	else {
		body.rows.forEach(function(doc) {
			db.get(doc.id, { revs_info: false }, function(err, body) {
				if (!err)
			    	console.log(body.title);
				});
		});	
  	}
});
console.log("Manifest...");
