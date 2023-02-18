'use strict'

const el = React.createElement

const ADMIN_SERVER_SECRET = 'admin_server_secret'

const domContainer = document.querySelector('#redgrid-overview')
ReactDOM.render(el(Container), domContainer)

const labelStyles = {
  fontWeight: 600,
  fontSize: 14,
}

function Container() {
  const [secretInput, setSecretInput] = React.useState('')
  const [secret, setSecret] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState(null)
  const [serverError, setServerError] = React.useState(false)
  const [invalid, setInvalid] = React.useState(false)
  const [userIdFilter, setUserIdFilter] = React.useState(null)

  // forecasts
  const [viewForecasts, setViewForecasts] = React.useState(false)
  const [forecasts, setForecasts] = React.useState([])
  const [forecastPostcodeFilter, setForecastPostcodeFilter] = React.useState(null)

  // on initial mount, check local storage for the key
  React.useEffect(() => {
    const localSecret = localStorage.getItem(ADMIN_SERVER_SECRET)
    // this will trigger a data fetch attempt, via the useEffect below
    setSecret(localSecret)
  }, [])

  function fetchAdminData(path) {
    setLoading(true)
    return fetch(path, { headers: { 'x-rg-admin': secret } })
      .then(async (res) => {
        setLoading(false)
        if (res.ok) {
          const data = await res.json()
          return data
        } else if (res.status === 401) {
          setInvalid(true)
          setSecret('')
          localStorage.removeItem(ADMIN_SERVER_SECRET)
        } else {
          console.log(res)
          setServerError(true)
        }
      })
      .catch(e => {
        console.log(e)
        setServerError(true)
      })
  }

  React.useEffect(() => {
    // use the provided secret
    // to fetch the data to display
    if (secret) {
      fetchAdminData('/admin/overview').then((fetched) => {
        setData(fetched)
      })
    }
  }, [secret])

  if (serverError) {
    return el('div', null, 'There was an error while talking to the server, please refresh and try again or contact the system admin.')
  }

  if (invalid) {
    return el('div', null, 'secret was invalid, please refresh and try again with the right secret')
  }

  if (!secret) {
    // the system which allows the admin to provide a secret to the server
    return AuthenticateYourself({ setSecret, setSecretInput, secretInput })
  }

  if (loading || !data) {
    return el('div', null, 'loading...')
  }

  if (viewForecasts) {
    return el('div', null, Forecasts({ setViewForecasts, forecasts, forecastPostcodeFilter, setForecastPostcodeFilter }))
  } else {
    function switchToForecasts() {
      setViewForecasts(true)
      fetchAdminData('/admin/forecasts').then((fetched) => {
        setForecasts(fetched)
      })
    }
    return AuthenticatedDataDash({ data, setSecret, setSecretInput, userIdFilter, setUserIdFilter, switchToForecasts })
  }
}

/*
  FORECASTS
*/

function Forecasts({ setViewForecasts, forecasts, forecastPostcodeFilter, setForecastPostcodeFilter }) {
  // find all the unique dates
  // we will separate them into those buckets
  const dates = Object.keys(forecasts.reduce((memo, current) => {
    memo[current.forecast_date] = true
    return memo
  }, {}))
  return el('div', { style: { maxWidth: 1200, margin: '0 auto' } }, [
    el('h3', { key: 'heading' }, 'Forecasts'),
    // switch back to users view
    el(
      'button',
      {
        key: 'go_to_users',
        onClick: () => {
          setViewForecasts(false)
        },
      },
      'Go Back To Users',
    ),
    ForecastPostcodeFilter({ forecastPostcodeFilter, setForecastPostcodeFilter }),
    // forecasts
    el('div', { style: { display: 'flex', flexDirection: 'column' }}, ForecastRows({ dates, forecasts, forecastPostcodeFilter }))
  ])
}

function ForecastPostcodeFilter({ forecastPostcodeFilter, setForecastPostcodeFilter }) {
  return [
    el('br', { key: 'break' }),
    el('br', { key: 'break' }),
    el('label', { type: 'text', key: 'forecast_postcode_filter_label' }, 'Filter By Postcode'),
    el('br', { key: 'break' }),
    el('input', {
      type: 'text',
      key: 'forecast_postcode_filter_input',
      onChange: (e) => setForecastPostcodeFilter(e.target.value),
      value: forecastPostcodeFilter,
    }),
  ]
}

