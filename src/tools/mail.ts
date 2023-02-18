import * as dotenv from 'dotenv'
// Weird bug, in linux mint the configuration is not loaded for this environment
dotenv.config()

type SendMailInput = {
  target: string
  subject: string
  message: string
}

type MailFunction = (data: SendMailInput) => Promise<void>

const sendMail: MailFunction = async (data: SendMailInput) => {
  const msg = {
    to: data.target,
    from: '',
    subject: data.subject,
    html: data.message,
  }
}

const mockSendMail: MailFunction = async (data: SendMailInput) => {
  const msg = {
    to: data.target,
    from: '',
    subject: data.subject,
    html: data.message,
  }
  console.log('email sent via mockSendMail: ', msg)
}

export { sendMail, mockSendMail, SendMailInput, MailFunction }
