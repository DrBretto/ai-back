const fs = require('fs');
const path = require('path'); // Import the path module
const { exec } = require('child_process');

// Define the base directory path for cache files
const BASE_DIR = path.join(__dirname, '..'); // Go up one directory to the base directory
const CACHE_DIR = path.join(BASE_DIR, 'cache'); // Define the cache directory path
const CACHE_FILE = path.join(CACHE_DIR, 'pricing-cache.json'); // Define the cache file path

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

    // Save data to the cache file
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));

    // Execute the Python script to process data
    const pythonScript = path.join(BASE_DIR, 'python', 'process_data.py');
    const command = `python ${pythonScript} ${CACHE_FILE}`;

    exec(command, (error, stdout, stderr) => {
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
