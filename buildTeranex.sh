#!/usr/bin/env bash

BUILD_ROOT_PATH="./dist/apps/nxt-teranex-controller";
DAVINCI_ROOT_PATH="$HOME/code/nextologies/davinci/";
DAVINCI_GRAPH_PATH="$HOME/code/nextologies/davinci/src/Nl/DavinciBundle/Resources/public/nxt/teranex/";

#prepare build
#rm -rf ./build;
nx run nxt-teranex-controller:build --prod --skip-nx-cache

#copy files
eval rm -rf ${DAVINCI_GRAPH_PATH}*;
eval cp -r ${BUILD_ROOT_PATH}/. ${DAVINCI_GRAPH_PATH};

#build assets
#eval cd ${DAVINCI_ROOT_PATH};
#bin/console assets:install --symlink;
