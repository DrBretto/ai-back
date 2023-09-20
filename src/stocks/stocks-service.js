const fetch = require('node-fetch');

const StocksService = {
  async getStockId(db, symbol) {
    const stock = await db('stocks').where({ symbol }).first();
    return stock ? stock.stock_id : null;
  },

  async fetchStockHistory(db, stockSymbol, month) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&month=${month}&outputsize=full&apikey=B91GX8DBBAR32QM0`;
    const response = await fetch(url);
    const data = await response.json();

    const stockId = await this.getStockId(db, stockSymbol);

    const timeSeries = data['Time Series (1min)'];

    for (const [dateTime, stockData] of Object.entries(timeSeries)) {
      const closePrice = stockData['4. close'];
      const highPrice = stockData['2. high'];
      const lowPrice = stockData['3. low'];
      const volume = stockData['5. volume'];
    
      await db('stockhistory')
        .insert({
          stock_id: stockId,
          date_time: dateTime,
          closing_price: closePrice,
          high_price: highPrice,  // New
          low_price: lowPrice,    // New
          volume: volume,
        })
        .onConflict(['stock_id', 'date_time'])
        .ignore();
    }
    // test

    return data;
  },
};

module.exports = StocksService;
