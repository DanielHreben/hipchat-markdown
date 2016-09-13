/* add-on script */

$(document).ready(function () {
  var simplemde = new SimpleMDE({
    element: $("#mdEditor")[0],
    autofocus: true,
    blockStyles: {
        bold: "__",
        italic: "_"
    },
    showIcons: ["code", "table"],
    hideIcons: ["quote", "heading"]
  });


  // The following functions use the HipChat Javascript API
  // https://developer.atlassian.com/hipchat/guide/javascript-api

  //To send a message to the HipChat room, you need to send a request to the add-on back-end
  function sayHello(callback) {
    HipChat.user.getCurrentUser(function (err, user) {
      if (err) {
        console.error(error);
        return;
      }

      //Ask HipChat for a JWT token
      HipChat.auth.withToken(function (err, token) {
        if (err) {
          console.error(error);
          return;
        };

        //Then, make an AJAX call to the add-on backend, including the JWT token
        //Server-side, the JWT token is validated using the middleware function addon.authenticate()
        $.ajax({
          type: 'POST',
          url: '/send_notification',
          headers: {'Authorization': 'JWT ' + token},
          contentType: 'application/json',
          processData: false,
          data: JSON.stringify({
            user:    user,
            message: simplemde.value()
          }),
          success: function () {
            callback(false);
          },
          error: function () {
            callback(true);
          }
        });
      });
    });


  }

  /* Functions used by sidebar.hbs */

  $('#say_hello').on('click', function () {
    sayHello(function (error) {
      if (error)
        console.log('Could not send message');
    });
  });

  $('#show-room-details').on('click', function (e) {
    HipChat.room.getRoomDetails(function (err, data) {
      if (!err) {
        $('#more-room-details-title').html('More details');
        $('#more-room-details-body').html(JSON.stringify(data, null, 2));
      }
    });
    e.preventDefault();
  });

  $('#show-room-participants').on('click', function (e) {
    HipChat.room.getParticipants(function (err, data) {
      if (!err) {
        $('#room-participants-title').html('Room participants');
        $('#room-participants-details').html(JSON.stringify(data, null, 2));
      }
    });
    e.preventDefault();
  });

  $('#show-user-details').on('click', function (e) {

    HipChat.user.getCurrentUser(function (err, data) {
      if (!err) {
        $('#more-user-details-title').html('User details');
        $('#more-user-details-body').html(JSON.stringify(data, null, 2));
      }
    });
    e.preventDefault();
  });


  /* Functions used by dialog.hbs */

  //Register a listener for the dialog button - primary action "say Hello"
  HipChat.register({
    "dialog-button-click": function (event, closeDialog) {
      if (event.action === "editor.dialog.action") {
        //If the user clicked on the primary dialog action declared in the atlassian-connect.json descriptor:
        sayHello(function (error) {
          if (!error)
            closeDialog(true);
          else
            console.log('Could not send message');
        });
      } else {
        //Otherwise, close the dialog
        closeDialog(true);
      }
    },
    "receive-parameters": function(parameters) {
      simplemde.value(parameters.source)
    }
  });

});