const exec = require('child_process').exec;
const path = require('path');

const DataService = {
  async getData(db) {
    try {
      const data = await db('stockrealtime').select('close_price');
      console.log('Data fetched from database:', data);
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

      const command =
        '. env/bin/activate && env/bin/python src/python/process_data.py';
      console.log('Command:', command);

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error in processData: ${error}`);
          console.error(`Stderr: ${stderr}`);
          reject(error);
          return;
        }
        console.log(`Python script output: ${stdout}`);
        try {
          const result = JSON.parse(stdout);
          resolve(result.count);
        } catch (parseError) {
          console.error(`Error parsing JSON: ${parseError}`);
          reject(parseError);
        }
      });
    });
  },
};

module.exports = DataService;

module.exports = DataService;
