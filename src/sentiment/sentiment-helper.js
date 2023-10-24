// sentiment-helper.js

// const axios = require('axios');
// const cheerio = require('cheerio');

const createBatches = (articleBodies, maxBatchSize) => {
  // Concatenate all articles into one large string
  const allArticles = articleBodies.join('\n\n');

  let batches = [];
  let position = 0;

  // Loop through the large string, creating batches of the specified max size
  while (position < allArticles.length) {
    const batch = allArticles.substring(position, position + maxBatchSize);
    batches.push(batch);
    position += maxBatchSize;
  }

  return batches;
};

const validateSentimentScore = (sentimentScoreString) => {
  const sentimentScoreMatch = sentimentScoreString.match(/-?\d+\.\d+/);
  return sentimentScoreMatch ? parseFloat(sentimentScoreMatch[0]) : NaN;
};

const calculateScores = (sentimentScores) => {
  const average =
    sentimentScores.reduce((sum, score) => sum + score, 0) /
    sentimentScores.length;
  const low = Math.min(...sentimentScores);
  const high = Math.max(...sentimentScores);
  return {
    average: average.toFixed(4),
    low: low.toFixed(4),
    high: high.toFixed(4),
  };
};

const logError = (error, message) => {
  console.error(`${message}:`, error);
};

module.exports = {
  createBatches,
  validateSentimentScore,
  calculateScores,
  logError,
};
