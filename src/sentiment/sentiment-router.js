const express = require('express');
const SentimentService = require('./sentiment-service');

const sentimentRouter = express.Router();

sentimentRouter
  .route('/')
  .get(async (req, res, next) => {
    try {
      const articles = await SentimentService.scrapeTradingView();
      res.json(articles);
    } catch (error) {
      next(error);
    }
  });

module.exports = sentimentRouter;
