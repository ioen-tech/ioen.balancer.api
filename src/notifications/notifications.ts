import { Queue } from 'bullmq'
import { Expo, ExpoPushMessage, ExpoPushReceiptId, ExpoPushToken } from 'expo-server-sdk'
import { DailyNotification, PrismaClient, Users} from 'energy-schema'
// import { POST_PROCESS_NOTIFICATION_RECEIPTS } from '../scheduler/jobHandlers'
import moment from 'moment'
import { getMessaging, Message } from 'firebase-admin/messaging'

const findNonNullFcmTokens = async (dbClient: PrismaClient): Promise<Users[]> => {
  return dbClient.users.findMany({
    where: {
      fcm_token: {
        not: null
      }
    }
  })
}

const unsubscribeFromPush = async (dbClient: PrismaClient, pushNotifToken: Users['fcm_token']) => {
  const found = await dbClient.users.findFirst({
    where: {
      fcm_token: pushNotifToken,
    },
  })
  if (!found) {
    return
  }
  return dbClient.users.update({
    where: {
      user_id: found.user_id,
    },
    data: {
      fcm_token: null,
    },
  })
}

// unregister everyone who we should no longer send to
const unsubTheseTokens = async (dbClient: PrismaClient, unsubTokens: ExpoPushToken[]) => {
  for (let unsubToken of unsubTokens) {
    await unsubscribeFromPush(dbClient, unsubToken)
  }
  if (unsubTokens.length) {
    console.log(
      `${unsubTokens.length} users are no longer available for push notifications and their push tokens have been removed from our system`,
    )
  }
}

const sendDailyPushNotification = async(
  dbClient: PrismaClient,
  jobQueue: Queue,
  firebaseAdmin
) => {
  const usersWithFcmToken = await findNonNullFcmTokens(dbClient)
  for (let user of usersWithFcmToken) {
    const dailyNotif = await dbClient.dailyNotification.findFirst({
      where: {
        user_id: user.user_id
      }
    })
    let title = ''
    if ((dailyNotif.balanced_count > dailyNotif.consuming_count) && (dailyNotif.balanced_count > dailyNotif.producing_count)) {
      title = "Your group have been using Balanced energy"
    } else if ((dailyNotif.consuming_count > dailyNotif.balanced_count) && (dailyNotif.consuming_count > dailyNotif.producing_count)) {
      title = "Your group have been Consuming energy"
    } else {
      title = "Your group have been Producing energy"
    }
    const message = {
      notification: {
        title: title,
        body: `Your groups daily reward is: ${dailyNotif.daily_rewards}`
      },
      token: user.fcm_token
    }
    getMessaging().send(message)
    .then((response) => {
      console.log("sent notif success: ", response)
    })
    .catch((e) => {
      console.log('error sending message: ', e)
    })
  }

  // Update daily notif table and set back to 0
  const notif = await dbClient.dailyNotification.updateMany({
    data: {
      daily_rewards: 0,
      balanced_count: 0,
      producing_count: 0,
      consuming_count: 0
    }
  })
}

const handlePushNotifications = async (
  messages: any,
  dbClient: PrismaClient,
  jobQueue: Queue,
) => {
  
  for (let message of messages) {
      getMessaging().send(message)
      .then((response) => {
        console.log('send notif success: ', response)
      })
      .catch((e) => {
        console.log("error sending message: ", e)
      })
  }

  // Handle Post Processing Notification Receipt Here.
  // await jobQueue.add(
  //   POST_PROCESS_NOTIFICATION_RECEIPTS,
  //   {
  //     ticketTokenMap,
  //   },
  //   {
  //     delay: 1000 * 60 * 30, // 30 minutes
  //   },
  // )
  // unsubscribe people who are no longer registered
  // await unsubTheseTokens(dbClient, unsubTokens)
}

export { findNonNullFcmTokens,
         handlePushNotifications,
         sendDailyPushNotification
        }
