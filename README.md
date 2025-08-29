# Jericho - Telegram Chat Summarizer Bot

A Telegram bot that uses Google's Gemini AI to provide summaries of chat conversations.

## Features

- Summarizes the last 100 messages in a chat
- Powered by Google's Gemini Pro AI model
- Easy to use commands

## Prerequisites

- Node.js (v14 or higher)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Google Gemini API Key

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your credentials:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_token
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Start the bot:
   ```bash
   node bot.js
   ```

## Usage

- `/start` - Initialize the bot
- `/summarise` - Get a summary of the last 100 messages in the chat

## Dependencies

- node-telegram-bot-api
- @google/generative-ai
- dotenv

## License

MIT

## Contributing

Feel free to open issues and submit pull requests.
