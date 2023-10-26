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
      const scriptPath = path.join('/opt/render/project/srcprocess_data.py');
      console.log('Current working directory:', process.cwd()); 
      console.log('scriptPath:', scriptPath);
      exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error('Error in processData:', error);
          console.error('Stderr:', stderr);
          reject(error);
        } else {
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
