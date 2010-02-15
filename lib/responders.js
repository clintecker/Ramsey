var utils = require('utils'),
    sys = require('sys');

channel_pat = new RegExp('PRIVMSG #(.*)? :');

exports.route = function(commands, ignores, line){
  for(i=0;i<ignores.length;i++){
    if(line.match(ignores[i])) { return }
  }

  match = line.match(channel_pat);
  channel = match ? match[1] : null;
  if(!channel){return;}
  for(i=0;i<commands.length;i++){
    command = commands[i];
    if(line.match(command.regex)) {
      output = command.view(line);
      for(j=0;j<output.length;j++){
        command.responder('#'+channel, output[j]);
      }
    }
  }
};
