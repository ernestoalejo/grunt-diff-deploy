/*
 * grunt-diff-deploy
 * https://github.com/ernesto/grunt-diff-deploy
 *
 * Copyright (c) 2013 Ernesto Alejo
 * Licensed under the MIT license.
 */
'use strict';


module.exports = function(grunt) {

  var prompt = require('prompt'),
      JSFtp = require("jsftp"),
      async = require('async'),
      fs = require('fs');

  var ftp;

  function credentials(host, done) {
    // Ask for username & password without prompts
    prompt.start();
    prompt.message = '';
    prompt.delimiter = '';

    var schema = {
      properties: {
        /*username: {
          description: 'FTP username:'.cyan,
        },*/
        password: {
          description: 'FTP password:'.cyan,
          hidden: true,
        }
      },
    };
    prompt.get(schema, function(err, result) {
      if (err) {
        throw err;
      }

      // Login
      ftp = new JSFtp({
        host: host,
        user: result.username || 'ernesto',
        pass: result.password,
      });

      // Check login credentials
      ftp.raw.pwd(function(err, res) {
        if (err) {
          if (err.code === 530) {
            grunt.fatal('bad username or password');
          }
          throw err;
        }
        done();
      });
    });
  }

  grunt.registerMultiTask('diff_deploy', 'Deploy a folder using FTP. It uploads differences only. It can handle server generated files mixed with the uploaded ones.', function() {
    var doneTask = this.async();
    var options = this.options();

    // Extract filepaths
    var filepaths = this.files.map(function(file) {
      return file.src[0];
    }).filter(function(filepath) {
      // Check if the file / folder exists
      if (!grunt.file.exists(filepath)) {
        grunt.log.warn('Source file "' + src + '" not found.');
        return false;
      }
      return true;
    });

    async.series([
      function(done) {
        async.map(filepaths, fs.stat, done);
      },
      function(done) {
        credentials(options.host, done);
      },
      function() {
        doneTask();
      }
    ], function(err) {
      if (err) throw err;
    });

    /*
      // Write the destination file.
      grunt.file.write(f.dest, src);

      // Print a success message.
      grunt.log.writeln('File "' + f.dest + '" created.');
    });*/
  });

};
