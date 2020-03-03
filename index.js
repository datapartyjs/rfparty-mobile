import './src/style.css'
import './src/app.js'

// Dynamically load cordova
var cordova = document.createElement('script')
cordova.setAttribute('type','text/javascript')
cordova.setAttribute('src', 'cordova.js')
document.getElementsByTagName("head")[0].appendChild(cordova)
