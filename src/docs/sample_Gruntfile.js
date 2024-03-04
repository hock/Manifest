module.exports = function(grunt) {
	let pkg = grunt.file.readJSON('package.json');
	pkg.version = pkg.version.split(".");
	let subversion = pkg.version.pop();
	subversion++;
	if (subversion >= 1000) { 
		let version = pkg.version.pop(); 
		version++; subversion = 0; 
		pkg.version.push(version);
	}
	pkg.version.push(subversion);
	pkg.version = pkg.version.join(".");
	grunt.file.write('package.json', JSON.stringify(pkg, null, 2));
	
	const development = { 
		baseurl: 'https://manifest.supplystudies.com/dev/', 
		serverurl: 'https://service.supplystudies.com/manifest/', 
		css_path: 'css/Manifest-main.'+pkg.version+'.min.css', css_editpath: 'css/Manifest-edit.'+pkg.version+'.min.css', css_staticpath: 'css/Manifest-static.'+pkg.version+'.min.css',
		js_mainpath: 'js/Manifest-main.'+pkg.version+'.min.js', js_editpath: 'js/Manifest-edit.'+pkg.version+'.min.js', js_staticpath: 'js/Manifest-static.'+pkg.version+'.min.js', js_datapath: 'js/Manifest-data.'+pkg.version+'.min.js', js_libpath: 'js/Manifest-lib.'+pkg.version+'.min.js',
		src: 'src', dist: '/var/www/manifest.supplystudies.com/dev/',
		livereload: false
	}
	const local_min = { 
		baseurl: 'http://hockbook.local/Manifest/dist/', 
		serverurl: 'http://hockbook.local:3000/', 
		css_path: 'css/Manifest-main.'+pkg.version+'.min.css', css_editpath: 'css/Manifest-edit.'+pkg.version+'.min.css', css_staticpath: 'css/Manifest-static.'+pkg.version+'.min.css',
		js_mainpath: 'js/Manifest-main.'+pkg.version+'.min.js', js_editpath: 'js/Manifest-edit.'+pkg.version+'.min.js', js_staticpath: 'js/Manifest-static.'+pkg.version+'.min.js', js_datapath: 'js/Manifest-data.'+pkg.version+'.min.js', js_libpath: 'js/Manifest-lib.'+pkg.version+'.min.js',
		src: 'src', dist: 'dist',
		livereload: false
	}
	const local = { 
		baseurl: 'http://hockbook.local/Manifest/dist/', 
		serverurl: 'http://hockbook.local:3000/', 
		css_path: 'css/Manifest-main.css', css_editpath: 'css/Manifest-edit.css', css_staticpath: 'css/Manifest-static.css',
		js_mainpath: 'js/Manifest-main.js', js_editpath: 'js/Manifest-edit.js', js_staticpath: 'js/Manifest-static.js', js_datapath: 'js/Manifest-data.js', js_libpath: 'js/Manifest-lib.js',
		src: 'src', dist: 'dist',
		livereload: true
	}
	const target = local;
	target.version = pkg.version;
	
	grunt.initConfig({
	  mdist: target.dist, msrc: target.src, 
	  mversion: target.version,
	  mbaseurl: target.baseurl,
	  mserverurl: target.serverurl,
	  mlivereload: target.livereload,
	  		
	  pkg: grunt.file.readJSON('package.json'),
		copy: {
			main: {
				files: [
					{ src: 'CHANGELOG.md', dest: '<%= mdist %>/' },
					{ expand: true, cwd: '<%= msrc %>/lib/json', src: '**', dest: '<%= mdist %>/json/' },
					{ expand: true, cwd: '<%= msrc %>/lib/images', src: '**', dest: '<%= mdist %>/images/' },
					{ expand: true, cwd: '<%= msrc %>/lib/webfonts', src: '**', dest: '<%= mdist %>/webfonts/' },
					{ expand: true, cwd: '<%= msrc %>/services/json', src: '**', dest: '<%= mdist %>/services/json/' },
					{ expand: true, cwd: '<%= msrc %>/services/data', src: '**', dest: '<%= mdist %>/services/data/' },
					{ expand: true, cwd: '<%= msrc %>/services/maps', src: '**', dest: '<%= mdist %>/services/maps/' }				
				]
			}
		},
		htmlbuild: {
			dist: {
				src: ['<%= msrc %>/index.html','<%= msrc %>/edit.html','<%= msrc %>/about.html','<%= msrc %>/data.html'],
				dest: '<%= mdist %>/',
				options: {
					beautify: true,
					sections: {
						layout: {
							header: '<%= msrc %>/lib/html/header.html',
							launcher: '<%= msrc %>/lib/html/launcher.html',
							navigation: '<%= msrc %>/lib/html/navigation.html',
							footer: '<%= msrc %>/lib/html/footer.html'						
						}
					},
					data: {
						baseurl: target.baseurl,
						version: target.version,
						css_path: target.css_path, css_editpath: target.css_editpath, css_staticpath: target.css_staticpath,
						js_mainpath: target.js_mainpath, js_editpath: target.js_editpath, js_staticpath: target.js_staticpath, js_datapath: target.js_datapath, js_libpath: target.js_libpath,
						livereload: '<%= mlivereload %>'
					}
				}
			}
		},
		less: {
		  target: {
		    files: {
		      '<%= mdist %>/css/fonts.css': '<%= msrc %>/lib/less/fonts.less', '<%= mdist %>/css/fa.css': '<%= msrc %>/lib/less/fa.less', '<%= mdist %>/css/leaflet.css': '<%= msrc %>/lib/less/leaflet.less', '<%= mdist %>/css/visualize.css': '<%= msrc %>/lib/less/visualize.less', '<%= mdist %>/css/manifest.css': '<%= msrc %>/lib/less/manifest.less', '<%= mdist %>/css/simplemde.css': '<%= msrc %>/lib/less/simplemde.less', '<%= mdist %>/css/editor.css': '<%= msrc %>/lib/less/editor.less'
		    }
		  }
		},	
		
		cssmin: {
		  target: {
		    files: [{
		      expand: true,
		      src: ['<%= mdist %>/css/Manifest-main.css','<%= mdist %>/css/Manifest-edit.css','<%= mdist %>/css/Manifest-static.css'],
		      ext: '.'+pkg.version+'.min.css'
		    }]
		  }
		},
		
		jshint: { js: ['<%= msrc %>/lib/js/*.js'], options: { 'jshintrc': true } },

		uglify: {
			options: { banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n', sourceMap: true, sourceMapIn: function(path) { return path + ".map";} },
			js: {
				files : {
				'<%= mdist %>/js/<%= pkg.name %>-lib.<%= pkg.version %>.min.js' : '<%= mdist %>/js/<%= pkg.name %>-lib.js',
				'<%= mdist %>/js/<%= pkg.name %>-main.<%= pkg.version %>.min.js' : '<%= mdist %>/js/<%= pkg.name %>-main.js',
				'<%= mdist %>/js/<%= pkg.name %>-static.<%= pkg.version %>.min.js' : '<%= mdist %>/js/<%= pkg.name %>-static.js',
				'<%= mdist %>/js/<%= pkg.name %>-data.<%= pkg.version %>.min.js' : '<%= mdist %>/js/<%= pkg.name %>-data.js',
				'<%= mdist %>/js/<%= pkg.name %>-edit.<%= pkg.version %>.min.js' : '<%= mdist %>/js/<%= pkg.name %>-edit.js'
				}
			}
		},

		concat: {
			options: { sourceMap: true, process: true },
			js_lib: {
				src: ['<%= msrc %>/lib/js/leaflet/leaflet.js', '<%= msrc %>/lib/js/leaflet/pmtiles.js', '<%= msrc %>/lib/js/leaflet/maplibre-gl.js', '<%= msrc %>/lib/js/leaflet/leaflet-maplibre-gl.js', '<%= msrc %>/lib/js/inc/d3.v4.js', '<%= msrc %>/lib/js/inc/d3.sankey.js', '<%= msrc %>/lib/js/inc/jsondrop.js','<%= msrc %>/lib/js/inc/showdown.js','<%= msrc %>/lib/js/util.js'],
				dest: '<%= mdist %>/js/<%= pkg.name %>-lib.js'
			},
			js_main: {
				src: ['<%= msrc %>/lib/js/inc/tinycolor.js','<%= msrc %>/lib/js/leaflet/zoomhome.js', '<%= msrc %>/lib/js/leaflet/smoothzoom.js','<%= msrc %>/lib/js/leaflet/edgebuffer.js','<%= msrc %>/lib/js/leaflet/grate.js','<%= msrc %>/lib/js/leaflet/geodesic.js','<%= msrc %>/lib/js/leaflet/protomaps.js','<%= msrc %>/lib/js/manifest.js','<%= msrc %>/lib/js/manifest-supplychain.js','<%= msrc %>/lib/js/manifest-atlas.js','<%= msrc %>/lib/js/manifest-ui.js','<%= msrc %>/lib/js/inc/list.js','<%= msrc %>/lib/js/manifest-visualization.js','<%= msrc %>/lib/js/main.js'],
				dest: '<%= mdist %>/js/<%= pkg.name %>-main.js'
			},
			js_static: {
				src: ['<%= msrc %>/lib/js/static.js'],
				dest: '<%= mdist %>/js/<%= pkg.name %>-static.js'				
			},
			js_data: {
				src: ['<%= msrc %>/lib/js/inc/list.js','<%= msrc %>/lib/js/static.js','<%= msrc %>/lib/js/data.js'],
				dest: '<%= mdist %>/js/<%= pkg.name %>-data.js'
			},
			js_edit: {
				src: ['<%= msrc %>/lib/js/inc/simplemde.js','<%= msrc %>/lib/js/inc/jsoneditor.js','<%= msrc %>/lib/js/edit.js'],
				dest: '<%= mdist %>/js/<%= pkg.name %>-edit.js'
			},
			js_services: {
				src: ['<%= msrc %>/services/manifester.js',],
				dest: '<%= mdist %>/services/manifester.js'
			},
			css_main: {
				src: ['<%= mdist %>/css/fonts.css','<%= mdist %>/css/fa.css','<%= mdist %>/css/leaflet.css','<%= mdist %>/css/visualize.css','<%= mdist %>/css/manifest.css'],
				dest: '<%= mdist %>/css/<%= pkg.name %>-main.css'
			},
			css_edit: {
				src: ['<%= mdist %>/css/fonts.css','<%= mdist %>/css/fa.css','<%= mdist %>/css/leaflet.css','<%= mdist %>/css/visualize.css','<%= mdist %>/css/simplemde.css','<%= mdist %>/css/editor.css'],
				dest: '<%= mdist %>/css/<%= pkg.name %>-edit.css'
			},
			css_static: {
				src: ['<%= mdist %>/css/fonts.css','<%= mdist %>/css/fa.css','<%= mdist %>/css/editor.css'],
				dest: '<%= mdist %>/css/<%= pkg.name %>-static.css'
			}
		},
		watch: {
  		  html: { files: ['<%= msrc %>/**/*.html'], tasks: ['htmlbuild'], options: { livereload:true } },
		  js: { files: ['<%= msrc %>/lib/**/*.js'], tasks: ['jshint', 'concat'], options: { livereload:true } },
		  srv: { files: ['<%= msrc %>/services/*.js'], tasks: ['concat'], options: { livereload:true } },
		  less: { files: ['<%= msrc %>/lib/less/*.less'], tasks: ['less'], options: { livereload:true } },		
		  css: { files: ['<%= mdist %>/css/*.css'], tasks: ['concat'], options: { livereload:true } },
		  copy: { files: ['<%= msrc %>/lib/**/*.json'], tasks: ['copy'], options: { livereload:true } }
		}
	});

// Load plugins
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-html-build');
grunt.loadNpmTasks('grunt-contrib-cssmin');
grunt.loadNpmTasks('grunt-contrib-less');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-watch');

// Set tasks
grunt.registerTask('default', ['copy','htmlbuild','less','concat','cssmin','uglify']);
};