// load in environment variables from .env file
import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import passport from 'passport'
import Expo from 'expo-server-sdk'
import cors from 'cors'
import multer from 'multer'
import { PrismaClient } from 'energy-schema'

import setupPassport from './jwt'
import usersRouter from './routes/users'

import { MailFunction, sendMail, mockSendMail } from './tools/mail'
import { setupQueue } from './scheduler'
import { Queue } from 'bullmq'
import path from 'path'
import { Server } from 'socket.io'

const port = process.env.PORT || 3000

const loggerMiddleware: express.RequestHandler = (req, _res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('received request to path: ', req.path)
  }
  next()
}
const middlewares = [loggerMiddleware]

async function makeApp(
  dbClient: PrismaClient,
  mail: MailFunction,
  jobQueue?: Queue,
  firebaseAdmin?: any,
  portOverride?: number,
) {
  const app = express()
  app.use(express.static('public'))
  // json parser for (req.body)
  app.use(express.json())
  app.use(cors({
    origin: '*'
  }))
  // other custom middleware
  app.use(...middlewares)
  // setup authentication middleware 
  const authenticateRoute = setupPassport(dbClient)
  app.use(passport.initialize())

  // filter uploaded file.
  const storage = multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, __dirname + "/uploads")
    },
    filename: function(req, file, callback) {
      callback(null, file.originalname)
    }
  })

  const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/webp') {
      cb(null, true)
    } else {
      cb(new Error("Not an image! Please upload an image"))
    }
  }

  app.use('/logos', express.static('src/uploads'))
  // const uploads = multer({dest: __dirname + "/uploads"})
  const uploads = multer({
    storage: storage,
    limits: {
      fileSize: 5241288,
      files: 1
    },
    fileFilter: fileFilter
  })
  
  // mount routers
  app.use(
    '/users',
    usersRouter(dbClient, authenticateRoute, mail, jobQueue, uploads, firebaseAdmin),
  )


  // start server listening on port, wait for
  // it to be ready
  const portToUse = portOverride || port
  const server = app.listen(portToUse)
  
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
  })

  // Initialize Websocket / Socketio server.
  io.on("connection", socket => {
    console.log("New User Connected: ", socket.id)
    socket.on('disconnect', () => {
      console.log("A User id disconnected")
    })

    socket.on("send-message", message => {
      // This will broadcast to the connected client that
      // there is an update with their group energy.
      socket.broadcast.emit(message, message)
    })
  })

  await new Promise((resolve, reject) => {
    server.on('listening', resolve)
    server.on('error', reject)
  })
  console.log(`RedGrid API listening at http://localhost:${portToUse}`)

  return {
    app,
    server,
  }
}

export { makeApp }

async function start() {
  // database
  const dbClient = new PrismaClient()

  const USE_MAIL = process.env.USE_MAIL
  let mail: MailFunction
  if (USE_MAIL === 'true') {
    mail = sendMail
  } else {
    mail = mockSendMail
  }

  // setup firebase admin sdk
  const firebaseAdmin = require("firebase-admin");
  var serviceAccount = require(path.join(__dirname, '../nanogrid-fcm.json'));
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount)
  });


  // as long as not running in test mode
  // set up the queues
  let jobQueue: Queue
  if (!process.env.JEST_WORKER_ID) {
    // notifications service
    const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN })
    jobQueue = setupQueue(dbClient, expo, mail, firebaseAdmin)
  }

  await makeApp(
    dbClient,
    mail,
    jobQueue,
    firebaseAdmin
  )
}

export default start
