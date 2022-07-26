import {MainWindow} from './main-window'

import { RFParty } from './rfparty'

const JSONPath = require('jsonpath-plus').JSONPath



window.JSONPath = JSONPath
window.rfparty = null
window.RFParty = RFParty
window.MainWindow = MainWindow

function channelListener(msg) {
  console.log('[cordova] received:' + msg);
}

function startupCallback(err) {
  if (err) {
      console.log(err);
  } else {
      console.log ('Node.js Mobile Engine Started');
      nodejs.channel.send('Hello from Cordova!');
  }
};

function startNodeProject() {
  nodejs.channel.setListener(channelListener);
  nodejs.start('main.js', startupCallback);
  // To disable the stdout/stderr redirection to the Android logcat:
  // nodejs.start('main.js', startupCallback, { redirectOutputToLogcat: false });
};


document.addEventListener("deviceready", startNodeProject, false);