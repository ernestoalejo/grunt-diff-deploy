# grunt-diff-deploy

> Deploy a folder using FTP. It uploads differences only. It can handle server generated files mixed with the uploaded ones.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-diff-deploy --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js 
grunt.loadNpmTasks('grunt-diff-deploy');
```

## The "push" task

### Overview
In your project's Gruntfile, add a section named `push` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  push: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

### Options

#### options.host
Type: `String`
Default value: `localhost`

Host to connect to.

#### options.remoteBase
Type: `String`
Default value: `.`

If you want to upload files to a subdirectory of the remote computer, specify the
path here.

### Usage Examples

#### Common usage
The most common usage of this task: uploading to a host the contents of a folder
called `deploy`, building the routes taking `deploy` as the base path.

```js
grunt.initConfig({
  push: {
    options: {
      host: 'example.com',
    },
    files: [
      {
        src: ['**', '**/.*'],
        cwd: 'deploy',
        expand: true,
      },
    ],
  },
})
```
#### Upload to a subfolder
Same as before, but uploading all files to a subfolder of the host.

```js
grunt.initConfig({
  push: {
    options: {
      host: 'example.com',
      remoteBase: 'mysubfolder1/mysubfolder2',
    },
    files: [
      {
        src: ['**', '**/.*'],
        cwd: 'deploy',
        expand: true,
      },
    ],
  },
})
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
* 2013-11-21   v0.2     Remove base configuration (guess it from the dest path). Fix FS stat problems.
* 2013-11-21   v0.1.1   Fix problem when opening too many files.
* 2013-11-21   v0.1.0   Release initial push task.
