// load in environment variables from .env file
import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import passport from 'passport'
import twilio from 'twilio'
import Expo from 'expo-server-sdk'
import cors from 'cors'
import { PrismaClient } from 'energy-schema'

import setupPassport from './jwt'
import usersRouter from './routes/users'

import { MailFunction, sendMail, mockSendMail } from './tools/mail'
import { setupQueue } from './scheduler'
import { Queue } from 'bullmq'

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
  twilioClient: twilio.Twilio,
  twilioSendNumber: string,
  mail: MailFunction,
  jobQueue?: Queue,
  portOverride?: number,
) {
  const app = express()
  app.use(express.static('public'))
  // json parser for (req.body)
  app.use(express.json())
  app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true
  }))
  // other custom middleware
  app.use(...middlewares)
  // setup authentication middleware
  const authenticateRoute = setupPassport(dbClient)
  app.use(passport.initialize())


  // mount routers
  app.use(
    '/users',
    usersRouter(dbClient, twilioClient, twilioSendNumber, authenticateRoute, mail, jobQueue),
  )
  // start server listening on port, wait for
  // it to be ready
  const portToUse = portOverride || port
  const server = app.listen(portToUse)
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

  // SMS: twilio config
  const TWILIO_SEND_NUMBER = process.env.TWILIO_SEND_NUMBER
  const USE_TWILIO = process.env.USE_TWILIO
  let twilioClient: twilio.Twilio
  if (USE_TWILIO === 'true') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    twilioClient = twilio(accountSid, authToken)
  }
  const USE_MAIL = process.env.USE_MAIL
  let mail: MailFunction
  if (USE_MAIL === 'true') {
    mail = sendMail
  } else {
    mail = mockSendMail
  }

  // as long as not running in test mode
  // set up the queues
  let jobQueue: Queue
  if (!process.env.JEST_WORKER_ID) {
    // notifications service
    const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN })
    jobQueue = setupQueue(dbClient, expo, mail)
  }

  await makeApp(
    dbClient,
    twilioClient,
    TWILIO_SEND_NUMBER,
    mail,
    jobQueue
  )
}

export default start
