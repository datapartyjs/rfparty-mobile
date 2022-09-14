const moment = require('moment')

exports.updatGeoBoundsByPoint = (bounds, point)=>{

  if(!point){ return bounds }

  return {
    min: {
      lat: point.latitude < bounds.min.lat ? point.latitude : bounds.min.lat,
      lon: point.longitude < bounds.min.lon ? point.longitude : bounds.min.lon
    },
    max: {
      lat: point.latitude > bounds.max.lat ? point.latitude : bounds.max.lat,
      lon: point.longitude > bounds.max.lon ? point.longitude : bounds.max.lon
    }
  }
}

exports.updatGeoBoundsByGeoBounds = (bounds, otherBounds)=>{

  if(!otherBounds){ return bounds }

  return {
    min: {
      lat: otherBounds.min.lat < bounds.min.lat ? otherBounds.min.lat : bounds.min.lat,
      lon: otherBounds.min.lon < bounds.min.lon ? otherBounds.min.lon : bounds.min.lon
    },
    max: {
      lat: otherBounds.max.lat > bounds.max.lat ? otherBounds.max.lat : bounds.max.lat,
      lon: otherBounds.max.lon > bounds.max.lon ? otherBounds.max.lon : bounds.max.lon
    }
  }
}

exports.updateTimebounds = (bounds, time)=>{

  let retVal = {...bounds}

  let first = moment(bounds.first)
  let last = moment(bounds.last)
  let current = moment(time)

  if(last.isBefore(current)){

    let duration = current.diff(first, 'ms')

    retVal = {
      first: first.valueOf(),
      last: current.valueOf(),
      duration
    }
  }

  if(first.isAfter(current)){

    let duration = current.diff(first, 'ms')

    retVal = {
      first: current.valueOf(),
      last: last.valueOf(),
      duration
    }
  }

  return retVal
}

exports.updateLocation = (location, point)=>{

  if(!point){ return location }

  return {
    first: location.first,
    last: {
      lat: point.latitude,
      lon: point.longitude
    }
  }
}

exports.updateBestRssi = (best, current)=>{
  return best.rssi > current.rssi ? best : current
}

exports.updateWorstRssi = (worst, current)=>{
  return worst.rssi < current.rssi ? worst : current
}