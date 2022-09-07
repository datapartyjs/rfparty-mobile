#!/bin/bash

set -x

node ./party/rfparty-build.js
cp dataparty/*.json www/nodejs-project/party