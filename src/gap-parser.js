import * as UUID16_TABLES from './16bit-uuid-tables'
import * as MANUFACTURER_TABLE from './manufacturer-company-id.json' 
const DeviceIdentifiers = require('./device-identifiers')


export class UUIDParser {

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
      deviceType = UUIDParser.lookupUuid16(uuid)
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
        ...(UUIDParser.reverseLookupByName(
            UUID16_TABLES[type], term, '/'+type+'/'
        ).map( name=>{return '/'+type+'/'+name }) )
      )
    }
    
    return possibles.concat( 
      UUIDParser.reverseLookupByName(DeviceIdentifiers.APPLE_Continuity, term),
      UUIDParser.reverseLookupByName(DeviceIdentifiers.UUID, term)
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

  static decode16bitUuid(field){
    let uuid = field.raw.data.reverse().toString('hex')

    field.raw.data = uuid
    field.value = UUIDParser.lookupDeviceUuid(uuid) || uuid
  }
}

const GAP_TYPES = {
  0x01: {decode:'hex', name: 'Flags'},
  0x02: {decode:'hex', parser: UUIDParser.decode16bitUuid, name: 'ServiceClassUUIDs'},  //Incomplete 16-bit list
  0x03: {decode:'hex', parser: UUIDParser.decode16bitUuid, name: 'ServiceClassUUIDs'},  //Complete 16-bit list
  0x04: {decode:'hex', name: 'ServiceClassUUIDs'},  //Incomplete 32-bit list
  0x05: {decode:'hex', name: 'ServiceClassUUIDs'},  //Complete 32-bit list
  0x06: {decode:'hex', name: 'ServiceClassUUIDs'},  //Incomplete 128-bit list
  0x07: {decode:'hex', name: 'ServiceClassUUIDs'},  //Complete 128-bit list
  0x08: {decode:'utf8', name: 'LocalName'},          //Shortened local name
  0x09: {decode:'utf8', name: 'LocalName'},          //Complete local name
  0x0A: {decode:'hex', name: 'TxPower'},
  0x0D: {decode:'hex', name: 'DeviceClass'},
  0x0E: {decode:'hex', name: 'SimplePairingHash'},
  0x0F: {decode:'hex', name: 'SimplePairingRandomizer'},
  0x10: {decode:'hex', name: 'DeviceID'},     //0x10: 'SecurityManagerTK',
  0x11: {decode:'hex', name: 'SecurityManagerOutOfBandFlags'},
  0x12: {decode:'hex', name: 'SlaveConnectionIntervalRange'},
  0x14: {decode:'hex', name: 'ServiceUUIDs'},       //16bit list
  0x15: {decode:'hex', name: 'ServiceUUIDs'},       //128bit list
  0x16: {decode:'hex', name: 'ServiceData'},        // 16bit uuid + data
  0x17: {decode:'hex', name: 'PublicTargetAddress'},
  0x18: {decode:'hex', name: 'RandomTargetAddress'},
  0x19: {decode:'hex', name: 'Appearance'},
  0x1A: {decode:'hex', name: 'AdvertisingInterval'},
  0x1B: {decode:'hex', name: 'LEDeviceAddress'},
  0x1C: {decode:'hex', name: 'LERole'},
  0x1D: {decode:'hex', name: 'SimplePairingHash'},      //256
  0x1E: {decode:'hex', name: 'SimplePairingRandomizer'},//256
  0x1F: {decode:'hex', name: 'ServiceUUIDs'},      //32 bit list
  0x20: {decode:'hex', name: 'ServiceData'},       //32bit uuid + data
  0x21: {decode:'hex', name: 'ServiceData'},       //128bit uuid + data
  0x22: {decode:'hex', name: 'LESecureConnectionsConfirmationValue'},
  0x23: {decode:'hex', name: 'LESecureConnectionsRandomValue'},
  0x24: {decode:'hex', name: 'URI'},
  0x25: {decode:'hex', name: 'IndoorPositioning'},
  0x26: {decode:'hex', name: 'TransportDiscoveryData'},
  0x27: {decode:'hex', name: 'LESupportedFeatures'},
  0x28: {decode:'hex', name: 'ChannelMapUpdateIndication'},
  0x29: {decode:'hex', name: 'PB_ADV'},
  0x2A: {decode:'hex', name: 'MeshMessage'},
  0x2B: {decode:'hex', name: 'MeshBeacon'},
  0x2C: {decode:'hex', name: 'BIGInfo'},
  0x2D: {decode:'hex', name: 'BroadcastCode'},
  0x2E: {decode:'hex', name: 'ResolvableSetIdentifier'},
  0x2F: {decode:'hex', name: 'AdvertisingInterval'}, //Long
  0x30: {decode:'hex', name: 'BroadcastName'},
  0x3D: {decode:'hex', name: '3DInformationData'},
  0xFF: {decode:'hex', name: 'ManufacturerData'}
}

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

export class GapField{
  constructor(buffer, offset=0){
    this.value = null
    this.raw = {}
    this.raw.offset = offset
    this.raw.field_length = buffer[this.raw.offset]
    this.raw.data_length = this.raw.field_length - 1
    this.raw.offset_next = this.raw.offset + this.raw.field_length + 1



    if(this.raw.field_length > 0){
      this.raw.type = buffer[this.raw.offset+1]

      const Type = GAP_TYPES[this.raw.type] || {}


      this.type = Type.name || 'unknown('+this.raw.type+')'

      
      if(Type.parser && typeof Type.parser == 'function'){
        this.raw.data = buffer.slice( this.raw.offset+2, this.raw.offset_next )
        Type.parser(this)
      } else {
        this.raw.data = buffer.slice( this.raw.offset+2, this.raw.offset_next ).toString( Type.decode || 'hex' )
        this.value = this.raw.data
      }

    }

  }

  toJson(){
    //
  }


}


export class GapParser{

  static parseBuffer(buffer){

    let idx = 0
    let fields = []
    while(idx < buffer.length){
      let field = new GapField( buffer, idx )

      if(field.raw.data_length < 1){ break }
      
      fields.push( field )

      idx = field.raw.offset_next
    }

    return fields
  }

  static parseBase64String(data){
    const buffer = Buffer.from( data, 'base64' )

    return GapParser.parseBuffer(buffer)
  }
}