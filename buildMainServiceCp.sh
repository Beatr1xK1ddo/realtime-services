#!/usr/bin/env bash

BUILD_ROOT_PATH="./dist/apps/nxt-realtime-main-service";
DAVINCI_ROOT_PATH="$HOME/code/nextologies/nxt-realtime-services/dist/apps/nxt-realtime-main-service";
DAVINCI_GRAPH_PATH="dv2@cp.nextologies.com:/home/www/dv2/services/";

#prepare build
#rm -rf ./build;
nx run nxt-realtime-main-service:build --prod

#copy files
eval rm -rf ${DAVINCI_GRAPH_PATH}*;
eval scp -r ${BUILD_ROOT_PATH} ${DAVINCI_GRAPH_PATH};

#build assets
#eval cd ${DAVINCI_ROOT_PATH};
#bin/console assets:install --symlink;
