import { Job, Queue } from 'bullmq'
import moment from 'moment-timezone'
import { Expo } from 'expo-server-sdk'

import { PrismaClient } from 'energy-schema'
import { RESILIENCE_OPTS } from '../tools/scheduling'
import { query } from 'express'
import { handlePushNotifications, sendDailyPushNotification } from '../notifications/notifications'

import axios from 'axios'

// JOB TYPES
const QUERY_FRONIUS_USERS = 'query_fronius_users'
const QUERY_FRONIUS_USER = 'query_fronius_user'
const QUERY_GROUP_NAMES = 'query_group_names'
const QUERY_USERS_PER_GROUP = 'query_users_per_group'
const SEND_DAILY_NOTIFICATION = 'send_daily_notification'

const jobHandler = (
  dbClient: PrismaClient,
  expo: Expo,
  jobQueue: Queue,
  firebaseAdmin: any,
) => async (job: Job) => {
  switch (job.name) {
    case QUERY_GROUP_NAMES:
      await queryGroupNames(dbClient, jobQueue)
      break
    case QUERY_USERS_PER_GROUP:
      const groupId: number = job.data.group_id
      await queryUsersPerGroup(dbClient, groupId, jobQueue)
      break
    case SEND_DAILY_NOTIFICATION:
      await sendDailyNotification(dbClient, jobQueue, firebaseAdmin)
      break
    default:
      console.log('unrecognized Job name: ' + job.name)
      break
  }
}

const sendDailyNotification = async (dbClient: PrismaClient, queue: Queue, firebaseAdmin) => {
  console.log("Send daily Notifications")
  await sendDailyPushNotification(dbClient, queue, firebaseAdmin)
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
      let froniusQuery = await axios.get(url, {
        headers: {
          'accept': 'application/json', 
          'AccessKeyId': user.fronius_info.fronius_accesskey_id,
          'AccessKeyValue': user.fronius_info.fronius_accesskey_value, 
          'Authorization': bearer,
        }
      })

      let userEnergy = parseInt(JSON.stringify(froniusQuery.data.data.channels[0].value), 10);

      let retries = 0
      // Sometimes fronius data returns a NaN
      if (isNaN(userEnergy)) {
        // Query fronius 3 times if it returns a NaN
        while (retries < 3) {
          console.log("Fronious data(isNan): ", JSON.stringify(froniusQuery.data.data.channels[0].value))

          froniusQuery = await axios.get(url, {
            headers: {
              'accept': 'application/json', 
              'AccessKeyId': user.fronius_info.fronius_accesskey_id,
              'AccessKeyValue': user.fronius_info.fronius_accesskey_value, 
              'Authorization': bearer,
            }
          })
          userEnergy = parseInt(JSON.stringify(froniusQuery.data.data.channels[0].value), 10);
          if (!isNaN(userEnergy)) {
            break
          }
          console.log('Retry #: ', retries)
          retries++
        }
      }
      totalGroupEnergy += userEnergy

      console.log(`user: ${user.user_id}:${user.username}, energy: ${userEnergy}`)
    }

  }


  // Sometimes query to fronius returns status code 401.
  // check if totalGroupEnergy is null or nan
  if (!isNaN(totalGroupEnergy)) {
    // Group totalbal / 8640 = per interval reward for group
    // per interval for group / amount of group members = per interval reward for member
    const group = await dbClient.groups.findFirst({
      where: {
        group_id: groupId
      }
    })
    console.log(`${group.group_name} Energy: ${totalGroupEnergy}`)
    const numMembers = await dbClient.groupMembers.count({
      where: {
        group_id: groupId
      }
    })

    // Check if group has minimum users, if not skip this
    if (numMembers >= group.min_users) {
      const groupReward = Math.round(group.reward_start_balance / 8640)
      const memberReward = Math.round(groupReward / numMembers)

      const gupdate = {group_energy: totalGroupEnergy}
      if (totalGroupEnergy > -500 && totalGroupEnergy < 500) {
        // Group energy is Balanced
        console.log(`groupReward: ${groupReward}`)
        console.log(`memberReward: ${memberReward}`)
        gupdate['reward_start_balance'] = {increment: groupReward}

        // Update User reward points
        for (let user of groupMembers) {
          await dbClient.users.update({
            where: {
              user_id: user.user_id
            },
            data: {
              rewards_points: {
                increment: memberReward
              }
            }
          })
        }

        // Update user daily notification table
        for (let user of groupMembers) {
          await dbClient.dailyNotification.update({
            where: {
              user_id: user.user_id
            },
            data: {
              daily_rewards: {
                increment: groupReward
              },
              balanced_count: {
                increment: 1
              }
            }
          })
        }
      } else if (totalGroupEnergy < -500) {
        // Group Energy is Producing
        console.log("Group energy is Producing")
        // Update user daily notification table
        for (let user of groupMembers) {
          await dbClient.dailyNotification.update({
            where: {
              user_id: user.user_id
            },
            data: {
              daily_rewards: {
                increment: groupReward
              },
              producing_count: {
                increment: 1
              }
            }
          })
        }
      } else {
        // Group Energy is Consuming
        console.log("Group energy is Consuming")
        // Update user daily notification table
        for (let user of groupMembers) {
          await dbClient.dailyNotification.update({
            where: {
              user_id: user.user_id
            },
            data: {
              daily_rewards: {
                increment: groupReward
              },
              consuming_count: {
                increment: 1
              }
            }
          })
        }
      }
      // Update Group Energy
      await dbClient.groups.update({
        where: {
          group_id: groupId
        },
        data: gupdate
      })

      // Create energy Logs
      await dbClient.groupEnergyLogs.create({
        data: {
          event_time: moment().unix(),
          energy: totalGroupEnergy,
          group_id: groupId
        }
      })
    } else {
      console.log(`Group ${group.group_name} does not reach the minimum users`)
    }
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
  SEND_DAILY_NOTIFICATION,
  jobHandler,
}
