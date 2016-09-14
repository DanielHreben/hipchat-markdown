const http = require('request');
const cors = require('cors');
const uuid = require('uuid');
const url  = require('url');
const md   = require('markdown-it')();

// This is the heart of your HipChat Connect add-on. For more information,
// take a look at https://developer.atlassian.com/hipchat/tutorials/getting-started-with-atlassian-connect-express-node-js
module.exports = function(app, addon) {
  let hipchat = require('../lib/hipchat')(addon);

  // simple healthcheck
  app.get('/healthcheck', function(req, res) {
    res.send('OK');
  });

  // Root route. This route will serve the `addon.json` unless a homepage URL is
  // specified in `addon.json`.
  app.get('/',
    function(req, res) {
      // Use content-type negotiation to choose the best way to respond
      res.format({
        // If the request content-type is text-html, it will decide which to serve up
        'text/html': function() {
          let homepage = url.parse(addon.descriptor.links.homepage);
          if (homepage.hostname === req.hostname && homepage.path === req.path) {
            res.render('homepage', addon.descriptor);
          } else {
            res.redirect(addon.descriptor.links.homepage);
          }
        },
        // This logic is here to make sure that the `addon.json` is always
        // served up when requested by the host
        'application/json': function() {
          res.redirect('/atlassian-connect.json');
        }
      });
    }
  );

  // This is an example dialog controller that can be launched when clicking on the glance.
  // https://developer.atlassian.com/hipchat/guide/dialog-and-sidebar-views/dialog
  app.get('/dialog',
    addon.authenticate(),
    function(req, res) {
      res.render('dialog', {
        identity: req.identity
      });
    }
  );

  // Sample endpoint to send a card notification back into the chat room
  // See https://developer.atlassian.com/hipchat/guide/sending-messages
  app.post('/send_notification',
    addon.authenticate(),
    function(req, res) {

      let source = req.body.message.trim()
      let message = md.render(source);

      // console.log('req.body.message', req.body.message);
      // console.log('message', message);

      let options = JSON.stringify({
        parameters: {
          source: source
        }
      });

      let value = `<a href='#' data-target='editor.dialog' data-target-options='${options}'>Open in editor</a>`;

      let card = {
        "style": "application",
        "id": uuid.v4(),
        "title": "View source markdown",
        "description": {
          "format": "html",
          "value": value
        },
        "activity": {
          "html": `<img src=${req.body.user.photo_url} width=32px heigth=32px> <b>${req.body.user.name}</b>
          posts this message using hipchat markdown
          <br>
          <br>
          ${message}`
        }
      };

      let opts = {
        'options': {
          'color': 'gray'
        }
      };

      hipchat
        .sendMessage(req.clientInfo, req.identity.roomId, message, opts, card)
        .then(response => {
          res.json({
            status: "ok"
          });
        })
        .catch(err => cconsole.log(err));
    }
  );

  // This is an example route to handle an incoming webhook
  // https://developer.atlassian.com/hipchat/guide/webhooks
  app.post('/webhook',
    addon.authenticate(),
    function(req, res) {
      const pattern = /^(\/code md|\/md|\/markdown)[\s\n]([\s\S]*)/i;

      let [message, command, body] = req.body.item.message.message.match(pattern);

      if (!command || !body) {
        return res.sendStatus(200);
      }

      let result = md.render(body);

      hipchat.sendMessage(req.clientInfo, req.identity.roomId, result, {
        options: {
          attach_to: req.body.item.message.id
        }
      })
      .then(data => {
        res.sendStatus(200);
      });
    }
  );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function(clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' add-on has been installed in this room');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function(id) {
    addon.settings.client.keys(id + ':*', function(err, rep) {
      rep.forEach(function(k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

};
