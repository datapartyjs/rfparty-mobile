const ISchema = require('@dataparty/api/src/service/ischema')

const Utils = ISchema.Utils

exports.Location = {
  lat: Number,
  lon: Number
}


exports.LocationIndexed = {
  lat: {type: Number, index: true},
  lon: {type: Number, index: true}
}

exports.GapField = {
  type: {type: String},
  raw: {
    data: String,
    data_length: Number,
    field_length: Number,
    offset: Number,
    offset_next: Number,
    type: Number
  }
}

exports.BleParsedAdv = {
  mtu: Number,
  addressType: String,
  connectable: Boolean,
  services: [String],
  unknownServices: [String],
  product: {type: String, index: true},
  company: {type: String, index: true},
  companyCode: Utils.string(2,2),

  name: {type:String, index: true},

  appleContinuity:{
    typeCode: String,
    services: [String],

    lasterror: String,

    service:{

      airplay: {
        ip: {type: String, index: true}
      },

      ibeacon: {
        uuid: {type: String, index: true},
        major: String,
        minor: String,
        txPower: Number
      },

      findmy: {
        maintained: Boolean
      },

      nearbyaction: { type: String },
      nearbyinfo: {
        actionCode: Utils.string(2,2),
        action: {type: String, index: true},
        flags: {
          unknownFlag1: Boolean,
          unknownFlag2: Boolean,
          primaryDevice: Boolean,
          airdropRxEnabled: Boolean,
          airpodsConnectedScreenOn: Boolean,
          authTag4Bytes: Boolean,
          wifiOn: Boolean,
          hasAuthTag: Boolean,
          watchLocked: Boolean,
          watchAutoLock: Boolean,
          autoLock: Boolean,
        }
      }
    }
  }
}

exports.BlePacket = {
  hash: {type: String, index: true},
  base64: String,
  gapFields: [exports.GapField],
  parsed: exports.BleParsedAdv,
  seen: [{
    rssi: Number,
    timestamp: Utils.created,
    location: exports.Location
  }]
}

exports.BleStationInfo = {
  source: Utils.actor(['ble_source'], {indexId:true}),
  created: Utils.created,
  address: { type: String, maxlength: 20, minlength: 18, index: true},

  duration: {type: Number, index: true},
  firstseen: {type: Date, index: true},
  lastseen: {type: Date, index: true},
  location: {
    first: exports.LocationIndexed,
    last: exports.LocationIndexed
  },

  best: {
    timestamp: Date,
    rssi: {type: Number, index: true}
  },

  bounds: {
    min: exports.LocationIndexed,
    max: exports.LocationIndexed
  },
}

exports