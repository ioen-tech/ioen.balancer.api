import moment from 'moment-timezone'
import Expo from 'expo-server-sdk'
import IORedis from 'ioredis'
import { Worker, Queue, QueueScheduler, JobsOptions, RepeatOptions } from 'bullmq'

import { PrismaClient } from 'energy-schema'
import { repeatAtHours, repeatAtMinutes, RESILIENCE_OPTS } from '../tools/scheduling'
const TIMEZONE = 'Australia/Victoria'
import {
  jobHandler,
  QUERY_FRONIUS_USER,
  QUERY_FRONIUS_USERS,
  QUERY_GROUP_NAMES,
  SEND_DAILY_NOTIFICATION,
} from './jobHandlers'
import { MailFunction } from '../tools/mail'

/* Explanation

*/

// https://docs.bullmq.io/
const setupQueue = (dbClient: PrismaClient, expo: Expo, mail: MailFunction, firebaseAdmin: any) => {
  const redisUrl = process.env.REDISCLOUD_URL
  // just use default localhost:6379 as fallback
  const redisConnection = redisUrl ? new IORedis(redisUrl) : new IORedis({maxRetriesPerRequest: null})
  const queueOpts = { connection: redisConnection }

  /*
    Repeatable jobs are just delayed jobs, therefore you also
    need a QueueScheduler instance to schedule the jobs accordingly.
  */
  const QUEUE_NAME = 'nanogrid'
  const jobQueue = new Queue(QUEUE_NAME, queueOpts)
  const queueScheduler = new QueueScheduler(QUEUE_NAME, queueOpts)

  // These can be uncommented and run to clean the queue
  jobQueue.drain(true)
  jobQueue.clean(0, 0)
  process.on('beforeExit', async () => {
    await queueScheduler.close()
  })
  const worker = new Worker(
    QUEUE_NAME,
    jobHandler(
      dbClient,
      expo,
      jobQueue,
      firebaseAdmin
    ),
    queueOpts,
  )
  worker.on('failed', (error) => {
    console.error('attempt ' + error.attemptsMade + ':', error.failedReason)
  })

  // Repeat job to query fronius server every 5 minute interval
  setupRepeatingJob(
    jobQueue,
    QUERY_GROUP_NAMES,
    repeatAtMinutes('*/5', TIMEZONE), // every 5 minutes
    'successfully scheduled every 5 minutes to query Fronius',
    'failed to schedule to query Fronius every 5 minutes',
    false
  )

  // Repet job to send a daily push notification to subscibe users.
  setupRepeatingJob(
    jobQueue,
    SEND_DAILY_NOTIFICATION,
    repeatAtMinutes('53', TIMEZONE), // every 5 minutes
    'successfully scheduled every day to send daily push notification',
    'failed to schedule to send daily push notification',
    false
  )
  return jobQueue
}

const setupRepeatingJob = async (
  jobQueue: Queue,
  jobName: string,
  atTimes: RepeatOptions,
  successMessage: string,
  failureMessage: string,
  skipResilience?: boolean,
) => {
  try {
    await jobQueue.add(
      jobName,
      null, // no data to pass in
      {
        repeat: atTimes,
        ...(skipResilience ? {} : RESILIENCE_OPTS),
      },
    )
    // log(successMessage)
    console.log(successMessage)
  } catch (error) {
    console.error(failureMessage, error)
  }
}

export { setupQueue }
