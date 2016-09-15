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
  const storageKey = 'hipchat-markdown';

  let simplemde = new SimpleMDE({
    element: document.getElementById('mdEditor'),
    autofocus: true,
    blockStyles: {
      bold: '__',
      italic: '_'
    },
    initialValue: localStorage.getItem(storageKey),
    showIcons: ['code', 'table'],
    hideIcons: ['quote', 'heading']
  });

  simplemde.toggleSideBySide();

  HipChat.register({
    'dialog-button-click': (event, closeDialog) => {
      Promise.resolve()
      .then(() => {
        let notification = simplemde.value();

        if (event.action != 'editor.dialog.action') {
          return localStorage.setItem(storageKey, notification);
        }

        return sendNotification(notification)
        .then(() => localStorage.removeItem(storageKey));
      })
      .then(() => closeDialog(true))
      .catch(error => console.error(error));
    }
  });
});