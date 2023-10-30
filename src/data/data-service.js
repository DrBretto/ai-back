const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DataService = {
  async getData(db, batchSize = 100) {
    try {
      // Paths to the cache files
      const historicalPath = path.join(
        process.cwd(),
        'src/cache/historical.json'
      );
      const realtimePath = path.join(process.cwd(), 'src/cache/realtime.json');
      const sentimentPath = path.join(
        process.cwd(),
        'src/cache/sentiment.json'
      );

      // Function to fetch and process data in batches
      const processBatchedData = async (
        table,
        stockIdMap,
        dateColumn,
        filePath
      ) => {
        let offset = 0;
        let hasMoreData = true;
        let lastUpdateTime = {};

        // Load last update time if file exists
        if (fs.existsSync(filePath)) {
          const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          lastUpdateTime = {
            NUGT:
              existingData.NUGT.length > 0
                ? existingData.NUGT.slice(-1)[0][dateColumn]
                : '1970-01-01 00:00:00',
            JDST:
              existingData.JDST.length > 0
                ? existingData.JDST.slice(-1)[0][dateColumn]
                : '1970-01-01 00:00:00',
          };
        }

        while (hasMoreData) {
          const newData = await db(table)
            .select('*')
            .orderBy(dateColumn, 'asc')
            .limit(batchSize)
            .offset(offset);
          hasMoreData = newData.length === batchSize;
          offset += batchSize;

          // Organize and filter new data by stock_id and date
          const organizedData = {
            NUGT: newData.filter(
              (row) =>
                row.stock_id === stockIdMap.NUGT &&
                row[dateColumn] > lastUpdateTime.NUGT
            ),
            JDST: newData.filter(
              (row) =>
                row.stock_id === stockIdMap.JDST &&
                row[dateColumn] > lastUpdateTime.JDST
            ),
          };

          // Merge new data with existing data and write to file
          if (fs.existsSync(filePath)) {
            const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            existingData.NUGT.push(...organizedData.NUGT);
            existingData.JDST.push(...organizedData.JDST);
            fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
          } else {
            fs.writeFileSync(filePath, JSON.stringify(organizedData, null, 2));
          }
        }
      };

      // Process each type of data separately
      await processBatchedData(
        'stockhistory',
        { NUGT: 1, JDST: 2 },
        'date_time',
        historicalPath
      );
      await processBatchedData(
        'stockrealtime',
        { NUGT: 1, JDST: 2 },
        'date_time',
        realtimePath
      );
      await processBatchedData(
        'sentiment_analysis',
        { NUGT: 2, JDST: 1 },
        'date_published',
        sentimentPath
      );

      return { historicalPath, realtimePath, sentimentPath }; // Return the paths to the data files
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
