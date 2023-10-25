const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Define the base directory path for your project
const BASE_DIR = path.join(__dirname, '..');

// Define the cache directory and data file paths
const CACHE_DIR = path.join(BASE_DIR, 'cache');
const DATA_FILE = path.join(CACHE_DIR, 'pricing-cache.json');

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
    // Ensure the cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Save data to the data file
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));

    // Execute the Python script to process data
    const pythonScript = path.join(BASE_DIR, 'python', 'process_data.py');
    const command = `python ${pythonScript} ${DATA_FILE}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing Python script:', error);
        throw error;
      }

      // Read the result from the results file
      const resultFilePath = path.join(BASE_DIR, 'python', 'results.json');
      const resultData = fs.readFileSync(resultFilePath, 'utf8');
      const result = JSON.parse(resultData);

      const count = result.count;
      console.log(`Number of price points received: ${count}`);
    });
  },
};

module.exports = DataService;
