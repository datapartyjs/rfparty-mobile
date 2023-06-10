# RFParty Mobile App!

[rfparty is a new way to see BLE](https://blog.dataparty.xyz/blog/rfparty-a-new-way-to-see-ble/)

[![rfparty collage ](https://img.youtube.com/vi/kDboDShA8do/0.jpg)](https://www.youtube.com/watch?v=kDboDShA8do)

Based on ![](https://cordova.apache.org/static/img/cordova_24.png) [Cordova](https://cordova.apache.org/) and the bundler ![](https://parceljs.org/assets/parcel.png) [ParcelJS](https://parceljs.org/).

## Installation

Clone this project and run the npm package installation command.
```
$ npm install
```
Once the components are installed, initialize the project via the init command:
```
$ npm run init
```

Add a platform to the project, like any cordova project.
````
$ npx cordova platform add android
````

# Development

## Build

The `parcel.js` cordova script is plugged into the `before_build` and `before_run` hooks to start packaging before the build or run (`config.xml`).
```
$ npx cordova run
```
Processing flow :
> `npm run build` > `cordova run`

## Lint

The project comes with a static code analysis tool (eslint). To launch it, use the command:
```
$ npm run lint
```

## Usage

### Build RFParty

To package without the sourcemaps and minify the code run the build command.
```
$ npm run build
```
If you don't want to minify the code (debug):
```
$ npm run build-dev
```

### Launch RFParty on a smartphone emulator
Basic Cordova `run` command:
```
$ npx cordova run
```
In debug mode (not minified):
```
$ npx cordova run --dev
```
Note: `.map` sourcemaps are not accessible from the device, only an unminified version is accessible in debug mode.

### Build RF Party
Basic Cordova `build` command:
```
$ npx cordova build
```
Compile non minified:
```
$ npx cordova build --dev
```
Compile in release mode:
```
$ npx cordova build --release
$ npx cordova build android --buildConfig=build.json --release
```

## Follow and Support

 * [Twitter](https://twitter.com/datapartydao)
 * [Buy it on Google Play](https://play.google.com/store/apps/details?id=xyz.dataparty.rfparty)
 * Donate 🤲
   * https://ko-fi.com/dataparty
