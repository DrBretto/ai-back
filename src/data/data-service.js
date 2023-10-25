const fs = require('fs');
const path = require('path'); // Import the path module
const { exec } = require('child_process');

const CACHE_DIR = path.join(__dirname, '../cache'); // Use path.join to ensure correct path
const CACHE_FILE = path.join(CACHE_DIR, 'pricing-cache.json'); // Use path.join for the cache file

const DataService = {
  async getPricingData(db) {
    const prices = await db.select('closing_price').from('stockrealtime');
    const data = prices.map((price) => price.closing_price);

    // Log the length of data and first few data points
    console.log('Data length:', data.length);
    console.log('First 10 data points:', data.slice(0, 10));

    return data;
  },

  async processDataWithPython(data) {
    // Save data to a cache file
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));

    // Execute the Python script to process data
    const pythonScript = path.join(__dirname, '../python/process_data.py');
    const command = `python ${pythonScript} ${CACHE_FILE}`;

    exec(command, (error, stdout) => {
      if (error) {
        console.error('Error executing Python script:', error);
        throw error;
      }

      const count = parseInt(stdout);
      console.log(`Number of price points received: ${count}`);
    });
  },
};

module.exports = DataService;
