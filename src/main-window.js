
const xmljs = require('xml-js')

import { RFParty } from './rfparty'
import {LoadingProgress} from './loading-progress'
import { stringify } from 'json5'

import { GapParser } from './gap-parser'
const Loki = require('lokijs')
const LokiIndexAdapter = require('lokijs/src/loki-indexed-adapter')

const Debug = require('debug')
const debug = Debug('MainWindow')
const onLocationDebug = Debug('geolocation')
const moment = require('moment')



const Dataparty = require( '@dataparty/api/src/index-browser' )
const RFPartyModel = require('../dataparty/xyz.dataparty.rfparty.dataparty-schema.json')

const RFPartyDocuments = require('./documents')

//const BouncerModel = require('@dataparty/bouncer-model/dist/bouncer-model.json')

/*function debug(...args){
  debug('MainWindow -', ...args)
}*/

const byteToHex = [];
for(let n=0; n<0xff; ++n){
  const hexOctet = n.toString(16).padStart(2, '0')
  byteToHex.push(hexOctet)
}

function hexString(arrayBuffer){
  const buf = new Uint8Array(arrayBuffer)
  const hexOctets = [];

  for(let i=0; i<buf.length; i++){
    hexOctets.push( byteToHex[ buf[i] ] )
  }

  return hexOctets.join('')
}

const SearchSuggestions = {
  help: false,
  address: 'mac',
  here: false,
  name: true,
  company: true,
  product: true,
  service: ['name','0x...', 'company', 'product'],
  unknown: false,
  'unknown-service': false,
  appleip: 'ip',
  random: false,
  public: false,
  connectable: false,
  duration: ['period'],
  error: false
}

window.lastScanStart = moment().subtract(10, 'minutes')
window.isScanning = false

window.locations = []
window.advertisements = {}
window.seen_macs = {}

window.printBle = function (){


  for(let mac in window.advertisements){
    const station = window.advertisements[mac]

    //const buffer = Buffer.from( station.advertising.data, 'base64' )
    
    debug(station)

    const fields = GapParser.parseBase64String( station.advertising.data ) 

    debug( fields )

    //debug('\t', buffer.toString('hex'))
  }
}


export class MainWindow {

  static get scanWindow() {
    return 60000
  }

  static async onload(divId, channel) {
    debug('RFParty.onload')
    window.rfparty = new RFParty(divId)

    const form = document.getElementsByName('setupForm')[0]
    form.addEventListener('submit', MainWindow.startSession);

    const versionText = document.getElementById('version-text')
    versionText.innerText = 'v' + RFParty.Version


    await MainWindow.setupSession(channel)
  }

  static hideDiv(divId){ return MainWindow.addRemoveClass(divId, 'add', 'hidden') }

  static showDiv(divId){ return MainWindow.addRemoveClass(divId, 'remove', 'hidden') }


  static addRemoveClass(divId, addRemove='add', className='hidden', display='block'){
    var div = document.getElementById(divId)

    //debug('div', addRemove, className, div)
    
    if(addRemove==='remove'){
      div.classList.remove(className)
      
      if(className=='hidden'){
        div.style.display = display
      }
      //debug('remove')
    }
    else{
      //debug('add')
      
      if(className=='hidden'){
        div.style.display = "none";
      }
      div.classList.add(className)
    }

  }

  static openSetupForm() {
    MainWindow.showDiv('setup-modal')
    MainWindow.showDiv('modal-shadow')
    MainWindow.showDiv('logo')
    MainWindow.showDiv('center-modal', 'remove', 'hidden', 'flex')

  }

  static closeSetupForm() {
    if (window.rfparty == null) {
      return
    }
    

    MainWindow.hideDiv('center-modal')
    MainWindow.hideDiv('logo')
    MainWindow.hideDiv('setup-modal')
    
  }

