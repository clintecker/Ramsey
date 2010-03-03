var utils = require('utils'),
  sys = require('sys'),
  http = require('http'),
  urllib = require('url'),
  base64 = require('./vendor/base64'),
  xml = require('./vendor/node-xml');

// This is pretty hairy, but it should be pretty usable
//  by anyone and it emits nice little events.
this.Cruise = function(url, interval, projects){
  var self = this;
  
  self.interval = interval||60*1000,
  self.projects = projects;

  self.statuses = {}

  // store xml location
  if(typeof(url) != undefined){
    self.url = url;
    // parse out domain, path for client request
    self.parsed_url = urllib.parse(self.url);
  } else {
    sys.exit('Please provide a URL');
  }

  self.client = http.createClient(self.parsed_url.port, self.parsed_url.hostname);

  self.createParser = function(startHandler) {
      p = new xml.SaxParser(function(cb) {
        cb.onStartDocument(function() {
          self.emit('xmldocstart');
        });
        
        cb.onEndDocument(function() {
          self.emit('xmldocdone');
        });
      
        cb.onStartElementNS(startHandler);
      
        cb.onEndElementNS(function(elem, prefix, uri) {});
      
        cb.onCharacters(function(chars) {});
      
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

    request = self.client.request("GET", self.parsed_url.pathname, headers);
    
    self.xmldata = "";
    
    request.finish(function(response){
      response.setBodyEncoding("utf8");
      
      response.addListener("body", function (chunk) {
        self.xmldata += chunk; 
      });

      response.addListener("complete", function() {
        self.emit("xmlready", self.xmldata);
      });
    });
  };

  self.addListener("xmlready", function(xmldata){
    xmldata = xmldata.replace('<?xml version="1.0" encoding="utf-8"?>', '');   
    parser = this.createParser(function(elem, attrs, prefix, uri, namespaces) {
      if(elem == 'Project') {
        name = attrs[0][1];
        activity = attrs[1][1];
        laststatus = attrs[2][1];
        lastlabel = attrs[3][1];
        lasttime = attrs[4][1];
        url = attrs[5][1];
        url = urllib.parse(url);
        url = url.protocol + '//' + self.parsed_url.host.replace(self.parsed_url.auth+'@','') + url.pathname;
        if((self.projects.length) && !(self.projects.indexOf(name) != -1)){
          return;
        }
        
        previous_status = self.statuses[name]||null;
        if(previous_status && (previous_status.activity == activity)) {
          //sys.puts('No change in ' + name + ' since last check.  Still ' + activity);
        }
       
        if(previous_status && (previous_status.activity != activity)) {
          // Announce changes
          if(activity == 'Sleeping') {
            // Finished whatever it was just doing
            self.emit('finished', name, laststatus, url);
          } else if (activity == 'Building') {
            // Just started a new build
            self.emit('started', name);
          }
        }
        
        // Store new state.
        self.statuses[name] = {
          activity: activity,
        };
        
      }
    });
    parser.parseString(xmldata);
    setTimeout(self.get_feed, interval);          
  });
 
  sys.puts('Cruise module initialized');
};
utils.inherits(this.Cruise, process.EventEmitter)
