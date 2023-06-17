#!/bin/bash

NODEMON=node_modules/nodemon/bin/nodemon.js;
APP=app.js;
REDIS=redisMDS;
POSTGRES=postgresMDS;
POSTGRESPORT=5432;
REDISPORT=6379;
NODELOG=node.log;
NGLOG=ng.log;

docker version;
retVal=$?;

if [ $retVal -ne 0 ]; then
		echo "Docker must be installed to run this script. Install Docker and try again.";
		exit 1;
fi

docker container inspect $REDIS > /dev/null 2>&1;
retVal=$?;

if [ $retVal -ne 0 ]; then
    docker run -p $REDISPORT:$REDISPORT -d --name $REDIS redis/redis-stack-server:latest > /dev/null;
fi

docker container inspect $POSTGRES > /dev/null 2>&1;
retVal2=$?;

if [ $retVal2 -ne 0 ]; then
    docker run -p $POSTGRESPORT:$POSTGRESPORT --name $POSTGRES -e POSTGRES_PASSWORD=mysecretpassword -d postgres > /dev/null;
fi

docker start $REDIS > /dev/null;
docker start $POSTGRES > /dev/null;

echo "Running node server...";

npm run dev > /dev/null 2>&1 >> $NODELOG

