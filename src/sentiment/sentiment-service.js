const axios = require('axios');
const cheerio = require('cheerio');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SentimentService = {
  async scrapeTradingView() {
    try {
      const url = 'https://www.tradingview.com/news/';
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const articles = [];

      $('a[href^="/news/"]').each((index, element) => {
        const articleUrl = $(element).attr('href');
        const articleTitle = $(element).text();
        if (
          articleTitle.toLowerCase().includes('gold') ||
          articleTitle.toLowerCase().includes('us dollar')
        ) {
          articles.push({
            url: `https://www.tradingview.com${articleUrl}`,
            title: articleTitle,
          });
        }
      });

      console.log('Scraped articles:', articles);
      return articles;
    } catch (error) {
      console.error('Error in scrapeTradingView:', error);
      return [];
    }
  },

  async fetchArticleContent(url) {
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      // Get date from breadcrumbs
      const date = $('[class*="breadcrumbs"]').text().trim();

      // Get article title
      const title = $('[class*="title"]').text().trim();

      // Get article content (replace with a more specific selector if available)
      const articleContent = $('div[class*="body-"]').text().trim();

      console.log('Fetched article content:', articleContent);

      const dateRegex = /(\w+ \d+, \d+ \d+:\d+ UTC)/;
      const match = date.match(dateRegex);
      const adjDate = match ? match[1] : 'Date not found';

      console.log('Fetched date:', adjDate);
      console.log('Fetched title:', title);

      return { adjDate, title, content: articleContent };
    } catch (error) {
      console.error('Error in fetchArticleContent:', error);
      return null;
    }
  },

  async getSentimentFromGPT4(content) {
    const apiKey = OPENAI_API_KEY;
    const url = OPENAI_API_URL;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    };

    const body = {
      model: 'gpt-3.5-turbo', // specify the model name
      messages: [
        {
          role: 'system',
          content:
            'You are a financial analyst specialized in commodities, with a focus on predicting gold prices.',
        },
        {
          role: 'user',
          content: `Analyze the following news article and provide a market outlook for gold. Also, provide a sentiment score ranging from -1 to 1. A score of -1 indicates a bearish outlook with a significant expected decline in gold prices, a score of 1 indicates a bullish outlook with a significant expected increase, and a score of 0 indicates a neutral outlook with no significant change expected:\n\n${content}`,
        },
      ],
    };

    try {
      console.log('Sending request to GPT-3.5 Turbo API...');
      const response = await axios.post(url, body, config);
      console.log('Received response from GPT-3.5 Turbo:', response.data);

      const responseText = response.data.choices[0].message.content.trim();
      // Extract the sentiment score from the response text
      const sentimentScore = parseFloat(
        responseText.match(/Sentiment Score: ([-+]?[0-9]*\.?[0-9]+)/)[1]
      );

      return { responseText, sentimentScore }; // Return both the text and the score
    } catch (error) {
      console.error('Error in getSentimentFromGPT4:', error);
      return null;
    }
  },

  async performSentimentAnalysis() {
    try {
      console.log('Starting sentiment analysis...');
      const articles = await this.scrapeTradingView();
      const analyzedArticles = [];

      for (const article of articles) {
        console.log(`Fetching content for article: ${article.url}`);
        const content = await this.fetchArticleContent(article.url);
        if (content) {
          console.log('Content fetched, analyzing sentiment...');
          const gptSentiment = await this.getSentimentFromGPT4(content.content); // Note the change here to GPT4
          const sentimentValue = this.convertSentimentToValue(gptSentiment);
          analyzedArticles.push({
            date: content.adjDate,
            sentimentBlurb: gptSentiment,
            sentimentValue,
          });
        }
      }

      console.log('Analyzed articles:', analyzedArticles);
      return analyzedArticles.map((article) => ({
        date: article.date,
        sentimentBlurb: article.sentimentBlurb,
        sentimentValue: article.sentimentValue,
      }));
    } catch (error) {
      console.error('Error in performSentimentAnalysis:', error);
      return [];
    }
  },
};

module.exports = SentimentService;
