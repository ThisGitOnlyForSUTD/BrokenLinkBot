# Описание скрипта для проверки битых ссылок в Telegram боте

Этот скрипт на языке JavaScript используется для создания Telegram бота, который выполняет проверку битых (нерабочих) ссылок на веб-сайтах. Ниже представлено описание основных компонентов скрипта и его функциональности.
Описание файлов и библиотек

    fs: Этот модуль предназначен для работы с файловой системой. В данном скрипте он используется для чтения файлов.

    dotenv: Библиотека dotenv используется для загрузки переменных окружения из файла .env.

    axios: Axios - это библиотека для выполнения HTTP-запросов. Она используется для отправки HTTP HEAD-запросов к ссылкам для проверки их доступности.

    cheerio: Cheerio - это библиотека парсинга HTML и XML, которая используется для анализа веб-страниц и извлечения данных из них.

    node-telegram-bot-api: Это библиотека для создания Telegram ботов и взаимодействия с Telegram API.

## Переменные окружения

Переменная BOT_TOKEN является обязательной переменной окружения и содержит токен Telegram бота. Она загружается из файла .env с помощью библиотеки dotenv.
Основные компоненты бота
Бот

## Создается экземпляр бота с использованием токена Telegram. Бот настроен на опрос новых сообщений.

## Процесс работы бота

Пользователи могут отправлять команду /start или взаимодействовать с ботом через встроенные кнопки. При запросе на проверку ссылок бот отправляет сообщение о начале проверки и начинает асинхронный процесс проверки битых ссылок на веб-сайтах. После завершения проверки, бот отправляет отчет пользователю.

Примечание: Для полной функциональности бота необходимо настроить .env файл с токеном бота.


## мысли
На данный момент, это сырой проект, который нужно сделать более гибким и дружелюбным для пользователя
