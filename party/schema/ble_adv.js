'use strict'


const Dataparty = require('@dataparty/api/src/index')

const ISchema = require('@dataparty/api/src/service/ischema')

const Utils = ISchema.Utils


class BleAdv extends ISchema {

  static get Type () { return 'ble_adv' }

  static get Schema(){
    return {
      source: Utils.actor(['ble_source'], {indexId:true}),
      created: Utils.created,
      address: { type: String, maxlength: 20, minlength: 18, index: true},
      packet_hash: {type: String, index: true},
      packet_base64: String,
      packet_parsed: Object,
      firstseen: {type: Date, index: true},
      lastseen: {type: Date, index: true},
      seen: [{
        rssi: Number,
        timestamp: Utils.created
      }]
    }
  }

  static setupSchema(schema){
    schema.index({ source: {id: 1, type: 1} }, {unique: true})
    return schema
  }

  static permissions (context) {
    return {
      read: true,
      new: true,
      change: true
    }
  }
}


module.exports = BleAdv
