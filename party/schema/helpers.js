const ISchema = require('@dataparty/api/src/service/ischema')

const Utils = ISchema.Utils

Utils.created = {
  type: Number,
  default: Date.now,
  required: true
}

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
  gap: Object,
  services: [String],
  unknownServices: [String],
  hasUnknownService: Boolean,
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
    time: Utils.created
  }]
}

exports.GeoBoundsIndexed = {
  min: exports.LocationIndexed,
  max: exports.LocationIndexed
}

exports.LocationBoundsIndexed = {
  first: exports.LocationIndexed,
  last: exports.LocationIndexed,
  distance: {type: Number, index: true}
}

exports.TimeBoundsIndexed = {
  duration: {type: Number, index: true},
  first: {type: Number, index: true},
  last: {type: Number, index: true}
}

exports.BleStationInfo = {
  //source: Utils.actor(['ble_source'], {indexId:true}),
  created: Utils.created,
  address: { type: String, maxlength: 20, minlength: 18, index: true},

  timebounds: exports.TimeBoundsIndexed,
  location: exports.LocationBoundsIndexed,
  
  geobounds: exports.GeoBoundsIndexed,

  best: {
    time: {type: Number, index: true},
    rssi: {type: Number, index: true}
  },

  worst: {
    time: {type:Number, index: true},
    rssi: {type: Number, index: true}
  }
}

exports.GeoPoint = {
  time: Number,
  accuracy: Number,
  altitude: Number,
  bearing: Number,
  latitude: Number,
  longitude: Number,
  speed: Number,

  isStationary: Boolean,
  
  provider: String,
  locationProvider: Number,
  isFromMockProvider: Boolean,
  mockLocationsEnabled: Boolean,
}

exports.GeoTrackInfo = {
  //source: Utils.actor(['ble_source'], {indexId:true}),
  created: Utils.created,

  timebounds: exports.TimeBoundsIndexed,

  location: exports.LocationBoundsIndexed,

  geobounds: exports.GeoBoundsIndexed,

  points: [exports.GeoPoint]
}

exports.ActivityInfo = {
  //source: Utils.actor(['ble_source'], {indexId:true}),
  created: Utils.created,

  timebounds: exports.TimeBoundsIndexed,

  activity: [{
    type: {type: String},
    confidence: Number,
    time: Number
  }]
}