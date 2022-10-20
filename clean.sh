#!/bin/bash

killall java
cordova clean android
cordova platform rm android
rm -rf node_modules
rm -rf plugins
rm -rf platforms
rm package-lock.json
npm i
#npm run prepare-nodejs
cordova platform add android@latest
#cordova plugin add cordova-plugin-androidx
cordova plugin add nodejs-mobile-cordova
#cordova plugin add cordova-plugin-exclude-files
#cordova plugin add @mauron85/cordova-plugin-background-geolocation
cordova plugin add cordova-plugin-inappbrowser
cordova plugin add https://github.com/sevenbitbyte/cordova-plugin-powermanagement.git
cordova plugin add https://github.com/sevenbitbyte/cordova-plugin-background-mode.git
cordova run android --debug
ls -lah platforms/android/app/build/outputs/apk/debug/app-debug.apk
