require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

const messageHistory = new Map();

bot.on('message', (msg) => {
  console.log('=== NEW MESSAGE EVENT ===');
  try {
    const chatId = msg.chat.id;
    console.log(`Received message: "${msg.text}" from ${msg.from?.first_name} (Chat ID: ${chatId})`);
    
    if (!messageHistory.has(chatId)) {
      messageHistory.set(chatId, []);
      console.log(`Created new message history for chat ${chatId}`);
    }
    const messages = messageHistory.get(chatId);
    messages.push(msg);
    console.log(`Stored ${messages.length} messages for chat ${chatId}`);
    if (messages.length > 100) {
      messages.shift();
    }

    if (msg.text === '/start') {
      console.log('Handling /start command');
      bot.sendMessage(chatId, 'Hello! I can summarize your chat messages. Use /summarise to get a summary of recent messages.');
      return;
    }

    if (msg.text === '/summarise') {
      console.log('Handling /summarise command');
      handleSummarize(chatId);
      return;
    }

    if (msg.text === '/favourite') {
      console.log('Handling /favourite command');
      handleFavourite(chatId);
      return;
    }
    
    console.log('Message processed successfully');
  } catch (error) {
    console.error('Error in message handler:', error);
  }
});

async function handleSummarize(chatId) {
    try {
    bot.sendMessage(chatId, 'Summarizing recent messages...');
    
    const messages = messageHistory.get(chatId) || [];
    
    if (messages.length === 0) {
      bot.sendMessage(chatId, 'No messages to summarize. Send some messages first!');
      return;
    }
    
    const messageTexts = messages
      .filter(msg => msg.text && !msg.text.startsWith('/'))
      .map(msg => `${msg.from?.first_name || 'User'}: ${msg.text}`)
      .join('\n');
    
    console.log(`Found ${messages.length} total messages, ${messageTexts.split('\n').filter(m => m.trim()).length} text messages`);
    
    if (!messageTexts) {
      bot.sendMessage(chatId, 'No text messages found to summarize.');
      return;
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Please provide a concise summary of the following chat messages:\n\n${messageTexts}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    bot.sendMessage(chatId, `📝 *Chat Summary:*\n\n${summary}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I encountered an error while summarizing the messages. Please try again later.');
  }
}

async function handleFavourite(chatId) {
  try {
    bot.sendMessage(chatId, 'Finding my favourite message...');
    
    const messages = messageHistory.get(chatId) || [];
    
    if (messages.length === 0) {
      bot.sendMessage(chatId, 'No messages to choose from. Send some messages first!');
      return;
    }
    
    const messageTexts = messages
      .filter(msg => msg.text && !msg.text.startsWith('/'))
      .map((msg, index) => `${index + 1}. ${msg.from?.first_name || 'User'}: ${msg.text}`)
      .join('\n');
    
    if (!messageTexts) {
      bot.sendMessage(chatId, 'No text messages found to choose from.');
      return;
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `From the following chat messages, please select your absolute favourite one and explain why. Be specific about who sent it and what makes it special or interesting to you:\n\n${messageTexts}\n\nPlease respond in this format:\n**Favourite Message:** [quote the exact message]\n**From:** [person's name]\n**Why I chose it:** [your explanation]`;
    
    const result = await model.generateContent(prompt);
    const favourite = result.response.text();
    
    bot.sendMessage(chatId, `💝 *My Favourite Message:*\n\n${favourite}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I encountered an error while finding my favourite message. Please try again later.');
  }
}

console.log('Bot is running...');