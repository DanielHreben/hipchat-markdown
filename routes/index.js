var http = require('request');
var cors = require('cors');
var uuid = require('uuid');
var url = require('url');
const md = require('markdown-it')();

// This is the heart of your HipChat Connect add-on. For more information,
// take a look at https://developer.atlassian.com/hipchat/tutorials/getting-started-with-atlassian-connect-express-node-js
module.exports = function (app, addon) {
  var hipchat = require('../lib/hipchat')(addon);

  // simple healthcheck
  app.get('/healthcheck', function (req, res) {
    res.send('OK');
  });

  // Root route. This route will serve the `addon.json` unless a homepage URL is
  // specified in `addon.json`.
  app.get('/',
    function (req, res) {
      // Use content-type negotiation to choose the best way to respond
      res.format({
        // If the request content-type is text-html, it will decide which to serve up
        'text/html': function () {
          var homepage = url.parse(addon.descriptor.links.homepage);
          if (homepage.hostname === req.hostname && homepage.path === req.path) {
            res.render('homepage', addon.descriptor);
          } else {
            res.redirect(addon.descriptor.links.homepage);
          }
        },
        // This logic is here to make sure that the `addon.json` is always
        // served up when requested by the host
        'application/json': function () {
          res.redirect('/atlassian-connect.json');
        }
      });
    }
    );

  // This is an example route that's used by the default for the configuration page
  // https://developer.atlassian.com/hipchat/guide/configuration-page
  app.get('/config',
    // Authenticates the request using the JWT token in the request
    addon.authenticate(),
    function (req, res) {
      // The `addon.authenticate()` middleware populates the following:
      // * req.clientInfo: useful information about the add-on client such as the
      //   clientKey, oauth info, and HipChat account info
      // * req.context: contains the context data accompanying the request like
      //   the roomId
      res.render('config', req.context);
    }
    );

  // This is an example glance that shows in the sidebar
  // https://developer.atlassian.com/hipchat/guide/glances
  app.get('/glance',
    cors(),
    addon.authenticate(),
    function (req, res) {
      res.json({
        "label": {
          "type": "html",
          "value": "Hello World!"
        },
        "status": {
          "type": "lozenge",
          "value": {
            "label": "NEW",
            "type": "error"
          }
        }
      });
    }
    );

  // This is an example end-point that you can POST to to update the glance info
  // Room update API: https://www.hipchat.com/docs/apiv2/method/room_addon_ui_update
  // Group update API: https://www.hipchat.com/docs/apiv2/method/addon_ui_update
  // User update API: https://www.hipchat.com/docs/apiv2/method/user_addon_ui_update
  app.post('/update_glance',
    cors(),
    addon.authenticate(),
    function (req, res) {
      res.json({
        "label": {
          "type": "html",
          "value": "Hello World!"
        },
        "status": {
          "type": "lozenge",
          "value": {
            "label": "All good",
            "type": "success"
          }
        }
      });
    }
    );

  // This is an example sidebar controller that can be launched when clicking on the glance.
  // https://developer.atlassian.com/hipchat/guide/dialog-and-sidebar-views/sidebar
  app.get('/sidebar',
    addon.authenticate(),
    function (req, res) {
      res.render('sidebar', {
        identity: req.identity
      });
    }
    );

  // This is an example dialog controller that can be launched when clicking on the glance.
  // https://developer.atlassian.com/hipchat/guide/dialog-and-sidebar-views/dialog
  app.get('/dialog',
    addon.authenticate(),
    function (req, res) {
      res.render('dialog', {
        identity: req.identity
      });
    }
    );

  // Sample endpoint to send a card notification back into the chat room
  // See https://developer.atlassian.com/hipchat/guide/sending-messages
  app.post('/send_notification',
    addon.authenticate(),
    function (req, res) {

      let source  = req.body.message.trim()
      let message = md.render(source);

      console.log('req.body.message', req.body.message);
      console.log('message', message);

      let options = JSON.stringify({
        // options: {
        //   title: "aaaaaaa"
        // },
        parameters: {
          source: source
        }
      });

      let value = `<a href='#' data-target='sample.dialog' data-target-options='${options}'>Open in editor</a>`;
      console.log(value);

      var card = {
        "style": "application",
        // "url": "hipchat://"+req.body.user.mention_name,
        "id": uuid.v4(),
        // "format": "small",
        // "title": req.body.user.name,
        "title": "View source markdown",
        "description": {
          "format": "html",
          "value": value
        },
        // "icon": {
        //   "url": req.body.user.photo_url
        // },
        // "attributes": [{
        //   "label": "attribute1",
        //   "value": {
        //     "label": "value1"
        //   }
        // }, {
        //   "label": "attribute2",
        //   "value": {
        //     "icon": {
        //       "url": "http://bit.ly/1S9Z5dF"
        //     },
        //     "label": "value2",
        //     "style": "lozenge-complete"
        //   }
        // }],
        "activity": {
          "html": `<img src=${req.body.user.photo_url} width=32px heigth=32px> <b>${req.body.user.name}</b>
          posts this message using hipchat markdown
          <br>
          <br>
          ${message}`
        }
      };

      var opts = { 'options': { 'color': 'gray' } };

      hipchat
      .sendMessage(req.clientInfo, req.identity.roomId, message, opts, card)
      .then(response => {
        // console.log('reponse', response);

        res.json({ status: "ok" });
      })
      .catch(err => cconsole.log(err));
    }
  );

  // This is an example route to handle an incoming webhook
  // https://developer.atlassian.com/hipchat/guide/webhooks
  app.post('/webhook',
    addon.authenticate(),
    function (req, res) {
      const pattern = /^(\/code md|\/md|\/markdown)[\s\n]([\s\S]*)/i;


      // console.log('req.body.item.message.message', req.body.item.message.message);

      let [message, command, body] = req.body.item.message.message.match(pattern);
      // console.log(req.body.item.message);
      // console.log('message', message);
      // console.log('command', command);
      // console.log('body', body);

      if (!command || !body) {
        return res.sendStatus(200);
      }


      let result = md.render(body);

      // console.log(result);

      // console.log('render message', req.body.item.message.id, '; result', result);

      hipchat.sendMessage(req.clientInfo, req.identity.roomId, result, {options: {attach_to: req.body.item.message.id}})
        .then(function (data) {
          res.sendStatus(200);
        });
    }
    );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function (clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' add-on has been installed in this room');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function (id) {
    addon.settings.client.keys(id + ':*', function (err, rep) {
      rep.forEach(function (k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

};
