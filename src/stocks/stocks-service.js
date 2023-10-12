const fetch = require('node-fetch');
require('dotenv').config();

const finnhubApiKey = process.env.FINNHUB_API_KEY;
const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;

const StocksService = {
  async getStockId(db, symbol) {
    const stock = await db('stocks').where({ symbol }).first();
    return stock ? stock.stock_id : null;
  },

  async fetchHistoricalData(db, stockSymbol, monthToFetch) {
    const stockId = await this.getStockId(db, stockSymbol);
    const historicalUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&month=${monthToFetch}&outputsize=full&apikey=${alphaVantageApiKey}`;
    await this.fetchDataAndInsert(db, stockId, historicalUrl);
  },

  async fetchTodaysData(db, stockSymbol) {
    const stockId = await this.getStockId(db, stockSymbol);
    const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${stockSymbol}&token=${finnhubApiKey}`;
    await this.fetchRealTimeDataAndInsert(db, stockId, finnhubUrl);
  },

  async fetchRealTimeDataAndInsert(db, stockId, url) {
    const response = await fetch(url);
    const data = await response.json();

    const {
      c: closePrice,
      h: highPrice,
      l: lowPrice,
      o: openPrice,
      d: dailyChange,
      dp: dailyPercentChange,
      pc: previousClose,
    } = data;

    const now = new Date();
    const dateTime = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    try {
      await db('stockrealtime').insert({
        stock_id: stockId,
        date_time: dateTime,
        closing_price: closePrice,
        high_price: highPrice,
        low_price: lowPrice,
        opening_price: openPrice,
        daily_change: dailyChange,
        daily_percent_change: dailyPercentChange,
        previous_close: previousClose,
      });
      console.log(
        'Successfully inserted realtime data:',
        stockId,
        dateTime,
        data.c
      );
    } catch (error) {
      console.error('DB Insert Error:', error);
    }
  },

  async fetchDataAndInsert(db, stockId, url) {
    const response = await fetch(url);
    const data = await response.json();
    const timeSeries = data['Time Series (1min)'];

    const timeSeriesEntries = Object.entries(timeSeries);
    const firstEntryDate = timeSeriesEntries[0][0].split(' ')[0];
    const lastEntryDate =
      timeSeriesEntries[timeSeriesEntries.length - 1][0].split(' ')[0];

    console.log(
      'recording data for',
      stockId,
      'from',
      firstEntryDate,
      'to',
      lastEntryDate,
      ':'
    );

    for (const [dateTime, stockData] of Object.entries(timeSeries)) {
      const existingRecord = await db('stockhistory')
        .where({ stock_id: stockId, date_time: dateTime })
        .first();

      if (!existingRecord) {
        const closePrice = stockData['4. close'];
        const highPrice = stockData['2. high'];
        const lowPrice = stockData['3. low'];
        const volume = stockData['5. volume'];
        try {
          await db('stockhistory').insert({
            stock_id: stockId,
            date_time: dateTime,
            closing_price: closePrice,
            high_price: highPrice,
            low_price: lowPrice,
            volume: volume,
          });
          console.log(
            'Successfullly Recorded',
            timeSeriesEntries.length,
            'historical entries for stockId:',
            stockId,
            'from',
            firstEntryDate,
            'to',
            lastEntryDate
          );
        } catch (error) {
          console.error('DB Insert Error:', error);
        }
      }
    }
  },
};

module.exports = StocksService;
