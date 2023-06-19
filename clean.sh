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
#cordova plugin add nodejs-mobile-cordova
#cordova plugin add cordova-plugin-exclude-files
#cordova plugin add @mauron85/cordova-plugin-background-geolocation
cordova plugin add cordova-plugin-inappbrowser
cordova plugin add https://github.com/sevenbitbyte/cordova-plugin-powermanagement.git
cordova plugin add https://github.com/sevenbitbyte/cordova-plugin-background-mode.git
cordova plugin add cordova-plugin-purchase --variable BILLING_KEY="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvyxyAvvP0G+lImRdJDWE3zlEo6CVnYGZaX4ivaQCbuRXF1V8RoOv5+Tl7lndz4SvV8Bi2P4JF2EPOnaGRkGdeD778wMKB+VoSIZ43Rp0+b5df8lQ70NiFpIJmvJ3tW9C2g88Iv636bf/9nvLZtvtIVMnJ3gi/IuOYfX7IbdiOw1ZC9K5oz8ymLtqghQe9AraMBAlm1FAoTOztIq5GZ+M5qXn6kSKG4SNzi2nKWr9yGuLvH53RlxQr6oWToWnH/m+fXINHekhgJW78CZREzW0BbgencXEcuu7CP+16U00evzCPKKo/Km8hnoBq08mOl33m1IzCAvw7J8ggr6Vav9YsQIDAQAB"
cordova run android --debug
ls -lah platforms/android/app/build/outputs/apk/debug/app-debug.apk
