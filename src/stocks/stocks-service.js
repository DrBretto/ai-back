const fetch = require('node-fetch');

const StocksService = {
  async fetchStockHistory(stockSymbol, slice) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&slice=${slice}&apikey=B91GX8DBBAR32QM0`;
    const response = await fetch(url);
    const data = await response.json();

    // TODO: Store this data in your PostgreSQL database

    return data;
  },
};

module.exports = StocksService;
