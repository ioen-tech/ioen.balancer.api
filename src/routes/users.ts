import { Response, RequestHandler, Router } from 'express'
import { Prisma, PrismaClient, User } from 'energy-schema'
import axios from 'axios'


type JwtToken = string
type TokenResponse = {
  token: JwtToken
}

type SignInRequest = {
  email_address: string
  password: string
}
type SignInResponse = TokenResponse

// means all the fields on UserCreateInput + password field
// type SignUpRequest = Prisma.UserCreateInput & {
//   password: string
// }


type SignUpRequest = {
  username: string
  email: string
  password: string
  fronius_userid: string
  fronius_password: string
  fronius_accesskey_id: string
  fronius_accesskey_value: string
  retailer: string
  meter_hardware: string
}

type SignUpResponse = TokenResponse

type RecoverPasswordRequest = {
  phoneNumber: string
}
type RecoverPasswordResponse = null

type PasswordResetRequest = {
  newPassword: string
  recoverCode: number
  phoneNumber: string
}
type PasswordResetResponse = null

type SendIntegrationCodeRequest = {
  email: string
}
type SendIntegrationCodeResponse = null


import jwt from 'jwt-simple'
import { jwtConfig, JWTpayload } from '../jwt'
import { ExtendedRequest } from '../extendExpressRequest'
import bcrypt from 'bcrypt'
import twilio from 'twilio'
import { MailFunction } from '../tools/mail'
import Expo from 'expo-server-sdk'
import { Queue } from 'bullmq'


// a bcrypt configuration
const saltRounds = 10

const createTokenResponseForUser = (user: User): TokenResponse => {
  const payload: JWTpayload = {
    user_id: user.user_id,
  }
  const tokenResponse: TokenResponse = {
    token: jwt.encode(payload, jwtConfig().jwtSecret),
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
): Router {
  const router = Router()

  // authorize yourself
  // Get a token, from an email and password
  // TODO: share the route magic string with nanogrid.
  router.post('/sign_in', async (req, res) => {
    const input: SignInRequest = req.body
    // early exit if not passing required fields

    console.log(input)
    if (!input.email_address || !input.password) {
      res.status(400).json({
        message: 'email and password are required fields',
      })
      return
    }

    const { email_address, password } = input
    const user = await client.user.findFirst({
      where: {
        email_address,
      },
    })
    // important, compare the hashed version of the
    // password that was given, with the hashed password
    // that has been stored in the database
    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        // success!
        const signInResponse: SignInResponse = createTokenResponseForUser(user)
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
      const createUserArgs: Prisma.UserCreateArgs = {
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
      const user = await client.user.create(createUserArgs)
      // success!
      const signUpResponse: SignUpResponse = createTokenResponseForUser(user)
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
    res.json(req.user)
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
