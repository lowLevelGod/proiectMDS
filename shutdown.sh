#!/bin/bash

NODE="node node_modules/nodemon/bin/nodemon.js app.js";
ANGULAR="ng serve";
REDIS=redisMDS;

kill $(ps aux | grep "$NODE" | awk '{print $2}') > /dev/null 2>&1;

echo "Closed node server";

kill $(ps aux | grep "$ANGULAR" | awk '{print $2}') > /dev/null 2>&1;

echo "Closed angular server";

docker stop $REDIS > /dev/null 2>&1;

echo "Stopped redis container";


