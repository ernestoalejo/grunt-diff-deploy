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
      JSFtp = require('jsftp'),
      async = require('async'),
      fs = require('fs'),
      crypto = require('crypto'),
      path = require('path'),
      _ = require('lodash');

  var ftpin, ftpout;

  var curcol = 0;
  var totalcols = process.stdout.columns;
  var wrap = function(text) {
    curcol += text.length;
    curcol %= totalcols;
    return text;
  };
  var wrapRight = function(text) {
    if (curcol + text.length > totalcols) {
      text += '\n';
      curcol = 0;
    }
    text = grunt.util.repeat(totalcols - text.length - curcol - 3) + text;
    curcol = 0;
    return text;
  };

  function credentials(host, remoteBase, done) {
    // Ask for username & password without prompts
    prompt.start();
    prompt.message = '';
    prompt.delimiter = '';

    var schema = {
      properties: {
        username: {
          description: 'FTP username:'.cyan,
        },
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
        user: result.username,
        pass: result.password,
      });
      ftpout = new JSFtp({
        host: host,
        user: result.username,
        pass: result.password,
      });

      // Check login credentials
      async.series([
        // Check user name & password
        function(callback) {
          ftpout.raw.pwd(function(err) {
            if (err && err.code === 530) {
              grunt.fatal('bad username or password');
            }
            callback(err);
          });
        },

        // Move to the subfolder in both connections
        async.apply(ftpout.raw.cwd, remoteBase),
        async.apply(ftpin.raw.cwd, remoteBase),
      ], done);
    });
  }

  function hashLocalFiles(files, done) {
    var hashes = {};
    async.mapLimit(files, 100, function(file, callback) {
      var shasum = crypto.createHash('sha1');

      shasum.update(file.mode.toString(8), 'ascii');

      var endsum = function() {
        hashes[file.dest] = shasum.digest('hex');
        callback();
      };
      if (file.isFile()) {
        var s = fs.ReadStream(file.src);
        s.on('data', shasum.update.bind(shasum));
        s.on('end', endsum);
        return;
      }
      endsum();
    }, function(err) {
      done(err, hashes, files);
    });
  }

  function fetchRemoteHashes(done) {
    grunt.log.write(wrap('===== loading hashes... '));
    ftpin.get('push-hashes', function(err, socket) {
      if (err) {
        // If the file cannot be found, keep running as if nothing
        // has been uploaded yet to the server
        if (err.code === 550) {
          grunt.log.writeln(wrapRight('[NOT FOUND]').yellow);
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
        grunt.log.writeln(wrapRight('[SUCCESS]').green);
        done(err, JSON.parse(str));
      });
      socket.resume();
    });
  }

  function uploadDiff(localHashes, remoteHashes, files, done) {
    // Prepare local paths in the correct order
    var local = files.slice();
    local.sort(function(a, b) {
      return (a.src == b.src) ? 0 : (a.src < b.src) ? -1 : 1;
    });

    // Prepare remote paths in the correct order
    var remote = [];
    for (var file in remoteHashes) {
      remote.push(file);
    }
    remote.sort().reverse();

    async.series([
      async.apply(async.mapSeries, local, function(file, mapCallback) {
        // Ignore root folder
        if (file.dest == '.') {
          mapCallback();
          return;
        }

        // Ignore similar fiels that have not been modified
        if (remoteHashes[file.dest] && remoteHashes[file.dest] == localHashes[file.dest]) {
          grunt.verbose.writeln('ignored equal file: ' + file.dest);
          mapCallback();
          return;
        }

        async.series([
          // Create directories
          function(callback) {
            if (!file.isDirectory()) {
              callback();
              return;
            }

            grunt.log.write(wrap('d--------- /' + file.dest));
            ftpout.raw.mkd(file.dest, function(err) {
              if (err) {
                if (err.code != 550) {
                  done(err);
                } else {
                  grunt.log.writeln(wrapRight('[PRESENT]').yellow);
                }
              } else {
                grunt.log.writeln(wrapRight('[SUCCESS]').green);
              }
              callback();
            });
          },

          // Upload files
          function(callback) {
            if (file.isDirectory()) {
              callback();
              return;
            }

            grunt.log.write(wrap('f--------- /' + file.dest));
            ftpout.put(file.src, file.dest, function(err) {
              if (err) { done(err); }
              grunt.log.writeln(wrapRight('[SUCCESS]').green);
              callback();
            });
          },

          // Change permissions
          function(callback) {
            grunt.verbose.writeln('changing file perms...');
            ftpout.raw.site('chmod', file.mode.toString(8), file.dest, function(err) {
              if (err) { done(err); }
              grunt.verbose.writeln('done changing perms');
              callback();
            });
          },
        ], mapCallback);
      }),

      // Try to remote files tracked but no longer present in the local copy
      async.apply(async.mapSeries, remote, function(filepath, mapCallback) {
        if (localHashes[filepath]) {
          mapCallback();
          return;
        }

        grunt.log.write(wrap('---------- /' + filepath).magenta);
        async.series([
          function(callback) {
            // Try to delete as a file
            ftpout.raw.dele(filepath, function(err) {
              if (!err) {
                grunt.log.writeln(wrapRight('[SUCCESS]').green);
              }
              callback((err && err.code !== 550) ? err : null);
            });
          },
          function(callback) {
            // Try to delete as a folder
            ftpout.raw.rmd(filepath, function(err) {
              if (!err) {
                grunt.log.writeln(wrapRight('[SUCCESS]').green);
              }
              callback((err && err.code !== 550) ? err : null);
            });
          },
        ], mapCallback);
      }),

      // Change folder & files perms
      function(callback) {
        grunt.log.write(wrap('===== saving hashes... '));
        ftpout.put(new Buffer(JSON.stringify(localHashes)), 'push-hashes', function(err) {
          if (err) { done(err); }
          grunt.log.writeln(wrapRight('[SUCCESS]').green);
          callback();
        });
      },
    ], done);
  }

  grunt.registerMultiTask('push', 'Deploy a folder using FTP.', function() {
    var doneTask = this.async();
    var options = this.options({
      host: 'localhost',
      remoteBase: '.',
    });

    // Extract files
    var files = this.files.filter(function(file) {
      var filepath = file.src[0];
      // Check if the file / folder exists
      if (!grunt.file.exists(filepath)) {
        grunt.log.warn('Source file "' + filepath + '" not found.');
        return false;
      }
      return true;
    }).map(function(file) {
      return {
        src: file.src[0],
        dest: file.dest,
      };
    });

    async.waterfall([
      // Login to the FTP server
      function(done) {
        credentials(options.host, options.remoteBase, function(err) {
          done(err);
        });
      },

      // Stat all local files & hash them
      async.apply(async.map, files, function(file, callback) {
        fs.stat(file.src, function(err, stats) {
          stats = _.extend(stats, file);
          callback(err, stats);
        });
      }),
      hashLocalFiles,

      // Fetch the remote hashes
      function(localHashes, files, done) {
        fetchRemoteHashes(function(err, remoteHashes) {
          done(err, localHashes, remoteHashes, files);
        });
      },

      // Upload differences to the server
      uploadDiff,
    ], doneTask);
  });

};
