# MyETPBot
This is a simple telegram bot to get information about the Metaverse Blockchain.

# Setup
First you need to create a Telegram bot. To do so you have to connect to BotFather and use the `/newbot` command. Then just follow the instructions. You will get a token that you will need in order to configure the bot:

``` bash
npm install
export TELEGRAM_TOKEN=your_telegram_token
node index.js
```

# How does it work?
It creates a bot object. This object connects to telegram and emits events for new incomming messages to your bot. To respond to different inputs the commands are defined as regular expressions that match the message text.

If the commands requires the loading of external data (from the explorer) it caches them for later requests from other users.

On startup it also sends a message with the common commands as a keyboard layer. Functions that require feedback are implemented as callback messages that contain a stringified data object.
