var utils = require('utils'),
  sys = require('sys'),
  http = require('http'),
  urllib = require('url'),
  base64 = require('./vendor/base64'),
  xml = require('./vendor/node-xml');

// This is pretty hairy, but it should be pretty usable
//  by anyone and it emits nice little events.
this.RSS = function(url, interval){
  var self = this;
  
  this.interval = interval||60*1000;

  // store xml location
  if(typeof(url) != undefined){
    self.url = url;
    // parse out domain, path for client request
    self.parsed_url = urllib.parse(self.url);
  } else {
    sys.exit('Please provide a URL');
  }

  this.client = http.createClient(self.parsed_url.port||80, self.parsed_url.hostname);

  this.createParser = function(startHandler, endHandler, charHandler) {
      p = new xml.SaxParser(function(cb) {
        cb.onStartDocument(function() {
          self.emit('xmldocstart');
        });
        
        cb.onEndDocument(function() {
          self.emit('xmldocdone');
        });
      
        cb.onStartElementNS(startHandler);
      
        cb.onEndElementNS(endHandler);
      
        cb.onCharacters(charHandler);
      
        cb.onCdata(function(cdata) {});
      
        cb.onComment(function(msg) {});
      
        cb.onWarning(function(msg) {});
        
        cb.onError(function(msg) {
          self.emit('xmldocerror', msg);
        });
    });
    return p;
  };


  self.get_feed = function(){
    var headers = {
      "host": self.parsed_url.hostname,
    }, request;
    
    if(self.parsed_url.auth){
      headers['Authorization'] = "Basic " + base64.encode(self.parsed_url.auth);
    }

    request = self.client.request("GET", self.parsed_url.pathname + self.parsed_url.search, headers);

    xmldata = "";

    request.finish(function(response){
      response.setBodyEncoding("utf8");
      response.addListener("body", function (chunk) {
        xmldata += chunk; 
      });

      response.addListener("complete", function() {
        self.emit("xmlready", xmldata);
      });
    });
  };

  var in_item = false;
  var tmp_item = {};
  var cur_element = null;

  self.addListener("xmlready", function(xmldata){
    xmldata = xmldata.replace('<?xml version="1.0" encoding="utf-8"?>', '');   
    parser = this.createParser(
      function(elem, attrs, prefix, uri, namespaces) {
        if(elem == 'item') {
          in_item = true;
        } else {  
          if(in_item) {
            cur_element = elem;
          }
        }
      },
      function(elem, prefix, uri){
        if(elem == 'item'){
          in_item = false;
          self.emit('item', tmp_item)
          tmp_item = {};
        } else {
          cur_element = null;
          if(elem == 'rss'){
            self.emit('done')
          }
        }
          
      },
      function(chars){
        if(in_item && cur_element){
          tmp_item[cur_element] = chars;
        }
      }
    );
    parser.parseString(xmldata);
    setTimeout(self.get_feed, interval);          
  });
 
  sys.puts('RSS module initialized');
};
utils.inherits(this.RSS, process.EventEmitter)
