
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

  let config = new Dataparty.Config.LocalStorageConfig({basePath:'rfparty'})

  let comms = new Dataparty.Comms.LoopbackComms({
    channel: channel
  })

  let peer = new Dataparty.PeerParty({
    comms: comms,
    model: BouncerModel,
    config: config
  })





  console.log('starting nodejs')
  let nodejsStart = new Promise((resolve, reject)=>{
    nodejs.start('main.js', (err)=>{
      if(err){ reject(err) }
      else { resolve() }
    })
  })

  await nodejsStart
  console.log ('nodejs Mobile Engine Started')

  await config.start()
  await peer.loadIdentity()

  channel.post('identity', peer.identity)

  channel.on('identity', async (identity)=>{
    console.log('onidentity', identity)
    peer.comms.remoteIdentity = identity
    await peer.start()

    console.log('peer started')
  })

  console.log('waiting to party...')
  await peer.comms.authorized()
  console.log('authorized to party 😎')

  let user = (await peer.find()
    .type('user')
    .where('name').equals('tester')
    .exec())[0]


  if(!user){
    console.log('creating document')
    user = await peer.createDocument('user', {name: 'tester', created: (new Date()).toISOString() })
  }
  else{
    console.log('loaded document')
  }
    

  console.log(user.data)

}


async function ready() {

  try{
    await main(nodejs.channel).catch(err=>{
      console.log('ERROR - app.js main catch' + JSON.stringify(err,null,2))
    }).then(()=>{
      console.log('finished app.js')
    })
  }catch(err){
    console.error('exception', err)
  }
};


document.addEventListener("deviceready", ready, false);