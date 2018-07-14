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

function getPrice(asset, base) {
    return Promise.resolve(cache.get('PRICES'))
        .then(result => {
            if (result != undefined) {
                console.info('load prices from cache');
                return result[asset][base].price;
            }
            return requestify.get('https://explorer.mvs.org/api/pricing/tickers')
                .then(response => response.getBody().result)
                .then(prices => {
                    cache.put('PRICES', prices);
                    console.info('save prices to cache');
                    return prices[asset][base].price;
                });
        });
}

bot.onText(/\/start/, (msg, match) => {
    console.log(msg);
    const opts = {
        reply_to_message_id: msg.message_id,
        reply_markup: JSON.stringify({
            keyboard: [
                ['/price'],
                ['/height']
            ]
        })
    };
    bot.sendMessage(msg.chat.id, 'Hi. I am MyETPBot. You can get the current price and blockchain height from the menu or ask any address balance by /address ADDRESS. Have fun!', opts);

});

bot.onText(/\/balance(?:\s*)(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const address = match[1];
    requestify.get('https://explorer.mvs.org/api/address/info/' + address)
        .then(response => response.getBody().result.info.ETP)
        .then(balance => bot.sendMessage(chatId, balance / 100000000))
        .catch(error => bot.sendMessage(chatId, 'Not found'));
});



bot.onText(/\/height/, (msg, match) => {
    requestify.get('https://explorer.mvs.org/api/height')
        .then(response => response.getBody().result)
        .then(height => bot.sendMessage(msg.chat.id, height))
        .catch(error => bot.sendMessage(msg.chat.id, 'Not found'));
});

bot.onText(/\/price/, (msg, match) => {
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

// Handle callback queries
bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const data = JSON.parse(callbackQuery.data);
    const msg = callbackQuery.message;
    const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
    };
    let text;
    if (data.command === 'price') {
        getPrice('ETP', data.base)
            .then(price => {
                var formatter = new Intl.NumberFormat(callbackQuery.from.language_code, {
                    minimumFractionDigits: 2,
                    style: 'currency',
                    currency: data.base,
                    maximumFractionDigits: (data.base == 'BTC') ? 6 : 2
                });
                bot.sendMessage(opts.chat_id, formatter.format(price));
                bot.answerCallbackQuery(callbackQuery.id);
            })
            .catch(error => {
                bot.sendMessage(opts.chat_id, 'Not found');
                bot.answerCallbackQuery(callbackQuery.id);
            });
    }

});

bot.on('message', console.log)
