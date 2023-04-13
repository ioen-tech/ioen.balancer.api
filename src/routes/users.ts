import { Response, RequestHandler, Router } from 'express'
import { GroupMembers, Prisma, PrismaClient, Users } from 'energy-schema'
import axios from 'axios'
import moment from 'moment-timezone'

import {
  TokenResponse,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  SignUpResponse,
  CreateGroupRequest,
  JoinGroupRequest,
  RecoverPasswordRequest,
  PasswordResetRequest,
  SendIntegrationCodeRequest
} from '../types'


import jwt from 'jwt-simple'
import { jwtConfig, JWTpayload } from '../jwt'
import { ExtendedRequest } from '../extendExpressRequest'
import bcrypt from 'bcrypt'
import { MailFunction } from '../tools/mail'
import Expo from 'expo-server-sdk'
import { Queue } from 'bullmq'
import { getMessaging } from 'firebase-admin/messaging'


// a bcrypt configuration
const saltRounds = 10

const createTokenResponseForUser = (user: Users, groupMember: GroupMembers): TokenResponse => {
  const payload: JWTpayload = {
    user_id: user.user_id,
  }
  let route = ''
  if (groupMember) {
    route = '/home'
  } else {
    route = '/groupmgmt'
  }
  const tokenResponse: TokenResponse = {
    token: jwt.encode(payload, jwtConfig().jwtSecret),
    route: route
  }
  return tokenResponse
}