function ForecastRows({ dates, forecasts, forecastPostcodeFilter }) {
  if (dates.length === 0) {
    return el('div', { key: 'no_forecasts' }, 'There are none')
  }
  const intPostcode = parseInt(forecastPostcodeFilter)
  const filtered = forecastPostcodeFilter ? forecasts.filter((forecast) => forecast.postcode === intPostcode) : forecasts
  return dates.map((date) => ForecastDateRow({ date, forecasts: filtered }))
}

function ForecastDateRow({ date, forecasts }) {
  const filteredForecasts = forecasts.filter((forecast) => {
    return forecast.forecast_date === date
  })
  const formatted = moment(date).tz('Australia/Victoria').format().split('T')[0]
  return [
    el('h4', null, formatted),
    el(
      'div',
      {
        key: `dates${date}`,
        className: 'grid',
        style: { display: 'grid', gridTemplateColumns: `repeat(6, auto)`, gridGap: '4px' },
      },
      ForecastPostcodeRowHeaders().concat(filteredForecasts.map((forecast) => ForecastPostcodeRow({ forecast })))
    )
  ]
}

function ForecastPostcodeRowHeaders() {
  return [
    el('div', null, 'Postcode'),
    el('div', null, 'Worst'),
    el('div', null, 'Neutral'),
    el('div', null, 'Best'),
    el('div', null, 'Neutral'),
    el('div', null, 'Worst'),
  ]
}

function p(d) {
  return moment(d).tz('Australia/Victoria').format().substr(11, 5)
}

function ForecastPostcodeRow({ forecast }) {
  // fill these in with
  // info similar to how its 
  // done in assess-forecasts
  let worst1 = ''
  let neutral1 = ''
  let best1 = ''
  let neutral2 = ''
  let worst2 = ''

  // worst 1 when there are 2 worst periods
  if (forecast.worst_start_2 && p(forecast.worst_start_2) === "05:00") {
    worst1 += p(forecast.worst_start_2)
    worst1 += ' - '
    worst1 += p(forecast.worst_end_2)
  } else if (forecast.worst_start_1 && p(forecast.worst_start_1) === "05:00") {
    worst1 += p(forecast.worst_start_1)
    worst1 += ' - '
    worst1 += p(forecast.worst_end_1)
  }

  // neutral 1
  if (forecast.neutral_start_1) {
    neutral1 += p(forecast.neutral_start_1)
    neutral1 += ' - '
    neutral1 += p(forecast.neutral_end_1)
  }

  // best
  best1 += p(forecast.best_start_1)
  best1 += ' - '
  best1 += p(forecast.best_end_1)

  // neutral 2
  if (forecast.neutral_start_2) {
    neutral2 += p(forecast.neutral_start_2)
    neutral2 += ' - '
    neutral2 += p(forecast.neutral_end_2)
  }

  // worst
  if (forecast.worst_start_2 && p(forecast.worst_start_2) !== "05:00") {
    worst2 += p(forecast.worst_start_2)
    worst2 += ' - '
    worst2 += p(forecast.worst_end_2)
  } else if (forecast.worst_start_1 && p(forecast.worst_start_1) !== "05:00") {
    worst2 += p(forecast.worst_start_1)
    worst2 += ' - '
    worst2 += p(forecast.worst_end_1)
  }

  return [
    el('div', null, forecast.postcode),
    el('div', null, worst1),
    el('div', null, neutral1),
    el('div', null, best1),
    el('div', null, neutral2),
    el('div', null, worst2),
  ]
}

/*
  END FORECASTS
*/

function AuthenticateYourself({ setSecret, setSecretInput, secretInput }) {
  return el('div', { style: { maxWidth: 1200, margin: '0 auto' } }, [
    el('h3', { key: 'heading' }, 'RedGrid Admin Overview'),
    el('label', { type: 'text', key: 'secret_input_label' }, 'Please Provide The Server Secret'),
    el('br', { key: 'break' }),
    el('input', {
      type: 'text',
      key: 'secret_input',
      onChange: (e) => setSecretInput(e.target.value),
      value: secretInput,
    }),
    el(
      'button',
      {
        type: 'submit',
        key: 'secret_submit',
        onClick: () => {
          setSecret(secretInput)
          localStorage.setItem(ADMIN_SERVER_SECRET, secretInput)
        },
      },
      'Let Me In',
    ),
  ])
}

