$( document ).ready(function() {
	SmapDataTableInit();
}); 

/** Load the local smap index and populate a tablesorter view of it. **/
function SmapDataTableInit() {
	$.getJSON("json/smapindex.json", function(d) {
		var data = JSON.parse(d);
		$.each(data, function( index, value ) {
		  data[index].json = "<a href='https://raw.githubusercontent.com/hock/smapdata/master/data/"+value.id+".json'>json</a>";
		  data[index].geojson = "<a href='https://raw.githubusercontent.com/hock/smapdata/master/data/"+value.id+".geojson'>geo</a>";			  
		});
		var colorchoice = [["#3498DB","#dbedf9"],["#FF0080","#f9dbde"],["#34db77","#dbf9e7"],["#ff6500","#f6d0ca"],["#4d34db","#dfdbf9"]];
		
		var columns = { 'id': 'ID', 'nm': 'Name', 'dc': 'Description', 'json': 'json', 'geojson': 'geo', };
		
		var table = $('#table-sortable').tableSortable({
		    data: data, columns: columns, rowsPerPage: 100, pagination: true, searchField: $('#searchField'),
			tableDidMount: function() { this.sortData("id"); },
		    formatCell: function(row, key) {
		        if (key === 'id') {
					var ind = row.id % 5;
					
		            return $('<span></span>').append("<div class='dot' style='background:"+colorchoice[ind][0]+"; border-color:"+colorchoice[ind][1]+";'></div>");
				
				}
		        if (key === 'nm') {
		            return $('<span></span>').append("<a href='#smap-"+row.id+"'>"+row[key]+"</a>");
		        }
		        return row[key];
		    },
		    responsive: {
				// It works for 571 - 1100 viewport width; (max-width: 1100px and min-width: 571px);
				1226: {
				// Other options
					columns: {
						id: 'ID',
						nm: 'Name'
					},
				}				
			}
		});			
	}); 
}