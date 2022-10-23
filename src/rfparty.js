//import { point } from 'leaflet'
//import { scan } from 'node-wifi'

import Drawer from '@vrembem/drawer';
import { labelWidth } from 'settings-panel/theme/none';
/*import '@vrembem/drawer/dist/styles.css';
import '@vrembem/icon/dist/styles.css';
import '@vrembem/menu/dist/styles.css';*/

const debug = /*(...args)=>{ debug('rfparty', ...args) }*/  require('debug')('rfparty')
const Leaflet = require('leaflet')
const JSON5 = require('json5')
const Pkg = require('../package.json')
const JSONPath = require('jsonpath-plus').JSONPath
const reach = require('./reach')
const Loki = require('lokijs')
const moment = require('moment')
const EventEmitter = require('last-eventemitter')
const EarthDistance = require('earth-distance-js')

const RFPartyDocuments = require('./documents')

import * as UUID16_TABLES from './16bit-uuid-tables'
import { MainWindow } from './main-window';
import * as MANUFACTURER_TABLE from './manufacturer-company-id.json' 
import { UUIDParser } from './parsers/uuid-parser'
const DeviceIdentifiers = require('./device-identifiers')

const JSONViewer = require('json-viewer-js/src/jsonViewer')
const SettingsPanel = require('settings-panel')
const SettingsTheme = require('settings-panel/theme/dragon')

const TILE_SERVER_DEFAULT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_SERVER_DARK = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
const TILE_SERVER_LIGHT = 'https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'

const TILE_SERVER_MAPBOX = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}'
const TILE_SERVER_MAPBOX_CONFIG = {
    attribution: '',
    maxZoom: 20,
    id: 'mapbox/dark-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiZGF0YXBhcnR5IiwiYSI6ImNremFnMnlyZjIzZHMycG5mczZ1bDljM2gifQ.uGoEE_YpTbIlELvytTzbNQ'
}

async function delay(ms=100){
  return new Promise((resolve, reject)=>{
    setTimeout(resolve, ms)
  })
}


function toLoc(location){
  return {
    lat: location.latitude || 0,
    lon: location.longitude || 0
  }
}



/**
 * 
 * BLE
 * 
 * Bool
 *  - connectable [ true / false ]
 *  - address_type [ public / random ]
 * Int
 *  - mtu
 *  - rssi
 *  - duration
 * 
 * DateTime or DateTimeRange
 *  - timestamp
 *  - duration
 * 
 * String
 *  - localname
 *  - company
 *  - product
 *  - services
 *
 *  Hex String
 *  - address
 *  - companyCode
 *  - appleContinuityTypeCode
 *  - 
 */


export class RFParty extends EventEmitter {
  constructor(divId, party=null) {
    super()

    this.party = party

    this.mode = 'map'

    this.showAllTracks = true
    this.showAwayTracks = false

    this.center = null
    this.detailsViewer = null

    this.divId = divId
    this.map = Leaflet.map(divId,{
      attributionControl: false,
      zoomControl: false
    })

    Leaflet.tileLayer(TILE_SERVER_MAPBOX, TILE_SERVER_MAPBOX_CONFIG).addTo(this.map);

    let startPoint = [0,0]

    this.map.setView(startPoint, 3)

    this.positionCircle = Leaflet.circle(startPoint, { color: 'orange', fill:false, weight:1, opacity: 0 }).addTo(this.map)

    debug('rfparty constructor')



    this.deviceLayers = {}
    this.searchResults = null
    this.lastRender = null
    this.lastQuery = null
    this.lastQueryInput = null

    this.scanDb = null
    
    this.autoCenter = true
    this.lastLocation = undefined
    this.packetCount = 0
    this.stationCount = 0
    this.locationCount = 0

    this.lastmoveTime = null
    this.sessionStartTime = moment()

    this.queryActive = false
    this.queryResult = null
  }



