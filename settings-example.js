var github = require('./lib/github'),
  cruise = require('./lib/cruise'),
  short = require('./lib/short'),
  routes = require('./lib/routes'),
  bot = require('./lib/bot'),
  http = require('http'),
  sys = require('sys');

/** 
 * IRC BOT SETUP 
 * 
 * IRC bot options, currently multiple servers are
 * not supported but are planned.
 *
 **/
var options = {
  servers: {
    'ars': {
      host: "irc.freenode.net",
      nick: "mylittlepony",
      port: 6667,
      user: "Ramsey 0 * :Ramsey IRC Bot",
      channels: [
        "#testingchannel",
        "#testingchannel2",
      ],
      passwords: {
        "#testingchannel2" : 'passwordsarecool',
      },
    },
  }
};
var mybot = new bot.Bot(options);
mybot.connect();
/** END IRC BOT SETUP **/


/** 
 * GITHUB WEBHOOK SETUP
 *
 * The Github module parses the JSON post from Github and
 * pipes this data and the channel it should go to into
 * a responder function.  Its up to the person configuring
 * the bot to build this function.  This one replicates most
 * of the functionality and design of the IRC module 
 * found on Github itslf
 *
 **/
var hookResponder = function(channel, data){
  var commits = {};

  try{
    reponame = data.repository.name;
  } catch(e) {
    // Data wasn't formed properly and the
    // rest of this module would likely
    // fail.
    return;
  }

  branch = data.ref.split('/').pop();

  // If the post contains multiple commits, we
  // use a "compact" mode which outputs each
  // line but does not calculate a tiny url 
  // for each commit.
  //
  // At the end of a compact output, we output
  // a summary line with special tiny url which
  // points to a /compare/ link on github.
  if(data.commits.length > 1) { compact = true; }
  
  for(i=0;i<data.commits.length;i++){
    commit = data.commits[i];
    commits[commit.id] = '\002checkin to ' + reponame + ":\002 " + "\0037" + branch + " \0033" + commit.author.name + "\0031 * \002" + commit.id.slice(0,7) + "\002 (" + commit.modified.length + " files): " + commit.message;
    if(!compact) {
      // Calculating a shorturl using the is.gd shorturl
      // module is easy.
      link = new short.ShortLink(commit.url);
      
      func = function(commit) {
        return function(shorturl){
          commits[commit.id] += ' - ' + shorturl;
          mybot.send(channel, commits[commit.id]);
        };
      }(commit);
      
      link.addListener("finish", func);

    } else {
      // We send the output to our bot as defined above
      // but you could do whatever you want with it
      mybot.send(channel, commits[commit.id]);
    }
  }

  // Output summary line
  if(compact){
    first_id = data.before.slice(0,7);
    last_id =  data.after.slice(0,7);
    link = new short.ShortLink(data.repository.url + "/compare/" + first_id + "..." + last_id);

    link.addListener("finish", function(shorturl){
      output = '\002' + reponame + ":\002 " + "\0037" + branch + "\0031 commits \002" + first_id + "..." + last_id + "\002 - " + shorturl;
      mybot.send(channel, output);
    });
  } 
};

/** An array of URL routes **/
var app_routes = [
  {
    // If URL path matches this RegExp
    regex: RegExp('^github'),
    // We pass the request to this module
    view: github.GitHub,
    // Which will output its data to this responder
    responder: hookResponder,    
  },
];

// Starting up an HTTP server to support our github module
var httpserver = http.createServer(function (request, response) {
  var content = "";
  request.addListener("body", function(chunk) {
    content += chunk;
  });
  request.addListener("complete", function() {
    // Route all requests to our lightweight
    // router.
    routes.route_message(app_routes, request, content);
    response.sendHeader(200, {"Content-Type": "text/plain"});
    response.sendBody("OK");
    response.finish();
  });
});

httpserver.listen(1234);
sys.puts('HTTP server running at http://0.0.0.0:1234/');
/** END GITHUB WEBHOOK SETUP **/

/** 
 * CRUISE BUILD SERVER MONITOR SETUP
 * 
 * Cruise is a build server and outputs an XML
 * feed of the statuses of its projects (building,
 * sleeping, failed, success, et cetera).
 *
 * The cruise module will poll the cctray.xml feed
 * you provide it on a regular interval and emits
 * started and finished events which you can
 * tap into.  Below is an example that ties into
 * these and outputs status information to the 
 * above bot with nice coloring.
 *
 **/
var cruise_url = 'http://myusername:mypassword@builds.mycompany.com:8153/cruise/cctray.xml';

// Instantiating a cruise instance with our XML feed,
// a polling interval, and a dictionary of projects
// you wish to monitor (case-sensitive).
var cruise = new cruise.Cruise(
  cruise_url,
  5*1000, // milliseconds between checks
  ['important-site :: build', 'important-site :: deploy',]
);

// Tie into the emitted events and do stuff with the data.
// The 'started' event emits a project name, we do some 
// colorized formatting and send an update to the bot.  Note
// you'll need to provide a hardcoded channel for now.
cruise.addListener("started", function(name) {
  mybot.send('#testingchannel', '\002build:\002\0037 ' + name + ' \0031begun');
});

// The finished event sends along the name, but also the
// status of the build which is either Success or Failure.
// We also send along a URL to the cruise page for this build.
// In the example below we calculate a tiny URL and only output
// it if the build failed.
cruise.addListener("finished", function(name, status, url) {
  var output = '\002build:\002 \0037' + name + '\0031 finished with: ';
  if(status == 'Success'){
    output += '\0033' + status.toLowerCase() + '\0031';
    // Must hardcode channel for now
    mybot.send('#testingchannel', output);    
  } else if (status == 'Failure') {
    link = new short.ShortLink(url);
    output += '\0034' + status.toLowerCase() + '\0031';
    func = function(output) {
      return function(shorturl){
        output += ' - ' + shorturl;
        mybot.send('#testingchannel', output);    
      };
    }(output);
    link.addListener("finish", func);
  }
});

cruise.get_feed(); // kicks it off
/** END CRUISE BUILD SERVER SETUP **/

/** BEGIN RESPONDERS AND LINK HARVESTER SETUP
 * This is a command list which is meant to be passed to
 * responders.route.  Each command has a regex which is
 * checked against each line.  
 *
 * If the line matches your regex, the router will store
 * the name of the channel that the command was issued 
 * from and pass the raw line to your view and store
 * your view's output.
 *
 * The view should output a list of lines.  The router 
 * will iterate over this list and send each one along
 * with the above channel to your responder function.
 *
 * In the below example we do nothing with the output
 * from push_link and we simply send the channel/line
 * combo to our IRC bot for get_links.
 **/
var commands = [
  {
    // Respond to this command
    regex: /\~links/,
    // Send raw line to this method
    view: links.get_links,
    // Send channel and view output to this method
    responder: function(channel, line){
      mybot.send(channel, line);
    },
    name: 'show links',
  },
  {
    regex: links.link_pattern, // We provide a nice link pattern
    view: links.push_link,
    responder: function(channel, line){
      // No output
    },
    name: 'capture links',
  },
]; 

/** 
 * You can wire up any number of custom responders that
 * follow the above pattern.
 **/


var ignores = [
  /annoyingperson/,
  /anotherbot/,
];
// Call responders.route on each line we recieve
// from the server.
mybot.addListener("receive", function(data){
  responders.route(commands, ignores, data);
});
/** END RESPONDERS AND LINK HARVESTER SETUP **/


process.addListener("SIGINT", function() {
  sys.puts("Quitting HTTP");
  httpserver.close();
  mybot.connection.close();
  process.exit();
});