  static openLoading(){
    MainWindow.showDiv('modal-shadow')
    MainWindow.showDiv('center-modal', 'remove', 'hidden', 'flex')
    MainWindow.showDiv('logo')
    MainWindow.showDiv('loading-bar')

    MainWindow.addRemoveClass('logo', 'add', 'rainbow-busy')

    window.loadingState = new LoadingProgress()

    window.loadingState.on('step-start', (name)=>{
      document.getElementById('loading-details').value = window.loadingState.toString()
    })

    window.loadingState.on('step-progress', (name)=>{
      document.getElementById('loading-details').value = window.loadingState.toString()
      document.getElementById('loading-value').innerText=''+ Math.round(progress*100)
      document.getElementById('loading-progress-bar').value= progress*100
    })

    window.loadingState.on('step-complete', (name)=>{
      document.getElementById('loading-details').value = window.loadingState.toString()
    })

    window.loadingState.on('progress', (progress)=>{
      document.getElementById('loading-value').innerText=''+ Math.round(progress*100)
      document.getElementById('loading-progress-bar').value= progress*100
    })
  }

  static closeLoading(){

    MainWindow.addRemoveClass('center-modal', 'add', 'fadeOut')

    setTimeout(()=>{      
      MainWindow.hideDiv('center-modal')
      MainWindow.hideDiv('logo')
      MainWindow.hideDiv('modal-shadow')
      MainWindow.hideDiv('loading-bar')
      MainWindow.addRemoveClass('logo', 'remove', 'rainbow-busy')
    }, 2000)

  }

  static async startSession(event) {
    if(event){
      event.preventDefault()
    }
    debug('startSession')


    MainWindow.closeSetupForm()
    MainWindow.openLoading()


    await MainWindow.setupSession()

    MainWindow.closeLoading()
  }

  static async delay(ms=100){
    return new Promise((resolve, reject)=>{
      setTimeout(resolve, ms)
    })
  }

  static async onLocation(location){
    onLocationDebug('location', location)

    const point = {
      time: moment(location.time).valueOf(),
      accuracy: location.accuracy,
      altitude: location.altitude,
      bearing: location.bearing,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
    
      isStationary: location.isStationary ? true : false,
      
      provider: location.provider,
      locationProvider: location.locationProvider,
      isFromMockProvider: location.isFromMockProvider ? true : undefined,
      mockLocationsEnabled: location.mockLocationsEnabled ? true : undefined,
    }


    window.rfparty.indexLocation(point)
    MainWindow.scanLoop()
  }

  static async onBleDevice(dev){
    debug('device', dev)

    
    window.rfparty.indexDevice(dev)
    MainWindow.scanLoop()
  }

  static get Permissions(){
    return [
      cordova.plugins.permissions.ACCESS_FINE_LOCATION,
      cordova.plugins.permissions.ACCESS_COARSE_LOCATION,
      cordova.plugins.permissions.ACTIVITY_RECOGNITION,
      cordova.plugins.permissions.ACCESS_BACKGROUND_LOCATION,
      cordova.plugins.permissions.WAKE_LOCK,
      //cordova.plugins.permissions.BLUETOOTH_SCAN
    ]
  }

  static async hasPermission(perm){
    return new Promise( (resolve,reject)=>cordova.plugins.permissions.checkPermission(perm, resolve, reject) )
  }

  static async requestPermissions(perms){
    debug('requesting permissions', perms)

    let result = []

    for(let perm of perms){

      debug('requesting permission', perm)

      let req = await new Promise((resolve,reject)=>
        cordova.plugins.permissions.requestPermission(perm, resolve, reject))
   

      result.push({ permission:perm , ... req})
    }

    return result
    
  }

  static async isLocationEnabled(){

    try{ 
      let geoEA = new Promise((resolve,reject)=>{ble.isLocationEnabled(resolve,reject) })
      await geoEA
    }
    catch(err){ return false }

    return true
  }

  static async isBleEnabled(){
    try{ await ble.withPromises.isEnabled() }
    catch(err){ return false }

    return true
  }

  static async checkPermissions(){
    debug('checkPermissions - ', MainWindow.Permissions)
    let needs = []
    for(let perm of MainWindow.Permissions){
      if(! (await MainWindow.hasPermission(perm)).hasPermission){
        needs.push( perm )
      }
    }

    debug('needs permissions', needs)

    if(needs.length > 0){
      let request = await MainWindow.requestPermissions(needs)

      //if(!request.hasPermission){
        debug('permissions request result')
        debug( JSON.stringify(request, null, 2))
      //}
    }


  }

