/*
 * grunt-diff-deploy
 * https://github.com/ernesto/grunt-diff-deploy
 *
 * Copyright (c) 2013 Ernesto Alejo
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        'test/fixtures/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        curly: true,
        immed: true,
        indent: 2,
        latedef: true,
        newcap: true,
        noarg: true,
        noempty: true,
        quotmark: 'single',
        undef: true,
        unused: true,
        globalstrict: true,
        trailing: true,
        loopfunc: true,
        node: true,
        globals: {
        },
        reporter: require('jshint-stylish'),
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
    },

    // Configuration to be run (and then tested).
    diff_deploy: {
      default_options: {
        options: {
          host: 'localhost',
          base: 'test/fixtures',
        },
        files: [
          {
            src: ['**', '**/.*'],
            cwd: 'test/fixtures',
            expand: true,
          },
        ],
      },
      /*default_options: {
        options: {
        },
        files: {
          'tmp/default_options': ['test/fixtures/testing', 'test/fixtures/123'],
        },
      },
      custom_options: {
        options: {
          separator: ': ',
          punctuation: ' !!!',
        },
        files: {
          'tmp/custom_options': ['test/fixtures/testing', 'test/fixtures/123'],
        },
      },*/
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

    bump: {
      options: {
        pushTo: 'origin',
      },
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'diff_deploy', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