function AuthenticatedDataDash({ data, setSecret, setSecretInput, userIdFilter, setUserIdFilter, switchToForecasts }) {
  
  return el('div', { style: { maxWidth: 1200, margin: '0 auto' } }, [
    // delete secret
    el(
      'button',
      {
        key: 'delete_secret',
        onClick: () => {
          localStorage.removeItem(ADMIN_SERVER_SECRET)
          setSecret('')
          setSecretInput('')
        },
      },
      'Clear Server Secret',
    ),
    el('br', { key: 'break' }),
    el('br', { key: 'break' }),
    // switch to forecasts view
    el(
      'button',
      {
        key: 'go_to_forecasts',
        onClick: () => {
          switchToForecasts()
        },
      },
      'View Forecasts',
    ),
    // stats
    el('div', { key: 'redgrid-stats' }, [
      el('h3', { key: 'redgrid-stats-title' }, 'RedGrid Stats'),
      el('div', { key: 'redgrid-stats-users' }, `Users: ${data.users.length}`),
      el('div', { key: 'redgrid-stats-onboarded' }, `Onboarded: ${data.users.filter((u) => u.asset).length}`),
      el(
        'div',
        { key: 'redgrid-stats-linked' },
        `Linked Accounts: ${data.users.filter((u) => u.asset && u.asset.integrations.length > 0).length}`,
      ),
    ]),
    // users
    UserIdFilter({ userIdFilter, setUserIdFilter }),
    el(
      'div',
      {
        key: 'redgrid-users',
        className: 'grid',
        style: { display: 'grid', gridTemplateColumns: `repeat(${UsersHeaders().length}, auto)`, gridGap: '1em' },
      },
      UsersHeaders().concat(Users({ users: data.users, userIdFilter: userIdFilter })),
    ),
  ])
}

function UserIdFilter({ userIdFilter, setUserIdFilter }) {
  return [
    el('br', { key: 'break' }),
    el('br', { key: 'break' }),
    el('label', { type: 'text', key: 'user_id_filter_label' }, 'Filter By User ID'),
    el('br', { key: 'break' }),
    el('input', {
      type: 'text',
      key: 'user_id_filter_input',
      onChange: (e) => setUserIdFilter(e.target.value),
      value: userIdFilter,
    }),
  ]
}

function UsersHeaders() {
  return [
    el('h4', { key: 'user' }, 'User Details'),
    el('h4', { key: 'home' }, 'Home Details'),
    el('h4', { key: 'devices' }, 'Device Details'),
  ]
}

function Users({ users, userIdFilter }) {
  const filterId = userIdFilter && parseInt(userIdFilter)
  return users
    .filter(user => !userIdFilter || user.user_id === filterId)
    .map((user) => UserRow({ user }))
}

function UserRow({ user }) {
  return [
    el('div', { key: `user${user.user_id}` }, UserColumn({ user })),
    el('div', { key: `asset${user.user_id}` }, HomeColumn({ home: user.asset })),
    el('div', { key: `devices${user.user_id}` }, DevicesColumn({ home: user.asset })),
  ]
}

function UserColumn({ user }) {
  return el(
    'div',
    {
      key: `user_column${user.user_id}`,
      className: 'grid',
      style: { display: 'grid', gridTemplateColumns: `repeat(2, auto)`, gridGap: '4px' },
    },
    UserItems({ user }),
  )
}

function UserItems({ user }) {
  return [
    el('div', { key: 'id', style: labelStyles }, 'user_id'),
    el('div', { key: `user_id${user.user_id}` }, user.user_id),
    el('div', { key: 'email', style: labelStyles }, 'Email'),
    el('div', { key: `email${user.user_id}` }, user.email),
    el('div', { key: 'name', style: labelStyles }, 'Name'),
    el('div', { key: `name${user.user_id}` }, user.name),
    el('div', { key: 'contact_num', style: labelStyles }, 'Phone'),
    el('div', { key: `contact_num${user.user_id}` }, user.contact_num),
    el('div', { key: 'postcode', style: labelStyles }, 'Postcode'),
    el('div', { key: `postcode${user.user_id}` }, user.postcode),
    el('div', { key: 'notifications', style: labelStyles }, 'Notifications Active'),
    el('div', { key: `notifications${user.user_id}` }, user.user_security.push_notif_token ? 'Yes' : 'No'),
    el('div', { key: 'signup_time', style: labelStyles }, 'Signed Up At'),
    el('div', { key: `signup_time${user.user_id}` }, new Date(user.signup_time).toString()),
  ]
}

