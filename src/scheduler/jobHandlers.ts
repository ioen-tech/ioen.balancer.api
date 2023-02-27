import { Job, Queue } from 'bullmq'
import moment from 'moment-timezone'
import { Expo } from 'expo-server-sdk'

import { PrismaClient } from 'energy-schema'
import { RESILIENCE_OPTS } from '../tools/scheduling'
import { query } from 'express'

import axios from 'axios'

// JOB TYPES
const QUERY_FRONIUS_USERS = 'query_fronius_users'
const QUERY_FRONIUS_USER = 'query_fronius_user'
const QUERY_GROUP_NAMES = 'query_group_names'
const QUERY_USERS_PER_GROUP = 'query_users_per_group'

const jobHandler = (
  dbClient: PrismaClient,
  expo: Expo,
  jobQueue: Queue
) => async (job: Job) => {
  switch (job.name) {
    case QUERY_GROUP_NAMES:
      await queryGroupNames(dbClient, jobQueue)
      break
    case QUERY_USERS_PER_GROUP:
      const groupId: number = job.data.group_id
      await queryUsersPerGroup(dbClient, groupId, jobQueue)
      break
    default:
      console.log('unrecognized Job name: ' + job.name)
      break
  }
}

const queryUsersPerGroup = async (dbClient: PrismaClient, groupId: number, queue: Queue) => {
  // Query users per group.
  const groupMembers = await dbClient.groupMembers.findMany({
    where: {
      group_id: groupId
    }
  })

  let totalGroupEnergy = 0
  for (let groupMember of groupMembers) {
    const user = await dbClient.users.findFirst({
      include: {
        fronius_info: true
      },
      where: {
        user_id: groupMember.user_id
      }
    })

    // Query fronius Info
    if (user) {
      // get the jwtQuery Token
      const jwtQuery = await axios.post(process.env.FRONIUS_URL, {
        userId: user.fronius_info.fronius_userid,
        password: user.fronius_info.fronius_password
      },
      {
        headers: {
          accept: 'application/json',
          AccessKeyId: user.fronius_info.fronius_accesskey_id,
          AccessKeyValue: user.fronius_info.fronius_accesskey_value
        },
      }
      )
      const token = jwtQuery.data.jwtToken
      const bearer = 'Bearer ' + token

      // calculate Power Requirements
      const url = `${process.env.FRONIUS_PVSYSTEMS_URL}/${user.fronius_info.fronius_device_id}/${process.env.FRONIUS_PVSYSTEMS_AGGDATA}`
      const froniusQuery = await axios.get(url, {
        headers: {
          'accept': 'application/json', 
          'AccessKeyId': user.fronius_info.fronius_accesskey_id,
          'AccessKeyValue': user.fronius_info.fronius_accesskey_value, 
          'Authorization': bearer,
        }
      })
      const userEnergy = parseInt(JSON.stringify(froniusQuery.data.data.channels[0].value), 10);
      totalGroupEnergy += userEnergy

      console.log(`user: ${user.user_id}, energy: ${userEnergy}`)
    }

    console.log(`Group Energy: ${totalGroupEnergy}`)

    // Sometimes query to fronius returns status code 401.  
    if (totalGroupEnergy) {
      // Update Group Energy
      await dbClient.groups.update({
        where: {
          group_id: groupId
        },
        data: {
          group_energy: totalGroupEnergy
        }
      })
    }

    // Calculate Rewards here. TBD...
  }
}

const queryGroupNames = async (dbClient: PrismaClient, queue: Queue) => {
  // Query group energy and update group DB
  const groups = await dbClient.groups.findMany({})

  for (let group of groups) {
    queue.add(QUERY_USERS_PER_GROUP, {
      group_id: group.group_id
    }, {
      ...RESILIENCE_OPTS
    }).catch((e) => {
      console.log(`Error while trying to add a ${QUERY_USERS_PER_GROUP}`)
    })
  }


}



export {
  QUERY_FRONIUS_USERS,
  QUERY_FRONIUS_USER,
  QUERY_GROUP_NAMES,
  jobHandler,
}
