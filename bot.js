const fs = require('fs')
require('dotenv').config()
const axios = require('axios')
const cheerio = require('cheerio')
const TelegramBot = require('node-telegram-bot-api')
const cron = require('node-cron')

const token = process.env.BOT_TOKEN
const bot = new TelegramBot(token, { polling: true })
const userRequests = new Set()
const userIgnoreList = new Map()
const userSubscriptions = new Map()

bot.onText(/\/start/, (msg) => {
  handleUserRequest(msg)
})

bot.onText(/\/stop/, (msg) => {
  handleStop(msg)
})

bot.onText(/\/restart/, (msg) => {
  handleRestart(msg)
})

bot.onText(/\/ignore (.+)/, (msg, match) => {
  handleIgnore(msg, match)
})

bot.onText(/\/subscribe/, (msg) => {
  handleSubscribe(msg)
})

bot.onText(/\/options/, (msg) => {
  const chatId = msg.chat.id
  const message = "Напоминаю, я ищу битые ссылки и т.д. Также покажу сервисы, которые могут помочь с аналитикой вашего сайта."

  const keyboard = {
    reply_markup: {
      keyboard: [
        [
          { text: 'Яндекс позиции' },
          { text: 'Google позиции' },
          { text: 'Коммерческость запроса' },
        ],
      ],
      one_time_keyboard: true,
    },
  }

  bot.sendMessage(chatId, message, keyboard)
})

bot.onText(/Яндекс позиции/, (msg) => {
  const chatId = msg.chat.id
  const message = "Для получения Яндекс позиций перейдите по ссылке: [ЯндексIKS_bot](https://t.me/YandexIKS_bot)"

  bot.sendMessage(chatId, message, { parse_mode: 'markdown' })
})

bot.onText(/\/donate/, (msg) => {
  const chatId = msg.chat.id
  const message = "Работа работой, а кофе это святое. Если есть желание напоить молодых и красивых, то можешь купить мне кофе"
  const imageURL = "https://helloimjessa.files.wordpress.com/2021/06/bmc-button.png?w=660"
  const donateURL = "https://www.buymeacoffee.com/shutupandbuymecoffee"

  // Отправка сообщения
  bot.sendMessage(chatId, message)

  // Отправка картинки с ссылкой
  bot.sendPhoto(chatId, imageURL, {
    caption: "Поддержать кофе",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Купить кофе", url: donateURL }],
      ],
    },
  })
})

bot.onText(/Google позиции/, (msg) => {
  const chatId = msg.chat.id
  const message = "Для получения Google позиций перейдите по ссылке: [GooglePositions_bot](https://t.me/GooglePositions_bot)"

  bot.sendMessage(chatId, message, { parse_mode: 'markdown' })
})

bot.onText(/Коммерческость запроса/, (msg) => {
  const chatId = msg.chat.id
  const message = "Для проверки коммерческости запроса перейдите по ссылке: [SEOKommercheskost_bot](https://t.me/SEOKommercheskost_bot)"

  bot.sendMessage(chatId, message, { parse_mode: 'markdown' })
})

bot.on('callback_query', (query) => {
  if (query.data === 'start_check') {
    handleUserRequest(query.message.chat)
  }
})

bot.on('text', (msg) => {
  handleUserRequest(msg)
})

function handleSubscribe(msg) {
  const chatId = msg.chat.id
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Каждый день', callback_data: 'daily' },
          { text: 'Каждую неделю', callback_data: 'weekly' },
          { text: 'Каждый месяц', callback_data: 'monthly' },
        ],
      ],
    },
  }

  bot.sendMessage(chatId, 'Выберите частоту отчетов:', keyboard)
}

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id
  const data = query.data

  if (['daily', 'weekly', 'monthly'].includes(data)) {
    userSubscriptions.set(chatId, data)
    bot.sendMessage(chatId, `Вы будете получать отчеты ${data}`)
    // Schedule sending reports based on the chosen frequency
    scheduleReports(chatId, data)
  }
})