  static async setupBlePermissions(){
    debug('setupBlePermissions')
    const bluetoothSetup = await MainWindow.isBluetoothSetup()
    if( !bluetoothSetup ){
      debug('setupBlePermissions - setting permissions')
      await MainWindow.setupBluetoothPermissions()
    }

    if(! (await MainWindow.isBleEnabled()) ){
      debug('setupBlePermissions - enabling BLE hw programtically')
      await ble.withPromises.enable()
    }

    cordova.plugins.diagnostic.registerBluetoothStateChangeHandler(function(state){
      debug('bluetooth state changed - ', state)
    });

    /*while(! (await MainWindow.isBleEnabled())){
      debug('prompting user to enable ble')
      await ble.withPromises.showBluetoothSettings()
    }*/
  }

  static async isBluetoothSetup(){
    return new Promise((resolve,reject)=>{

      debug('isBluetoothSetup - checking')

      cordova.plugins.diagnostic.getBluetoothAuthorizationStatuses((statuses)=>{
        let granted = 0
        for(var permission in statuses){
          
          let permEA = statuses[permission] == 'GRANTED'
          
          if(permEA){ granted++ }
          
          debug('isBluetoothSetup - ' + permission + " permission is: " + statuses[permission])
        }

        resolve(granted == 3)
      }, reject);
    })
  }

  static async setupBluetoothPermissions(){
    return new Promise((resolve, reject)=>{
      cordova.plugins.diagnostic.requestBluetoothAuthorization(resolve, reject);
    })
  }

  static async waitForHardware(){
    while(! (await MainWindow.isLocationEnabled())){
      debug('waiting for location hw')
      await MainWindow.delay(500)
    }
  }

  static async stopScan(){
    await new Promise((resolve,reject)=>{ ble.stopScan(resolve,reject) })
  }


  static async isScreenOff(){
    return new Promise((resolve,reject)=>{
      cordova.plugins.backgroundMode.isScreenOff(resolve)
    })
  }
  

  static async scanLoop(){

    let now = moment()
    let deltaMs = now.diff(window.lastScanStart, 'ms')

    if(deltaMs < MainWindow.scanWindow){
      debug('.')
      return
    }

    debug('scanLoop')

    if(await MainWindow.isBleEnabled()){

      if(window.isScanning){
        debug('scanLoop - stopping ble scan')
        await MainWindow.stopScan()
        window.isScanning = false
      }

      debug('scanLoop - starting ble scan', moment().format())
  
      ble.startScanWithOptions([],{
        reportDuplicates: false,
        scanMode: 'lowLatency',
        reportDelay: 0
      }, MainWindow.onBleDevice, console.error)

      if(cordova.plugins.backgroundMode.isActive() /*&& await MainWindow.isScreenOff()*/){

        debug('\t scanLoop - WAKE UP - ', moment().format())
        cordova.plugins.backgroundMode.wakeUp()
      }

      window.isScanning = true
      window.lastScanStart = now

      MainWindow.checkGeoLocation()
    }
    else{
      debug('scanLoop - ble not enabled')

      window.isScanning = false
    }

    setTimeout(MainWindow.scanLoop, MainWindow.scanWindow)
  }

  static IndexedDb(){
    return LokiIndexAdapter
  }

  static async setupDb(channel){
    let config = new Dataparty.Config.LocalStorageConfig({basePath:'rfparty-config'})

    /*
    let idbAdapter = new LokiIndexAdapter('rfparty')

    //let adapter = new Loki.LokiPartitioningAdapter(idbAdapter, { paging: true });

    
    let party = new Dataparty.LokiParty({
      path: 'rfparty-db',
      dbAdapter: new Loki.LokiLocalStorageAdapter(),
      model: RFPartyModel,
      config: config
    })

    await party.start()

    await window.rfparty.start(party)
    */




    let comms = new Dataparty.Comms.LoopbackComms({
      channel: channel
    })
  
    let peer = new Dataparty.PeerParty({
      comms: comms,
      noCache: true,
      model: RFPartyModel,
      factories: RFPartyDocuments,
      config: config
    })
  
  
    window.loadingState.startStep('start db thread')
    let srcPath = 'main.js'
    debug('starting nodejs - ', srcPath)
    let nodejsStart = new Promise((resolve, reject)=>{
      nodejs.start(srcPath, (err)=>{
        if(err){
          debug(err)
          reject(err) }
        else { resolve() }
      })
    })
  
    await nodejsStart
    debug ('nodejs started')
    window.loadingState.completeStep('start db thread')
  
    await config.start()
    await peer.loadIdentity()

    //channel.post('debug-settings', localStorage.getItem('node_debug'))
  
    channel.post('identity', peer.identity)
  
    channel.on('identity', async (identity)=>{
      debug('onidentity', identity)
      peer.comms.remoteIdentity = identity
      await peer.start()
  
      debug('peer started')
    })
  
    window.loadingState.startStep('authorized to party 😎')
    await peer.comms.authorized()
    debug('authorized to party 😎')
    window.loadingState.completeStep('authorized to party 😎')

    await window.rfparty.start(peer)
  }

