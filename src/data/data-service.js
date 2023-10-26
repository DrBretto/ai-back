const exec = require('child_process').exec;
const path = require('path');

class DataService {
  async getData(db) {
    try {
      const data = await db('stockrealtime').select('close_price');
      console.log('Data fetched from database:', data);
      return data.map((row) => row.close_price);
    } catch (error) {
      console.error('Error in getData:', error);
      throw error;
    }
  }

  processData(data) {
    // Passing data as argument here
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(
        process.cwd(),
        '/src/python/process_data.py'
      );
      console.log('Current working directory:', process.cwd());
      console.log('scriptPath:', scriptPath);
      console.log('Data to be processed:', JSON.stringify(data, null, 2)); // Log data here

      const command = `. env/bin/activate && echo '${JSON.stringify(
        data
      )}' | env/bin/python src/python/process_data.py`; // Passing data here
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
  }
}

module.exports = DataService;

module.exports = DataService;
