const fetch = require('node-fetch');

const StocksService = {
  async fetchStockHistory(stockSymbol, month) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&adjusted=true&${month}&outputsize=full&apikey=B91GX8DBBAR32QM0`;
    const response = await fetch(url);
    const data = await response.json();

    // TODO: Store this data in your PostgreSQL database

    return data;
  },
};

module.exports = StocksService;
