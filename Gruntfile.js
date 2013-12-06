/*
 * grunt-diff-deploy
 * https://github.com/ernestoalejo/grunt-diff-deploy
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
    push: {
      default_options: {
        options: {
          host: 'localhost',
          disablePerms: true,
          remoteBase: 'tt',
        },
        files: [
          {
            src: ['**', '**/.*'],
            cwd: 'test/fixtures',
            expand: true,
          },
        ],
      },
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
  //grunt.registerTask('test', ['clean', 'push', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint']);

};
