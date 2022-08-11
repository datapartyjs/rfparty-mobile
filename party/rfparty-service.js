const Dataparty = require('@dataparty/api')
const debug = require('debug')('rfparty.service')

const Path = require('path')

class RfpartyService extends Dataparty.IService {
  constructor(opts){
    super(opts)

    this.addSchema(Path.join(__dirname, './schema/ban_list.js'))
    this.addSchema(Path.join(__dirname, './schema/venue_service.js'))

    this.addMiddleware(Dataparty.middleware_paths.pre.decrypt)
    this.addMiddleware(Dataparty.middleware_paths.pre.validate)

    this.addMiddleware(Dataparty.middleware_paths.post.validate)
    this.addMiddleware(Dataparty.middleware_paths.post.encrypt)

    this.addEndpoint(Dataparty.endpoint_paths.identity)
    this.addEndpoint(Dataparty.endpoint_paths.version)

    this.addEndpoint(Path.join(__dirname, './endpoints/create-service.js'))
  }

}

module.exports = RfpartyService