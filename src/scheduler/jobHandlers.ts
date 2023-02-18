import { Job, Queue } from 'bullmq'
import moment from 'moment-timezone'
import { Expo } from 'expo-server-sdk'

import { PrismaClient } from 'energy-schema'
import { RESILIENCE_OPTS } from '../tools/scheduling'

// JOB TYPES
const QUERY_FRONIUS_INFO = 'query_fronius_information'

const jobHandler = (
  dbClient: PrismaClient,
  expo: Expo,
  jobQueue: Queue
) => async (job: Job) => {
  switch (job.name) {
    case QUERY_FRONIUS_INFO:
      // await updateAdminDailyForecasts(dbClient, gridRenewablesQueue)
      break
    default:
      // log('unrecognized job name: ' + job.name)
      break
  }
}


export {
  QUERY_FRONIUS_INFO,
  jobHandler,
}
