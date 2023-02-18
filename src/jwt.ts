// @ts-ignore
import { Strategy, ExtractJwt } from 'passport-jwt'
import passport from 'passport'
import { PrismaClient, User } from 'energy-schema'

const jwtConfig = () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtSession: {
    session: false,
  },
})

type JWTpayload = {
  user_id: number
}

export { JWTpayload, jwtConfig }

function setupPassport(dbClient: PrismaClient) {
  passport.use(
    new Strategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: jwtConfig().jwtSecret,
      },
      async function (payload: JWTpayload, done: (e: Error | null, user?: User) => void) {
        // TODO: handle await error
        const user = await dbClient.user.findFirst({
          where: {
            user_id: payload.user_id,
          },
        })
        if (user) {
          done(null, user)
        } else {
          done(new Error('no user found'))
        }
      },
    ),
  )
  // this will be the authenticate middleware function to use
  return passport.authenticate('jwt', jwtConfig().jwtSession)
}

export default setupPassport
