const fs = require('fs')
require('dotenv').config()
const axios = require('axios')
const cheerio = require('cheerio')
const TelegramBot = require('node-telegram-bot-api')

const token = process.env.BOT_TOKEN
const userRequests = new Set()

const bot = new TelegramBot(token, { polling: true })

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id

  const uniqueRequestId = `${chatId}-${userId}`
  if (!userRequests.has(uniqueRequestId)) {
    userRequests.add(uniqueRequestId)
    sendReport(chatId)
    console.log(`Запрос на проверку ссылок отправлен для чата ${chatId}`)
  }
})

bot.on('callback_query', (query) => {
  if (query.data === 'start_check') {
    const chatId = query.message.chat.id
    if (!userRequests.has(chatId)) {
      userRequests.add(chatId)
      sendReport(chatId)
      console.log(`Запрос на проверку ссылок отправлен для чата ${chatId}`)
    }
  }
})

bot.on('text', (msg) => {
  const chatId = msg.chat.id
  if (!userRequests.has(chatId)) {
    userRequests.add(chatId)
    sendReport(chatId)
    console.log(`Запрос на проверку ссылок отправлен для чата ${chatId}`)
  }
})

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
