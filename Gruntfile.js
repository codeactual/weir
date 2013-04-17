module.exports = function(grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-shell');

  var mochaShelljsOpt = {stdout: true, stderr: true};

  grunt.initConfig({
    jshint: {
      src: {
        files: {
          src: ['index.js']
        }
      },
      grunt: {
        files: {
          src: ['Gruntfile.js']
        }
      },
      tests: {
        options: {
          expr: true
        },
        files: {
          src: ['test.js']
        }
      },
      json: {
        files: {
          src: ['*.json']
        }
      }
    },
    uglify: {
      dist: {
        options: {
          compress: false,
          mangle: false,
          beautify: true
        },
        files: {
          'dist/bdd-flow.js': 'dist/bdd-flow.js'
        }
      }
    },
    shell: {
      options: {
        failOnError: true,
        stdout: true,
        stderr: true
      },
      build: {
        command: 'component install --dev && component build --standalone bddflow --name bdd-flow --out dist --dev'
      },
      dist: {
        command: 'component build --standalone bddflow --name bdd-flow --out dist'
      },
      shrinkwrap: {
        command: 'npm shrinkwrap'
      },
      test_lib: {
        options: mochaShelljsOpt,
        command: 'mocha --colors --async-only --reporter spec test.js'
      }
    }
  });

  grunt.registerTask('default', ['jshint', 'shell:shrinkwrap']);
  grunt.registerTask('build', ['shell:build']);
  grunt.registerTask('dist', ['default', 'shell:dist', 'uglify:dist', 'shell:shrinkwrap']);
  grunt.registerTask('test', ['build', 'shell:test_lib']);
};
