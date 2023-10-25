const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const DataService = {
  async getPricingData(db) {
    const prices = await db.select('closing_price').from('stockrealtime');

    const data = prices.map((price) => price.closing_price);

    // Log the length of data and first few data points
    console.log('Data length:', data.length);  
    console.log('First 10 data points:', data.slice(0, 10));  

    // Write data to a temporary file
    const filePath = path.join(__dirname, 'tempData.json');
    fs.writeFileSync(filePath, JSON.stringify(data));

    return new Promise((resolve, reject) => {
      exec(
        `python3 ${path.join(
          __dirname,
          '..',
          'python',
          'process_data.py'
        )} ${filePath}`,
        (error, stdout) => {
          // Delete the temporary file
          fs.unlinkSync(filePath);

          if (error) {
            console.log('Error from Python script:', error);  // Log error from Python script
            reject(error);
          } else {
            console.log('Output from Python script:', stdout);  // Log output from Python script
            resolve(stdout);
          }
        }
      );
    });
  },
};
module.exports = DataService;
