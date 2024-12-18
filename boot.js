// PixlBoot API
// Install service to run on server startup
// Works on Linux (RedHat / Ubuntu) and OS X
// Copyright (c) 2016 - 2019 Joseph Huckaby and PixlCore.com
// MIT License

var fs = require('fs');
var cp = require('child_process');

module.exports = {
	
	defaults: {
		name: "MyService",
		company: "Node",
		script: "bin/control.sh",
		
		// systemd stuff (modern)
		linux_type: "forking",
		linux_after: "network.target",
		linux_wanted_by: "multi-user.target",
		
		// init.d stuff (legacy)
		linux_runlevels: "3,4,5",
		redhat_start_priority: "99",
		redhat_stop_priority: "01",
		debian_requires: "local_fs remote_fs network syslog named",
		debian_stoplevels: "0,1,6"
	},
	
	install: function(args, callback) {
		// install service as a startup item
		var uid = process.geteuid ? process.geteuid() : process.getuid();
		if (uid != 0) return callback( new Error("Must be root to register a startup service.") );
		
		// merge in default args
		for (var key in this.defaults) {
			if (!(key in args)) args[key] = this.defaults[key];
		}
		
		// get abs path to script
		args.script = require('path').resolve( args.script );
		
		// install steps differ based on platform
		switch (process.platform) {
			case 'linux': this.install_linux(args, callback); break;
			case 'darwin': this.install_darwin(args, callback); break;
			default:
				callback( new Error("Unsupported platform: " + process.platform) );
			break;
		}
	},
	
	install_linux: function(args, callback) {
		// install linux systemd or init.d service
		// first determine if we're on RedHat (CentOS / Fedora) or Debian (Ubuntu)
		var self = this;
		
		args.service_name = args.name.toLowerCase().replace(/\W+/g, '');
		
		cp.exec("which systemctl", function(err, stdout, stderr) {
			if (err) {
				// oops, try one of the legacy methods
				cp.exec("which chkconfig", function(err, stdout, stderr) {
					if (err) {
						// not redhat, but are we on debian?
						cp.exec("which update-rc.d", function(err, stdout, stderr) {
							if (err) {
								// not a supported linux platform
								callback( new Error("Unsupported platform: No systemctl, chkconfig nor update-rc.d found.") );
							}
							else {
								// we're on legacy debian
								self.install_linux_debian(args, callback);
							}
						});
					}
					else {
						// we're on legacy redhat
						self.install_linux_redhat(args, callback);
					}
				});
				return;
			}
			else {
				// proceed with modern linux systemd
				self.install_linux_systemd(args, callback);
			}
		});
	},
	
	install_linux_systemd: function(args, callback) {
		// install service on linux with systemd (systemctl)
		args.service_file = "/etc/systemd/system/" + args.service_name + ".service";
		var service_type = args.linux_type;
		var unit_after = args.linux_after;
		var wanted_by = args.linux_wanted_by;
		
		var service_contents = [
			"[Unit]",
			"Description=" + args.company + " " + args.name,
			"After=" + unit_after,
			"",
			"[Service]",
			"Type=" + service_type,
			"ExecStart=" + args.script + " start",
			"ExecStop=" + args.script + " stop",
			"",
			"[Install]",
			"WantedBy=" + wanted_by
		].join("\n") + "\n";
		
		// write init.d config file
		fs.writeFile( args.service_file, service_contents, { mode: 0o644 }, function(err) {
			if (err) return callback( new Error("Failed to write file: " + args.service_file + ": " + err.message) );
			
			// reload systemd
			cp.exec("systemctl daemon-reload", function(err, stdout, stderr) {
				if (err) callback( new Error("Failed to activate service: " + args.service_name + ": " + err.message) );
				
				// activate service
				cp.exec("systemctl enable " + args.service_name + ".service", function(err, stdout, stderr) {
					if (err) callback( new Error("Failed to activate service: " + args.service_name + ": " + err.message) );
					
					// success
					callback();
				}); // cp.exec
			}); // cp.exec
		}); // fs.writeFile
	},
	
	install_linux_redhat: function(args, callback) {
		// install service on redhat (chkconfig)
		// (this is legacy, only used if systemd/systemctl is not on system)
		args.service_file = "/etc/init.d/" + args.service_name;
		var runlevels = args.linux_runlevels.toString().replace(/\D+/g, '');
		var rh_start_priority = this.zeroPad(args.redhat_start_priority, 2);
		var rh_stop_priority = this.zeroPad(args.redhat_stop_priority, 2);
		
		var init_contents = [
			"#!/bin/sh",
			"#",
			"# init.d script for " + args.name,
			"#",
			"# chkconfig: " + runlevels + " " + rh_start_priority + " " + rh_stop_priority,
			"# description: " + args.company + " " + args.name,
			"",
			args.script + " $1"
		].join("\n") + "\n";
		
		// write init.d config file
		fs.writeFile( args.service_file, init_contents, { mode: '755' }, function(err) {
			if (err) return callback( new Error("Failed to write file: " + args.service_file + ": " + err.message) );
			
			// activate service
			cp.exec("chkconfig " + args.service_name + " on", function(err, stdout, stderr) {
				if (err) callback( new Error("Failed to activate service: " + args.service_name + ": " + err.message) );
				
				// success
				callback();
			}); // cp.exec
		}); // fs.writeFile
	},
	
	install_linux_debian: function(args, callback) {
		// install service on debian (update-rc.d)
		// (this is legacy, only used if systemd/systemctl is not on system)
		args.service_file = "/etc/init.d/" + args.service_name;
		var runlevels = args.linux_runlevels.toString().replace(/\D+/g, '').split('').join(" ");
		var deb_stoplevels = args.debian_stoplevels.toString().replace(/\D+/g, '').split('').join(" ");
		var deb_requires = args.debian_requires.split(/\W+/).map( function(req) { return '$' + req; } ).join(" ");
		
		var init_contents = [
			"#!/bin/sh",
			"",
			"### BEGIN INIT INFO",
			"# Provides:          " + args.service_name,
			"# Required-Start:    " + deb_requires,
			"# Required-Stop:     " + deb_requires,
			"# Default-Start:     " + runlevels,
			"# Default-Stop:      " + deb_stoplevels,
			"# X-Interactive:     true",
			"# Short-Description: Start/stop " + args.company + " " + args.name,
			"### END INIT INFO",
			"",
			args.script + " $1"
		].join("\n") + "\n";
		
		// write init.d config file
		fs.writeFile( args.service_file, init_contents, { mode: '755' }, function(err) {
			if (err) return callback( new Error("Failed to write file: " + args.service_file + ": " + err.message) );
			
			// activate service
			cp.exec("update-rc.d " + args.service_name + " defaults", function(err, stdout, stderr) {
				if (err) {
					callback( new Error("Failed to activate service: " + args.service_name + ": " + err.message) );
				} else {
					// success
					callback();
				}
			}); // cp.exec
		}); // fs.writeFile
	},
	
	install_darwin: function(args, callback) {
		// install service as Darwin (OS X) agent or daemon
		args.service_name = args.name.toLowerCase().replace(/\W+/g, '');
		args.company_name = args.company.toLowerCase().replace(/\W+/g, '');
		
		if (process.getuid() == 0) {
			// we're root, so install a LaunchDaemon
			args.plist_file = "/Library/LaunchDaemons/com." + args.company_name + "." + args.service_name + ".plist";
		}
		else {
			// we're a standard user, so install a user-level LaunchAgent
			args.plist_file = process.env.HOME + "/Library/LaunchAgents/com." + args.company_name + "." + args.service_name + ".plist";
		}
		
		var plist_contents = [
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
			'<plist version="1.0">',
			'<dict>',
				"\t" + '<key>Label</key>',
				"\t" + '<string>com.' + args.company_name + '.' + args.service_name + '</string>',
				"\t" + '<key>ProgramArguments</key>',
				"\t" + '<array>',
					"\t\t" + '<string>' + args.script + '</string>',
					"\t\t" + '<string>start</string>',
				"\t" + '</array>',
				"\t" + '<key>RunAtLoad</key>',
				"\t" + '<true/>',
				"\t" + '<key>KeepAlive</key>',
				"\t" + '<false/>',
			'</dict>',
			'</plist>'
		].join("\n") + "\n";
		
		// write plist config file
		fs.writeFile( args.plist_file, plist_contents, { mode: '644' }, function(err) {
			if (err) return callback( new Error("Failed to write file: " + args.plist_file + ": " + err.message) );
			callback();
		});
	},
	
	uninstall: function(args, callback) {
		// remove service from startup (brute force)
		var uid = process.geteuid ? process.geteuid() : process.getuid();
		if (uid != 0) return callback( new Error("Must be root to deregister a startup service.") );
		
		// merge in default args
		for (var key in this.defaults) {
			if (!(key in args)) args[key] = this.defaults[key];
		}
		
		args.service_name = args.name.toLowerCase().replace(/\W+/g, '');
		args.company_name = args.company.toLowerCase().replace(/\W+/g, '');
		
		if (process.platform == 'linux') {
			// try every which way to remove service
			args.service_file = "/etc/systemd/system/" + args.service_name + ".service";
			
			fs.access( args.service_file, function(err) {
				if (err) {
					// nope, try legacy methods
					args.service_file = "/etc/init.d/" + args.service_name;
					
					// chkconfig may or may not work, so ignore error
					cp.exec( "chkconfig " + args.service_name + " off", function() {
						cp.exec( "rm -f /etc/rc*.d/*" + args.service_name, function() {
							fs.unlink( args.service_file, callback );
						} );
					} );
					return;
				}
				
				// looks like we have a systemd service
				cp.exec( "systemctl disable " + args.service_name + ".service", function() {
					fs.unlink( args.service_file, callback );
				} );
			}); // fs.access
		}
		else {
			// non-linux (darwin)
			if (process.getuid() == 0) {
				// we're root, so uninstall the LaunchDaemon
				args.plist_file = "/Library/LaunchDaemons/com." + args.company_name + "." + args.service_name + ".plist";
			}
			else {
				// we're a standard user, so uninstall the user-level LaunchAgent
				args.plist_file = process.env.HOME + "/Library/LaunchAgents/com." + args.company_name + "." + args.service_name + ".plist";
			}
			
			fs.unlink( args.plist_file, callback );
		}
	},
	
	zeroPad: function(value, len) {
		// Pad a number with zeroes to achieve a desired total length (max 10)
		return ('0000000000' + value).slice(0 - len);
	},
	
};
