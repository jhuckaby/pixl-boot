# Overview

`pixl-boot` will automatically register a startup service for your module on Linux and macOS, so your daemon will be started on a server reboot.  It is configured entirely out of your [package.json](https://docs.npmjs.com/files/package.json) file, and will handle all the details of registering a [systemd service](https://en.wikipedia.org/wiki/Systemd) on Linux, or a [LaunchAgent/LaunchDaemon](https://developer.apple.com/library/content/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html) on macOS.

This is only designed for packages that are installed as the root user.

# Usage

First, add the `pixl-boot` package in the `dependencies` section of your `package.json` file:

```js
"dependencies": {
	"pixl-boot": "^2.0.0"
}
```

Next, you need to provide a shell script for starting and stopping your background daemon.  This can be a simple bash (or Node.js) script that responds to `start` and `stop` commands on the CLI.  If you do not have one of these scripts we provide a sample one for you (instructions below).

Once you have your control script ready, link to it in the `bin` property in your `package.json` file:

```js
"bin": "bin/control.sh",
```

Finally, you need to have npm run `pixl-boot` on install and uninstall of your package, so that it has a chance to register and unregister your startup service.  Do this by adding `boot` and `unboot` properties in the `scripts` section of your `package.json` file:

```js
"scripts": {
	"boot": "pixl-boot install",
	"unboot": "pixl-boot uninstall"
}
```

Then your users need to be instructed to type:

```sh
npm run boot
npm run unboot
```

To install and uninstall the startup service, respectively.

## Advanced

The `pixl-boot install` and `pixl-boot uninstall` commands accept some optional CLI arguments which you can add if desired:

### name

Add `--name` if you want to customize the startup service name.  This defaults to the `name` property from your `package.json` file, and is converted to lower-case alphanumeric.  Make sure you add this to both the install and uninstall commands.  Example:

```js
"scripts": {
	"boot": "pixl-boot install --name mycustomservice",
	"unboot": "pixl-boot uninstall --name mycustomservice"
}
```

### company

Add `--company` if you want to customize the "company" (organization) name that goes into your startup service metadata.  This defaults to the word `Node`, and may be displayed as part of your package description, depending on the OS.  This is really just a cosmetic detail that has no operational effect on your service.  Make sure you add this to both the install and uninstall commands.  Example use:

```js
"scripts": {
	"boot": "pixl-boot install --company MyCompany",
	"unboot": "pixl-boot uninstall --company MyCompany"
}
```

### script

Add `--script` to specify a custom location of your shell control script, relative to the base directory of your package.  Use this option if you do not want to pull this from the `bin` property in your `package.json` file.  You only need to add this to the `pixl-boot install` command.  Example:

```js
"scripts": {
	"boot": "pixl-boot install --script bin/my-control-script.sh"
}
```

### linux_type

Add `--linux_type` if you want to customize the Linux systemd service type.  It should be one of `simple`, `forking`, `oneshot`, `dbus`, `notify`, or `idle`.  It defaults to `forking`.  Example:

```js
"scripts": {
	"boot": "pixl-boot install --linux_type forking"
}
```

### linux_after

Add `--linux_after` if you want to specify a service that we must start *after*.  This defaults to `network.target`, denoting that the server should have basic networking started before trying to start our service.  Example:

```js
"scripts": {
	"boot": "pixl-boot install --linux_after network.target"
}
```

### linux_wanted_by

Add `--linux_wanted_by` if you want to customize the `WantedBy` property in the systemd service file.  This defaults to `multi-user.target`.  Example:

```js
"scripts": {
	"boot": "pixl-boot install --linux_wanted_by multi-user.target"
}
```

## Sample Shell Control Script

Your module is expected to provide a simple shell (or Node.js) control script, which will start and stop your daemon based on CLI commands.  Stopping your daemon from a shell script is usually accomplished by using a [PID File](https://en.wikipedia.org/wiki/Process_identifier#Pidfile).  If you do not have one of these scripts handy, we provide a sample one for you:

[sample-control.sh](https://github.com/jhuckaby/pixl-boot/blob/master/sample-control.sh)

Copy this script to your package directory (typically in a `bin` subdirectory but doesn't have to be), name it whatever you want, and configure these three lines near the top of the file:

```sh
NAME="YOUR_SERVICE_NAME_HERE"
BINARY="node lib/main.js"
PIDFILE="logs/pid.txt"
```

Set `NAME` to your service's name (just used for display purposes during startup / shutdown).  Set `BINARY` to the shell command used to actually launch your Node.js daemon (relative to your package base directory).  And finally, set `PIDFILE` to the location of your daemon's PID file. 

Your Node.js daemon is expected to fork a daemon (background) process when launched, and write out its own PID file after forking.  An easy way to do this is to use the npm [daemon](https://www.npmjs.com/package/daemon) package, and then call `fs.writeFileSync()` for the PID file.  Example:

```js
// forks a daemon process and exits main process
require('daemon')();

// write PID file after forking
require('fs').writeFileSync( "logs/pid.txt", process.pid );
```

## JavaScript API

In addition to the command-line interface for `pixl-boot` there is also a JavaScript API you can use in your Node.js code, to install and/or uninstall startup services.  To use this, first call `require('pixl-boot)` to load the module, and the returned object exposes `install()` and `uninstall()` functions.  Both functions accept an options object, and a callback.  The options object accepts all the named command-line arguments, sans the hyphens.  Example use:

```js
const boot = require('pixl-boot');
let opts = {
	name: "MyService",
	company: "Node",
	script: "bin/control.sh",
	linux_type: "forking",
	linux_after: "network.target",
	linux_wanted_by: "multi-user.target"
};

// install startup service
boot.install(opts, function(err) {
	if (err) throw err;
} );

// uninstall startup service
boot.uninstall(opts, function(err) {
	if (err) throw err;
} );
```

# Licenses

**The MIT License**

Copyright (c) 2016 - 2024 Joseph Huckaby.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

The [sample-control.sh](https://github.com/jhuckaby/pixl-boot/blob/master/sample-control.sh) file included with this package is based on one originally written by Marc Slemko, and is licensed under The Apache Software License, Version 1.1.
