/**
 * Links module
 *
 * This module implements two methods which you can
 * wire together in your settings.js to capture and
 * display links seen in a channel.  This module
 * is built to accomodate responding to commands seen
 * in a channel, here's an example of how to wire 
 * these method up in your command responders config:
 * 
 * var commands = [
 *  {
 *     regex: /\~links/, // Command to respond to
 *     view: links.get_links, // Call this view
 *     responder: function(channel, line){
 *       mybot.send(channel, line); // How you want to handle output
 *     },
 *     name: 'show links',
 *   },
 *   {
 *     regex: links.link_pattern, // Respond to links
 *     view: links.push_link, // Use our link harvester
 *     responder: function(channel, line){
 *       // No output
 *     },
 *     name: 'capture links',
 *   },
 * ];
 *
 * Pass this into the responders.route when your bot (or whatever)
 * gets a new line.  responders.route will parse out the channel,
 * and route it back, if you want to go that route.
 * 
 **/

// for now we just store a running list of links in an 
// in-memory array
seen_links = [
];

// Our link pattern courtesy of Mr. John Gruber
exports.link_pattern = new RegExp(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.])(?:[^\s()<>]+|\([^\s()<>]+\))+(?:\([^\s()<>]+\)|[^`!()\[\]{};:'".,<>?«»“”‘’\s]))/i);

// Route to this method to store a link
exports.push_link = function(line){
  var link = line.match(exports.link_pattern);
  seen_links.push(link[0]);
  return link[0];
};

// Route your links command to this method. Called naked
// it will output the last 5 links in seen_links.
//
// You can also call your command with -n <number> to
// output an arbitary number of links.
//
// You can also call it with -q <RegExp pattern> to output
// a list of links which match said pattern.
exports.get_links = function(line){
  var search = line.match(/\-q (.*)?/),
    output = [];

  if(!search){
    // how many items to return?
    len = line.match(/\-n (\d+)/);
    if(len) { len = len[1] };
    // Default to 5 links
    len = len||5;
    if(len>seen_links.length){ len=seen_links.length; }
    if(seen_links.length){
      output = ['Last '+len+' links seen in this channel ('+seen_links.length+'):',];
      slice = seen_links.slice(seen_links.length-len, seen_links.length);
      reversed = slice.reverse();
      combined = output.concat(slice);
      return combined;
    } else {
      return ["I ain't seen no links",];
    }
  } else {
    pat = new RegExp(search[1]);
    output = ["Links that match '" + search[1] + "'",];
    for(i=0;i<seen_links.length;i++){
      if(seen_links[i].match(pat)) {
        output.push(seen_links[i]);
      }
    }
    return output;
  }
};