function makeRouter(
  client: PrismaClient,
  authenticateUser: RequestHandler,
  sendMail: MailFunction,
  jobQueue?: Queue,
  uploads?: any,
  firebaseAdmin?: any,
): Router {
  const router = Router()

  // authorize yourself
  // Get a token, from an email and password
  // TODO: share the route magic string with nanogrid.
  router.post('/sign_in', async (req, res) => {
    const input: SignInRequest = req.body
    // early exit if not passing required fields

    if (!input.username || !input.password) {
      res.status(400).json({
        message: 'email and password are required fields',
      })
      return
    }

    const { username, password } = input
    const user = await client.users.findFirst({
      where: {
        username,
      },
    })

    // important, compare the hashed version of the
    // password that was given, with the hashed password
    // that has been stored in the database
    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        // success!
        // Check if user is member of a group.
        const groupMember = await client.groupMembers.findFirst({
          where: {
            user_id: user.user_id
          }
        })
        const signInResponse: SignInResponse = createTokenResponseForUser(user, groupMember)
        // res.cookie('jwt', signInResponse, {
        //   httpOnly: true,
        //   maxAge: 24 * 60 * 60 * 1000
        // })
        res.json(signInResponse)
      } else {
        res.status(400).json({
          message: 'bad password',
        })
      }
    } else {
      res.status(404).json({
        message: 'no user was found with that email',
      })
    }
  })
  
  // Upload Logo
  router.post('/upload_logo', authenticateUser, async (req: ExtendedRequest, res) => {
    const input = req.body

    res.status(400).json({
      message: "this is just a test"
    })
  })

  // Creates a new group
  router.post('/new_group', authenticateUser, uploads.array("files"), async (req: ExtendedRequest, res) => {
    const input = req.body
    const img = req.files[0]

    try {
      // Check if groupname already exist.
      const groupRec = await client.groups.findFirst({
        where: {
          group_name: input.group_name
        }
      })

      const groupLogo = img.path

      const groupInfo = {
        group_name: input.group_name,
        min_users: parseInt(input.min_users),
        max_users: parseInt(input.max_users),
        reward_start_balance: parseInt(input.reward_start_balance),
        group_logo: img.originalname
      }

      // If group doest not exist, create it and save to database.
      if (!groupRec) {
        const createGroupsArgs: Prisma.GroupsCreateArgs = {
          data: {
            ...groupInfo
          }
        }
        const group = await client.groups.create(createGroupsArgs)

        // The group admin will automatically be a mamber of the group.
        const member = {
          user_id: req.user.user_id,
          group_id: group.group_id
        }
        const createGroupMemberArgs: Prisma.GroupMembersCreateArgs = {
          data: {
            ...member
          }
        }
        const groupMember = await client.groupMembers.create(createGroupMemberArgs)

        // Update
        client.users.update({
          where: {
            user_id: req.user.user_id
          },
          data: {
            group_id: group.group_id
          }
        }).then((value) => {
        }).catch((e) => {
          console.log(e)
          res.status(500).json({
            message: 'there was a server error while updating your password'
          })
        })

        res.json({
          message: 'New group and member has been created'
        })
      } else {
        // IF group exist, return 400 error.
        res.status(400).json({
          message: "Group name exist!"
        })
      }
    } catch (e) {
      console.log('unexpected error', e)
      res.status(400).json({
        message: e.message
      })
    }
  })

  // Get Group Info
  router.get('/get_group_info', authenticateUser, async (req: ExtendedRequest, res) => {
    const input = req.body
    try {
      const gInfo = await client.groups.findFirst({
        where: {
          group_id: req.user.group_id
        }
      })
      res.json(gInfo)
    } catch (e) {
      console.log('unexpected error', e)
      res.status(400).json({
        message: e.message
      })
    }
  })

  // Creates a new group
  router.post('/join_group', authenticateUser, async (req: ExtendedRequest, res) => {
    const input: JoinGroupRequest = req.body

    try {
      // Check if groupname exist.
      const group = await client.groups.findFirst({
        where: {
          group_name: input.group_name
        }
      })
      if (group) {
        // Check if user is already a member of a group.
        const mg = await client.groupMembers.findFirst({
          where: {
            user_id: req.user.user_id
          }
        })

        if (!mg) {
          // Check if group already has a maximum users.

          const numMembers = await client.groupMembers.count({
            where: {
              group_id: group.group_id
            }
          })
          if (numMembers < group.max_users) {
            // Add user id and group id to group_members DB
            const gdata = {
              user_id: req.user.user_id,
              group_id: group.group_id
            }

            client.users.update({
              where: {
                user_id: req.user.user_id
              },
              data: {
                group_id: group.group_id
              }
            }).then((value) => {
            }).catch((e) => {
              console.log(e)
              res.status(500).json({
                message: 'there was a server error while updating your password'
              })
            })

            const createGroupMemberArgs: Prisma.GroupMembersCreateArgs = {
              data: {
                ...gdata
              }
            }
            const groupMember = await client.groupMembers.create(createGroupMemberArgs)

            res.json({
              message: 'Member has been added to the group'
            })
          } else {
            res.status(404).json({
              message: 'Group has reached the maximum users'
            })
          }
        } else {
          res.status(404).json({
            message: 'User is already a member of a group'
          })
        }
      } else {
        // Group name does not exist.
        res.status(404).json({
          message: 'Group name does not exist.'
        })
        return
      }
    } catch (e) {
      console.log('unexpected error', e)
      res.status(400).json({
        message: e.message
      })
    }
  })

  // sign up / register (create a user)
  // hash their password along the way for secure storage
  router.post('/', async (req, res) => {
    let hashedPassword: string
    const input: SignUpRequest = req.body

    try {
      if (!input.password) throw new Error('password is a required field')
      if (typeof input.password !== 'string') throw new Error('password must be a string')
      hashedPassword = await bcrypt.hash(input.password, saltRounds)
    } catch (e) {
      res.status(400).json({
        message: e.message,
      })
      return
    }

    delete input.password

    const userInfo = {
      username: input.username,
      password: hashedPassword,
      email_address: input.email,
      retailer: input.retailer,
      meter_hardware: input.meter_hardware,
      is_group_admin: 0,
      group_id: 0
    }

    try {
      const createUserArgs: Prisma.UsersCreateArgs = {
        data: {
          ...userInfo,
          fronius_info: {
            create: {
              fronius_userid: input.fronius_userid,
              fronius_password: input.fronius_password,
              fronius_accesskey_id: input.fronius_accesskey_id,
              fronius_accesskey_value: input.fronius_accesskey_value,
              fronius_device_id: input.fronius_device_id
            }
          }
        }
      }
      const user = await client.users.create(createUserArgs)

      // Create daily notification table.
      const daily = await client.dailyNotification.create({
        data: {
          user_id: user.user_id,
          daily_rewards: 0,
          balanced_count: 0,
          producing_count: 0,
          consuming_count: 0
        }
      })

      // success!
      const signUpResponse: SignUpResponse = createTokenResponseForUser(user, null)
      res.json(signUpResponse)

      return
    } catch (e) {
      console.log(`meta target: ${e?.meta?.target}`)
      if (e?.meta?.target === 'email_address_UNIQUE') {
        res.status(400).json({
          message: 'Email address already taken',
        })
      } else if (e?.meta?.target === 'username_unique') {
        res.status(400).json({
          message: 'Username already taken!',
        })
      } else {
        console.log('unexpected error', e)
        res.status(400).json({
          message: 'Unexpected Error occured!'
        })
      }
    }
  })

  router.get('/me', authenticateUser, async (req: ExtendedRequest, res) => {
    let user = req.user
    delete user.password
    res.json(user)
  })

  router.get('/energy_logs', authenticateUser, async (req: ExtendedRequest, res) => {
    const energy_logs = await client.groupEnergyLogs.findMany({
      where: {
        group_id: req.user.group_id,
        event_time: {
          gt: moment().tz('Australia/Victoria').hour(0).minute(0).unix()
        }
      }
    })
    res.json(energy_logs)
  })

  // Get Collections Info
  router.get('/my_collections', authenticateUser, async (req: ExtendedRequest, res) => {
    try {
      const collections = await client.nftCollections.findMany({
        where: {
          user_id: req.user.user_id
        }
      })
      res.json(collections)
    } catch (e) {
      console.log('unexpected error', e)
      res.status(400).json({
        message: e.message
      })
    }
  })

  // Get store Info
  router.get('/stores', authenticateUser, async (req: ExtendedRequest, res) => {
    try {
      const stores = await client.nftStore.findMany({})
      res.json(stores)
    } catch (e) {
      console.log('unexpected error', e)
      res.status(400).json({
        message: e.message
      })
    }
  })

  router.post('/buy', authenticateUser, async (req: ExtendedRequest, res) => {
    const input = req.body

    console.log(`input: ${input}`)

    const store = await client.nftStore.findFirst({
      where: {
        store_id: input.store_id
      }
    })
    console.log(store)
    if (req.user.rewards_points < store.item_price) {
      console.log("Insufficient IEON Balance")
      res.status(400).json({
        message: 'Insufficient IOEN Balance.'
      })
      return
    } 
    const collection = {
      items: store.items,
      description: store.description,
      item_price: store.item_price,
      user_id: req.user.user_id
    }
    
    // Add bought collection to the store.
    try {
      const createCollectionArgs: Prisma.NftCollectionsCreateArgs = {
        data: {
          ...collection
        }
      }
      const createdCollection = await client.nftCollections.create(createCollectionArgs)
      
      if (createdCollection) {
        // Delete Store
        const deleteStore = await client.nftStore.delete({
          where: {
            store_id: input.store_id
          }
        })
        if (deleteStore) {
          const newIOEN = req.user.rewards_points - store.item_price

          // Update IOEN balance if success
          client.users.update({
            where: {
              user_id: req.user.user_id
            },
            data: {
              rewards_points: newIOEN
            }
          }).then((value) => {
          }).catch((e) => {
            console.log(e)
            res.status(500).json({
              message: 'there was a server error while updating your password'
            })
          })
  
          res.json({
            message: 'Successful!'
          })
        }
    }
    } catch (e) {
      console.log(`meta target: ${e?.meta?.target}`)
      if (e?.meta?.target === 'email_address_UNIQUE') {
        res.status(400).json({
          message: 'Email address already taken',
        })
      } else if (e?.meta?.target === 'username_unique') {
        res.status(400).json({
          message: 'Username already taken!',
        })
      } else {
        console.log('unexpected error', e)
        res.status(400).json({
          message: 'Unexpected Error occured!'
        })
      }
    }
  })
  router.post('/set_fcm_token', authenticateUser, async (req: ExtendedRequest, res) => {
    const input = req.body

    // Check if token is valid or null
    try {
      if (!input.fcm_token) throw new Error('FCM token is a required field')
    } catch (e) {
      console.log("Throws an ERRRORRRRR")
      res.status(400).json({
        message: e.message,
      })
      return
    }

    // Update user fcm token
    client.users.update({
      where: {
        user_id: req.user.user_id
      },
      data: {
        fcm_token: input.fcm_token
      }
    }).then((value) => {
    }).catch((e) => {
      console.log(e)
      res.status(500).json({
        message: 'there was a server error while updating your password'
      })
    })
  })
  router.get('/send_notif', authenticateUser, async (req: ExtendedRequest, res) => {
    const fcmToken = req.user.fcm_token

    const message = {
      notification: {
        title: "Nanogrid",
        body: "Congratulations You have been rewarded!"
      },
      token: fcmToken
    }
    getMessaging().send(message)
    .then((response) => {
      console.log("sent notif success: ", response)
    })
    .catch((e) => {
      console.log('error sending message: ', e)
    })
    res.status(200).json({
      message: "test notification"
    })
  })

  return router
}

export default makeRouter
