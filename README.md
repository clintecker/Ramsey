Ramsey: a node.js IRC bot
=========================

Ramsey is a loosely coupled set of libraries which can be tied together
to create a useful IRC bot.  This project contains the tools and modules
for the following:

  * Connecting to an IRC network (bot.js)
  * Lightweight routing of HTTP requests to views (routes.js)
  * Processing Service Hooks from Github (github.js)
  * Monitoring the status of a Cruise build server (cruise.js)
  * Responding to commands from an IRC channel (responder.js)
  * Simple link harvester and query module command (links.js)

The above modules were developed to be tied together as a cohesive IRC
bot for use in a devleopment channel, hence the initial
focus on recieving and outputting service hooks from Github projects and
displaying the status of our builds out of Cruise.

Basically, an individual would instantiate these modules and tie them
together with the supplied callbacks and listeners.  I've included a
``settings-example.js`` file which demonstrates how to use all of the
included modules to create a bot identical to the one we use at Ars.

This however, shouldn't stop you from creating your own modules, command
responders, tieing the modules together in new ways, or snatching any of
the included modules or code from those modules for use in your own,
non-IRC related node.js projects!

Once you've got a settings.js file all ready to go, all you do is
simply execute the file:

``node settings.js``

And you're set!

## Caveats ##

The are a few IRC level functions that this bot doesn't yet support.
There are also some that it does.  The bot was developed for use in a
specific setting, so I've only implemented those functions I needed.
These are:

* Connecting to passworded channels
* Connecting to multiple channels

Things the bot cannot do yet are:

* Connecting to multiple servers
* Interact with private messages
* Connect to passworded servers
* Natively handle anything remotely complex on the IRC side, although there's nothing to stop a sufficiently motivated programmer from adding support for setting modes, topics, and bans using the command responder modules.
