'use strict'

const Dataparty = require('@dataparty/api/src/index')

const ISchema = require('@dataparty/api/src/service/ischema')

const Utils = ISchema.Utils


class BleSource extends ISchema {

  static get Type () { return 'ble_source' }

  static get Schema(){
    return {
      created: Utils.created,
      info: {
        uuid: String,
        serial: String,
        model: String,
        platform: String,
        sdkVersion: String,
        manufacturer: String,
        cordova: String,
        version: String
      }
    }
  }

  static setupSchema(schema){
    schema.index({ 'info.uuid': 1 }, {unique: true})
    schema.index({ 'info.serial': 1 })
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


module.exports = BleSource
