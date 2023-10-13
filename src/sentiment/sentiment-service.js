const axios = require('axios');
const cheerio = require('cheerio');

const SentimentService = {
  async scrapeTradingView() {
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

    return articles;
  },
};

module.exports = SentimentService;
