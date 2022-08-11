'use strict'

const Hoek = require('hoek')
//const BouncerDb = require('@dataparty/bouncer-db')
/*
require('mongoose-schema-jsonschema')(BouncerDb.mongoose())
BouncerDb.mongoose().plugin(require("mongoose-ajv-plugin"))
*/
const debug = require('debug')('rfparty.ble_adv')

const Dataparty = require('@dataparty/api/src/index')

const ISchema = require('@dataparty/api/src/service/ischema')

const Utils = ISchema.Utils


class BleAdv extends ISchema {

  static get Type () { return 'ble_adv' }

  static get Schema(){
    return {
      source: Utils.actor(['source']),
      created: Utils.created,
      address: Utils.string(18,20),
      packet_hash: String,
      packet_base64: String,
      packet_parsed: Object,
      firstseen: Date,
      lastseen: Date,
      seen: [{
        rssi: Number,
        timestamp: Utils.created
      }]
    }
  }

  static setupSchema(schema){
    schema.index({ name: 1 }, {unique: true})
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
