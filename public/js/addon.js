/* add-on script */
'use strict';

function getCurrentUser() {
  return new Promise((resolve, reject) => {
    HipChat.user.getCurrentUser((error, data) => {
      error ? reject(error) : resolve(data);
    });
  });
};

function authWithToken() {
  return new Promise((resolve, reject) => {
    HipChat.auth.withToken((error, data) => {
      error ? reject(error) : resolve(data);
    });
  });
}

function sendNotification(notification) {
  return Promise.all([ getCurrentUser(), authWithToken() ])
  .then(([user, token]) => {
    return fetch('/send_notification', {
      method: 'POST',
      headers: {
        'Authorization': 'JWT ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user: user,
        message: notification
      })
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  let simplemde = new SimpleMDE({
    element: document.getElementById('mdEditor'),
    autofocus: true,
    blockStyles: {
      bold: '__',
      italic: '_'
    },
    showIcons: ['code', 'table'],
    hideIcons: ['quote', 'heading']
  });

  HipChat.register({
    'dialog-button-click': function(event, closeDialog) {
      Promise.resolve()
      .then(() => {
        if (event.action == 'editor.dialog.action') {
          return sendNotification(simplemde.value());
        }
      })
      .then(() => closeDialog(true))
      .catch(error => console.error(error));
    },
    'receive-parameters': function(parameters) {
      simplemde.value(parameters.source)
    }
  });
});