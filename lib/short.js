var utils = require('utils'),
    http = require('http'),
    sys = require('sys');

// A module for creating shortlinks with the is.gd service.
// Should be pretty self explainitory:
//
// Example: 
//
// shorturl = new short.ShortLink(myLongURL);
// shorturl.addListener('finish', function(shorturl){
//     sys.puts('Shortened ' + myLongURL + ' to ' + shorturl);
// });
this.ShortLink = function(longurl) {  
  var endpoint = 'is.gd',
    self = this, request,
    c = http.createClient(80, endpoint);
  request = c.request("GET", "/api.php?longurl=" + escape(longurl), {"host": endpoint}),    
  request.finish(function(response){
    response.setBodyEncoding("utf8");
    response.addListener("body", function (shorturl) {
      self.emit('finish', shorturl);
    });
  });
};

utils.inherits(this.ShortLink, process.EventEmitter)
