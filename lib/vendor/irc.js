/**

This IRC library was taken from the Egret library
<http://github.com/ionfish/egret> and modified slightly for use in this project.

Copyright (c) 2008-2009, Benedict Eastaugh. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 
**/

var sys   = require("sys"),
    utils = require("utils"),
    tcp   = require("tcp");

/**
 * The Interpret object is just a namespace for the various interpreter
 * functions such as textToIrc and ircToText.
 */
this.Interpret = {
    /**
     * The textToIrc function converts user input to the wire format sent to
     * the IRC server. It handles normal messages and the usual set of
     * commands, e.g. /join, /part, /say, /msg and /quit.
     */
    textToIrc: function(data) {
            data  = data.replace(/\s+$/, "");
        var match = (/^\/([a-z]+)(\s|$)/).exec(data),
            cmd, msg;
        
        if (match && match[1]) {
            cmd = match[1].toUpperCase();
            msg = cmd + " " + data.substr(cmd.length + 2, data.length);
        } else {
            msg = "PRIVMSG " + data;
        }
        
        return msg + "\r\n";
    },
    
    /**
     * The ircToText function converts IRC wire format data to text which can
     * be displayed to the user.
     */
    ircToText: function(data) {
        return data;
    }
};

/**
 * The Connection object provides a network connection to the specified IRC
 * server. Other objects can instruct it to send data to the server, while
 * other data (such as pings) will be sent automatically as long as the
 * connection remains open. Data received from the server is dispatched to
 * listeners, such as consoles.
 */
this.Connection = function(options) {
    //sys.puts(sys.inspect(options));
    this.server = options.host;
    this.channels = options.channels;

    var self     = this,
        handle   = tcp.createConnection(options.port, this.server);
    
    handle.setEncoding("utf8");
    handle.setTimeout();
    
    this.write = function(message) {
        handle.send(message, "utf8");
        self.emit("send", message);
    };
    
    this.close = function() {
        this.write("QUIT :Leaving");
        handle.close();
    };
    
    handle.addListener("connect", function() {
        var interpret = module.exports.Interpret;
        self.write(interpret.textToIrc("/nick " + options.nick));
        self.write(interpret.textToIrc("/user " + options.user));
        for(i=0;i<self.channels.length;i++){
          channel = self.channels[i];
          self.write(interpret.textToIrc("/join " + channel + " " + options.passwords[channel]));
        }
        self.emit("connect");
    });
    
    handle.addListener("close", function(had_error) {
        if (had_error)
            sys.puts("Connection closed due to a transmission error.");
        
        self.emit("close");
    });
    
    handle.addListener("eof", function() {
        sys.puts("Connection closed by remote.");
        handle.close();
    });
    
    handle.addListener("timeout", function() {
        sys.puts("Connection timed out.");
        self.emit("timeout");
    });
    
    handle.addListener("receive", function(data) {
      if(data.match(/^PING :/)){
        self.write(data.replace(/PING/, 'PONG'));
      }
      
      self.emit("receive", data);
    });
};

utils.inherits(this.Connection, process.EventEmitter);

/**
 * The Console object provides a command-line style interface to the IRC
 * connection, allowing the user to send and receive messages.
 */
this.Console = function() {
    var self = this;
    
    this.print = function(message) {
        sys.print("\n" + message.replace(/\s+$/, "") + "\n> ");
    };
    
    this.exit = function() {
        process.stdio.close();
    };
    
    process.stdio.open();
    
    process.stdio.addListener("data", function(line) {
        self.emit("message", line);
    });
};

utils.inherits(this.Console, process.EventEmitter);
