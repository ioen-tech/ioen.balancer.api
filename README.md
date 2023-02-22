# Redgrid.energy.api
This is the backend of the Redgrid.redgrid app.  This contains the REST API urls for all communicaation between the frontend and the backend.


## Developer Documentation

## Setup for Database
Please see https://github.com/redgridone/Redgrid.energy.schema/blob/main/README.md on how to setup the database locally.  This is a prerequisite for running the backend.

## Ioredis installation
IORedis() is a requirement for the `bullmq` package which manages the job scheduler.  Make sure to install ioredis server into your system.

##### Environment file
The following are the needed property to be set prior to running the api server.
````
JWT_SECRET=""
REDIS_HOST=
REDIS_PORT=
PRODUCTION=
````

## Running Server Locally

First time, run:
```bash
npm install
```

First time, and all future times, to run the server with live-reload, run:
```bash
npm run dev
```