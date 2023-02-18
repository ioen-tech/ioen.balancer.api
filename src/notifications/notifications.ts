import { Queue } from 'bullmq'
import { Expo, ExpoPushMessage, ExpoPushReceiptId, ExpoPushToken } from 'expo-server-sdk'
import { PrismaClient, UserSecurity } from 'rg-schema'
import { POST_PROCESS_NOTIFICATION_RECEIPTS } from '../scheduler/jobHandlers'
import log from '../gridRenewables/logger'
import { UserSecurityWithUser } from './types'
import { getIntegrationForUserId } from '../tools/queries'
import moment from 'moment'

const findNonNullPushNotifTokens = async (dbClient: PrismaClient): Promise<UserSecurityWithUser[]> => {
  return dbClient.userSecurity.findMany({
    where: {
      push_notif_token: {
        not: null,
      },
    },
    include: {
      user: true,
    },
  })
}

const findNonNullIntegId = async (userSecurities: UserSecurityWithUser[], dbClient: PrismaClient): Promise<UserSecurityWithUser[]> => {
  let ret = []
  await Promise.all(
    userSecurities.map(async (user): Promise<boolean> => {
      const integ = await getIntegrationForUserId(user.user_id, dbClient)
      if (integ !== null) {
        ret.push(user)
      }
      return true
    })
  )

  return ret
}

const findNewOnboardedUsers = async (userSecurities: UserSecurityWithUser[], dbClient: PrismaClient): Promise<UserSecurityWithUser[]> => {
  let ret = []
  const timezone = 'Australia/Victoria'
  await Promise.all(
    userSecurities.map(async (user): Promise<boolean> => {
      const enrolment = await dbClient.enrolment.findFirst({
        where: {
          user_id: user.user_id
        }
      })
      const userAsset = await dbClient.asset.findFirst({
        where: {
          asset_id: enrolment.asset_id
        }
      })
      const onboardTime = moment(userAsset.onboard_time).tz(timezone)
      const today = moment().tz(timezone)
      const daysDiff = today.diff(onboardTime,'days')
      if (daysDiff > 0 &&daysDiff < 2) {
        ret.push(user)
      }
      return true
    })
  )

  return ret
}

const getAllUsers = async (dbClient: PrismaClient): Promise<UserSecurityWithUser[]> => {
  return dbClient.userSecurity.findMany({
    include: {
      user: true,
    },
  })
}

const unsubscribeFromPush = async (dbClient: PrismaClient, pushNotifToken: UserSecurity['push_notif_token']) => {
  const found = await dbClient.userSecurity.findFirst({
    where: {
      push_notif_token: pushNotifToken,
    },
  })
  if (!found) {
    return
  }
  return dbClient.userSecurity.update({
    where: {
      user_id: found.user_id,
    },
    data: {
      push_notif_token: null,
    },
  })
}

const updateUserField = async (dbClient: PrismaClient, userId: any) => {
  for (let i = 0; i < userId.length; i++) {
    const user_id: number = userId[i].user

    const user_info = await dbClient.user.findFirst({
      select: {
        user_id: true,
        is_first_shift_load_pop_up: true
      },
      where: {
        user_id: user_id,
      },
    })
    
    if (user_info.is_first_shift_load_pop_up == null) {
      await dbClient.user.update({
        where: {
          user_id: user_info.user_id,
        },
        data: { is_first_shift_load_pop_up: true }
      })
    }
  }
}

// unregister everyone who we should no longer send to
const unsubTheseTokens = async (dbClient: PrismaClient, unsubTokens: ExpoPushToken[]) => {
  for (let unsubToken of unsubTokens) {
    await unsubscribeFromPush(dbClient, unsubToken)
  }
  if (unsubTokens.length) {
    log(
      `${unsubTokens.length} users are no longer available for push notifications and their push tokens have been removed from our system`,
    )
  }
}

type TicketTokenMap = {
  [ticketId: string]: ExpoPushToken[]
}

