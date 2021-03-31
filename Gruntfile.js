module.exports = function(grunt) {

	grunt.initConfig({
	  pkg: grunt.file.readJSON('package.json'),
		cssmin: {
		  target: {
		    files: [{
		      expand: true,
		      src: ['dist/css/<%= pkg.name %>.css'],
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
				src: 'dist/js/<%= pkg.name %>.js',
				dest: 'dist/js/<%= pkg.name %>.min.js'
			}
		},

		concat: {
			options: {
				separator: ' ',
			},
			js: {
				src: ['src/lib/js/jquery.js', 'src/lib/js/fontawesome.js', 'src/lib/js/waypoints.js', 'src/lib/js/scrollto.js', 'src/lib/js/autolinker.js', 'src/lib/js/leaflet/leaflet.js', 'src/lib/js/leaflet/markercluster.js', 'src/lib/js/grate.js', 'src/lib/js/manifest.js', 'src/lib/js/d3.v4.js','src/lib/js/visualize.js', "src/lib/js/main.js"],
				dest: 'dist/js/<%= pkg.name %>.js',
			},
			css: {
				src: ['src/lib/css/leaflet.css','src/lib/css/visualize.css','src/lib/css/manifest.css'],
				dest: 'dist/css/<%= pkg.name %>.css',
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