const fetch = require('node-fetch');

const StocksService = {
  async getStockId(db, symbol) {
    const stock = await db('stocks').where({ symbol }).first();
    return stock ? stock.stock_id : null;
  },

  async fetchHistoricalData(db, stockSymbol, monthToFetch) {
    const stockId = await this.getStockId(db, stockSymbol);
    const historicalUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&month=${monthToFetch}&outputsize=full&apikey=B91GX8DBBAR32QM0`;
    await this.fetchDataAndInsert(db, stockId, historicalUrl);
  },

  async fetchTodaysData(db, stockSymbol) {
    const stockId = await this.getStockId(db, stockSymbol);
    const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${stockSymbol}&token=YOUR_API_KEY_HERE`;
    await this.fetchRealTimeDataAndInsert(db, stockId, finnhubUrl);
  },
  
  async fetchRealTimeDataAndInsert(db, stockId, url) {
    const response = await fetch(url);
    const data = await response.json();
  
    console.log('Fetching real-time data for stockId:', stockId);
  
    // Finnhub data keys: c = close, h = high, l = low, o = open, v = volume
    const { c: closePrice, h: highPrice, l: lowPrice, o: openPrice, v: volume } = data;
  
    // Generate a timestamp for the current time
    const dateTime = new Date().toISOString();
  
    const existingRecord = await db('stockrealtime')
      .where({ stock_id: stockId, date_time: dateTime })
      .first();
  
    if (!existingRecord) {
      await db('stockrealtime').insert({
        stock_id: stockId,
        date_time: dateTime,
        closing_price: closePrice,
        high_price: highPrice,
        low_price: lowPrice,
        volume: volume,
        open_price: openPrice,
      });
    } else {
      // Update the existing record if needed
    }
  },

  async fetchDataAndInsert(db, stockId, url) {
    const response = await fetch(url);
    const data = await response.json();
    const timeSeries = data['Time Series (1min)'];

    console.log('Fetching data for stockId:', stockId);

    const timeSeriesEntries = Object.entries(timeSeries);
    if (timeSeriesEntries.length > 0) {
      console.log('Recording ', timeSeriesEntries.length, ' entries');
      console.log('First entry:', timeSeriesEntries[0]);
      console.log(
        'Last entry:',
        timeSeriesEntries[timeSeriesEntries.length - 1]
      );
    } else {
      console.log('No data to record');
    }

    for (const [dateTime, stockData] of Object.entries(timeSeries)) {
      const existingRecord = await db('stockhistory')
        .where({ stock_id: stockId, date_time: dateTime })
        .first();

      if (!existingRecord) {
        const closePrice = stockData['4. close'];
        const highPrice = stockData['2. high'];
        const lowPrice = stockData['3. low'];
        const volume = stockData['5. volume'];

        await db('stockhistory').insert({
          stock_id: stockId,
          date_time: dateTime,
          closing_price: closePrice,
          high_price: highPrice,
          low_price: lowPrice,
          volume: volume,
        });
      }
    }
  },
};

module.exports = StocksService;
