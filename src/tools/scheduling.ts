import { RepeatOptions } from "bullmq"

// these two repeatAtHours and RESILIENCE_OPTS
// can be combined, as opts to a bullmq job
const repeatAtHours = (hours: number | string, tz: string): RepeatOptions => ({
  // uses cron-parser inside:
  // https://www.npmjs.com/package/cron-parser
  cron: `0 ${hours} * * *`,
  // schedule it according to the set time zone
  tz,
})

const repeatAtMinutes = (minutes: number | string, tz: string) : RepeatOptions => ({
  // uses cron-parser inside:
  // https://www.npmjs.com/package/cron-parser
  cron: `${minutes} * * * *`,
  // schedule it according to the set time zone
  tz,
})

const repeatAtHoursAndWeekday = (hours: number | string, weekDay: number | string, tz: string): RepeatOptions => ({
  cron: `0 ${hours} * * ${weekDay}`,
  tz,
})

const RESILIENCE_OPTS = {
  // give it a little bit of resilience
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
}

export { repeatAtHours, repeatAtHoursAndWeekday, repeatAtMinutes, RESILIENCE_OPTS }
