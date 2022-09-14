import moment from 'moment';

const debug=require('debug')('rfparty.geo_track')

const Dataparty = require( '@dataparty/api/src/index-browser' )

const GeoUtils = require('../geo-utils')

module.exports = class GeoTrackDocument extends Dataparty.IDocument {
  constructor({ party, type, id, data }) {
    super({ party, type, id, data });
    debug("instantiated - ", this.id);

  }

  static async indexGeoPoint(party, point){

    let prev24 = moment().subtract(24, 'hours')

    let tracks = (await party.find()
      .type('geo_track')
      .where('timebounds.first').gt(prev24.valueOf())
      .sort('-timebounds.first')
      .exec())

    let track = tracks[0]

    if(!track){
      debug('found tracks', tracks)
      track = await GeoTrackDocument.createFromGeoPoint(party, point)
      debug('created', track)

      await track.save()
      return
    }

    debug('indexGeoPoint', track)

    track.data.points.push(point)
    track.data.geobounds = GeoUtils.updatGeoBoundsByPoint(track.data.geobounds, point)
    track.data.location = GeoUtils.updateLocation(track.data.location, point)
    track.data.timebounds = GeoUtils.updateTimebounds(track.data.timebounds, point.time)

    await track.save()

    return track
  }

  static get DocumentSchema(){
    return 'geo_track'
  }

  static async createFromGeoPoint(party, point){
    debug('create')

    const now = moment().valueOf()

    const loc = {
      lat: point.latitude, lon: point.longitude
    }

    return await party.createDocument('geo_track', {
      created: now,

      timebounds: { first: now, last: now },

      location: { first: loc, last: loc },

      geobounds: { min: loc, max: loc },

      points: [point]
    })
  }
}