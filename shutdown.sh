#!/bin/bash

NODE='tsc|tsOutput/app.js';
ANGULAR="ng serve";
REDIS=redisMDS;
POSTGRES=postgresMDS;

kill $(ps aux | grep -E "$NODE" | awk '{print $2}') > /dev/null 2>&1;

echo "Closed node server";

kill $(ps aux | grep "$ANGULAR" | awk '{print $2}') > /dev/null 2>&1;

echo "Closed angular server";

docker stop $REDIS > /dev/null 2>&1;

echo "Stopped redis container";

docker stop $POSTGRES > /dev/null 2>&1;

echo "Stopped postgres container";