function HomeColumn({ home }) {
  if (!home) {
    return el('div', { key: 'devices_not_onboarded' }, 'Not Onboarded')
  }

  return el(
    'div',
    {
      key: `asset_id${home.asset_id}`,
      className: 'grid',
      style: { display: 'grid', gridTemplateColumns: `repeat(2, auto)`, gridGap: '4px' },
    },
    HomeItems({ home }),
  )
}

function HomeItems({ home }) {
  return [
    el('div', { key: 'home_integrations', style: labelStyles }, 'Linked To RG Home'),
    el(
      'div',
      { key: `home_integrations${home.asset_id}` },
      home.integrations.length > 0 ? `Yes (TUYA ID: ${home.integrations[0].external_id})` : 'No',
    ),

    el('div', { key: 'home_type', style: labelStyles }, 'Home Type'),
    el('div', { key: `home_type${home.asset_id}` }, home.home_type),

    el('div', { key: 'number_occupants', style: labelStyles }, 'Number Of Occupants'),
    el('div', { key: `number_occupants${home.asset_id}` }, home.no_occupants),

    el('div', { key: 'busy_at', style: labelStyles }, 'Busy At'),
    el('div', { key: `busy_at${home.asset_id}` }, HomeBusyAt({ home })),

    el('div', { key: 'working_from_home', style: labelStyles }, 'Working From Home'),
    el('div', { key: `working_from_home${home.asset_id}` }, HomeWorkingFromHome({ home })),

    el('div', { key: 'energy_provider', style: labelStyles }, 'Energy Provider'),
    el('div', { key: `energy_provider${home.asset_id}` }, home.provider),

    el('div', { key: 'renewables', style: labelStyles }, 'Renewables'),
    el('div', { key: `renewables${home.asset_id}` }, HomeRenewables({ home })),

    el('div', { key: 'onboard_time', style: labelStyles }, 'Finished Onboarding At'),
    el('div', { key: `onboard_time${home.asset_id}` }, new Date(home.onboard_time).toString()),
  ]
}

function HomeBusyAt({ home }) {
  return el('div', null, [
    el('div', { key: 'busy06_09' }, [
      el('input', { key: 'busy06_09_checkbox', type: 'checkbox', readOnly: true, checked: home.busy06_09 }),
      el('label', { key: 'busy06_09_label' }, '6-9am'),
    ]),
    el('div', { key: 'busy09_12' }, [
      el('input', { key: 'busy09_12_checkbox', type: 'checkbox', readOnly: true, checked: home.busy09_12 }),
      el('label', { key: 'busy09_12_label' }, '9-12am'),
    ]),
    el('div', { key: 'busy12_15' }, [
      el('input', { key: 'busy12_15_checkbox', type: 'checkbox', readOnly: true, checked: home.busy12_15 }),
      el('label', { key: 'busy12_15_label' }, '12-3pm'),
    ]),
    el('div', { key: 'busy15_18' }, [
      el('input', { key: 'busy15_18_checkbox', type: 'checkbox', readOnly: true, checked: home.busy15_18 }),
      el('label', { key: 'busy15_18_label' }, '3-6pm'),
    ]),
    el('div', { key: 'busy18_21' }, [
      el('input', { key: 'busy18_21_checkbox', type: 'checkbox', readOnly: true, checked: home.busy18_21 }),
      el('label', { key: 'busy18_21_label' }, '6-9pm'),
    ]),
    el('div', { key: 'busy21_24' }, [
      el('input', { key: 'busy21_24_checkbox', type: 'checkbox', readOnly: true, checked: home.busy21_24 }),
      el('label', { key: 'busy21_24_label' }, '9pm-12am'),
    ]),
  ])
}

