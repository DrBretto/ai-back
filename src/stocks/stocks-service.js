const fetch = require('node-fetch');
const { Pool } = require('pg');

const pool = new Pool({
  // your db config here
});

const StocksService = {
  async getStockId(db, symbol) {
    const stock = await db('Stocks').where({ symbol }).first();
    return stock ? stock.stock_id : null;
  },

  async fetchStockHistory(stockSymbol, month) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&month=${month}&outputsize=full&apikey=B91GX8DBBAR32QM0`;
    const response = await fetch(url);
    const data = await response.json();

    const stockId = await this.getStockId(stockSymbol); // Implement this function

    const timeSeries = data['Time Series (1min)'];

    for (const [dateTime, stockData] of Object.entries(timeSeries)) {
      const closePrice = stockData['4. close'];
      const volume = stockData['5. volume'];

      // Insert into PostgreSQL
      await pool.query(
        'INSERT INTO stockhistory (stock_id, date_time, closing_price, volume) VALUES ($1, $2, $3, $4) ON CONFLICT (stock_id, date_time) DO NOTHING',
        [stockId, dateTime, closePrice, volume]
      );
    }

    return data;
  },
};

module.exports = StocksService;