  async indexLocation(location){

    let movedDistance = !this.lastLocation ? 0 : EarthDistance.haversine(
      toLoc(this.lastLocation),
      toLoc(location)
    )

    const latLon = Leaflet.latLng([ location.latitude, location.longitude])
    let hasMoved = ((movedDistance*1000) > 100) && location.accuracy < 30
    let isInView = this.map.getBounds().pad(-0.3).contains(latLon) && location.accuracy < 30

    //Update if we don't have a center or accuracy improves and autocenter is turned-on
    if( !this.center || (this.autoCenter && (this.center.accuracy > location.accuracy || !isInView))){
      this.center = location
      debug('update view center')

      if(this.lastmoveTime == null || !this.lastLocation){
        this.map.flyTo(latLon, 17)  

      } else {

        let now = new moment()
        let delta = now.diff(this.lastmoveTime, 'seconds')
        
        debug('\t delta check',delta)

        if(delta > 30){
          this.map.setView(latLon, 17)
        }
  

      }

      this.lastLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      }

      //Leaflet.circle(latLon, { color: 'white', radius: location.accuracy, fill:false, weight:1, opacity: 0.3 }).addTo(this.map)

      this.positionCircle.setStyle({ color: 'green', fill:false, weight:1, opacity: 0.9 })
    } else {
      this.positionCircle.setStyle({ color: 'orange', fill:false, weight:1, opacity: 0.9 })
    }

    this.positionCircle.setRadius(location.accuracy)
    this.positionCircle.setLatLng(latLon)

