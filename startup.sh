#!/bin/bash

NODEMON=node_modules/nodemon/bin/nodemon.js;
APP=app.js;
REDIS=redisMDS;
REDISPORT=6379;
ANGULAR=proiectMDSAngular
NODELOG=node.log
NGLOG=ng.log

docker container inspect $REDIS > /dev/null 2>&1;
retVal=$?;

if [ $retVal -ne 0 ]; then
    docker run -p $REDISPORT:$REDISPORT -d --name $REDIS redis/redis-stack-server:latest > /dev/null;
fi

docker start $REDIS > /dev/null;
node $NODEMON $APP > /dev/null 2>&1 >> $NODELOG &
cd $ANGULAR && nohup ng serve > /dev/null 2>&1 >> $NGLOG;