// data-service.js
const exec = require('child_process').exec;

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
      exec('python3 process_data.py', (error, stdout, stderr) => {
        if (error) {
          console.error('Error in processData:', error);
          console.error('Stderr:', stderr);
          reject(error);
        } else {
          console.log('Python script output:', stdout); // Log the output from the Python script
          try {
            resolve(JSON.parse(stdout));
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            reject(parseError);
          }
        }
      });
    });
  },
};

module.exports = DataService;
