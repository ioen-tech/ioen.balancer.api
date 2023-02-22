import { Request } from 'express'
import { Users } from 'energy-schema/prisma/generated'

interface ExtendedRequest extends Request {
  user?: Users
  body: any
}

export { ExtendedRequest }
