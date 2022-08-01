const Dataparty = require('@dataparty/api')
const DatapartySrv = Dataparty.Service
const debug = require('debug')('rfparty.service')

const Path = require('path')

class RfpartyService extends DatapartySrv.IService {
  constructor(opts){
    super(opts)

    this.addSchema(Path.join(__dirname, './schema/track.js'))
    /*this.addSchema(Path.join(__dirname, './schema/source.js'))
    this.addSchema(Path.join(__dirname, './schema/station_ble.js'))
    this.addSchema(Path.join(__dirname, './schema/station_wifi.js'))
    this.addSchema(Path.join(__dirname, './schema/advertisement_ble.js'))
    this.addSchema(Path.join(__dirname, './schema/advertisement_wifi.js'))*/

    this.addMiddleware(DatapartySrv.middleware_paths.pre.decrypt)
    this.addMiddleware(DatapartySrv.middleware_paths.pre.validate)

    this.addMiddleware(DatapartySrv.middleware_paths.post.validate)
    this.addMiddleware(DatapartySrv.middleware_paths.post.encrypt)

    this.addEndpoint(DatapartySrv.endpoint_paths.identity)
    this.addEndpoint(DatapartySrv.endpoint_paths.version)

    this.addEndpoint(Path.join(__dirname, './endpoints/create-service.js'))
  }

}

module.exports = RfpartyService