  static checkGeoLocation(){

    BackgroundGeolocation.checkStatus(function(status) {
      debug('geolocation service is running', status.isRunning)
      debug('geolocation services enabled', status.locationServicesEnabled)
      
      if (!status.isRunning) {
        debug('geolocation - start')
        BackgroundGeolocation.start(); //triggers start on start event
      }
    });
  }


  static setupGeoLocation(){
    BackgroundGeolocation.configure({
      startOnBoot: false,
      notificationsEnabled: false,
      maxLocations: 30,
      locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
      desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
      stationaryRadius: 5,
      distanceFilter: 1,
      notificationTitle: 'rfparty',
      notificationText: 'partying in background',
      debug: false,
      interval: 30000,
      fastestInterval: 5000,
      activitiesInterval: 10000,
    })

    BackgroundGeolocation.on('location', MainWindow.onLocation)

    BackgroundGeolocation.on('background', function() {
      onLocationDebug('[INFO] App is in background');
      // you can also reconfigure service (changes will be applied immediately)
      //BackgroundGeolocation.configure({ debug: true });
    })
  
    BackgroundGeolocation.on('foreground', function() {
      onLocationDebug('[INFO] App is in foreground');
      //BackgroundGeolocation.configure({ debug: false });
    })

    BackgroundGeolocation.on('stationary', function(stationaryLocation) {
      // handle stationary locations here
      onLocationDebug('geolocation - stationary', stationaryLocation)
      MainWindow.onLocation({isStationary: true, ...stationaryLocation})
    })
  
    BackgroundGeolocation.on('activity', function(activity) {
      // handle stationary locations here
      onLocationDebug('geolocation - activity', activity)
    })

    BackgroundGeolocation.on('error', function(error) {
      onLocationDebug('[ERROR] BackgroundGeolocation error:', error.code, error.message);
    })
  
    BackgroundGeolocation.on('start', function() {
      onLocationDebug('[INFO] BackgroundGeolocation service has been started');
    })
  
    BackgroundGeolocation.on('stop', function() {
      onLocationDebug('[INFO] BackgroundGeolocation service has been stopped');
    })

    BackgroundGeolocation.checkStatus(function(status) {
      onLocationDebug('[INFO] BackgroundGeolocation service is running', status.isRunning)
      onLocationDebug('[INFO] BackgroundGeolocation services enabled', status.locationServicesEnabled)
      onLocationDebug('[INFO] BackgroundGeolocation auth status: ' + status.authorization)
  
      // you don't need to check status before start (this is just the example)
      if (!status.isRunning) {
        BackgroundGeolocation.start(); //triggers start on start event
      }
    });

    //BackgroundGeolocation.start()
  }

