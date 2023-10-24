const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');

const AYLIEN_API_URL = 'https://api.aylien.com/news/stories';
const AYLIEN_APP_ID = process.env.AYLIEN_APP_ID;
const AYLIEN_API_KEY = process.env.AYLIEN_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const sh = require('./sentiment-helper');

let totalTokensUsed = 0;

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

      console.log('Scraped articles from tradingview relating to ', subject);
      return articles;
    } catch (error) {
      console.error('Error in scrapeTradingView:', error.code);
      return [];
    }
  },

  async fetchHistoricalNews(db, subject, startDate, endDate) {
    try {
      const url = AYLIEN_API_URL;
      const response = await axios.get(url, {
        headers: {
          'X-AYLIEN-NewsAPI-Application-ID': AYLIEN_APP_ID,
          'X-AYLIEN-NewsAPI-Application-Key': AYLIEN_API_KEY,
        },
        params: {
          'title': subject,
          'published_at_start': startDate,
          'published_at_end': endDate,
          'per_page': 10,
          'categories.taxonomy': 'iab-qag',
          'categories.id[]': 'IAB13',
          'language[]': 'en',
        },
      });

      console.log('Searching Aylien for ', subject, startDate);

      const articleBodies = response.data.stories.map((story) => story.body);
      console.log('Fetched', articleBodies.length, 'articles from Aylien');
      const articleBatches = sh.createBatches(articleBodies, 8000);
      console.log('Split articleBodies into', articleBatches.length, 'batches');
      const date = response.data.stories[0].published_at;

      const processedData = await this.processAllArticles(
        articleBatches,
        date,
        subject
      );

      const { tokenizedSentiment, average, low, high } = processedData;

      const subjectId = await this.getOrCreateSubjectID(db, subject); // obtain the subjectId

      if (subjectId) {
        await this.insertData(
          db,
          3, //// make this a variable ///////////////////////////////////////////////////////////////////////
          subjectId,
          tokenizedSentiment,
          average,
          low,
          high,
          endDate
        );
      } else {
        console.error('Failed to obtain subjectId for', subject);
      }
      return processedData;
    } catch (error) {
      console.error('Error in fetchHistoricalNews:', error);
      return null;
    }
  },

  async processAllArticles(articleBodies, date, subject) {
    const processedData = {
      date: date,
      tokenizedSentiment: '',
      scores: [],
    };

    for (const article of articleBodies) {
      const summary = await this.getSentimentFromGPT(
        article,
        'summarize',
        subject
      );
      const sentimentWords = await this.getSentimentFromGPT(
        summary,
        'sentimentWords',
        subject
      );
      const tokenizedArticle = await this.getSentimentFromGPT(
        sentimentWords,
        'tokenizeSentiment',
        subject
      );

      const sentimentScoreString = await this.getSentimentFromGPT(
        sentimentWords,
        'sentimentScore',
        subject
      );
      const sentimentScore = sh.validateSentimentScore(sentimentScoreString);

      processedData.tokenizedSentiment += tokenizedArticle;
      if (!isNaN(sentimentScore)) {
        processedData.scores.push(sentimentScore);
      }
    }

    processedData.tokenizedSentiment = await this.getSentimentFromGPT(
      processedData.tokenizedSentiment,
      'reduceSentiment',
      subject
    );
    // Calculating high, low and average scores
    const { scores } = processedData;
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    const average =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Adding high, low and average scores to the processedData object
    processedData.high = high.toFixed(4);
    processedData.low = low.toFixed(4);
    processedData.average = average.toFixed(4);

    return processedData; // Returning the processed data object
  },

  async fetchArticleContent(url) {
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const title = $('[class*="title"]').text().trim();
      const articleContent = $('div[class*="body-"]').text().trim();
      console.log('Fetched article content');
      return { title, content: articleContent };
    } catch (error) {
      console.error('Error in fetchArticleContent:', error.code);
      return null;
    }
  },

  async getSentimentFromGPT(content, analysisType, subject) {
    const apiKey = OPENAI_API_KEY;
    const url = OPENAI_API_URL;
    let userPrompt = '';

    switch (analysisType) {
      case 'summarize':
        userPrompt = `Please provide a concise summary of anything related to ${subject} in the following block of news articles:\n\n${content}`;
        break;
      case 'sentimentWords':
        userPrompt = `Give a detailed sentiment analysis, describing the strength of ${subject}, based on the following news articles:\n\n${content}`;
        break;
      case 'sentimentScore':
        userPrompt = `Please quantize this sentiment analysis. The score should be a float between -1 and 1 where 1 is extremely positive and -1 is extremly negative and 0 is neutral:\n\n${content}`;
        break;
      case 'tokenizeSentiment':
        userPrompt = `Please list individual key phrases or entities from the following sentiment analysis that are indicative of the strength of ${subject}. Each term should be isolated for easy tokenization and be as concise as possible.\n\n${content}`;
        break;
      case 'reduceSentiment':
        userPrompt = `Please reduce this list of key phrases or entities from the following sentiment analysis that are indicative of the strength of ${subject}. remove repeated sentiments and Each term should be isolated for easy tokenization and be as concise as possible.\n\n${content}`;
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
      const response = await axios.post(url, body, config);
      //console.log('Received response from GPT-3.5 Turbo:');
      totalTokensUsed += response.data.usage.total_tokens;

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error(`Error in getSentimentFromGPT for ${analysisType}:`, error);
      return null;
    }
  },

  async getOrCreateSubjectID(db, subject) {
    try {
      // Try to find the subject ID in the database
      const subjectRow = await db('subjects')
        .select('id')
        .where('name', subject)
        .first();

      if (subjectRow) {
        return subjectRow.id;
      }

      // If subject not found, insert it
      const [newID] = await db('subjects')
        .insert({ name: subject })
        .returning('id');

      return newID;
    } catch (err) {
      console.error('Error in getOrCreateSubjectID:', err.code);
      return null;
    }
  },

  async getSourceID(db, source) {
    try {
      const sourceRow = await db('sources')
        .select('id')
        .where('name', source)
        .first();

      if (sourceRow) {
        return sourceRow.id;
      }
      return null; // Explicitly return null if source is not found
    } catch (err) {
      console.error('Error in getSourceID:', err.code);
      return null;
    }
  },

  async insertData(
    db,
    sourceId,
    subjectId,
    tokenizedSentiment,
    average,
    low,
    high,
    date = new Date().toISOString().split('T')[0]
  ) {
    console.log(
      'Inserting data into sentiment_analysis table',
      subjectId,
      sourceId,
      average,
      low,
      high,
      date
    );
    try {
      await db('sentiment_analysis').insert({
        subject_id: subjectId,
        source_id: sourceId,
        tokenized_sentiment: tokenizedSentiment,
        average_score: average,
        low_score: low,
        high_score: high,
        date_published: date,
      });
      console.log('Data inserted successfully.');
    } catch (err) {
      console.error('Error inserting data:', err.code);
    }
  },

  async findMissingDate(db, subjectID) {
    let dateCursor = moment();
    let foundDate = null;
    let loopCount = 0; // Add a loop count for debugging

    while (!foundDate) {
      // Log the current date being checked
      console.log('Checking date:', dateCursor.format('YYYY-MM-DD'));

      // Skip weekends
      while (dateCursor.day() === 0 || dateCursor.day() === 6) {
        dateCursor.subtract(1, 'days');
      }

      const dateStr = dateCursor.format('YYYY-MM-DD');

      try {
        const hasData = await db('sentiment_analysis')
          .where({
            subjectID: subjectID,
            date_published: dateStr,
          })
          .first();

        // Log the result of the database query
        console.log('Database query result:', hasData);

        if (!hasData) {
          foundDate = dateStr;
        } else {
          dateCursor.subtract(1, 'days');
        }
      } catch (error) {
        // Log any database errors
        console.error('Database query error:', error);
      }

      // Increment and log the loop count
      loopCount++;
      console.log('Loop count:', loopCount);

      // Break out of the loop if it runs too many times to prevent potential infinite loop
      if (loopCount > 300) {
        console.error(
          'Loop ran too many times, exiting to prevent potential infinite loop.'
        );
        break;
      }
    }

    return foundDate;
  },

  async performSentimentAnalysis(db, subject, source) {
    totalTokensUsed = 0;

    try {
      const subjectID = await this.getOrCreateSubjectID(db, subject);
      if (!subjectID) {
        console.error('Failed to get or create subject ID');
        return null;
      }
      const sourceID = await this.getSourceID(db, source);
      if (!sourceID) {
        console.error('Failed to get source ID');
        return 'Invalid source ID';
      }

      console.log(
        `Starting sentiment analysis for ${subject}...(subjectID: ${subjectID}) from ${source}...(sourceID: ${sourceID})`
      );

      let articles;

      switch (sourceID) {
        case 1:
          articles = await this.scrapeTradingView(subject);
          break;
        case 2:
          articles = await this.scrapeForbes(subject);
          break;

        default:
          return null;
      }

      let combinedContent = '';
      const sentimentSubject = subject === 'dollar' ? 'US Dollar' : subject; //GPT only disambiguation
      const sentimentScores = [];

      // Combine the content of all fetched articles
      for (const article of articles) {
        console.log(`Fetching content for article: ${article.title}`);
        const content = await this.fetchArticleContent(article.url);
        if (content) {
          combinedContent += ' ' + content.content;
        }
      }

      // Get the summary first
      const summary = await this.getSentimentFromGPT(
        combinedContent,
        'summarize',
        sentimentSubject
      );

      //get comprehendive sentiment analysis
      const sentimentWords = await this.getSentimentFromGPT(
        summary,
        'sentimentWords',
        sentimentSubject
      );

      //strip noise form sentiment analysis
      const tokenizedSentiment = await this.getSentimentFromGPT(
        sentimentWords,
        'tokenizeSentiment',
        sentimentSubject
      );

      //Quantize sentiment analysis
      for (let i = 0; i < 10; i++) {
        const sentimentScoreString = await this.getSentimentFromGPT(
          sentimentWords,
          'sentimentScore',
          sentimentSubject
        );
        const sentimentScore = sh.validateSentimentScore(sentimentScoreString);
        if (
          !isNaN(sentimentScore) &&
          sentimentScore >= -1 &&
          sentimentScore <= 1
        ) {
          sentimentScores.push(sentimentScore);
        } else {
          console.warn(`Skipping invalid sentiment score: ${sentimentScore}`);
        }
      }

      // Calculate the average, low, and high sentiment scores
      const scores = sh.calculateScores(sentimentScores);

      console.log(
        `Successfully analyzed ${subject} from ${source} using ${totalTokensUsed} tokens`
      );

      const analyzedArticle = {
        summary: summary,
        sentimentWords: sentimentWords,
        tokenizedSentiment: tokenizedSentiment,
        sentimentScores: scores,
      };

      const { average, low, high } = scores;

      this.insertData(
        db,
        sourceID,
        subjectID,
        tokenizedSentiment,
        average,
        low,
        high
      );

      return analyzedArticle;
    } catch (error) {
      sh.logError(error, 'Error in performSentimentAnalysis');
      return null;
    }
  },
};

module.exports = SentimentService;