    let track = await RFPartyDocuments.geo_track.indexGeoPoint(this.party, location)
    this.locationCount++
    this.emit('location_count',this.locationCount)
  }

  async indexDevice(dev){

    if(this.party == null){ return }

    debug('indexDevice -', dev)

    let device = await RFPartyDocuments.ble_adv.indexBleDevice(this.party, dev, this.lastLocation)
    let station = await RFPartyDocuments.ble_station.indexBleStation(this.party, device)

    if(station.data.timebounds.first == station.data.timebounds.last){
      this.stationCount++
      this.emit('station_count', this.stationCount)
    }

    this.packetCount++
    this.emit('packet_count', this.packetCount)
  }

  async start(party) {
    debug('starting')

    this.party = party

    //await this.handleSearch('duration')

    this.map.on('mouseup', ()=>{
      this.lastmoveTime = new moment()
    })

    this.map.on('moveend', ()=>{

      if(!this.lastRender){ return }
      if(!this.lastQuery){ return }

      if((this.lastRender.drawable != this.lastRender.onscreen || this.lastRender.drawable >= 2000) && this.lastQuery!==null){

        this.doQuery(this.lastQuery)
      }
    })

    
    this.drawers = new Drawer({
      selectorInert: '.drawer-main',
      selectorOverflow: 'body, .drawer-main'
    });
    
    await this.drawers.init();
  }

  async handleSearch(input){

    debug('handleSearch -',input)

    if(this.queryActive || !this.party){
      debug('ignoring query. one is already in progress -',input)
      return
    }

    this.queryActive = true


    let query = this.party.find().type('ble_station').limit(3000)
    let updateStartTime = new moment()

    if(input[0]=='{'){
      debug('raw query')
      const obj = JSON5.parse(input)

      //debug('parsed query', obj)
      //query = obj
    }else{

      try{

        const tokens = input.trim().split(' ')
  
        let term = tokens.slice(1).join(' ')
        switch(tokens[0].toLowerCase()){
          case 'mac':
          case 'address':
            if(tokens.length < 2){
              query = query.where('address').exists()
            }
            else{
              query = query.where('address').regex(new RegExp(term, 'i'))   //TODO - needs $contains support
            }
            break
          case 'here':
            let viewport = this.map.getBounds()
            query = query.or()
              .and()
                .where('location.first').exists()
                //.where('location.last').ne(null)
                //.where('location.first').ne(null)
                .where('location.first.lat').exists()
                .where('location.first.lon').exists()
                .where('location.first.lat').lt( viewport.getNorth() )
                .where('location.first.lat').gt( viewport.getSouth() )
                .where('location.first.lon').lt( viewport.getEast() )
                .where('location.first.lon').gt( viewport.getWest() )
              .dna()
              .and()
                .where('location.last').exists()
                //.where('location.last').ne(null)
                //.where('location.first').ne(null)
                .where('location.last.lat').exists()
                .where('location.last.lon').exists()
                .where('location.last.lat').lt( viewport.getNorth() )
                .where('location.last.lat').gt( viewport.getSouth() )
                .where('location.last.lon').lt( viewport.getEast() )
                .where('location.last.lon').gt( viewport.getWest() )
            break
          /*case 'nolocation':
            query = {'$or': [
              {'firstlocation': {'$exists': false}},
              {'lastlocation': {'$exists': false}},
              {'firstlocation': null },
              {'lastlocation': null },
            ]}
            break*/
          case 'name':
          case 'localname':
            debug('select by localname', tokens)
            if(tokens.length<2){
              query = query.where('summary.localname').exists()
            }
            else{
              query = query.where('summary.localname').regex((new RegExp(term, 'i')))   //TODO - needs $contains support

            }
            
            
            debug('term['+term+']')
    
            break
          case 'company':
            debug('select by company', tokens)
            if(tokens.length<2){
              query = query.where('summary.company').exists()
            }
            else{
              query = query.where('summary.company').regex(new RegExp(term, 'i'))   //TODO - needs $contains support
            }
            break
    
          case 'product':
            debug('select by product', tokens)
            if(tokens.length<2){
              query = query.where('summary.product').exists()
            }
            else{
              query = query.where('summary.product').regex(new RegExp(term, 'i'))   //TODO - needs $contains support
            }
            break
    
          case 'unknown':
          case 'unknown-service':
            query = query.where('summary.hasUnknownService').exists()
              .where('summary.hasUnknownService').equals(true)
            break
          case 'service':
            const serviceTerm = tokens[1]
            debug('select by service', serviceTerm)


            let specialQuery = null
            if(tokens.slice(2).length > 0){
              specialQuery = this.parseServiceSearch(query, serviceTerm.toLowerCase(), tokens.slice(2))
            }
            
            if(!specialQuery){
              //let possibleServices = UUIDParser.reverseLookupService(serviceTerm)
              //debug('possible', possibleServices)
              //console.log('possible', possibleServices)

              if(serviceTerm.indexOf('0x') == 0){

                query = query.or()
                  .where('summary.serviceUuids.known').regex(new RegExp(serviceTerm.replace('0x',''), 'i'))
                  .where('summary.serviceUuids.unknown').regex(new RegExp(serviceTerm.replace('0x',''), 'i'))

              } else {

                query = query.where('summary.serviceUuids.results').regex(new RegExp(serviceTerm, 'i'))
              }

            }
            else{
              query = specialQuery
            }

            /*query = {
              'services':  {'$containsAny':  possibleServices },
              ...this.parseServiceSearch(serviceTerm.toLowerCase(), tokens.slice(2))
            }*/
            break
    
          case 'appleip':
          case 'appleIp':
            debug('select by appleIp', tokens)
            if(tokens.length < 2){
              query = query.where('summary.appleContinuity.service.airplay.ip').exists()
            }
            else{
              query = query.where('summary.appleContinuity.service.airplay.ip').regex(new RegExp(term, 'i'))
            }
            break
    
          case 'random':
            query = query.where('summary.addressType').equals('random')
            break
          case 'public':
            query = query.where('summary.addressType').equals('public')
            break
          case 'connectable':
            query = query.where('summary.connectable').equals(true)
            break
          case 'duration':
            if(tokens.length < 2){
  
              query = query.where('timebounds.duration').gt(30*60*1000)
  
            } else {
  
              query = query.where('timebounds.duration').gt(moment.duration("PT" + term.toUpperCase()).as('ms') || 30*60000)
  
            }
            break
  
          case 'error':
            query = query.where('summary.appleContinuity.protocolError').exists()
            break
    
          default:
            debug('invalid search type', tokens[0])
            this.emit('search-failed')
            this.queryActive = false
            return
        }
      } catch (er) {
        debug('error constructing query')
        this.queryActive = false
        return
      }

    }

    if(!query){ 
      let updateEndTime = new moment()
      let updateDuration = updateEndTime.diff(updateStartTime)
      this.emit('update-finished', {query: this.lastQuery, updateDuration, render: this.lastRender})

      this.queryActive = false
      return
    }

    try{
      this.lastQueryInput = input
      await this.doQuery(query, updateStartTime)
    }
    catch(err){
      debug('query error', err)
    }
    this.queryActive = false
  }

  async doQuery(query, updateStartTime=new moment()){
    debug('running query...', query)

    this.emit('search-start', {query})

    let searchStartTime = new moment()

    //const devices = this.db.getCollection('ble').chain().find(query).data()

    const devices = (this.lastQuery === query) ? this.queryResult : await query.exec()

    this.queryResult = devices
    
    let searchEndTime = new moment()
    let searchDuration = searchEndTime.diff(searchStartTime)
    
    this.emit('search-finished', {query, render: {count: devices.length}, searchDuration})


    let durations = {searchDuration}

    debug('rendering devices...', devices)
    if(devices != null){

      this.emit('render-start')
      let renderStartTime = new moment()

      await delay(30)
      
      await this.renderBleDeviceList(devices)
      
      let renderEndTime = new moment()
      let renderDuration = renderEndTime.diff(renderStartTime)

      durations.renderDuration = renderDuration


      this.emit('render-finished', {query, render: this.lastRender, renderDuration})
    }

    let updateEndTime = new moment()
    let updateDuration = updateEndTime.diff(updateStartTime)
    this.emit('update-finished', {query, render: this.lastRender, updateDuration, ...durations})

    this.lastQuery = query
  }


  parseServiceSearch(query, service, terms){
    
    if(terms.length==0){ return null }

    switch(service){
      case 'ibeacon':
        query = query.where('summary.appleContinuity.ibeacon.uuid').exists()
        //  .where('summary.appleContinuity.ibeacon.uuid').regex( new RegExp(terms[0], 'i'))
        break
      case 'findmy':
        query = query.where('summary.appleContinuity.findmy.maintained').equals( terms[0] == 'found' )
        break
      default:
        return null
    }

    return query
  }

  async renderBleDeviceList(bleDevices){
    this.lastRender = {
      count: bleDevices.length,
      onscreen: 0,
      drawable: 0
    }

    debug('\trendering', bleDevices.length, 'ble devices')

    let restrictToBounds = this.restrictToBounds || bleDevices.length > 2000


    let layer = Leaflet.layerGroup()

    let count = 0
    for (let dev of bleDevices) {

      //if(dev.duration < 30*60000){ continue }

      count++
      if((count % 500) == 0){ await delay(1) }

      let lastPt = dev.data.location.last
      let firstPt = dev.data.location.first

      if(!lastPt || !firstPt){ continue }

      let corner1 = new Leaflet.LatLng(lastPt.lat, lastPt.lon)
      let corner2 = new Leaflet.LatLng(firstPt.lat, firstPt.lon)

      let bounds = new Leaflet.LatLngBounds(corner1, corner2)

      this.lastRender.drawable++
      if(restrictToBounds == true && !this.map.getBounds().intersects(bounds)) { continue }

      this.lastRender.onscreen++
      

      if (lastPt) {
        let lastCircle = Leaflet.circle([lastPt.lat, lastPt.lon], { color: 'white', radius: 10, fill:true, weight:1, opacity: 1, fillOpacity:0.3, fillColor:'white' })
        layer.addLayer(lastCircle)

        let onclick = (event)=>{
          this.handleClick({
            event,
            type: 'ble', 
            id: dev.id,
            value: dev.data.address,
            timestamp: dev.data.timebounds.last
          })
        }

        lastCircle.on('click', onclick)



        if(firstPt){
          let line = Leaflet.polyline([
            this.trackToLatLonArray([firstPt, lastPt])
          ], { color: 'blue', opacity: 0.6, weight: '5' })

          layer.addLayer(line)
          line.on('click', onclick)
          

          let firstCircle = Leaflet.circle([firstPt.lat, firstPt.lon], { color: 'yellow', radius: 5, fill:true, weight:1, opacity: 1 })

          layer.addLayer(firstCircle)
          firstCircle.on('click', (event)=>{
            this.handleClick({
              event,
              type: 'ble', 
              id: dev.id,
              value: dev.data.address,
              timestamp: dev.data.timebounds.first
            })
          })
        }
      }
    }

    

    
    layer.addTo(this.map)

    if(this.searchResults != null){
      this.map.removeLayer(this.searchResults)
      delete this.searchResults
    }

    this.searchResults = layer

    return
  }

  async getBLEDevice(mac){
    let adv = (await this.party.find().type('ble_adv')
      .where('address').equals(mac)
      //.limit(1)
      .exec())

    return adv
  }

  async updateDeviceInfoHud(station){
    let devices = Object.keys( this.deviceLayers )
    if(devices.length == 0){
      window.MainWindow.hideDiv('device-info')
      /*let deviceInfo = document.getElementById('device-info')
      deviceInfo.classList.add('hidden')*/
    } else {
      
      
      let devAdv = await this.getBLEDevice(devices[0])
      let device = devAdv[0]

      debug('updateDeviceInfoHud', device)


      //document.getElementById('device-info-mac').textContent = reach(device, 'address')
      //document.getElementById('device-info-name').textContent = reach(device, 'advertisement.localName')


      let companyText = ''

      if(reach(station, 'data.summary.company')){
        if(!reach(station,'data.summary.companyCode')){
          companyText=reach(station, 'data.summary.company') 
        } else {
          companyText=reach(station, 'data.summary.company') + '(' + reach(station, 'data.summary.companyCode') + ')'
        }
      }
      else if(reach(station, 'data.summary.companyCode')){
        companyText='Unknown Company' + '(0x' + reach(station, 'data.summary.companyCode') + ')'
      }

      if(reach(station, 'data.summary.product')){
        if(companyText.length > 0){
          companyText+='\n'
        }
        companyText+=reach(station, 'data.summary.product')
      }

      document.getElementById('device-info-address').textContent = reach(station, 'data.address')

      if(reach(station, 'data.summary.localname')){
        document.getElementById('device-info-name').textContent = reach(station, 'data.summary.localname')
        window.MainWindow.showDiv('device-info-name')
      }
      else{
        window.MainWindow.hideDiv('device-info-name')
      }


      document.getElementById('device-info-company').textContent = companyText

      document.getElementById('device-info-duration').textContent = moment.duration(station.data.timebounds.duration).humanize()



      let serviceText = ''

      if(reach(station, 'data.summary.appleContinuity.typeCode')){
        let appleService = RFParty.lookupAppleService( station.data.summary.appleContinuity.typeCode)
        if(appleService){
          serviceText+=  'Apple ' + appleService + '(0x' + station.data.summary.appleContinuity.typeCode + '); \n'
        }
        else{
          serviceText+=  'Apple ' + '0x' + station.data.summary.appleContinuity.typeCode + '; \n'
        }
      }
      

      if(reach(station, 'data.summary.appleContinuity.service.airplay.ip')){
        serviceText+=  'Apple IP ' + station.data.summary.appleContinuity.service.airplay.ip + '; \n'
      }

      if(reach(station, 'data.summary.serviceUuids')){

        let uuids = [...new Set([...station.data.summary.serviceUuids.known, ...station.data.summary.serviceUuids.unknown]) ]
        
        uuids.map(uuid=>{
          let name = RFParty.lookupDeviceUuid(uuid)
  
          if(name){
            serviceText += name + '(0x' + uuid + '); \n'
          } else {
            serviceText += '0x' + uuid + '; \n'
          }
        })
      }

      document.getElementById('device-info-services').textContent = serviceText




      let details = document.getElementById('device-info-detailscontainer')

      //details.textContent = JSON.stringify(device.cleanData,null,2)

      while (details.firstChild) { details.removeChild(details.firstChild) }

      debug('details viewer JSON - ', JSON.stringify(device.cleanData))

      let packets = []
      let seen = 0
      
      for(let adv of devAdv){
        //adv.parsePacket()
        //console.log(adv.cleanData)
        seen += adv.data.packet.seen
        if(adv.data.packet.parsed){
          packets.push(adv.data.packet.parsed)
        }
      }


      const content = {
        packets,
        base64: device.cleanData.packet.base64,
        seen
      }

      this.detailsViewer = new JSONViewer({
        container: details,
        data: JSON.stringify(content),
        theme: 'dark',
        expand: false
      })

      window.MainWindow.showDiv('device-info')
      
    }
  }


  async handleClick({id, type, value, timestamp, event}){
    debug('clicked type=', type, value, timestamp, event)

    if(type == 'ble'){

      debug('shift', event.originalEvent.shiftKey)

      //this.selectedLayers = [ value ]

      let layer = Leaflet.layerGroup()

      //let device = this.getBLEDevice(value)
      //let device = this.db.getCollection('ble').findOne({'$loki':id})

      let station = (await this.party.find().type('ble_station').id(id).exec())[0]

      if(!station){
        console.log('no station')
        return
      }

      /*
      let devAdvs = (await this.party.find().type('ble_adv').where('address').equals(station.data.address).exec())

      let devAdv = devAdvs[0]

      if(!devAdv){ 
        console.log('no adv')
        return }

      let devicePathLL = []


      let trackPointQuery = []
      

      for(let observation of devAdv.data.packet.seen){
        console.log(observation)
        trackPointQuery.push( this.getTrackPointByTime(observation.time) )
      }

      let trackPoints = await Promise.all(trackPointQuery)

      for(let pt of trackPoints){

        console.log('pt', pt)


        if(pt){ 
          devicePathLL.push([ pt.lat, pt.lon ])
          let circle = Leaflet.circle([pt.lat, pt.lon], { color: 'green', radius: 8, fill:true, weight:1, opacity: 0.9 })

          circle.on('click', (event)=>{
            this.handleClick({
              event,
              type: 'ble', 
              id: station.id,
              value: station.data.address,
              timestamp: observation.time
            })
          })

          layer.addLayer(circle)
        }
      }


      if(devicePathLL.length > 0){
        let line = Leaflet.polyline(devicePathLL, { color: 'green', opacity: 0.9, weight: '4' })

        line.on('click', (event)=>{
          this.handleClick({
            event,
            type: 'ble', 
            id: station.id,
            value: station.data.address,
            timestamp: station.data.timebounds.last
          })
        })
        layer.addLayer(line)
      }*/


      if(!event.originalEvent.shiftKey){
        for(let mac in this.deviceLayers){
          let l = this.deviceLayers[mac]
          this.map.removeLayer(l)

          delete this.deviceLayers[mac]
        }
      }

      this.deviceLayers[ value ] = layer
      layer.addTo(this.map)

      await this.updateDeviceInfoHud(station)
    }

    
  }

  async getTrackPointByTime(timestamp) {
    let bestDeltaMs = null
    let bestPoint = null
    let tracks = await this.getTracksByTime(timestamp - 600000, timestamp + 600000)

    for(let track of tracks){
      for (let point of track.data.points) {
        let deltaMs = Math.abs(moment(timestamp).diff(point.time))
  
        if (deltaMs < bestDeltaMs || bestDeltaMs == null) {
          bestDeltaMs = deltaMs
          bestPoint = point
        }
      }
    }


    if(bestPoint){
      bestPoint = {
        lat: bestPoint.latitude,
        lon: bestPoint.longitude
      }
    }

    return bestPoint
  }

  async getTracksByTime(starttime, endtime) {

    let tracks = (await this.party.find()
      .type('geo_track')
      //.sort('-timebounds.last')
        .or()
          .and()  //endtime within timebounds
            .where('timebounds.first').lt(endtime)
            .where('timebounfs.last').gt(endtime)
          .dna()
          .and()  //starttime within timebounds
            .where('timebounds.first').lt(starttime)
            .where('timebounfs.last').gt(starttime)
          .dna()
          .and()  //
            .where('timebounds.first').lt(endtime)
            .where('timebounds.first').gt(starttime)
          .dna()
          .and()
            .where('timebounds.last').lt(endtime)
            .where('timebounds.last').gt(starttime)
      .exec())

    return tracks
  }

  trackToLatLonArray(track) {
    let llarr = []

    for (let point of track) {
      llarr.push([
        point.lat, point.lon
      ])
    }

    return llarr
  }

  async getTrackPointsByTime(start, end) {
    let llpoints = []
    let tracks = await this.getTracksByTime(start, end)

    for(let track of tracks){
      for (let point of track.data.points) {
        llpoints.push(Leaflet.point(point.latitude, point.longitude))
      }
    }

    return llpoints
  }

  async getTrackBoundsByTime(starttime, endtime) {
    let points = await this.getTrackPointsByTime(starttime, endtime)

    return Leaflet.bounds(points)
  }



  static get Version() {
    return Pkg.version
  }

  


  static lookupDeviceCompany(code){
    return  MANUFACTURER_TABLE.Company[code] 
  }
  

  static lookupAppleService(code){
    return DeviceIdentifiers.APPLE_Continuity[code]
  }

  static lookupUuid16(uuid){
    const types = Object.keys(UUID16_TABLES)

    for(let type of types){
      let found = UUID16_TABLES[type][uuid]

      if(found){
        return '/'+type+'/'+found
      }
    }
  }
  
  static lookupDeviceUuid(uuid){
    let deviceType = null
  
    if(uuid.length == 4){
      //deviceType = DeviceIdentifiers.UUID16[uuid]
      deviceType = RFParty.lookupUuid16(uuid)
    }
    else if(uuid.length == 32){
      deviceType = DeviceIdentifiers.UUID[uuid] 
    }
  
    return deviceType
  }

  static reverseLookupService(term){

    let possibles = []

    const types = Object.keys(UUID16_TABLES)

    for(let type of types){ 
      possibles.push( 
        ...(RFParty.reverseLookupByName(
            UUID16_TABLES[type], term, '/'+type+'/'
        ).map( name=>{return '/'+type+'/'+name }) )
      )
    }
    
    return possibles.concat( 
      RFParty.reverseLookupByName(DeviceIdentifiers.APPLE_Continuity, term),
      RFParty.reverseLookupByName(DeviceIdentifiers.UUID, term)
    )
  }

  static reverseLookupByName(map, text, prefix=''){
    let names = []
    const lowerText = text.toLowerCase()
    for(let code in map){
      const name = map[code]
      const prefixedName = prefix+name
      const lowerName = prefixedName.toLowerCase()

      if(lowerName.indexOf(lowerText) != -1 ){
        names.push(name)
      }
    }

    return names
  }

  static get SettingsPanel(){
    return SettingsPanel
  }



  async setMode(mode){
    this.last_mode = this.mode
    this.mode = mode

    await this.drawers.get('drawer').close()

    if(this.mode == 'map'){
      MainWindow.hideDiv('full-content')
    }
    else if(this.mode == 'settings'){
      let fullContent = document.getElementById('full-content')
      let fullContentTitle = document.getElementById('full-content-title')

      MainWindow.showDiv('full-content')

      fullContentTitle.textContent = this.mode.charAt(0).toUpperCase() + this.mode.slice(1)


      let general_settings = SettingsPanel([
        {type: 'checkbox', label: 'Persistant Storage', value: true},
        {type: 'checkbox', label: 'Delete Old Data', value: false},
        {type: 'range', label: 'Max age (days)', min: 0, max: 365, default: 31},
      ],
        {
          title: 'General',
          container: fullContent,
          theme: SettingsTheme,
          orientation: 'left',
          collapsible: true,
          fontFamily: 'Roboto Condensed',
          labelWidth: '30%',
          fontSize: '16px',
          style:{
            width: '100vw'
          }
        }
      )

      let bluetooth_settings = SettingsPanel([
        {type: 'checkbox', label: 'Active Scanning', value: true},
        {type: 'range', label: 'Scan Interval (s)', min: 0, max: 600, default: 60},
      ],
        {
          title: 'Bluetooth',
          container: fullContent,
          theme: SettingsTheme,
          orientation: 'left',
          collapsible: true,
          fontFamily: 'Roboto Condensed',
          labelWidth: '30%',
          fontSize: '16px',
          style:{
            width: '100vw'
          }
        }
      )

      let geo_settings = SettingsPanel([
        {type: 'select', label: 'Location Provider', options: ['distance', 'activity', 'raw'], value: 'raw'},
        {type: 'range', label: 'Interval (s)', min: 0, max: 300, default: 5},
        {type: 'range', label: 'Fastest Interval (s)', min: 0, max: 300, value: 1},
        {type: 'range', label: 'Activities Interval (s)', min: 0, max: 300, value: 5},
        {type: 'range', label: 'Stationary Radius (m)', min: 0, max: 100, value: 5},
        {type: 'range', label: 'Distance Filter (m)', min: 0, max: 100, value: 1},
      ],
        {
          title: 'Geolocation',
          container: fullContent,
          theme: SettingsTheme,
          orientation: 'left',
          collapsible: true,
          fontFamily: 'Roboto Condensed',
          labelWidth: '30%',
          fontSize: '16px',
          style:{
            width: '100vw'
          }
        }
      )

    }
  }

  closeFullContent(){
    let fullContent = document.getElementById('full-content')
    let fullContentTitle = document.getElementById('full-content-title')

    MainWindow.hideDiv('full-content')
    MainWindow.addRemoveClass('full-content', 'remove', 'settings-panel-container')

    for(let child of fullContent.children) {
      if(child.id != 'full-content-header'){
        fullContent.removeChild(child)
      }
    }

    this.mode = this.last_mode
    this.setMode(this.last_mode)
  }
}