  static async setupSession(channel){

    MainWindow.closeSetupForm()
    MainWindow.openLoading()



    cordova.plugins.backgroundMode.setDefaults({
      title: 'rfparty',
      text: 'partying in the background',
      icon: 'ic_launcher', // this will look for icon.png in platforms/android/res/drawable|mipmap
      color: '000000', // hex format like 'F14F4D'
      //resume: Boolean,
      //hidden: true,
      silent: true
      //bigText: Boolean
    })

    cordova.plugins.backgroundMode.enable()

    window.watchdogInterval = setInterval(async ()=>{
      await MainWindow.scanLoop()
    }, 5*1000)

    window.loadingState.startStep('configure permissions')
    await MainWindow.checkPermissions()
    await MainWindow.checkPermissions()
    
    await MainWindow.setupBlePermissions()
    window.loadingState.completeStep('configure permissions')


    window.loadingState.startStep('please enable location')
    await MainWindow.waitForHardware()
    window.loadingState.completeStep('please enable location')

    window.loadingState.startStep('configure db')
    await MainWindow.setupDb(channel)
    window.loadingState.completeStep('configure db')

    window.loadingState.startStep('configure hardware')
    await MainWindow.scanLoop()

    MainWindow.setupGeoLocation()
    /*navigator.geolocation.watchPosition(MainWindow.onLocation, console.error, {
      enableHighAccuracy: true,
      maximumAge: 10000
    })*/

    window.powerManagement.setReleaseOnPause(false, function() {
      debug('wakelock - Set successfully');

      window.powerManagement.cpu(function() {
        debug('Wakelock - cpu lock acquired');
      }, function() {
        debug('wakelock - Failed to acquire wakelock');
      }, false);

      
    }, function() {
      debug('wakelock - Failed to set');
    })
    
    window.loadingState.completeStep('configure hardware')




    let searchElem = document.getElementById('search-input')
    let searchStatusElem = document.getElementById('search-status')
    let hintElem = document.getElementById('search-hint')

    searchElem.disabled = false

    window.rfparty.on('update-start', ()=>{
      window.MainWindow.hideDiv('search-hint')
      searchStatusElem.innerText = 'updating . . .'
      window.MainWindow.showDiv('search-status')      
    })

    window.rfparty.on('search-start', ()=>{
      window.MainWindow.hideDiv('search-hint')
      searchStatusElem.innerText = 'querying . . .'
      window.MainWindow.showDiv('search-status')
    })

    window.rfparty.on('search-finished', (data)=>{
      window.MainWindow.hideDiv('search-hint')
      searchStatusElem.innerText = 'rendering ' + data.render.count + ' devices . . .'
      window.MainWindow.showDiv('search-status')
    })

    window.rfparty.on('search-failed', (data)=>{
      window.MainWindow.hideDiv('search-hint')
      searchStatusElem.innerText = 'invalid search'
      window.MainWindow.showDiv('search-status')
    })

    window.rfparty.on('update-finished', (data)=>{
      debug('update complete', data.updateDuration, data)
      let updateTime = Math.round( (data.updateDuration/1000) * 100) / 100
      searchStatusElem.innerText = 'showing ' +data.render.onscreen +' out of ' + data.render.count + ' results in ' + updateTime + ' seconds'
      window.MainWindow.showDiv('search-status')
    })


    searchElem.addEventListener('input', (event)=>{
      debug('input', event)

      
      const hints = MainWindow.searchSuggestion(event.target.value)


      debug('hint', event.target.value, hints)

      if(hints.length == 0){
        window.MainWindow.hideDiv('search-hint')
      }
      else if(hints.length == 1){
        window.MainWindow.hideDiv('search-status')
        window.MainWindow.showDiv('search-hint')
        hintElem.innerText = hints[0]
      }
      else{
        window.MainWindow.hideDiv('search-status')
        window.MainWindow.showDiv('search-hint')
        hintElem.innerText = hints.join('\n')
      }

    })

    searchElem.addEventListener('change', (event)=>{

      
      const input = event.target.value

      debug('search input', input)

      searchStatusElem.innerText = 'searching . . .'
      window.MainWindow.showDiv('search-status')

      setTimeout(()=>{
        window.rfparty.handleSearch.bind(window.rfparty)(input)
      },10)

    })

    //await MainWindow.delay(10000) 

    MainWindow.closeLoading()
  }

  static searchSuggestion(input){
    const terms = input.trim().split(' ')
    const term = terms[0].trim()

    let suggestions = []

    if(term && terms.length == 1){
      for(let key in SearchSuggestions){
        const idx = key.indexOf(term)
        if(idx > -1 || term == 'help'){
          let args = SearchSuggestions[key]
          let suggestion = '• '+ key + ''
          if(args == true){ suggestion+= ` [${key}]` }
          else if(typeof args == 'string'){ suggestion+=` [${args}]` }
          else if(Array.isArray(args)){ suggestion+= ' ['+args.join(' | ')+']' }

          suggestions.push(suggestion)

          /*if(idx == 0){
            return input + suggestion.replace(term, '') 
          }

          return input + suggestion*/
        }
      }
    }

    return suggestions
  }
}
