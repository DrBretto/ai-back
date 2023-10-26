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

  processData: () => {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(
        process.cwd(),
        '/src/python/process_data.py'
      );
      console.log('Current working directory:', process.cwd());
      console.log('scriptPath:', scriptPath);

      exec(
        '. env/bin/activate && env/bin/python src/python/process_data.py',
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Error in processData: ${error}`);
            console.error(`Stderr: ${stderr}`);
            reject(error); // You might want to reject the promise here
            return;
          }
          console.log(`Python script output: ${stdout}`);
          resolve(stdout); // And resolve it here
        }
      );
    });
  },
};

module.exports = DataService;
