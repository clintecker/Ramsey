var utils = require('utils'),
  sys = require('sys'),
  short = require('./short');

// This is an example of a "view" which takes
//  and http request and http request body,
//  parses it, does things, and then emits
//  "line" events which our bot does stuff
//  with.  Line events need a "channel"
//  and a "message".  In this view we determine
//  the channel from the URL.
this.GitHub = function(request, msg, hookResponder){
  var data, self = this, channel;
  
  request = request||null;
  msg = msg||null;
   
  // Channel is based off the URL3
  channel = '#' + request.path.replace(/\//g, '');

  msg = unescape(msg);
  msg = msg.replace('payload=', '');
  
  try{
    data = eval('(' + msg + ')');
  } catch(e) {
    return false;
  }

  hookResponder(channel, data);  
};
