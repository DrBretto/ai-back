const axios = require('axios');
const cheerio = require('cheerio');

const OPENAI_API_URL =
  'https://api.openai.com/v1/engines/davinci-codex/completions';
const API_KEY = process.env.OPENAI_API_KEY;

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

  async getSentimentFromGPT(articleContent) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    };

    const data = {
      prompt: `Analyze the following article content for sentiment regarding the price of gold:\n\n${articleContent}`,
      max_tokens: 100,
    };

    try {
      const response = await axios.post(OPENAI_API_URL, data, { headers });
      return response.data.choices[0].text.trim();
    } catch (error) {
      console.error('Error in getSentimentFromGPT:', error);
      return null;
    }
  },

  async performSentimentAnalysis() {
    try {
      const articles = await this.scrapeTradingView();
      const analyzedArticles = [];
  
      for (const article of articles) {
        const content = await this.fetchArticleContent(article.url);
        if (content) {
          const gptSentiment = await this.getSentimentFromGPT(content.content);
          const sentimentValue = this.convertSentimentToValue(gptSentiment); // Assuming you have a function to convert sentiment to value
          analyzedArticles.push({
            date: content.adjDate,
            sentimentBlurb: gptSentiment,
            sentimentValue,
          });
        }
      }
  
      console.log('Analyzed articles:', analyzedArticles);
      return analyzedArticles.map(article => ({
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
