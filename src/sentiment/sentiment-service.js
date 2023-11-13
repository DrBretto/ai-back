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
      const combinedArticles = response.data.stories
        .map((story) => story.body)
        .join(' ')
        .slice(0, 40000);
      const date = response.data.stories[0].published_at;

      // Process the combined text blob
      const processedData = await this.processAllArticles(
        combinedArticles,
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

  async processAllArticles(combinedArticles, date, subject) {
    const processedData = {
      date: date,
      summary: '',
      scores: [],
    };

    const summary = await this.getSentimentFromGPT(
      combinedArticles,
      'summarize',
      subject
    );
    const sentimentScoreString = await this.getSentimentFromGPT(
      summary,
      'sentimentScore',
      subject
    );
    const sentimentScore = sh.validateSentimentScore(sentimentScoreString);

    if (!isNaN(sentimentScore)) {
      processedData.scores.push(sentimentScore);
    }

    // Calculating high, low and average scores
    const { scores } = processedData;
    const high = scores.length ? Math.max(...scores) : 0;
    const low = scores.length ? Math.min(...scores) : 0;
    const average = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

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

  async getTokensFromGPT(content, masterList) {
    const apiKey = OPENAI_API_KEY;
    const url = OPENAI_API_URL;
    let userPrompt = `You are provided with a list of predefined sentiments related to financial and economic trends, particularly focusing 
        on gold and the US dollar. Each sentiment is associated with a unique identifier. Your task is to read through the provided text and 
        identify any sentiments from the list that are conveyed or implied in the text. Please return a list of the unique identifiers for 
        these sentiments in a CSV format, enclosed in brackets. Here is the master list of sentiments along with their identifiers:

        ${masterList}
        
        Now, please read the following text and identify the sentiments from the master list:
        
       ${content}
        
        Return the identifiers of the sentiments conveyed in the text in CSV format enclosed in brackets. For example, if the text conveys 
        sentiments 1, 4, and 7 from the master list, the return should be: [1,4,7]
        `;

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
      totalTokensUsed += response.data.usage.total_tokens;

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error(`Error in getTokensFromGPT`, error.code);
      return null;
    }
  },

  async getSentimentFromGPT(content, analysisType, subject) {
    const apiKey = OPENAI_API_KEY;
    const url = OPENAI_API_URL;
    let userPrompt = '';

    switch (analysisType) {
      case 'summarize':
        userPrompt = `Please provide a concise summary of anything related to ${subject} in the following block of text:\n\n${content}`;
        break;
      case 'sentimentWords':
        userPrompt = `Give a detailed sentiment analysis, describing the strength of ${subject}, based on the following summary:\n\n${content}`;
        break;
      case 'sentimentScore':
        userPrompt = `Please quantize this sentiment analysis in relation to the stength of ${subject}. The score should be a float between -1 and 1 where 1 is extremely positive 
        and -1 is extremly negative and 0 is neutral:\n\n${content}`;
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
      model: 'gpt-4-32k',
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
      totalTokensUsed += response.data.usage.total_tokens;

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error(
        `Error in getSentimentFromGPT for ${analysisType}:`,
        error.code
      );
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
      console.error('Error in getOrCreateSubjectID:', err);
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
    summary,
    average,
    low,
    high,
    date = new Date().toISOString()
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
        tokenized_sentiment: summary,
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

  async fetchMasterList(db) {
    try {
      const masterListData = await db('master_tokens')
        .select('id', 'term')
        .where('omit', false)
        .limit(220); // Exclude entries where omit is true
      // Convert the array of objects to a string, with each term-id pairing on a new line
      const masterListString = masterListData
        .map((entry) => `${entry.id}:${entry.term}`)
        .join('\n');
      return masterListString;
    } catch (error) {
      console.error('Error fetching master list:', error);
      return null;
    }
  },

  async fetchSentimentAnalysisEntry(db, sentimentAnalysisId) {
    try {
      const entry = await db('sentiment_analysis')
        .where('id', sentimentAnalysisId)
        .first();
      return entry;
    } catch (error) {
      console.error('Error fetching sentiment analysis entry:', error.code);
      return null;
    }
  },

  async updateSentimentAnalysis(db, tokenValues, sentimentAnalysisId) {
    try {
      await db('sentiment_analysis').where('id', sentimentAnalysisId).update({
        token_values: tokenValues,
      });
      console.log('Sentiment analysis updated successfully.');
    } catch (error) {
      console.error('Error updating sentiment analysis:', error);
    }
  },

  async insertMasterTerm(db, term) {
    if (typeof term !== 'string' || term.trim() === '') {
      console.warn('Invalid term format, skipping:', term);
      return null;
    }
    try {
      const [newIdObject] = await db('master_tokens')
        .insert({ term })
        .returning('id');
      const newId = newIdObject.id;
      console.log('new term ID:', term, newId);
      return newId;
    } catch (error) {
      console.error('Error inserting term into master list:', term);
      return null;
    }
  },

  async parseGPTResponse(gptResponse) {
    // Find the positions of the enclosing square brackets
    const startIndex = gptResponse.indexOf('[');
    const endIndex = gptResponse.lastIndexOf(']');

    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      console.error('Invalid GPT-4 response format:', gptResponse);
      return null;
    }

    // Extract the CSV-formatted string
    const csvString = gptResponse.substring(startIndex + 1, endIndex);

    // Split the CSV string into an array of strings
    const stringArray = csvString.split(',');

    // Parse the array of strings into an array of integers
    const intArray = stringArray.map((str) => parseInt(str, 10));

    // Check for any NaN values in case of parsing failure
    if (intArray.some(isNaN)) {
      console.error('Error parsing string to integer:', csvString);
      return [0];
    }

    return intArray;
  },

  async performTermComparison(db, sentimentAnalysisId) {
    try {
      const sentimentEntry = await this.fetchSentimentAnalysisEntry(
        db,
        sentimentAnalysisId
      );
      if (!sentimentEntry) {
        console.error(
          'No sentiment analysis entry found for ID:',
          sentimentAnalysisId
        );
        return;
      }
      const sentimentTerms = sentimentEntry.tokenized_sentiment;

      if (sentimentTerms === null || sentimentTerms === undefined) {
        console.error(
          'Tokenized sentiment is null or undefined for id:',
          sentimentAnalysisId
        );
        return;
      }

      const masterList = await this.fetchMasterList(db);
      if (!masterList) {
        console.error('Failed to fetch master list');
        return;
      }

      const gptResponse = await this.getTokensFromGPT(
        sentimentTerms,
        masterList
      );

      if (!gptResponse) {
        console.error('Failed to get response from GPT-4');
        return;
      }

      const tokenValues = await this.parseGPTResponse(gptResponse);

      await this.updateSentimentAnalysis(db, tokenValues, sentimentAnalysisId);

      console.log(
        'Term comparison completed successfully for sentiment analysis ID:',
        sentimentAnalysisId
      );
    } catch (error) {
      console.error('Error performing term comparison:', error);
    }
  },

  async findMissingDate(db, subjectID, sourceID) {
    let currentDate = moment();
    let startYear = currentDate.clone().subtract(5, 'years').year();
    let currentHour = currentDate.hour();
    let currentMinute = currentDate.minute();
    let foundDateTime = null;

    while (!foundDateTime && currentDate.year() >= startYear) {
      currentDate.hour(currentHour); // Set to current hour
      currentDate.minute(currentMinute); // Set to current minute
      const dateStr = currentDate.format('YYYY-MM-DD HH:mm');

      try {
        const hasData = await db('sentiment_analysis')
          .where({
            source_id: sourceID,
            subject_id: subjectID,
            date_published: dateStr,
          })
          .first();

        if (!hasData) {
          foundDateTime = dateStr;
        } else {
          currentDate.subtract(1, 'months');
          currentDate.date(((currentDate.date() - 1) % 5) + 1); // Cycle through 1st, 5th, 10th, etc. of the month
        }
      } catch (error) {
        console.error('Database query error:', error);
      }
    }

    return foundDateTime;
  },

  async performSentimentAnalysis(db, subject, source = 'tradingview') {
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

      console.log('Combined content length:', combinedContent.length);

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
        sentimentScores: scores,
      };

      const { average, low, high } = scores;

      this.insertData(db, sourceID, subjectID, summary, average, low, high);

      return analyzedArticle;
    } catch (error) {
      sh.logError(error, 'Error in performSentimentAnalysis');
      return null;
    }
  },
};

module.exports = SentimentService;
