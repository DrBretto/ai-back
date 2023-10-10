const fetch = require('node-fetch');

const StocksService = {
  async getStockId(db, symbol) {
    const stock = await db('stocks').where({ symbol }).first();
    return stock ? stock.stock_id : null;
  },

  async fetchHistoricalData(db, stockSymbol, monthToFetch) {
    const stockId = await this.getStockId(db, stockSymbol);
    //const lastDateInDBRow = await db('stockhistory').where('stock_id', stockId).max('date_time');
    //const lastDateInDB = new Date(lastDateInDBRow[0].max);
    //const monthToFetch = lastDateInDB.getMonth() + 1;

    const historicalUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&month=${monthToFetch}&outputsize=full&apikey=B91GX8DBBAR32QM0`;

    await this.fetchDataAndInsert(db, stockId, historicalUrl);
  },

  async fetchTodaysData(db, stockSymbol) {
    const stockId = await this.getStockId(db, stockSymbol);
    const todayUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&outputsize=full&apikey=B91GX8DBBAR32QM0`;

    await this.fetchDataAndInsert(db, stockId, todayUrl);
  },

  async fetchDataAndInsert(db, stockId, url) {
    const response = await fetch(url);
    const data = await response.json();
    const timeSeries = data['Time Series (1min)'];

    for (const [dateTime, stockData] of Object.entries(timeSeries)) {
      const existingRecord = await db('stockhistory').where({ stock_id: stockId, date_time: dateTime }).first();

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





  // async fetchAndSaveStocks(db) {
  //   const stocks = ['JDST', 'NUGT'];
  //   for (const stock of stocks) {
  //     const lastDataPoint = await db('stockhistory')
  //       .where({ stock_id: stock })
  //       .orderBy('date_time', 'desc')
  //       .first();
  //     const lastDateTime = lastDataPoint ? lastDataPoint.date_time : null;

  //     // Fetch and save data for this stock
  //     await this.fetchStockHistory(db, stock, lastDateTime);
  //   }
  // },