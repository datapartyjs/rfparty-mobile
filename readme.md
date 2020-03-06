# Cordova & parcel

Utilisation de ![](https://cordova.apache.org/static/img/cordova_24.png) [Cordova](https://cordova.apache.org/) avec le bundler ![](https://parceljs.org/assets/parcel.png) [ParcelJS](https://parceljs.org/).

## Pré-requis (Windows)

Vous devez avoir au préalable installé [l'environnement de développement d'Android](https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html#installing-the-requirements) :
- la JDK 1.8 (voir ici si besoins: https://github.com/AdoptOpenJDK/openjdk8-releases/releases)
- [Gradle](https://gradle.org/install/)
- le Android Platform SDK 18 (via Android Studio) ansi que les Android SDK build-tools version 19.1.0 

Dans les variables d'environnement il faut ajouter :
- `JAVA_HOME` : pointe sur le répertoire de la JDK
- `ANDROID_HOME` : répertoire du SKD Android (disponible dans l'onglet du SDK manager de Android Studio)
- dans `PATH` : le chemin des répertoires `tools`, `tools/bin`, and `platform-tools` depuis `ANDROID_HOME`

## Installation

Récupérer le projet et lancer la commande d'installation des composants.
```
$ npm install
```
Une fois les composants installés, initialisez le projet via la commande init:
```
$ npm run init
```

Au final, le répertoire doit contenir les dossiers suivant (hooks, platforms et plugins sont générés par init et ne sont pas intégrés au git) :
```
├[+].git
├─[+] hooks
├─[+] node_modules
├─[+] platforms
├─[+] plugins
├─[+] res
├─[+] scripts
|  ├──init.js
|  └──parcel.js
├─[+] src
|  ├─[+] assets
|  ├─[+] img
|  ├──app.js
|  └──style.css
├──config.xml
├──index.html
├──index.js
├──package.json
└──readme.md
```

Editez les fichiers `config.xml` et `package.json` afin de refléter l'identité de votre projet (identifiant, nom, version, etc.).

Ajoutez une platform au projet, comme n'importe quel projet cordova.
````
$ npx cordova platform add android
````

## Principe

![](https://i.imgur.com/X0iSUqI.png) Le projet utilise [ParcelJS](https://parceljs.org/) pour l'empaquetage de l'application dans le répertoire `./www` de cordova.
```
$ npm run build
```
> `parcel build index.html --no-content-hash --public-url . --out-dir ./www index.html`

Les sources sont dans le répertoire `./src`, le point d'entrée principal est dans le répertoire courant (`index.html` & `index.js`).    
Le répertoire d'assets (`src/assets`) est recopié à la racine du répertoire `./www` lors de l'empaquetage (plugin `parcel-plugin-static-files-copy`).

### Build

Le script cordova `parcel.js` est branché sur les hook `before_build` et `before_run` pour lancer l'empaquetage avant le build ou le run (`config.xml`).
```
$ npx cordova run
```
Processing flow :
> `npm run build` > `cordova run`

### Lint

Le projet est fourni avec un outil d'analyse statique du code (eslint). Pour le lancer, utilisez la commande:
```
$ npm run lint
```

## Usage

### Page web & Live reload
Parcel permet un affichage du projet dans un navigateur.
Si cela ne donne pas accès aux fonctionnalités du device (photo, système de fichier), cela permet de tester les fonctionnalités de manière plus rapide qu'une installation sur un smartphone (mise en page, css; etc.).

Démarrer une serveur + live reload
```
$ npm start
```
Aller sur la page http://localhost:1234 pour voir l'application.

### Empaqueter l'application :

L'empaquetage se fait sans les sourcemaps et en minifiant le code.
```
$ npm run build
```
Si on ne veut pas minifier le code (debug) :
```
$ npm run build-dev
```

### Lancer l'application sur un smartphone
Commande `run` classique de Cordova.
```
$ npx cordova run
```
En mode debug (non minifié)
```
$ npx cordova run --dev
```
NB: les sourcemaps `.map` ne sont pas accessible depuis le device, seul une version non minifiée est accessible en mode debug.

### Compiler l'application 
Commande `build` classique de Cordova.
```
$ npx cordova build
```
Compiler (non minifier)
```
$ npx cordova build --dev
```
Compiler en mode release
```
$ npx cordova build --release
$ npx cordova build android --buildConfig=build.json --release
```
