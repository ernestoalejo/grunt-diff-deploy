/*
 * grunt-diff-deploy
 * https://github.com/ernesto/grunt-diff-deploy
 *
 * Copyright (c) 2013 Ernesto Alejo
 * Licensed under the MIT license.
 */
'use strict';


module.exports = function(grunt) {

  var inspect = require('util').inspect;
  var prompt = require('prompt'),
      JSFtp = require("jsftp"),
      async = require('async'),
      fs = require('fs'),
      crypto = require('crypto');

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

  function hashLocalFiles(filepaths, filestats, done) {
    var hashes = {};

    var infos = filepaths.map(function(filepath, i) {
      return {
        filepath: filepath,
        filestat: filestats[i],
      };
    });
    async.map(infos, function(info, callback) {
      var shasum = crypto.createHash('sha1');

      shasum.update(info.filestat.mode.toString(8), 'ascii');

      var endsum = function() {
        hashes[info.filepath] = shasum.digest('hex');
        callback();
      };
      if (info.filestat.isFile()) {
        var s = fs.ReadStream(info.filepath);
        s.on('data', shasum.update.bind(shasum));
        s.on('end', endsum);
        return;
      }
      endsum();
    }, function(err) {
      done(err, hashes);
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

    async.waterfall([
      // Login to the FTP server
      function(done) {
        credentials(options.host, done);
      },

      // Stat all local files & hash them
      async.map.bind(this, filepaths, fs.stat),
      hashLocalFiles.bind(this, filepaths),

      function(localHashes, done) {
        console.log(inspect(localHashes));
        done();
      },

      // Finish the task
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
