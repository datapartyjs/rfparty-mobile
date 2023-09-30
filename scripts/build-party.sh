#!/bin/bash

set -x

mkdir -p dataparty
node ./party/rfparty-build.js
mkdir -p www/nodejs-project/dataparty
cp dataparty/*.json www/nodejs-project/dataparty
ls -lah dataparty
