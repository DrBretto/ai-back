const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DataService = {
  deleteCache() {
    const files = [
      path.join(process.cwd(), 'src/cache/historical.json'),
      path.join(process.cwd(), 'src/cache/realtime.json'),
      path.join(process.cwd(), 'src/cache/sentiment.json'),
    ];
    files.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  },

  async getData(db, batchSize = 100) {
    try {
      console.log('Starting getData...');
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
        console.log(`Starting processBatchedData for table ${table}...`);
        let lastId = {
          NUGT: 0,
          JDST: 0,
        };

        // Load last id if file exists
        if (fs.existsSync(filePath)) {
          const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          lastId = {
            NUGT:
              existingData.NUGT.length > 0
                ? existingData.NUGT.slice(-1)[0].id
                : 0,
            JDST:
              existingData.JDST.length > 0
                ? existingData.JDST.slice(-1)[0].id
                : 0,
          };
        }

        let hasMoreData = true;
        const writeStream = fs.createWriteStream(filePath, { flags: 'a' }); // Create write stream

        while (hasMoreData) {
          console.log(
            `Processing batch with lastId: ${JSON.stringify(lastId)}`
          );
          const newData = await db(table)
            .select('*')
            .where('id', '>', Math.max(lastId.NUGT, lastId.JDST))
            .orderBy('id', 'asc')
            .limit(batchSize);

          hasMoreData = newData.length === batchSize;

          // Update the lastId for the next iteration
          if (newData.length > 0) {
            console.log(`Processed batch of ${newData.length} records.`);
            lastId = {
              NUGT: newData[newData.length - 1].id,
              JDST: newData[newData.length - 1].id,
            };
          }

          // Organize and filter new data by stock_id
          const organizedData = {
            NUGT: newData.filter((row) => row.stock_id === stockIdMap.NUGT),
            JDST: newData.filter((row) => row.stock_id === stockIdMap.JDST),
          };

          // Write organized data to the file incrementally
          writeStream.write(JSON.stringify(organizedData, null, 2));
        }

        writeStream.end(); // Close the write stream
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
      console.log('Completed getData.');
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
