import start from './server'

start()
  .catch((e: Error) => {
    console.error('There was a fatal error', e)
    process.exit(1)
  })