import * as UUID16_TABLES from '../16bit-uuid-tables'
import * as MANUFACTURER_TABLE from '../manufacturer-company-id.json' 
const DeviceIdentifiers = require('../device-identifiers')


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