const handlePostProcessNotificationReceipts = async (
  dbClient: PrismaClient,
  expo: Expo,
  ticketTokenMap: TicketTokenMap,
) => {
  const unsubTokens: ExpoPushToken[] = []
  const validReceiptIds = Object.keys(ticketTokenMap)
  // double check with the expo push notifications servers about the delivery of these notifications
  let fullySuccessfulSends = 0
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(validReceiptIds)
  for (let chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk)
      // The receipts specify whether Apple or Google successfully received the
      // notification and information about an error, if one occurred.
      for (let receiptId in receipts) {
        const receipt = receipts[receiptId]
        if (receipt.status === 'ok') {
          fullySuccessfulSends++
          continue
        } else if (receipt.status === 'error') {
          const { details } = receipt
          // The error codes are listed in the Expo documentation:
          // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
          // You must handle the errors appropriately.
          if (details.error === 'DeviceNotRegistered') {
            unsubTokens.push(...ticketTokenMap[receiptId])
          } else if (details.error === 'InvalidCredentials') {
            log('Our push notification credentials for the standalone app are invalid. ')
          } else if (details.error === 'MessageRateExceeded') {
            log(
              'Message rate for a single user has been exceeded, we should slow down and back off sending notifications',
            )
          } else if (details.error === 'MessageTooBig') {
            log('A push notification was sent that was too big and could not complete')
          } else {
            log(JSON.stringify(receipt))
          }
        } else {
          log(`Handled a receipt with an unexpected status:  ${receipt}`)
        }
      }
    } catch (error) {
      log(`An error occurred calling expo.getPushNotificationReceiptsAsync with receiptIds: ${JSON.stringify(chunk)}`)
      log(`The error was: ${JSON.stringify(error, null, 2)}`)
    }
  }
  await unsubTheseTokens(dbClient, unsubTokens)
}

const handlePushNotifications = async (
  messages: ExpoPushMessage[],
  expo: Expo,
  dbClient: PrismaClient,
  gridRenewablesQueue: Queue,
) => {
  log(`Beginning handling of ${messages.length} push notifications`)
  // The Expo push notification service accepts batches of notifications so
  // that you don't need to send 1000 requests to send 1000 notifications. We
  // recommend you batch your notifications to reduce the number of requests
  // and to compress them (notifications with similar content will get
  // compressed).
  let chunks = expo.chunkPushNotifications(messages)
  // this is an important mapping
  // from ticket ids to ExponentPushToken type data
  const ticketTokenMap: TicketTokenMap = {}
  const validReceiptIds: ExpoPushReceiptId[] = []
  const unsubTokens: ExpoPushToken[] = []
  // Send the chunks to the Expo push notification service. There are
  // different strategies you could use. A simple one is to send one chunk at a
  // time, which nicely spreads the load out over time:
  for (let chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
      ticketChunk.forEach((ticket, index) => {
        // Expo Docs say: Each ticket corresponds to the message
        // at its respective index (the nth receipt is for the nth message)
        // NOTE: Not all tickets have IDs; for example, tickets for notifications
        // that could not be enqueued will have error information and no receipt ID.
        const to = chunk[index].to
        let setTo: string[]
        if (typeof to === 'string') {
          setTo = [to]
        } else {
          setTo = to
        }
        if (ticket.status === 'ok') {
          validReceiptIds.push(ticket.id)
          // correlate some ExponentPushToken with a receipt id
          ticketTokenMap[ticket.id] = setTo
        } else if (ticket.details.error === 'DeviceNotRegistered') {
          unsubTokens.push(...setTo)
        }
      })
      // NOTE: If a ticket contains an error code in ticket.details.error, you
      // must handle it appropriately. The error codes are listed in the Expo
      // documentation:
      // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
    } catch (error) {
      log(`An error occurred calling expo.sendPushNotificationsAsync`)
      log(`The error was: ${JSON.stringify(error, null, 2)}`)
    }
  }
  log(`${validReceiptIds.length} push notifications were successfully sent`)
  // Expo says to handle these receipts about 30 minutes later
  await gridRenewablesQueue.add(
    POST_PROCESS_NOTIFICATION_RECEIPTS,
    {
      ticketTokenMap,
    },
    {
      delay: 1000 * 60 * 30, // 30 minutes
    },
  )
  // unsubscribe people who are no longer registered
  await unsubTheseTokens(dbClient, unsubTokens)
}

export { handlePostProcessNotificationReceipts,
         findNonNullPushNotifTokens,
         handlePushNotifications,
         TicketTokenMap,
         getAllUsers,
         updateUserField,
         findNonNullIntegId,
         findNewOnboardedUsers,
        }
