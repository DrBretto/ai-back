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
      console.error('Error in getData:', error.code);
      throw error;
    }
  },

  async getLatestPrediction(db) {
    try {
      console.log('Fetching the latest predictions...');

      const result = await db('stock_predictions')
        .select('stock_id', 'prediction_values')
        .whereIn('stock_id', [1, 2])
        .orderBy('prediction_date', 'desc')
        .limit(2);

      if (result.length < 2) {
        return { message: 'Insufficient prediction data available.' };
      }

      // Assuming result[0] is for stock 1 and result[1] is for stock 2
      return {
        stock1_prediction:
          result[0].stock_id === 1
            ? result[0].prediction_values
            : result[1].prediction_values,
        stock2_prediction:
          result[1].stock_id === 2
            ? result[1].prediction_values
            : result[0].prediction_values,
      };
    } catch (error) {
      console.error('Error fetching the latest predictions:', error);
      throw error;
    }
  },

  async trainLSTM() {
    console.log('Starting LSTM training...');

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(
        'env/bin/python',
        ['-u', 'src/python/train_LSTM.py', 'train'],
        {
          shell: true,
        }
      );

      pythonProcess.stdout.on('data', (data) => {
        console.log('Real-time output:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Real-time error:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Training process exited with code ${code}`);
          reject(new Error('Training failed'));
        } else {
          console.log('Training completed successfully.');
          resolve();
        }
      });
    });
  },

  async predictLSTM() {
    console.log('Starting LSTM prediction...');

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(
        'env/bin/python',
        ['-u', 'src/python/train_LSTM.py', 'predict'],
        {
          shell: true,
        }
      );

      let output = '';
      pythonProcess.stdout.on('data', (data) => {
        console.log('Real-time output:', data.toString());
        output += data.toString(); // Accumulate the output
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Real-time error:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Prediction process exited with code ${code}`);
          reject(new Error('Prediction failed'));
        } else {
          console.log('Prediction completed successfully.');
          resolve(output); // Resolve with the accumulated output
        }
      });
    });
  },
};

module.exports = DataService;
