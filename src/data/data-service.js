// file: data/data-service.js

const { spawn } = require('child_process');

const DataService = {
  runPythonScript(scriptPath, inputData) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        scriptPath,
        JSON.stringify(inputData),
      ]);

      let dataString = '';
      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pythonProcess.stdout.on('end', () => {
        resolve(JSON.parse(dataString));
      });

      pythonProcess.stderr.on('data', (data) => {
        reject(data.toString());
      });
    });
  },

  async getPricingData(db) {
    const prices = await db.select('closing_price').from('stockrealtime');
    return prices.map((priceObj) => priceObj.closing_price);
  },
};

module.exports = DataService;
