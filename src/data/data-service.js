const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const DataService = {
  async getPricingData(db) {
    const prices = await db.select('closing_price').from('stockrealtime');

    const data = prices.map((price) => price.closing_price);

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
            reject(error);
          } else {
            resolve(stdout);
          }
        }
      );
    });
  },
};
module.exports = DataService;
