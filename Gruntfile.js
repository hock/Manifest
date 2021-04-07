module.exports = function(grunt) {

	grunt.initConfig({
	  pkg: grunt.file.readJSON('package.json'),
		cssmin: {
		  target: {
		    files: [{
		      expand: true,
		      src: ['src/lib/css/*-*.css'],
		      ext: '.min.css'
		    }]
		  }
		},
		
		jshint: {
			js: ['src/lib/js/*.js']                             
		},

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			js: {
				src: 'src/lib/js/*-*.js',
				dest: 'dist/js'
			}
		},

		concat: {
			options: {
				separator: ' ',
			},
			js_lib: {
				src: ['src/lib/js/jquery.js', 'src/lib/js/fontawesome.js', 'src/lib/js/leaflet/leaflet.js', 'src/lib/js/d3.v4.js'],
				dest: 'src/js/<%= pkg.name %>-lib.js'
			},
			js_main: {
				src: ['src/lib/js/waypoints.js', 'src/lib/js/scrollto.js', 'src/lib/js/autolinker.js', 'src/lib/js/leaflet/markercluster.js', 'src/lib/js/grate.js', 'src/lib/js/manifest.js', 'src/lib/js/visualize.js', "src/lib/js/main.js"],
				dest: 'src/js/<%= pkg.name %>-main.js'
			},
			js_static: {
				src: ['src/lib/js/static.js'],
				dest: 'src/js/<%= pkg.name %>-static.js'				
			},
			js_data: {
				src: ['src/lib/js/tablesortable.js','src/lib/js/static.js','src/lib/js/datatable.js'],
				dest: 'src/js/<%= pkg.name %>-data.js'
			},
			js_edit: {
				src: ['src/lib/js/jsoneditor.js','src/lib/js/edit.js'],
				dest: 'src/js/<%= pkg.name %>-edit.js'
			},
			css_main: {
				src: ['src/lib/css/fonts.css','src/lib/css/fa.css','src/lib/css/leaflet.css','src/lib/css/visualize.css','src/lib/css/manifest.css'],
				dest: 'src/css/<%= pkg.name %>-main.css'
			},
			css_static: {
				src: ['src/lib/css/fonts.css','src/lib/css/fa.css','src/lib/css/manifest.css'],
				dest: 'src/css/<%= pkg.name %>-static.css'
			}
		}
	});

// Next one would load plugins
grunt.loadNpmTasks('grunt-contrib-cssmin');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-contrib-concat');

grunt.registerTask('default', ['concat', 'cssmin', 'uglify']);


};