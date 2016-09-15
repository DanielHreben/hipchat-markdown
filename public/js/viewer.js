/* add-on script */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  let simplemde = new SimpleMDE({
    element: document.getElementById('mdEditor'),
    autofocus: true,
    blockStyles: {
      bold: '__',
      italic: '_'
    },
    toolbar: [{
      name: "preview",
      action: SimpleMDE.togglePreview,
      className: "fa fa-eye no-disable",
      title: "Toggle Preview",
    }, {
      name: "side-by-side",
      action: SimpleMDE.toggleSideBySide,
      className: "fa fa-columns no-disable no-mobile",
      title: "Toggle Side by Side",
    }, {
      name: "fullscreen",
      action: SimpleMDE.toggleFullScreen,
      className: "fa fa-arrows-alt no-disable no-mobile",
      title: "Toggle Fullscreen",
    }],
  });

  // document.querySelector(".CodeMirror.cm-s-paper").style['pointer-events'] = 'none';

  simplemde.toggleSideBySide();
  simplemde.toggleFullScreen();


  HipChat.register({
    'dialog-button-click': (event, closeDialog) => {
      closeDialog(true);
    },
    'receive-parameters': (parameters) => {
      simplemde.value(parameters.source)
    }
  });
});