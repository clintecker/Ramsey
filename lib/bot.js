var sys = require('sys'), 
  irc = require('./vendor/irc'),
  utils = require('utils');

// The bot is a very thin wrapper around our IRC
//  mobile.  Instaniate the bot and then call
//  ``connect()`` when you're ready to go.
//  Send messages to IRC with the .send(channel, msg)
//  method.
//
//  You can do standard IRC commands through the
//  bot.connection instance.  We're not bubbling up
//  emits or handling input from IRC quite yet.
this.Bot = function(options) {
  var self = this;
  self.options = options;

  this.send = function(channel, msg){
    self.connection.write(irc.Interpret.textToIrc(channel + ' :' + msg));    
  };
  
  // I would not suggest connecting to multiple servers just yet, 
  //  for obvious reasons :P
  this.connect = function(){
    for(server in self.options.servers){
      if(!self.options.servers.hasOwnProperty(server)) { continue; }
      
      server_options = self.options.servers[server];
      this.connection = new irc.Connection(server_options);
      
      self.connection.addListener("connect", function() {
        sys.puts('Connected to ' + server);
      });

      self.connection.addListener("receive", function(data) {
        //sys.puts('RX: ' + data);
        self.emit("receive", data);
      });

      self.connection.addListener("send", function(data) {
        sys.puts('TX: ' + data);
      });
   
      self.connection.addListener("close", function() {
        process.exit();
      });
    }
  };
};
utils.inherits(this.Bot, process.EventEmitter);

