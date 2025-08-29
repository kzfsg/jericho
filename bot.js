require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const messageHistory = new Map();

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log(`Received message: ${msg.text} from ${msg.from?.first_name}`);
  if (!messageHistory.has(chatId)) {
    messageHistory.set(chatId, []);
  }
  const messages = messageHistory.get(chatId);
  messages.push(msg);
  console.log(`Stored ${messages.length} messages for chat ${chatId}`);
  if (messages.length > 100) {
    messages.shift();
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Hello! I can summarize your chat messages. Use /summarise to get a summary of recent messages.');
});

bot.onText(/\/summarise/, async (msg) => {
  const chatId = msg.chat.id;
  
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
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Please provide a concise summary of the following chat messages:\n\n${messageTexts}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    bot.sendMessage(chatId, `📝 *Chat Summary:*\n\n${summary}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I encountered an error while summarizing the messages. Please try again later.');
  }
});

console.log('Bot is running...');