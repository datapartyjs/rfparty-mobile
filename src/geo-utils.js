const moment = require('moment')

exports.updatGoeBoundsByPoint = (bounds, point)=>{

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
  return {
    first: location.first,
    last: {
      lat: point.latitude,
      lon: point.longitude
    }
  }
}