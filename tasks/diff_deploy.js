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
      crypto = require('crypto'),
      path = require('path');

  var ftpin, ftpout;

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
      ftpin = new JSFtp({
        host: host,
        user: result.username || 'ernesto',
        pass: result.password,
      });
      ftpout = new JSFtp({
        host: host,
        user: result.username || 'ernesto',
        pass: result.password,
      });

      // Check login credentials
      ftpout.raw.pwd(function(err, res) {
        if (err) {
          if (err.code === 530) {
            grunt.fatal('bad username or password');
          }
          throw err;
        }

        ftpout.raw.cwd('tt', function() { done(); });
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
      done(err, hashes, filestats);
    });
  }

  function fetchRemoteHashes(done) {
    grunt.verbose.writeln('fetch remote hashes...');
    ftpin.get('push-hashes', function(err, socket) {
      if (err) {
        // If the file cannot be found, keep running as if nothing
        // has been uploaded yet to the server
        if (err.code === 550) {
          grunt.verbose.writeln('remote hashes not found, using an empty default');
          done(null, {});
        } else {
          done(err, {});
        }
        return;
      }

      var str = '';
      socket.on('data', function(data) {
        str += data.toString();
      });
      socket.on('close', function(err) {
        grunt.verbose.writeln('done fetching remote hashes');
        done(err, JSON.parse(str));
      });
    });
  }

  function uploadDiff(basepath, localHashes, remoteHashes, filestats, done) {
    // Extract all the local paths, sort it to have the folders first
    // and then the tree inside it
    var filepaths = [];
    for (var filepath in localHashes) {
      filepaths.push(filepath);
    }
    filepaths.sort();

    var infos = filepaths.map(function(filepath, i) {
      return {
        filepath: filepath,
        filestat: filestats[i],
      };
    });

    async.mapSeries(infos, function(info, callback) {
      var rel = path.relative(basepath, info.filepath);
      if (!rel) {
        callback();
        return;
      }

      // Ignore similar fiels that have not been modified
      if (remoteHashes[info.filepath] && remoteHashes[info.filepath] == localHashes[info.filepath]) {
        return;
      }

      var changePerms = function() {
        grunt.verbose.writeln('changing file perms...');
        ftpout.raw.site('chmod', info.filestat.mode.toString(8), rel, function(err) {
          if (err) done(err);
          grunt.verbose.writeln('done changing perms');
          callback();
        });
      };

      if (info.filestat.isDirectory()) {
        grunt.log.write('.......... creating directory /' + rel + '... ');
        ftpout.raw.mkd(rel, function(err, result) {
          if (err) {
            if (err.code != 550) {
              done(err);
            } else {
              grunt.log.writeln('PRESENT'.yellow);
            }
          } else {
            grunt.log.writeln('SUCCESS'.green);
          }
          changePerms();
        });
      } else {
        grunt.log.write('.......... uploading file /' + rel + '... ');
        ftpout.put(info.filepath, rel, function(err) {
          if (err) done(err);
          grunt.log.writeln('SUCCESS'.green);
          changePerms();
        });
      }
    }, done);
  }

  grunt.registerMultiTask('diff_deploy', 'Deploy a folder using FTP.', function() {
    var doneTask = this.async();
    var options = this.options({
      host: 'localhost',
      base: '.',
    });

    // Extract filepaths
    var filepaths = this.filesSrc.filter(function(filepath) {
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

      // Fetch the remote hashes
      function(localHashes, filestats, done) {
        fetchRemoteHashes(function(err, remoteHashes) {
          done(err, localHashes, remoteHashes, filestats);
        });
      },

      // Upload differences to the server
      uploadDiff.bind(this, options.base),

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
