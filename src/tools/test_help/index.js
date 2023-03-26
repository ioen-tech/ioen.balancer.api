"use strict";
exports.__esModule = true;
exports.createMockRefreshDevicesForIntegration = exports.createMockGetUsers = void 0;
// default response
var mockGetUsersResponse = {
    has_more: false,
    list: [
        {
            create_time: 0,
            email: 'example@example.com',
            uid: '2',
            update_time: 0,
            username: 'my_username'
        },
    ],
    total: 6
};
var createMockGetUsers = function () {
    var f = jest.fn();
    // The following line sets the default response that it will
    // answer a call with everytime, unless overridden...
    // can be overridden for a single call by setting mockedGetUsers.mockResolvedValueOnce(value)
    // or mockedGetUsers.mockRejectedValueOnce(new Error('something'))
    f.mockResolvedValue(mockGetUsersResponse);
    return f;
};
exports.createMockGetUsers = createMockGetUsers;
var createMockRefreshDevicesForIntegration = function () {
    var f = jest.fn();
    f.mockResolvedValue(null);
    return f;
};
exports.createMockRefreshDevicesForIntegration = createMockRefreshDevicesForIntegration;