function scheduleReports(chatId, frequency) {
  // Use the 'node-cron' library to schedule reports based on user preferences
  let cronExpression

  if (frequency === 'daily') {
    cronExpression = '0 0 * * *' // Every day at midnight
  } else if (frequency === 'weekly') {
    cronExpression = '0 0 * * 1' // Every Monday at midnight
  } else if (frequency === 'monthly') {
    cronExpression = '0 0 1 * *' // First day of every month at midnight
  }

  // Schedule the report
  cron.schedule(cronExpression, () => {
    sendReport(chatId)
  })
}

async function handleUserRequest(msg) {
  const chatId = msg.chat.id

  if (!userRequests.has(chatId)) {
    userRequests.add(chatId)
    sendReport(chatId)
    console.log(`Запрос на проверку ссылок отправлен для чата ${chatId}`)
  }
}

function handleStop(msg) {
  const chatId = msg.chat.id
  if (userRequests.has(chatId)) {
    userRequests.delete(chatId)
    bot.sendMessage(chatId, 'Работа бота остановлена.')
    console.log(`Работа бота остановлена для чата ${chatId}`)
  }
}

function handleRestart(msg) {
  const chatId = msg.chat.id
  if (!userRequests.has(chatId)) {
    userRequests.add(chatId)
    sendReport(chatId)
    bot.sendMessage(chatId, 'Бот перезапущен. Проверка ссылок начата.')
    console.log(`Бот перезапущен для чата ${chatId}`)
  }
}

function handleIgnore(msg, match) {
  const chatId = msg.chat.id
  const linksToIgnore = match[1].split('\n')

  if (!userIgnoreList.has(chatId)) {
    userIgnoreList.set(chatId, [])
  }

  const ignoredLinks = userIgnoreList.get(chatId)
  linksToIgnore.forEach((link) => {
    ignoredLinks.push(link)
  })

  bot.sendMessage(chatId, 'Следующие ссылки будут проигнорированы при проверке.')
  console.log(`Следующие ссылки будут проигнорированы для чата ${chatId}: ${linksToIgnore.join(', ')}`)
}

async function findBrokenLinks(chatId) {
  try {
    const response = await axios.get(process.env.SITE_LINK)
    const $ = cheerio.load(response.data)
    const links = $('a')
    const brokenLinks = []
    const goodLinks = []

    for (let i = 0; i < links.length; i++) {
      const href = $(links[i]).attr('href')
      if (await isBroken(href)) {
        brokenLinks.push(href)
      } else {
        goodLinks.push(href)
      }
    }

    if (brokenLinks.length > 0) {
      const brokenLinksText = brokenLinks.join('\n')
      fs.writeFileSync('broken_links.txt', brokenLinksText)
      bot.sendDocument(chatId, 'broken_links.txt', {
        caption: 'Битые ссылки на сайте meet-market.ru'
      })
      console.log(`Отправлены битые ссылки для чата ${chatId}`)
    }

    if (goodLinks.length > 0) {
      const goodLinksText = goodLinks.join('\n')
      fs.writeFileSync('good_links.txt', goodLinksText)
      bot.sendDocument(chatId, 'good_links.txt', {
        caption: 'Небитые ссылки на сайте meet-market.ru'
      })
      console.log(`Отправлены небитые ссылки для чата ${chatId}`)
    }

    if (brokenLinks.length === 0 && goodLinks.length === 0) {
      bot.sendMessage(chatId, 'На сайте meet-market.ru нет битых или небитых ссылок.')
      console.log(`Сайт meet-market.ru не содержит битых или небитых ссылок для чата ${chatId}`)
    }
  } catch (error) {
    console.error('Ошибка при скрапинге сайта:', error)
    bot.sendMessage(chatId, 'Произошла ошибка при проверке ссылок.')
    console.log(`Произошла ошибка при проверке ссылок для чата ${chatId}: ${error.message}`)
  }
}

//прокидываем запрос на проверку битой ссылки
async function isBroken(href) {
  try {
    const response = await axios.head(href)
    return response.status === 200
  } catch (error) {
    return false
  }
}

async function sendReport(chatId) {
  bot.sendMessage(chatId, 'Я еще проверяю ваш сайт на наличие битых ссылок')
  console.log(`Начата проверка ссылок для чата ${chatId}`)
  findBrokenLinks(chatId)
}

