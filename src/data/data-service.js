const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const BASE_DIR = path.join(__dirname, '..');
const CACHE_DIR = path.join(BASE_DIR, 'cache');
const DATA_FILE = path.join(CACHE_DIR, 'pricing-cache.json');
const PYTHON_SCRIPT = path.join(BASE_DIR, 'python', 'process_data.py');

const DataService = {
  async processData() {
    // Simulate fetching data from the database
    const data = ['8.2201', '28.1400', '8.2100', '28.1450', '8.2100'];

    // Ensure the cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Save data to the data file
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));

    // Execute the Python script to process data
    const command = `python ${PYTHON_SCRIPT} ${DATA_FILE}`;

    exec(command, (error, stdout) => {
      if (error) {
        console.error('Error executing Python script:', error);
        throw error;
      }

      // Read the result from the Python script's output
      const count = parseInt(stdout);
      console.log(`Number of price points received: ${count}`);
    });
  },
};

module.exports = DataService;
