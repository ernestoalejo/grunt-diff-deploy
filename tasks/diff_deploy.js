/*
 * grunt-diff-deploy
 * https://github.com/ernesto/grunt-diff-deploy
 *
 * Copyright (c) 2013 Ernesto Alejo
 * Licensed under the MIT license.
 */
'use strict';


module.exports = function(grunt) {

  grunt.registerMultiTask('diff_deploy', 'Deploy a folder using FTP. It uploads differences only. It can handle server generated files mixed with the uploaded ones.', function() {
    this.files.forEach(function(file) {
      console.log(file.src);
    });
    /*// Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: '.',
      separator: ', '
    });

    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
      // Concat specified files.
      var src = f.src.filter(function(filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(function(filepath) {
        // Read file source.
        return grunt.file.read(filepath);
      }).join(grunt.util.normalizelf(options.separator));

      // Handle options.
      src += options.punctuation;

      // Write the destination file.
      grunt.file.write(f.dest, src);

      // Print a success message.
      grunt.log.writeln('File "' + f.dest + '" created.');
    });*/
  });

};
