
import {MainWindow} from './main-window'

import { RFParty } from './rfparty'

const JSONPath = require('jsonpath-plus').JSONPath



window.JSONPath = JSONPath
window.rfparty = null
window.RFParty = RFParty
window.MainWindow = MainWindow

const Dataparty = require( '@dataparty/api/src/index-browser' )
const BouncerModel = require('@dataparty/bouncer-model/dist/bouncer-model.json')

window.Dataparty = Dataparty

function channelListener(msg) {
  console.log('[cordova] received:' + msg);
}

function ondebug(msg){
  console.log(msg)
}

function onerror(msg){
  console.log('error', msg)
  console.error(msg)
}

nodejs.channel.setListener(channelListener)
nodejs.channel.on('debug', ondebug)
nodejs.channel.on('error', onerror)


async function main(channel){
  console.log('app.js - main()')

  try{
    await MainWindow.onload('map', channel)
  }
  catch(err){
    console.log('error', err)
  }

}


async function ready() {

  try{
    await main(nodejs.channel).catch(err=>{
      console.log('ERROR - app.js main catch' + JSON.stringify(err,null,2), err)
    }).then(()=>{
      console.log('finished app.js')
    })
  }catch(err){
    console.error('exception', err)
  }
};


document.addEventListener("deviceready", ready, false);