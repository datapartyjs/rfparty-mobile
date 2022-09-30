import moment from 'moment';

const md5 = require('md5')
const debug=require('debug')('rfparty.ble_adv')

const Dataparty = require( '@dataparty/api/dist/dataparty-browser' )

const GeoUtils = require('../geo-utils')

module.exports = class BleAdvDocument extends Dataparty.IDocument {
  constructor({ party, type, id, data }) {
    super({ party, type, id, data });
    debug("instantiated - ", this.id);

  }

  static async indexBleDevice(party, dev, point){

    const now = moment().valueOf()
    const packetHash = md5(dev.advertising.data)
    let prev7d = moment().subtract(7, 'days')

    let advs = (await party.find()
      .type('ble_adv')
      .where('address').equals(dev.id.toLowerCase())
      .where('packet.hash').equals(packetHash)
      .where('timebounds.first').gt(prev7d.valueOf())
      //.sort('-timebounds.first')
      .limit(1)
      .exec())

    let bleAdvDoc = advs[0]

    if(!bleAdvDoc){
      bleAdvDoc = await BleAdvDocument.createFromBleDevice(party, dev, packetHash, point)
      debug('created', bleAdvDoc.data)

      await bleAdvDoc.save()

      return bleAdvDoc
    }

    debug('indexBleDevice', bleAdvDoc.data)

    if(!bleAdvDoc.data.packet.seen){
      bleAdvDoc.data.packet.seen=[]
    }

    const currentRssi = {
      rssi: dev.rssi,
      time: now
    }

    bleAdvDoc.data.packet.seen.push(currentRssi)



    bleAdvDoc.data.geobounds = GeoUtils.updatGeoBoundsByPoint(bleAdvDoc.data.geobounds, point)
    bleAdvDoc.data.location = GeoUtils.updateLocationBounds(bleAdvDoc.data.location, point)
    bleAdvDoc.data.timebounds = GeoUtils.updateTimebounds(bleAdvDoc.data.timebounds, now)
    bleAdvDoc.data.best = GeoUtils.updateBestRssi(bleAdvDoc.data.best, currentRssi)
    bleAdvDoc.data.worst = GeoUtils.updateWorstRssi(bleAdvDoc.data.worst, currentRssi)

    await bleAdvDoc.save()

    return bleAdvDoc
  }

  static get DocumentSchema(){
    return 'ble_adv'
  }

  static async createFromBleDevice(party, dev, packetHash, point){
    debug('create')

    const now = moment().valueOf()
    const currentRssi = {
      rssi: dev.rssi,
      time: now
    }

    const loc = !point ? undefined : {
      lat: point.latitude,
      lon: point.longitude
    }


    return await party.createDocument('ble_adv', {
      address: dev.id.toLowerCase(),
      created: now,
      packet: {
        hash: packetHash,
        base64: dev.advertising.data,
        seen: [currentRssi]
      },

      timebounds: {
        first: now,
        last: now
      },
      location: {
        first: loc,
        last: loc
      },
    
      best: {
        time: now,
        rssi: dev.rssi
      },

      worst: {
        time: now,
        rssi: dev.rssi
      },
    
      geobounds: {
        min: loc,
        max: loc
      }
    })
  }
}