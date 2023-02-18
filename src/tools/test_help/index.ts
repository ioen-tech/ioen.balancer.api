import { UsersResponse } from '@tuyapi/openapi/dist/responses'
import { GetUsers, RefreshDevicesForIntegration } from '../tuya'

// default response
const mockGetUsersResponse: UsersResponse = {
  has_more: false,
  list: [
    {
      create_time: 0,
      email: 'example@example.com',
      uid: '2',
      update_time: 0,
      username: 'my_username',
    },
  ],
  total: 6,
}
const createMockGetUsers = (): jest.MockedFunction<GetUsers> => {
  const f = jest.fn()
  // The following line sets the default response that it will
  // answer a call with everytime, unless overridden...
  // can be overridden for a single call by setting mockedGetUsers.mockResolvedValueOnce(value)
  // or mockedGetUsers.mockRejectedValueOnce(new Error('something'))
  f.mockResolvedValue(mockGetUsersResponse)
  return f
}
const createMockRefreshDevicesForIntegration = (): jest.MockedFunction<RefreshDevicesForIntegration> => {
  const f = jest.fn()
  f.mockResolvedValue(null)
  return f
}

export { createMockGetUsers, createMockRefreshDevicesForIntegration }
