//const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const { spawn } = require('child_process');

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

  async processBatchedData(db, table, stockIdMap, idColumn, filePath, header) {
    console.log(`Starting processBatchedData for table ${table}...`);
    let lastId = {
      NUGT: 0,
      JDST: 0,
    };
    let hasMoreData = true;
    let batchCount = 0;

    const createCSVWriter = (filePath, header) => {
      const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
      writeStream.write(header.join(',') + '\n');
      return {
        write: (records) => {
          records.forEach((record) => {
            const row = header.map((field) => `"${record[field]}"`).join(',');
            writeStream.write(row + '\n');
          });
        },
        end: () => {
          writeStream.end();
        },
      };
    };

    const csvWriter = createCSVWriter(filePath, header);

    while (hasMoreData) {
      const newData = await db(table)
        .select('*')
        .where(idColumn, '>', Math.max(lastId.NUGT, lastId.JDST))
        .orderBy(idColumn, 'asc')
        .limit(100);

      hasMoreData = newData.length === 100;

      // Update the lastId for the next iteration
      if (newData.length > 0) {
        lastId = {
          NUGT: newData[newData.length - 1][idColumn],
          JDST: newData[newData.length - 1][idColumn],
        };
      }

      csvWriter.write(newData);

      batchCount++;
      if (batchCount % 100 === 0) {
        console.log(
          `Processed ${batchCount * 100} records from table ${table}.`
        );
      }
    }

    csvWriter.end();
    console.log(`Completed processBatchedData for table ${table}.`);
  },

  async getData(db) {
    this.deleteCache();
    try {
      console.log('Starting getData...');
      const historicalPath = path.join(
        process.cwd(),
        'src/cache/historical_data.csv'
      );
      const realtimePath = path.join(
        process.cwd(),
        'src/cache/realtime_data.csv'
      );
      const sentimentPath = path.join(
        process.cwd(),
        'src/cache/sentiment_data.csv'
      );

      await this.processBatchedData(
        db,
        'stockhistory',
        { NUGT: 1, JDST: 2 },
        'id',
        historicalPath,
        [
          'id',
          'stock_id',
          'date_time',
          'closing_price',
          'high_price',
          'low_price',
          'volume',
        ]
      );

      await this.processBatchedData(
        db,
        'stockrealtime',
        { NUGT: 1, JDST: 2 },
        'id',
        realtimePath,
        [
          'id',
          'stock_id',
          'date_time',
          'closing_price',
          'high_price',
          'low_price',
          'opening_price',
          'daily_change',
          'daily_percent_change',
          'previous_close',
        ]
      );

      await this.processBatchedData(
        db,
        'sentiment_analysis',
        { NUGT: 2, JDST: 1 },
        'id',
        sentimentPath,
        [
          'id',
          'pull_date',
          'subject_id',
          'source_id',
          'tokenized_sentiment',
          'average_score',
          'low_score',
          'high_score',
        ]
      );

      console.log('Completed getData.');
      return { historicalPath, realtimePath, sentimentPath }; // Return the paths to the data files
    } catch (error) {
      console.error('Error in getData:', error);
      throw error;
    }
  },





async  trainLSTM() {
  console.log('Starting LSTM training...');

  const pythonProcess = spawn('env/bin/python', ['src/python/train_LSTM.py'], {
    shell: true,
    env: {
      ...process.env, // Make sure to include existing environment variables
      PATH: `env/bin:${process.env.PATH}` // Adjust PATH to include your virtualenv binaries
    }
  });

  // Handle real-time output
  pythonProcess.stdout.on('data', (data) => {
    console.log('Real-time output:', data.toString());
  });

  // Handle real-time errors
  pythonProcess.stderr.on('data', (data) => {
    console.error('Real-time error:', data.toString());
  });

  // Handle process exit
  pythonProcess.on('close', (code) => {
    console.log(`Training process exited with code ${code}`);
  });

  // Handle process errors
  pythonProcess.on('error', (error) => {
    console.error('Failed to start training process.', error);
  });

  // If you need to write something to the python process, you can use pythonProcess.stdin.write()
}





  // Inside your DataService object in DataService.js

  // async trainLSTM() {
  //   console.log('Starting LSTM training...');

  //   return new Promise((resolve, reject) => {
  //     const process = exec(
  //       `. env/bin/activate && env/bin/python src/python/train_LSTM.py`,
  //       (error, stdout, stderr) => {
  //         if (error) {
  //           console.error('Error occurred:', error);
  //           console.error('Error details:', stderr);
  //           reject(error);
  //           return;
  //         }

  //         console.log('Training completed. Output:', stdout);
  //         resolve(stdout); // Resolve with the raw stdout data directly.
  //       }
  //     );

  //     Optional: If you want to capture real-time stdout as it is being printed by the Python script
  //     process.stdout.on('data', (data) => {
  //       console.log('Real-time output:', data.toString());
  //     });

  //     Optional: If you want to capture real-time stderr as it is being printed by the Python script
  //     process.stderr.on('data', (data) => {
  //       console.error('Real-time error:', data.toString());
  //     });
  //   });
  //},
};

module.exports = DataService;
