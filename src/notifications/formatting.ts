import moment from 'moment'
import { TIMEZONE } from '../gridRenewables/times'

export function formatTimeAus(timeframe: string): string {
  return timeframe
    .split(' - ')
    .map((time) => moment.tz(time, TIMEZONE).format('h:mma').replace(/:00/g, ''))
    .join('-')
}
