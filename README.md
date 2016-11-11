# Overview

`pixl-boot` will automatically register a startup service for your module on Linux and OS X, so your daemon will be started on a server reboot.  It is configured entirely out of your [package.json](https://docs.npmjs.com/files/package.json) file, and will handle all the details of registering an [init.d service](https://bash.cyberciti.biz/guide//etc/init.d) on Linux, or a [LaunchAgent/LaunchDaemon](https://developer.apple.com/library/content/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html) on OS X.

This is only designed for packages that are installed as the root user.

# Usage

First, add the `pixl-boot` package in the `dependencies` section of your `package.json` file:

```js
"dependencies": {
	"pixl-boot": "^1.0.0"
}
```

Next, you need to provide a shell script for starting and stopping your background daemon.  This can be a simple bash (or Node.js) script that responds to `start` and `stop` commands on the CLI.  If you do not have one of these scripts we provide a sample one for you (instructions below).

Once you have your control script ready, link to it in the `bin` property in your `package.json` file:

```js
"bin": "bin/control.sh",
```

Finally, you need to have npm run `pixl-boot` on install and uninstall of your package, so that it has a chance to register and unregister your startup service.  Do this by adding `postinstall` and `preuninstall` properties in the `scripts` section of your `package.json` file:

```js
"scripts": {
	"postinstall": "pixl-boot install",
	"preuninstall": "pixl-boot uninstall"
}
```

That's it!

Alternatively, if you would rather the startup service not be installed automatically, and instead require additional user commands, change the `scripts` property names to something custom, like `boot` and `unboot`:

```js
"scripts": {
	"boot": "pixl-boot install",
	"unboot": "pixl-boot uninstall"
}
```

Then your users would need to be instructed to type:

```
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
	"postinstall": "pixl-boot install --name mycustomservice",
	"preuninstall": "pixl-boot uninstall --name mycustomservice"
}
```

### company

Add `--company` if you want to customize the "company" (organization) name that goes into your startup service metadata.  This defaults to the word `Node`, and may be displayed as part of your package description, depending on the OS.  This is really just a cosmetic detail that has no operational effect on your service.  Make sure you add this to both the install and uninstall commands.  Example use:

```js
"scripts": {
	"postinstall": "pixl-boot install --company MyCompany",
	"preuninstall": "pixl-boot uninstall --company MyCompany"
}
```

### script

Add `--script` to specify a custom location of your shell control script, relative to the base directory of your package.  Use this option if you do not want to pull this from the `bin` property in your `package.json` file.  You only need to add this to the `pixl-boot install` command.  Example:

```js
"scripts": {
	"postinstall": "pixl-boot install --script bin/my-control-script.sh"
}
```

### linux_runlevels

Add `--linux_runlevels` if you want to customize the [Linux init.d Runlevels](https://en.wikipedia.org/wiki/Runlevel#Linux) for when your service should actually start up.  This defaults to `3,4,5' denoting that your service should start at Runlevels 3, 4 and 5.  Obviously, this only has effect when installing on Linux operating systems.  You only need to add this to the `pixl-boot install` command.  Example:

```js
"scripts": {
	"postinstall": "pixl-boot install --linux_runlevels 3,4,5"
}
```

### redhat_start_priority

Add `--redhat_start_priority` if you want to customize the [Linux init.d start priority](http://www.tldp.org/HOWTO/HighQuality-Apps-HOWTO/boot.html), which is a number from `01` to `99`.  This controls when your service should start up, in relation to all the other services on the machine.  This is only used by RedHat (CentOS / Fedora) flavors of Linux, and defaults to `99` (i.e. only start after everything else has).  You only need to add this to the `pixl-boot install` command.  Example:

```js
"scripts": {
	"postinstall": "pixl-boot install --redhat_start_priority 99"
}
```

### redhat_stop_priority

Add `--redhat_stop_priority` if you want to customize the [Linux init.d stop priority](http://www.tldp.org/HOWTO/HighQuality-Apps-HOWTO/boot.html), which is a number from `01` to `99`.  This controls when your service should shut down, in relation to all the other services on the machine.  This is only used by RedHat (CentOS / Fedora) flavors of Linux, and defaults to `01` (i.e. stop first, before anything else).  You only need to add this to the `pixl-boot install` command.  Example:

```js
"scripts": {
	"postinstall": "pixl-boot install --redhat_stop_priority 01"
}
```

### debian_requires

Add `--debian_requires` if you want to customize the list of [Debian services](https://wiki.debian.org/LSBInitScripts) that should be started *before* your service.  For example, it is common to list things like `network` if your daemon requires network access.  This defaults to `local_fs remote_fs network syslog named`.  You only need to add this to the `pixl-boot install` command.  Example:

```js
"scripts": {
	"postinstall": "pixl-boot install --debian_requires local_fs remote_fs network syslog named"
}
```

### debian_stoplevels

Add `--debian_stoplevels` if you want to customize the [Linux init.d Runlevels](https://en.wikipedia.org/wiki/Runlevel#Linux) for when your service should shut down.  This property is only used on Debian (Ubuntu) systems, and defaults to `0,1,6' denoting that your service should stop at Runlevels 0, 1 and 6.  You only need to add this to the `pixl-boot install` command.  Example:

```js
"scripts": {
	"postinstall": "pixl-boot install --debian_stoplevels 0,1,6"
}
```

### darwin_type

Add `--darwin_type` to customize the type of startup service you want on Darwin (OS X) systems.  Darwin supports two different types of startup services, [LaunchAgents and LaunchDaemons](https://developer.apple.com/library/content/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html).  In short, a `LaunchAgent` only starts up when a user log in, while a `LaunchDaemon` starts up earlier, before any user logs in.  The default type is `LaunchAgent`, but beware of changing this to `LaunchDaemon`, because this may start your service before things like network are available.  You only need to add this to the `pixl-boot install` command.  Example:

```js
"scripts": {
	"postinstall": "pixl-boot install --darwin_type LaunchAgent"
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
var boot = require('pixl-boot');
var opts = {
	name: "MyService",
	company: "Node",
	script: "bin/control.sh",
	linux_runlevels: "3,4,5",
	redhat_start_priority: "99",
	redhat_stop_priority: "01",
	debian_requires: "local_fs remote_fs network syslog named",
	debian_stoplevels: "0,1,6",
	darwin_type: "agent"
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

The MIT License

Copyright (c) 2016 Joseph Huckaby.

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
