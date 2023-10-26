// data-service.js
const exec = require('child_process').exec;
const path = require('path');

const DataService = {
  async getData(db) {
    try {
      const data = await db('stockrealtime').select('close_price');
      return data.map((row) => row.close_price);
    } catch (error) {
      console.error('Error in getData:', error);
      throw error;
    }
  },

  processData() {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(
        process.cwd(),
        '/src/python/process_data.py'
      );
      console.log('Current working directory:', process.cwd());
      console.log('scriptPath:', scriptPath);

      const { exec } = require('child_process');
      exec('which python3', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Error: ${stderr}`);
          return;
        }
        console.log(`Python Path: ${stdout}`);
      });

      exec(
        'pipenv run python3 src/python/process_data.py',
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Error in processData: ${error}`);
            console.error(`Stderr: ${stderr}`);
            return;
          }
          console.log(`Python script output: ${stdout}`);
        }
      );
    });
  },
};

module.exports = DataService;
