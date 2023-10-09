const fetch = require('node-fetch');

const StocksService = {
  async getStockId(db, symbol) {
    const stock = await db('stocks').where({ symbol }).first();
    return stock ? stock.stock_id : null;
  },

  async fetchStockHistory(db, stockSymbol) {
    // First, find the last date in the DB for this stock
    const lastDateInDBRow = await db('stockhistory')
      .where('stock_id', stockSymbol)
      .max('date_time');

    const lastDateInDB = new Date(lastDateInDBRow[0].max);
    const lastDayOfMonth = new Date(
      lastDateInDB.getFullYear(),
      lastDateInDB.getMonth() + 1,
      0
    ).getDate();
    const lastMinuteOfDay = 59;

    let url;
    let monthToFetch = lastDateInDB.getMonth() + 1; // JavaScript months are 0-11

    if (Date.now() - lastDateInDB <= 6000000) {
      // 100 minutes in milliseconds
      // If the last data point is within 100 minutes, pull the last 100 data points
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&outputsize=compact&apikey=B91GX8DBBAR32QM0`;
    } else {
      // Check if the last date is the last minute of the last day of the month
      if (
        lastDateInDB.getDate() === lastDayOfMonth &&
        lastDateInDB.getMinutes() === lastMinuteOfDay
      ) {
        monthToFetch++; // Increment the month if it's the last minute of the last day
        if (monthToFetch > 12) {
          monthToFetch = 1; // Reset to January if it goes over December
        }
      }
      // Otherwise, pull the data for the entire month
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&month=${monthToFetch}&outputsize=full&apikey=B91GX8DBBAR32QM0`;
    }

    const response = await fetch(url);
    const data = await response.json();
    const timeSeries = data['Time Series (1min)'];

    // Get the stock ID
    const stockId = await this.getStockId(db, stockSymbol); // Assuming getStockId is a method in the same service

    // Loop through the time series and insert new data into the DB
    for (const [dateTime, stockData] of Object.entries(timeSeries)) {
      const existingRecord = await db('stockhistory')
        .where({
          stock_id: stockId,
          date_time: dateTime,
        })
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

  ///////////////////////
  // async fetchStockHistory(db, stockSymbol, month) {
  //   const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&month=${month}&outputsize=full&apikey=B91GX8DBBAR32QM0`;
  //   const response = await fetch(url);
  //   const data = await response.json();

  //   const stockId = await this.getStockId(db, stockSymbol);

  //   const timeSeries = data['Time Series (1min)'];

  //   for (const [dateTime, stockData] of Object.entries(timeSeries)) {
  //     const closePrice = stockData['4. close'];
  //     const highPrice = stockData['2. high'];
  //     const lowPrice = stockData['3. low'];
  //     const volume = stockData['5. volume'];

  //     await db('stockhistory')
  //       .insert({
  //         stock_id: stockId,
  //         date_time: dateTime,
  //         closing_price: closePrice,
  //         high_price: highPrice, // New
  //         low_price: lowPrice, // New
  //         volume: volume,
  //       })
  //       .onConflict(['stock_id', 'date_time'])
  //       .ignore();
  //   }
  //   // test

  //   return data;
  // },

  // In StocksService.js
  async fetchAndSaveStocks(db) {
    const stocks = ['JDST', 'NUGT'];
    for (const stock of stocks) {
      const lastDataPoint = await db('stockhistory')
        .where({ stock_id: stock })
        .orderBy('date_time', 'desc')
        .first();
      const lastDateTime = lastDataPoint ? lastDataPoint.date_time : null;

      // Fetch and save data for this stock
      await this.fetchStockHistory(db, stock, lastDateTime);
    }
  },
};

module.exports = StocksService;