function HomeWorkingFromHome({ home }) {
  return el('div', null, [
    el('div', { key: 'wfh_mon' }, [
      el('input', { key: 'wfh_mon_checkbox', type: 'checkbox', readOnly: true, checked: home.wfh_mon }),
      el('label', { key: 'wfh_mon_label' }, 'Mon'),
    ]),
    el('div', { key: 'wfh_tue' }, [
      el('input', { key: 'wfh_tue_checkbox', type: 'checkbox', readOnly: true, checked: home.wfh_tue }),
      el('label', { key: 'wfh_tue_label' }, 'Tues'),
    ]),
    el('div', { key: 'wfh_wed' }, [
      el('input', { key: 'wfh_wed_checkbox', type: 'checkbox', readOnly: true, checked: home.wfh_wed }),
      el('label', { key: 'wfh_wed_label' }, 'Wed'),
    ]),
    el('div', { key: 'wfh_thu' }, [
      el('input', { key: 'wfh_thu_checkbox', type: 'checkbox', readOnly: true, checked: home.wfh_thu }),
      el('label', { key: 'wfh_thu_label' }, 'Thurs'),
    ]),
    el('div', { key: 'wfh_fri' }, [
      el('input', { key: 'wfh_fri_checkbox', type: 'checkbox', readOnly: true, checked: home.wfh_fri }),
      el('label', { key: 'wfh_fri_label' }, 'Fri'),
    ]),
  ])
}

function HomeRenewables({ home }) {
  return el('div', null, [
    el('div', { key: 'has_ecar' }, [
      el('input', { key: 'has_ecar_checkbox', type: 'checkbox', readOnly: true, checked: home.has_ecar }),
      el('label', { key: 'has_ecar_label' }, 'Electric Car'),
    ]),
    el('div', { key: 'has_solar' }, [
      el('input', { key: 'has_solar_checkbox', type: 'checkbox', readOnly: true, checked: home.has_solar }),
      el('label', { key: 'has_solar_label' }, 'Solar'),
    ]),
    el('div', { key: 'has_powerwall' }, [
      el('input', { key: 'has_powerwall_checkbox', type: 'checkbox', readOnly: true, checked: home.has_powerwall }),
      el('label', { key: 'has_powerwall_label' }, 'Battery Pack'),
    ]),
  ])
}

function DevicesColumn({ home }) {
  if (!home) {
    return el('div', { key: 'devices_not_onboarded' }, 'Not Onboarded')
  }

  return el(
    'div',
    {
      key: `devices${home.asset_id}`,
      className: 'grid',
      style: { display: 'grid', gridTemplateColumns: `repeat(1, auto)`, gridGap: '14px' },
    },
    DevicesItems({ home }),
  )
}

function DevicesItems({ home }) {
  if (home.integrations.length === 0) {
    return el('div', { key: 'devices_not_linked' }, 'Not Linked')
  }

  if (home.integrations[0].devices.length === 0) {
    return el('div', { key: 'devices_none' }, 'None')
  }

  return home.integrations[0].devices.map((device) => DeviceItem({ device }))
}

function DeviceItem({ device }) {
  return el(
    'div',
    {
      key: `device${device.device_id}`,
      className: 'grid',
      style: { display: 'grid', gridTemplateColumns: `repeat(2, auto)`, gridGap: '4px' },
    },
    DeviceItemRows({ device }),
  )
}

function DeviceItemRows({ device }) {
  return [
    el('div', { key: 'device_id', style: labelStyles }, 'Device ID'),
    el('div', { key: `device_id${device.device_id}` }, device.device_id),

    el('div', { key: 'appliance_type', style: labelStyles }, 'Appliance Type'),
    el('div', { key: `appliance_type${device.device_id}` }, device.appliance_type),

    el('div', { key: 'appliance_name', style: labelStyles }, 'Appliance Name'),
    el('div', { key: `appliance_name${device.device_id}` }, device.appliance_name),

    el('div', { key: 'create_time', style: labelStyles }, 'Registered At'),
    el('div', { key: `create_time${device.device_id}` }, new Date(device.create_time).toString()),

    el('div', { key: 'archived_label', style: labelStyles }, 'Archived'),
    el('input', { key: 'archived_checkbox', type: 'checkbox', readOnly: true, checked: device.archived }),
  ]
}
