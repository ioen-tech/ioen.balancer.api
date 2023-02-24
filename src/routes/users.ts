import { Response, RequestHandler, Router } from 'express'
import { GroupMembers, Prisma, PrismaClient, Users } from 'energy-schema'
import axios from 'axios'
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
import twilio from 'twilio'
import { MailFunction } from '../tools/mail'
import Expo from 'expo-server-sdk'
import { Queue } from 'bullmq'
import { files } from 'express-fileupload'
import internal from 'assert'
import { groupCollapsed } from 'console'
import { createInputFiles } from 'typescript'


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
  twilioClient: twilio.Twilio,
  sendNumber: string,
  authenticateUser: RequestHandler,
  sendMail: MailFunction,
  jobQueue?: Queue,
  uploads?: any
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
      console.log(hashedPassword)
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
              fronius_accesskey_value: input.fronius_accesskey_value
            }
          }
        }
      }
      const user = await client.users.create(createUserArgs)
      // success!
      const signUpResponse: SignUpResponse = createTokenResponseForUser(user, null)
      res.json(signUpResponse)

      return
    } catch (e) {
      if (e?.meta?.target === 'email_UNIQUE') {
        res.status(400).json({
          code: 'EMAIL_EXISTS',
        })
      } else if (e?.meta?.target === 'contact_num_UNIQUE') {
        res.status(400).json({
          code: 'CONTACT_NUM_EXISTS',
        })
      } else {
        console.log('unexpected error', e)
        res.status(400).json({
          message: e.message
        })
      }
    }
  })

  router.get('/me', authenticateUser, async (req: ExtendedRequest, res) => {
    let user = req.user
    delete user.password
    res.json(user)
  })

  router.post('/recover_password', async (req, res) => {
    const input: RecoverPasswordRequest = req.body
    const { phoneNumber } = input
    if (!phoneNumber) {
      res.status(400).json({
        message: 'phoneNumber is a required field',
      })
      return
    }

    res.status(200).json({message: "this is me"})
    return

    // get user based on the phone number
    // const user = await client.user.findFirst({
    //   select: {
    //     user_id: true,
    //   },
    //   where: {
    //     contact_num: phoneNumber,
    //   },
    // })
    // // if there's no user
    // if (!user) {
    //   res.status(400).json({
    //     message: 'user with phone number was not found',
    //   })
    //   return
    // }
    // // generate a random 4 digit number
    // const random4Digits = Math.floor(Math.random() * (9999 - 1000) + 1000)

    // // store the one-time-password in database
    // await client.userSecurity.update({
    //   where: {
    //     user_id: user.user_id,
    //   },
    //   data: {
    //     otp: random4Digits,
    //   },
    // })

    // await twilioClient.messages.create({
    //   body: `Your RedGrid verification code is ${random4Digits}. If you haven't requested a password change contact the RedGrid team to inform them of an anomaly`,
    //   from: sendNumber,
    //   to: phoneNumber,
    // })
    // const recoverPasswordResponse: RecoverPasswordResponse = null
    // res.json(recoverPasswordResponse)

    // // jobQueue will only be undefined in a jest testing environment
    // if (jobQueue) {
    //   // instruct the job queue to clear this users otp field
    //   // 5 minutes from now
    //   jobQueue.add(
    //     CLEAR_USER_SECURITY_FIELDS,
    //     {
    //       userId: user.user_id,
    //     },
    //     {
    //       delay: 1000 * 60 * 5, // 5 minutes
    //     },
    //   )
    // }
  })

  router.post('/password_reset', async (req, res) => {
    const input: PasswordResetRequest = req.body
    if (!input.phoneNumber || !input.recoverCode || !input.newPassword) {
      res.status(400).json({
        message: 'phoneNumber, recoverCode, and newPassword are required fields',
      })
      return
    }

    res.status(200).json({message:"This is passwordreset"})
    return 


    // // get user based on the otp and number
    // const user = await client.user.findFirst({
    //   select: {
    //     user_id: true,
    //   },
    //   where: {
    //     contact_num: input.phoneNumber,
    //     user_security: {
    //       otp: input.recoverCode,
    //     },
    //   },
    // })
    // // if there's a user update the password after hashing it
    // if (user && user.user_id) {
    //   try {
    //     await client.userSecurity.update({
    //       where: {
    //         user_id: user.user_id,
    //       },
    //       data: {
    //         password: await bcrypt.hash(input.newPassword, saltRounds),
    //         otp: null,
    //       },
    //     })
    //     const passwordResetResponse: PasswordResetResponse = null
    //     res.json(passwordResetResponse)
    //   } catch (e) {
    //     console.log(e)
    //     res.status(500).json({
    //       message: 'there was a server error while updating your password',
    //     })
    //   }
    // } else {
    //   res.status(400).json({
    //     message: 'the code you sent is not correct',
    //   })
    // }
  })


  router.post('/send_integration_code', authenticateUser, async (req: ExtendedRequest, res: Response) => {
    const input: SendIntegrationCodeRequest = req.body
    const { email } = input
    if (!email) {
      res.status(400).json({
        message: 'email is a required field',
      })
      return
    }
    // const user = await findUserByEmail(email, getUsers)
    // if (!user) {
    //   res.status(400).json({
    //     message: 'no user with that email exists',
    //   })
    //   return
    // }
    // generate a random 4 digit number
    const random4Digits = Math.floor(Math.random() * (9999 - 1000) + 1000)
    // inject the variables into the email template
    // the user added by the auth middleware
  })

  return router
}

export default makeRouter
