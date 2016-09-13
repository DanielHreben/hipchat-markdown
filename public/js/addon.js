/* add-on script */

$(document).ready(function() {
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


  function sendNotification() {
    const getCurrentUser = () => {
      return new Promise((resolve, reject) => {
        HipChat.user.getCurrentUser((error, data) => {
          error ? reject(error) : resolve(data);
        });
      });
    };

    const authWithToken = () => {
      return new Promise((resolve, reject) => {
        HipChat.auth.withToken((error, data) => {
          error ? reject(error) : resolve(data);
        });
      });
    }

    return Promise.all([ getCurrentUser(), authWithToken() ])
    .then(([user, token]) => {
      return $.ajax({
        type: 'POST',
        url: '/send_notification',
        headers: {
          'Authorization': 'JWT ' + token
        },
        contentType: 'application/json',
        processData: false,
        data: JSON.stringify({
          user: user,
          message: simplemde.value()
        })
      });
    });

  }

  HipChat.register({
    "dialog-button-click": function(event, closeDialog) {
      Promise.resolve()
      .then(() => {
        if (event.action == "editor.dialog.action") {
          return sendNotification();
        }
      })
      .then(() => closeDialog(true))
      .catch(error => console.error(error));
    },
    "receive-parameters": function(parameters) {
      simplemde.value(parameters.source)
    }
  });

});