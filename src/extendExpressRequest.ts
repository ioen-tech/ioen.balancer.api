import { Request } from 'express'
import { User } from 'energy-schema/prisma/generated'

interface ExtendedRequest extends Request {
  user?: User
  body: any
}

export { ExtendedRequest }
