

export type JwtToken = string
export type TokenResponse = {
  token: JwtToken
  route: string
}

export type SignInRequest = {
  username: string
  password: string
}
export type SignInResponse = TokenResponse

export type SignUpRequest = {
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

export type SignUpResponse = TokenResponse

export type CreateGroupRequest = {
  group_name: string
  min_users: number,
  max_users: number,
  reward_start_balance: number
}
export type CreateGroupResponse = null

export type JoinGroupRequest = {
  group_name: string
}
export type JoinGroupResponse = null

export type RecoverPasswordRequest = {
  phoneNumber: string
}
export type RecoverPasswordResponse = null

export type PasswordResetRequest = {
  newPassword: string
  recoverCode: number
  phoneNumber: string
}
export type PasswordResetResponse = null

export type SendIntegrationCodeRequest = {
  email: string
}
export type SendIntegrationCodeResponse = null
