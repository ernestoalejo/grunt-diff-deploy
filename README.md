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

## The "diff_deploy" task

### Overview
In your project's Gruntfile, add a section named `diff_deploy` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  diff_deploy: {
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

#### options.base
Type: `String`
Default value: `.`

Paths of the remoted files will be generated from the relative path to this base
folder in the local computer.

For example, if the full path it's `/home/user/myfolder/mysubfolder/myfile` and
`options.base` is pointing to `/home/user/myfolder`; the file will be uploaded
to `{{options.remoteBase}}/mysubfolder/myfile` in the server.

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
  diff_deploy: {
    options: {
      host: 'example.com',
      base: 'deploy',
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
  diff_deploy: {
    options: {
      host: 'example.com',
      base: 'deploy',
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
_(Nothing yet)_
