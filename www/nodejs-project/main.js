// Require the 'cordova-bridge' to enable communications between the
// Node.js app and the Cordova app.
const fs = require('fs')
const cordova = require('./cordova-bridge.js')
//const mkdirp = require('mkdirp')
//const { identity } = require('lodash')
const Debug = require('./debug')
let debug = new Debug(cordova, 'rfparty.nodejs')

let peer = null
let party = null
let config = null

let pendingQueryCount = 0

function reportStatus(){
  if(peer.comms.pending_calls != pendingQueryCount){
    pendingQueryCount = peer.comms.pending_calls
    cordova.channel.post('pending_calls', pendingQueryCount)
  }

  setTimeout(reportStatus, 500)
}

function mkdir(dir){
  try{
    fs.mkdirSync(dir)
  }
  catch(err){}
}

async function main(channel){
  
  debug.debug('starting')
  debug.debug('nodejs version - '+process.version)
  debug.debug('app datadir: '+cordova.app.datadir())
  


  try {
    debug.debug('api')
    const Dataparty = require('./dist/dataparty-embedded.js')
    debug.debug('model')
    const RFPartyModel = require('./party/xyz.dataparty.rfparty.dataparty-schema.json')

    debug.debug('config')

    const configPath = cordova.app.datadir()+'/config'
    config = new Dataparty.Config.JsonFileConfig({basePath: configPath})

    debug.debug('dbPath')
    const dbPath =  cordova.app.datadir() + '/rfparty-host-tingo'

    debug.debug('mkdirp', dbPath)
    mkdir(dbPath)
    debug.debug('db location: ' + dbPath)
    mkdir(configPath)
    debug.debug('config location: ' + configPath)


    /*channel.on('debug-settings', (settings)=>{
      debug.debug('applying global debug settings - ', settings)
    })*/

    
    debug.debug('config start')
    await config.start()


    debug.debug('tingoparty')
    party = new Dataparty.TingoParty({
      path: dbPath,
      noCache: true,
      model: RFPartyModel,
      config: config,
      qbOptions: {debounce: false, find_dedup:true, timeout: 30000}
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

    cordova.channel.once('identity', async (identity)=>{
      debug.debug('onidentity', typeof identity, identity)
      peer.comms.remoteIdentity = identity
      await peer.start()
  
      debug.debug('peer party started')
    })

    let compactStartMs = Date.now()
    debug.debug('compacting db started ...', new Date())
    await party.start()
    await party.db.compactDatabase()
    let compactEndtMs = Date.now()
    debug.debug('compacting db finished', compactEndtMs - compactStartMs, 'ms')


    reportStatus()
    //setInterval(()=>{
    //},500)

    debug.debug('started')

  } catch(err){
    debug.debug('app crash - '+err)

    throw err
  }

  cordova.app.on('pause', (pauseLock) => {
    debug.debug('app paused.');
    //pauseLock.release();
  })

  cordova.app.on('resume', () => {
    debug.debug('app resumed.');
  })


  debug.debug('waiting to party...')
  await peer.comms.authorized()
  debug.debug('authorized to party 😎')

  let handleError = (...err)=>{
    cordova.channel.send('error', err)
  }

  process.on('unhandledRejection', handleError)
  process.on('uncaughtException', handleError)

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
