const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DataService = {
  async getData(db) {
    try {
      // Retrieve data from the database
      const historicalData = await db('stockhistory').select('*');
      const realtimeData = await db('stockrealtime').select('*');
      const sentimentData = await db('sentiment_analysis').select('*');

      // Organize data by stock_id and type
      const organizedData = {
        NUGT: {
          historical: historicalData.filter((row) => row.stock_id === 1),
          realtime: realtimeData.filter((row) => row.stock_id === 1),
          sentiment: sentimentData.filter((row) => row.stock_id === 2),
        },
        JDST: {
          historical: historicalData.filter((row) => row.stock_id === 2),
          realtime: realtimeData.filter((row) => row.stock_id === 2),
          sentiment: sentimentData.filter((row) => row.stock_id === 1),
        },
      };

      // Write data to a file
      const dataPath = path.join(process.cwd(), 'src/cache/data.json');
      fs.writeFileSync(dataPath, JSON.stringify(organizedData, null, 2)); // The null, 2 arguments format the JSON for readability

      return dataPath; // Return the path to the data file
    } catch (error) {
      console.error('Error in getData:', error);
      throw error;
    }
  },

  async trainModel() {
    console.log(process.cwd());

    const dataPath = path.join(process.cwd(), 'src/cache/data.json');
    const resultPath = path.join(process.cwd(), 'src/cache/result.json');

    return new Promise((resolve, reject) => {
      exec(
        `. env/bin/activate && env/bin/python src/python/train_model.py ${dataPath} ${resultPath}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error('Error:', error);
            console.error('Standard Output:', stdout);
            console.error('Standard Error:', stderr);
            reject(error);
            return;
          }

          // Read result from a file
          const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

          // Optionally, delete temporary files
          fs.unlinkSync(resultPath);

          resolve(result);
        }
      );
    });
  },

  async processData(data) {
    console.log(process.cwd());

    const dataPath = path.join(process.cwd(), 'src/cache/data.json');
    const resultPath = path.join(process.cwd(), 'src/cache/result.json');

    // Write data to a file
    fs.writeFileSync(dataPath, JSON.stringify(data));

    return new Promise((resolve, reject) => {
      exec(
        `. env/bin/activate && env/bin/python src/python/process_data.py ${dataPath} ${resultPath}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error('Error:', error);
            console.error('Standard Output:', stdout);
            console.error('Standard Error:', stderr);
            reject(error);
            return;
          }

          // Read result from a file
          const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

          // Optionally, delete temporary files
          fs.unlinkSync(dataPath);
          fs.unlinkSync(resultPath);

          resolve(result.count);
        }
      );
    });
  },
};

module.exports = DataService;
