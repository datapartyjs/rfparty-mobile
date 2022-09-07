// Require the 'cordova-bridge' to enable communications between the
// Node.js app and the Cordova app.
const cordova = require('cordova-bridge')
const mkdirp = require('mkdirp')
//const { identity } = require('lodash')
const Debug = require('./debug')
let debug = new Debug(cordova, 'rfparty.nodejs')

let peer = null
let party = null
let config = null

async function main(channel){
  
  debug.debug('starting')
  debug.debug('nodejs version - '+process.version)
  debug.debug('app datadir: '+cordova.app.datadir())
  


  try {
    debug.debug('api')
    const Dataparty = require('@dataparty/api/dist/dataparty.js')
    debug.debug('model')
    const RFPartyModel = require('./party/xyz.dataparty.rfparty.dataparty-schema.json')

    debug.debug('config')

    const configPath = cordova.app.datadir()+'/config'
    config = new Dataparty.Config.JsonFileConfig({basePath: configPath})

    debug.debug('dbPath')
    const dbPath =  cordova.app.datadir() + '/rfparty-host-tingo'

    debug.debug('mkdirp', dbPath)
    mkdirp.sync(dbPath)
    debug.debug('db location: ' + dbPath)
    mkdirp.sync(configPath)
    debug.debug('config location: ' + configPath)



    
    debug.debug('config start')
    await config.start()


    debug.debug('tingoparty')
    party = new Dataparty.TingoParty({
      path: dbPath,
      model: RFPartyModel,
      config: config
    })

  
    debug.debug('peer party')
    peer = new Dataparty.PeerParty({
      comms: new Dataparty.Comms.LoopbackComms({
        host: true,
        channel: channel
      }),
      hostParty: party,
      model: RFPartyModel,
      config: config
    })



    debug.debug('load id')
    await party.loadIdentity()
    debug.debug('post id')
    cordova.channel.post('identity', party.identity)

    cordova.channel.on('identity', async (identity)=>{
      debug.debug('onidentity', typeof identity, identity)
      peer.comms.remoteIdentity = identity
      await peer.start()
  
      debug.debug('peer started')
    })

    debug.debug('started')

  } catch(err){
    debug.debug('app crash - '+err)

    throw err
  }

  cordova.app.on('pause', (pauseLock) => {
    debug.debug('app paused.');
    pauseLock.release();
  })

  cordova.app.on('resume', () => {
    debug.debug('app resumed.');
  })


  debug.debug('waiting to party...')
  await peer.comms.authorized()
  debug.debug('authorized to party 😎')

  /*await new Promise((resolve,reject)=>{
    console.log('for ever')
    setInterval(()=>{
      let p = peer
      debug.debug('keep alive', typeof p)
    }, 10000)
  })*/
}


main(cordova.channel).catch(err=>{
  cordova.channel.send('ERROR - main catch' + typeof err + err.stack + err +JSON.stringify(err,null,2))
}).then(()=>{
  cordova.channel.send('finished')
})