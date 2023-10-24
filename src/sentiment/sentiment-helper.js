// sentiment-helper.js

// const axios = require('axios');
// const cheerio = require('cheerio');

const createBatches = (articleBodies, maxBatchSize) => {
  let batches = [];
  let currentBatch = '';
  for (const article of articleBodies) {

    // If adding the next article would exceed the maximum batch size,
    // start a new batch
    if (currentBatch.length + article.length > maxBatchSize) {
      batches.push(currentBatch);
      currentBatch = article;
    } else {
      // Otherwise, add the article to the current batch
      currentBatch += '\n\n' + article;
    }
  }
  // Add the last batch if it's non-empty
  if (currentBatch) {
    batches.push(currentBatch);
  }
  batches.forEach((batch, index) => {
    console.log(`Batch ${index} size:`, batch.length);
  });
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
