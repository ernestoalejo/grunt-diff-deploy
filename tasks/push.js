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
      JSFtp = require('jsftp'),
      async = require('async'),
      fs = require('fs'),
      crypto = require('crypto'),
      path = require('path');

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

  function hashLocalFiles(filepaths, filestats, done) {
    var hashes = {};

    var infos = filepaths.map(function(filepath, i) {
      return {
        filepath: filepath,
        filestat: filestats[i],
      };
    });
    async.mapLimit(infos, 100, function(info, callback) {
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

  function uploadDiff(basepath, localHashes, remoteHashes, filestats, done) {
    // Extract all the local paths, sort it to have the folders first
    // and then the tree inside it.
    // Zip paths & stats together too.
    var localFilepaths = [];
    for (var filepath in localHashes) {
      localFilepaths.push(filepath);
    }
    localFilepaths.sort();
    var localInfos = localFilepaths.map(function(filepath, i) {
      return {
        filepath: filepath,
        filestat: filestats[i],
      };
    });

    // Prepare the remote files so we can remove unused files,
    // in reversed order so we delete first the files and then the folders
    // containing them.
    // Zip paths & stats together too.
    var remoteFilepaths = [];
    for (filepath in remoteHashes) {
      remoteFilepaths.push(filepath);
    }
    remoteFilepaths.sort();
    var remoteInfos = remoteFilepaths.map(function(filepath, i) {
      return {
        filepath: filepath,
        filestat: filestats[i],
      };
    });
    remoteInfos.reverse();

    async.series([
      async.apply(async.mapSeries, localInfos, function(info, mapCallback) {
        // Relativize path, and ignore root folder
        var rel = path.relative(basepath, info.filepath);
        if (!rel) {
          mapCallback();
          return;
        }

        // Ignore similar fiels that have not been modified
        if (remoteHashes[info.filepath] && remoteHashes[info.filepath] == localHashes[info.filepath]) {
          grunt.verbose.writeln('ignored equal file: ' + info.filepath);
          mapCallback();
          return;
        }

        async.series([
          // Create directories
          function(callback) {
            if (!info.filestat.isDirectory()) {
              callback();
              return;
            }

            grunt.log.write(wrap('d--------- /' + rel));
            ftpout.raw.mkd(rel, function(err) {
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
            if (info.filestat.isDirectory()) {
              callback();
              return;
            }

            grunt.log.write(wrap('f--------- /' + rel));
            ftpout.put(info.filepath, rel, function(err) {
              if (err) { done(err); }
              grunt.log.writeln(wrapRight('[SUCCESS]').green);
              callback();
            });
          },

          // Change permissions
          function(callback) {
            grunt.verbose.writeln('changing file perms...');
            ftpout.raw.site('chmod', info.filestat.mode.toString(8), rel, function(err) {
              if (err) { done(err); }
              grunt.verbose.writeln('done changing perms');
              callback();
            });
          },
        ], mapCallback);
      }),

      async.apply(async.mapSeries, remoteInfos, function(info, mapCallback) {
        if (localHashes[info.filepath]) {
          mapCallback();
          return;
        }

        // Relativize path
        var rel = path.relative(basepath, info.filepath);

        grunt.log.write(wrap('---------- /' + rel).magenta);
        async.series([
          function(callback) {
            ftpout.raw.dele(rel, function(err) {
              if (!err) {
                grunt.log.writeln(wrapRight('[SUCCESS]').green);
              }
              callback((err && err.code !== 550) ? err : null);
            });
          },
          function(callback) {
            ftpout.raw.rmd(rel, function(err) {
              if (!err) {
                grunt.log.writeln(wrapRight('[SUCCESS]').green);
              }
              callback((err && err.code !== 550) ? err : null);
            });
          },
        ], mapCallback);
      }),

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
      base: '.',
      remoteBase: '.',
    });

    // Extract filepaths
    var filepaths = this.filesSrc.filter(function(filepath) {
      // Check if the file / folder exists
      if (!grunt.file.exists(filepath)) {
        grunt.log.warn('Source file "' + filepath + '" not found.');
        return false;
      }
      return true;
    });

    async.waterfall([
      // Login to the FTP server
      function(done) {
        credentials(options.host, options.remoteBase, function(err) {
          done(err);
        });
      },

      // Stat all local files & hash them
      async.apply(async.map, filepaths, fs.stat),
      async.apply(hashLocalFiles, filepaths),

      // Fetch the remote hashes
      function(localHashes, filestats, done) {
        fetchRemoteHashes(function(err, remoteHashes) {
          done(err, localHashes, remoteHashes, filestats);
        });
      },

      // Upload differences to the server
      async.apply(uploadDiff, options.base),
    ], doneTask);
  });

};
