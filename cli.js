#!/usr/bin/env node

// PixlBoot CLI
// Install service to run on server startup
// Works on Linux (RedHat / Ubuntu) and OS X
//
// Usage:
//	pixl-boot install --name MyApp --company MyCompany --script /usr/bin/myscript
//	pixl-boot uninstall --name MyApp --company MyCompany
//
// package.json:
//	"scripts": {
//		"postinstall": "pixl-boot install",
//		"preuninstall": "pixl-boot uninstall"
//	}
//
// Copyright (c) 2016 Joseph Huckaby and PixlCore.com

var cli = require('pixl-cli');
cli.global();

var boot = require('./boot.js');

var usage = "Usage: pixl-boot install --name MyApp --company MyCompany --script /usr/bin/myscript\n";
var args = cli.args;
var cmd = '';

if (args.other && args.other[0]) cmd = ''+args.other[0];
else if (args.install) cmd = 'install';
else if (args.uninstall) cmd = 'uninstall';

if (!cmd.match(/^install|uninstall$/)) {
	die(usage);
}

// default to package.json in cwd
if (!args.name || !args.script) {
	var pkg = JSON.parse( loadFile('./package.json') );
	if (!args.name) args.name = pkg.name;
	if (!args.script && pkg.bin) {
		if (typeof(pkg.bin) == 'string') args.script = pkg.bin;
		else if (pkg.bin[pkg.name]) args.script = pkg.bin[pkg.name];
	}
}

// if running from npm, a blank line will be added already
if (!process.env['npm_package_name']) print("\n");

switch (cmd) {
	case 'install':
		if (!args.script) die(usage);
		
		print( "Installing startup service: " + args.name + "..." );
		
		boot.install(args, function(err) {
			if (err) {
				print( "ERROR.\n" );
				print( "" + err + "\n\n" );
			}
			else {
				print( "OK.\n" );
				print( "Successfully registered startup service.\n\n" );
			}
		});
	break;
	
	case 'uninstall':
		print( "Removing startup service: " + args.name + "..." );
		
		boot.uninstall(args, function(err) {
			if (err) {
				print( "ERROR.\n" );
				print( "" + err + "\n\n" );
			}
			else {
				print( "OK.\n" );
				print( "Successfully removed startup service.\n\n" );
			}
		});
	break;
}
