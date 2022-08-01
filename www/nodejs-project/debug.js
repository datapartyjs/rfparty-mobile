let Dbg = require('debug')

Dbg.enable('*')

module.exports = class Debug{
  constructor(cordova, name){
    this.name = name || 'context.undefined'
    this.cordova = cordova
  }

  debug(msg, ...args){
    let stack = (new Error().stack).split('at ')
    let line = stack[2].trim()

    const openParen = line.indexOf('(') + 1
    const closeParen = line.indexOf(')')

    const filePath = line.substring(openParen, closeParen).replace(__dirname, '')
    line = filePath

    const newMsg = this.name +': ' + line + ' ' + msg

    const logObj = {
      file: filePath,
      time: Date.now(),
      //msg: msg + ' ' + args.map(v=>{return JSON.stringify(v)}).join(' ')
      //stack: stack,
      msg: msg + ' ' + args.map(v=>{return JSON.stringify(v)}).join(' ')
    }

    //this._debugContent.push(logObj)

    this.cordova.channel.post('debug', this.name+': '+logObj.file+' - '+logObj.msg)
  }
}

