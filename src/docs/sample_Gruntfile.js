module.exports = function(grunt) {
	grunt.initConfig({
	  pkg: grunt.file.readJSON('package.json'),
		
		htmlbuild: {
			dist: {
				src: ['src/index.html','src/edit.html','src/about.html','src/data.html'],
				dest: 'dist/',
				options: {
					beautify: true,
					sections: {
						layout: {
							header: 'src/lib/html/header.html',
							launcher: 'src/lib/html/launcher.html',
							navigation: 'src/lib/html/navigation.html',
							footer: 'src/lib/html/footer.html'						
						}
					},
					data: {
						baseurl: "http://localhost/Manifest/dist/",
						minify: "", // or .min
						version: "0.2.4"
					}
				}
			}
		},
			
		cssmin: {
		  target: {
		    files: [{
		      expand: true,
		      src: ['dist/css/Manifest-main.css','dist/css/Manifest-edit.css','dist/css/Manifest-static.css'],
		      ext: '.min.css'
		    }]
		  }
		},
		
		jshint: {
			js: ['src/lib/js/*.js'],
			options: { 'esversion': 6 }
                      
		},

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',				
				sourceMap: true,
				sourceMapIn: function(path) { return path + ".map";}
			},
			js: {
				files : {
				'dist/js/<%= pkg.name %>-lib.min.js' : 'dist/js/<%= pkg.name %>-lib.js',
				'dist/js/<%= pkg.name %>-main.min.js' : 'dist/js/<%= pkg.name %>-main.js',
				'dist/js/<%= pkg.name %>-static.min.js' : 'dist/js/<%= pkg.name %>-static.js',
				'dist/js/<%= pkg.name %>-data.min.js' : 'dist/js/<%= pkg.name %>-data.js',
				'dist/js/<%= pkg.name %>-edit.min.js' : 'dist/js/<%= pkg.name %>-edit.js',
				'dist/services/manifester.min.js' : 'dist/services/manifester.js'
					
				}
			}
		},

		concat: {
			options: {
				sourceMap: true,
			},
			js_lib: {
				src: ['src/lib/js/leaflet/leaflet.js', 'src/lib/js/inc/d3.v4.js', 'src/lib/js/inc/d3.sankey.js', 'src/lib/js/inc/jsondrop.js'],
				dest: 'dist/js/<%= pkg.name %>-lib.js'
			},
			js_main: {
				src: ['src/lib/js/inc/showdown.js','src/lib/js/inc/tinycolor.js','src/lib/js/leaflet/image.js','src/lib/js/leaflet/zoomhome.js', 'src/lib/js/leaflet/smoothzoom.js','src/lib/js/leaflet/edgebuffer.js','src/lib/js/leaflet/grate.js','src/lib/js/leaflet/geodesic.js','src/lib/js/manifest.js','src/lib/js/manifest-supplychain.js','src/lib/js/manifest-atlas.js','src/lib/js/manifest-ui.js','src/lib/js/inc/list.js','src/lib/js/manifest-visualization.js','src/lib/js/main.js'],
				dest: 'dist/js/<%= pkg.name %>-main.js'
			},
			js_static: {
				src: ['src/lib/js/static.js'],
				dest: 'dist/js/<%= pkg.name %>-static.js'				
			},
			js_data: {
				src: ['src/lib/js/inc/list.js','src/lib/js/static.js','src/lib/js/data.js'],
				dest: 'dist/js/<%= pkg.name %>-data.js'
			},
			js_edit: {
				src: ['src/lib/js/inc/simplemde.js','src/lib/js/inc/jsoneditor.js','src/lib/js/edit.js'],
				dest: 'dist/js/<%= pkg.name %>-edit.js'
			},
			js_services: {
				src: ['src/services/manifester.js'],
				dest: 'dist/services/manifester.js'
			},
			css_main: {
				src: ['src/lib/css/fonts.css','src/lib/css/fa.css','src/lib/css/leaflet.css','src/lib/css/visualize.css','src/lib/css/manifest.css'],
				dest: 'dist/css/<%= pkg.name %>-main.css'
			},
			css_edit: {
				src: ['src/lib/css/fonts.css','src/lib/css/fa.css','src/lib/css/leaflet.css','src/lib/css/visualize.css','src/lib/css/simplemde.css','src/lib/css/editor.css'],
				dest: 'dist/css/<%= pkg.name %>-edit.css'
			},
			css_static: {
				src: ['src/lib/css/fonts.css','src/lib/css/fa.css','src/lib/css/editor.css'],
				dest: 'dist/css/<%= pkg.name %>-static.css'
			}
		},
		watch: {
  		  html: {
  		    files: ['src/**/*.html'],
  		    tasks: ['htmlbuild']
  		  },
		  js: {
		    files: ['src/lib/**/*.js'],
		    tasks: ['jshint', 'concat']
		  },
		  srv: {
		    files: ['src/services/manifester.js'],
		    tasks: ['concat']
		  },
		  css: {
		    files: ['src/lib/**/*.css'],
		    tasks: ['concat']
		  },
		}
	});

// Load plugins
grunt.loadNpmTasks('grunt-html-build');
grunt.loadNpmTasks('grunt-contrib-cssmin');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-watch');

// Set tasks
grunt.registerTask('default', ['htmlbuild', 'concat', 'cssmin', 'uglify']);


};
