const TelegramBot = require('node-telegram-bot-api');
const requestify = require('requestify');

const Cache = require('ttl');
var cache = new Cache({
    ttl: 1 * 60 * 1000,
    capacity: 10
});

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {
    polling: true
});

bot.onText(/\/start/, (msg, match) => {
    console.log(msg);
    const opts = {
        reply_to_message_id: msg.message_id,
        reply_markup: JSON.stringify({
            keyboard: [
                ['price'],
                ['height']
            ],
            'one_time_keyboard': true
        })
    };
    if(msg.chat.type=="private")
        bot.sendMessage(msg.chat.id, 'Hi. I am MyETPBot. You can get the current price and blockchain height from the menu or ask for the balance of an address. Have fun!', opts);

});

bot.onText(/balance(?:.*) (M[A-Za-z0-9]{33})/i, (msg, match) => {
    const chatId = msg.chat.id;
    const address = match[1];
    getBalance(address)
        .then(balance => bot.sendMessage(chatId, `The balance of ${address} is: ${balance}`))
        .catch(error => bot.sendMessage(chatId, 'Not found'));
});



bot.onText(/height/i, (msg, match) => {
    getHeight()
        .then(height => bot.sendMessage(msg.chat.id, height))
        .catch(error => bot.sendMessage(msg.chat.id, 'Not found'));
});

bot.onText(/price/i, (msg, match) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{
                        text: 'BTC',
                        callback_data: JSON.stringify({
                            command: 'price',
                            'base': 'BTC'
                        })
                    },
                    {
                        text: 'USD',
                        callback_data: JSON.stringify({
                            command: 'price',
                            'base': 'USD'
                        })
                    },
                    {
                        text: 'CNY',
                        callback_data: JSON.stringify({
                            command: 'price',
                            'base': 'CNY'
                        })
                    },
                    {
                        text: 'EUR',
                        callback_data: JSON.stringify({
                            command: 'price',
                            'base': 'EUR'
                        })
                    },
                    {
                        text: 'JPY',
                        callback_data: JSON.stringify({
                            command: 'price',
                            'base': 'JPY'
                        })
                    }
                ]
            ]
        }
    };
    bot.sendMessage(msg.chat.id, 'Choose base currency', opts);
});

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const data = JSON.parse(callbackQuery.data);
    const msg = callbackQuery.message;
    const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
    };
    let text;
    if (data.command === 'price') {
        getTicker('ETP', data.base)
            .then(ticker => {
                var formatter = new Intl.NumberFormat(callbackQuery.from.language_code, {
                    minimumFractionDigits: 2,
                    style: 'currency',
                    currency: data.base,
                    maximumFractionDigits: (data.base == 'BTC') ? 6 : 2
                });
                bot.sendMessage(opts.chat_id, `${formatter.format(ticker.price)}\n${ticker.percent_change_1h}% in 1 hour\n${ticker.percent_change_24h}% in 24 hours\n${ticker.percent_change_7d}% in 7 days\n${formatter.format(ticker.market_cap)} market cap\n${formatter.format(ticker.volume_24h)} 24h volume`);
                bot.answerCallbackQuery(callbackQuery.id);
            })
            .catch(error => {
                bot.sendMessage(opts.chat_id, 'Not found');
                bot.answerCallbackQuery(callbackQuery.id);
            });
    }

});

bot.on('message', console.log);

function getHeight() {
    return Promise.resolve(cache.get('HEIGHT'))
        .then(result => {
            if (result != undefined) {
                return result;
            }
            return requestify.get('https://explorer.mvs.org/api/height')
                .then(response => response.getBody().result)
                .then(height => {
                    cache.put('HEIGHT', height, 10 * 1000);
                    console.info('save height to cache');
                    return height;
                });
        });
}

function getTicker(asset, base) {
    return Promise.resolve(cache.get('PRICES'))
        .then(result => {
            if (result != undefined) {
                console.info('load prices from cache');
                return result[asset][base];
            }
            return requestify.get('https://explorer.mvs.org/api/pricing/tickers')
                .then(response => response.getBody().result)
                .then(prices => {
                    cache.put('PRICES', prices);
                    console.info('save prices to cache');
                    return prices[asset][base];
                });
        });
}

function getBalance(address) {
    return requestify.get('https://explorer.mvs.org/api/address/info/' + address)
        .then(response => response.getBody().result.info.ETP)
        .then(balance => {
            if (balance)
                return balance / 100000000;
            else
                throw Error('Balance not found');
        });
}
