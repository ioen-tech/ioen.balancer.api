import { User, UserSecurity } from "rg-schema"


type UserSecurityWithUser = UserSecurity & {
  user: User
}

