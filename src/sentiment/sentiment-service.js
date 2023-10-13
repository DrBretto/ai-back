const axios = require('axios');
const cheerio = require('cheerio');

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
      const articleContent = $('[class*="article"]').text().trim(); 
      
      console.log('Fetched article content:', articleContent);
      console.log('Fetched date:', date);
      console.log('Fetched title:', title);
      
      return { date, title, content: articleContent };
    } catch (error) {
      console.error('Error in fetchArticleContent:', error);
      return null;
    }
  },
  

  async performSentimentAnalysis() {
    try {
      const articles = await this.scrapeTradingView();
      const articleContents = [];

      for (const article of articles) {
        const content = await this.fetchArticleContent(article.url);
        articleContents.push({ title: article.title, content });
      }

      console.log('Article contents:', articleContents);
      return articleContents;
    } catch (error) {
      console.error('Error in performSentimentAnalysis:', error);
      return [];
    }
  },
};

module.exports = SentimentService;
