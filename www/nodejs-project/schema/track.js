'use strict'

const Hoek = require('hoek')
const Dataparty = require('@dataparty/api')
const debug = require('debug')('venue.ban_list')

const Bouncer = Dataparty.Bouncer

const Utils = Bouncer.ISchema.Utils


class BanList extends Bouncer.ISchema {

  static get Type () { return 'ban_list' }

  static get Schema(){
    return {
      created: Utils.created,
    }
  }

  static setupSchema(schema){

    return schema
  }

  static permissions (context) {
    return {
      read: false,
      new: false,
      change: false
    }
  }
}


module.exports = BanList