#!/bin/bash

killall java
cordova clean android
cordova platform rm android
#rm -rf node_modules
#npm i
#npm run prepare-nodejs
cordova platform add android@latest
#cordova plugin add cordova-plugin-androidx
cordova plugin add nodejs-mobile-cordova
cordova plugin add cordova-plugin-exclude-files
cordova plugin add cordova-background-geolocation-plugin
cordova run android --debug
ls -lah platforms/android/app/build/outputs/apk/debug/app-debug.apk
