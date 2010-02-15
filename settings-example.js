var github = require('./lib/github'),
  cruise = require('./lib/cruise'),
  short = require('./lib/short'),
  routes = require('./lib/routes'),
  bot = require('./lib/bot'),
  http = require('http'),
  sys = require('sys');

var options = {
  servers: {
    'ars': {
      host: "irc.freenode.net",
      nick: "mylittlepony",
      port: 6667,
      user: "sarsbot 0 * :Sars Bot!",
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

var hookResponder = function(channel, data){
  var commits = {};

  try{
    reponame = data.repository.name;
  } catch(e) {
    return;
  }

  branch = data.ref.split('/').pop();

  if(data.commits.length > 1) { compact = true; }
  
  for(i=0;i<data.commits.length;i++){
    commit = data.commits[i];
    commits[commit.id] = '\002checkin to ' + reponame + ":\002 " + "\0037" + branch + " \0033" + commit.author.name + "\0031 * \002" + commit.id.slice(0,7) + "\002 (" + commit.modified.length + " files): " + commit.message;
    if(!compact) { 
      link = new short.ShortLink(commit.url);
      
      func = function(commit) {
        return function(shorturl){
          commits[commit.id] += ' - ' + shorturl;
          mybot.send(channel, commits[commit.id]);
        };
      }(commit);
      
      link.addListener("finish", func);

    } else {
      mybot.send(channel, commits[commit.id]);
    }
  }

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

var app_routes = [
  {
    regex: RegExp('^github'),
    view: github.GitHub,
    responder: hookResponder,    
  },
];

var cruise_url = 'http://myusername:mypassword@builds.mycompany.com:8153/cruise/cctray.xml';

var httpserver = http.createServer(function (request, response) {
  var content = "";
  request.addListener("body", function(chunk) {
    content += chunk;
  });
  request.addListener("complete", function() {
    routes.route_message(app_routes, request, content);
    response.sendHeader(200, {"Content-Type": "text/plain"});
    response.sendBody("OK");
    response.finish();
  });
});

var cruise = new cruise.Cruise(
  cruise_url,
  5*1000, // seconds between checks
  ['important-site :: build', 'important-site :: deploy',]
);

cruise.addListener("started", function(name) {
  mybot.send('#testingchannel', '\002build:\002\0037 ' + name + ' \0031begun');
});

cruise.addListener("finished", function(name, status, url) {
  var output = '\002build:\002 \0037' + name + '\0031 finished with: ';
  if(status == 'Success'){
    output += '\0033' + status.toLowerCase() + '\0031';
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

routes.setup_views(app_routes, function(channel, line) {
  mybot.send(channel, line);
});

mybot.connect();
httpserver.listen(1234);
sys.puts('Server running at http://127.0.0.1:1234/');
cruise.get_feed(); // kicks it off

process.addListener("SIGINT", function() {
  sys.puts("Quitting HTTP");
  httpserver.close();
  mybot.connection.close();
  process.exit();
});
