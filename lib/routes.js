var sys = require('sys');

// When a request comes in, we clean off the first
// slash, check our routes.  If the request URL matches
// a view, we stash to part of the request URL that wasn't
// a part of your regexp in request.path and we call your
// already instantiated views with the request and the
// request's content.
this.route_message = function(routes, request, content) {
  var url = request.url.slice(1), view;
  for(i=0;i<routes.length;i++){
    route = routes[i];
    if(route.regex.exec(url)) {
      request.path = url.replace(route.regex, '');
      route.view(request, content, route.responder);
    }
  }
};

// Attach listeners to views so they're ready
//  to go when a request come in.  Views will
//  emit "line" events which also output a
//  "channel" and "msg" data pair.  The lineResponder
//  you attach here could take that data and pass
//  it to a bot, for example.
this.setup_views = function(routes, lineResponder) {
  for(i=0;i<routes.length;i++){
    route = routes[i];
    // We'll instantiate a new instance of your view
    //  with no params.  You can check for the absence
    //  of params and do some setup, for example and
    //  then return.
    route.view = new route.view();
    route.view.addListener("line", lineResponder);
    sys.puts("listener added to " + route.regex);
  }
}
