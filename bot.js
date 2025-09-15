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

    if (msg.text?.startsWith('/summarise')) {
      console.log('Handling /summarise command');
      const parts = msg.text.split(' ');
      const count = parts.length > 1 ? parseInt(parts[1]) : null;
      handleSummarize(chatId, count);
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

async function handleSummarize(chatId, count = null) {
    try {
    const requestedCount = count || 'recent';
    bot.sendMessage(chatId, `Summarizing ${requestedCount === 'recent' ? 'recent' : requestedCount} messages...`);
    
    const allMessages = messageHistory.get(chatId) || [];
    
    if (allMessages.length === 0) {
      bot.sendMessage(chatId, 'No messages to summarize. Send some messages first!');
      return;
    }

    // Filter out command messages first
    const textMessages = allMessages.filter(msg => msg.text && !msg.text.startsWith('/'));
    
    // If count is specified, take the last N messages, otherwise default to 100
    const defaultCount = 100;
    const actualCount = count && count > 0 ? count : defaultCount;
    const messagesToSummarize = textMessages.slice(-actualCount);
    
    if (messagesToSummarize.length === 0) {
      bot.sendMessage(chatId, 'No text messages found to summarize.');
      return;
    }

    // Validate count parameter
    if (actualCount > 0 && messagesToSummarize.length < actualCount) {
      bot.sendMessage(chatId, `Only ${messagesToSummarize.length} text messages available, summarizing all of them.`);
    }
    
    const messageTexts = messagesToSummarize
      .map(msg => `${msg.from?.first_name || 'User'}: ${msg.text}`)
      .join('\n');
    
    const finalCount = messagesToSummarize.length;
    console.log(`Found ${allMessages.length} total messages, ${textMessages.length} text messages, summarizing ${finalCount} messages`);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `Please provide a concise summary of the following chat messages:\n\n${messageTexts}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    // Escape markdown characters that could cause parsing errors
    const escapedSummary = summary.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    bot.sendMessage(chatId, `📝 *Chat Summary (${finalCount} messages):*\n\n${escapedSummary}`, { parse_mode: 'Markdown' });
    
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
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `From the following chat messages, please select your absolute favourite one and explain why. Be specific about who sent it and what makes it special or interesting to you:\n\n${messageTexts}\n\nPlease respond in this format:\n[quote the exact message]\n**From:** [person's name]\n**Why I chose it:** [your explanation]`;
    
    const result = await model.generateContent(prompt);
    const favourite = result.response.text();
    
    // Escape markdown characters that could cause parsing errors
    const escapedFavourite = favourite.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    bot.sendMessage(chatId, `💝 *My Favourite Message:*\n\n${escapedFavourite}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, 'Sorry, I encountered an error while finding my favourite message. Please try again later.');
  }
}

console.log('Bot is running...');