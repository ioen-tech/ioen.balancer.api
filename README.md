# Redgrid.energy.api
This is the backend of the Redgrid.redgrid app.  This contains the REST API urls for all communicaation between the frontend and the backend.


## Developer Documentation

## Setup for Database
Please see https://github.com/redgridone/Redgrid.energy.schema/blob/main/README.md on how to setup the database locally.  This is a prerequisite for running the backend.

## Ioredis installation
IORedis() is a requirement for the `bullmq` package which manages the job scheduler.  Make sure to install ioredis server into your system.

To verify if ioredis is running on your local machine type the following command:
````
redis-cli
````
This will connect to your local server and will show you the host and port number.

##### Environment file
The following are the needed property to be set prior to running the api server.
````
JWT_SECRET=""
REDIS_HOST=
REDIS_PORT=

VUE_APP_FRONIUS_DEVICE_ID=
FRONIUS_URL=
FRONIUS_PVSYSTEMS_URL=
FRONIUS_PVSYSTEMS_AGGDATA=

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