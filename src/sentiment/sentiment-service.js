const axios = require('axios');
const cheerio = require('cheerio');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SentimentService = {
  async scrapeTradingView(subject) {
    try {
      const url = 'https://www.tradingview.com/news/';
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const articles = [];

      $('a[href^="/news/"]').each((index, element) => {
        const articleUrl = $(element).attr('href');
        const articleTitle = $(element).text();
        if (articleTitle.toLowerCase().includes(subject)) {
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

      const date = $('[class*="breadcrumbs"]').text().trim();
      const title = $('[class*="title"]').text().trim();
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

  async getSentimentFromGPT(content, analysisType, subject) {
    const apiKey = OPENAI_API_KEY;
    const url = OPENAI_API_URL;
    let userPrompt = '';

    switch (analysisType) {
      case 'summarize':
        userPrompt = `Please provide a concise one-sentence summary of the following news article:\n\n${content}`;
        break;
      case 'sentimentWords':
        userPrompt = `Give a brief one to three sentence sentiment analysis, describing the strength of ${subject}, based on the following news articles:\n\n${content}`;
        break;
      case 'sentimentScore':
        userPrompt = `Please calculate and provide a sentiment score, representing the strength of ${subject}, for the following news article. The score should be a float between -1 and 1, rounded to 4 decimal places:\n\n${content}`;
        break;
      default:
        console.error('Invalid analysis type');
        return null;
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    };

    const body = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst specialized in commodities.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    try {
      console.log('Sending request to GPT-3.5 Turbo API...');
      const response = await axios.post(url, body, config);
      console.log('Received response from GPT-3.5 Turbo:', response.data);
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error(
        `Error in getSentimentFromGPT4 for ${analysisType}:`,
        error
      );
      return null;
    }
  },

  async performSentimentAnalysis(subject) {
    try {
      console.log(`Starting sentiment analysis for ${subject}...`);
      const articles = await this.scrapeTradingView(subject);
      let combinedContent = '';
      const sentimentSubject = subject === 'dollar' ? 'US Dollar' : subject;
      const sentimentScores = []; // Store sentiment scores for averaging

      for (const article of articles) {
        console.log(`Fetching content for article: ${article.url}`);
        const content = await this.fetchArticleContent(article.url);
        if (content) {
          combinedContent += ' ' + content.content;
        }
      }

      console.log('Combined content fetched, analyzing sentiment...');

      // Run the sentiment score call 10 times and save the results
      for (let i = 0; i < 10; i++) {
        const sentimentScoreString = await this.getSentimentFromGPT(
          combinedContent,
          'sentimentScore',
          sentimentSubject
        );
        const sentimentScoreMatch = sentimentScoreString.match(/-?\d+\.\d+/);
        const sentimentScore = sentimentScoreMatch
          ? parseFloat(sentimentScoreMatch[0])
          : NaN;

        sentimentScores.push(sentimentScore);
      }

      // Calculate the average sentiment score
      const averageSentimentScore =
        sentimentScores.reduce((sum, score) => sum + score, 0) /
        sentimentScores.length;

      // Calculate the low and high sentiment scores
      const lowSentimentScore = Math.min(...sentimentScores);
      const highSentimentScore = Math.max(...sentimentScores);

      const summary = await this.getSentimentFromGPT(
        combinedContent,
        'summarize',
        sentimentSubject
      );
      const sentimentWords = await this.getSentimentFromGPT(
        combinedContent,
        'sentimentWords',
        sentimentSubject
      );

      const analyzedArticle = {
        date: 'Date not found',
        summary: summary,
        sentimentWords: sentimentWords,
        sentimentScores: {
          low: lowSentimentScore.toFixed(4),
          high: highSentimentScore.toFixed(4),
          average: averageSentimentScore.toFixed(4),
        },
      };

      console.log('Analyzed article:', analyzedArticle);
      return analyzedArticle;
    } catch (error) {
      console.error('Error in performSentimentAnalysis:', error);
      return null;
    }
  },
};

module.exports = SentimentService;
