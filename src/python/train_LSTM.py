import torch
import torch.nn as nn
import psycopg2
import pandas as pd
import numpy as np
import os
from torch.utils.data import TensorDataset, DataLoader
import gc
import resource
import sys
from datetime import time
import pytz


# Define the window and intervals outside of the function
lagwindow = 30
intervals = [1, 15, 60, 1440]

class SimpleLSTM(nn.Module):
    def __init__(self, input_size=1, hidden_layer_size=100, output_size=1):
        super().__init__()
        self.hidden_layer_size = hidden_layer_size

        self.lstm = nn.LSTM(input_size, hidden_layer_size)

        self.linear = nn.Linear(hidden_layer_size, output_size)

        self.hidden_cell = (torch.zeros(1,1,self.hidden_layer_size),
                            torch.zeros(1,1,self.hidden_layer_size))

    def forward(self, input_seq):
        lstm_out, self.hidden_cell = self.lstm(input_seq.view(len(input_seq) ,1, -1), self.hidden_cell)
        predictions = self.linear(lstm_out.view(len(input_seq), -1))
        return predictions[-1]


def log_memory_usage():
    memory_usage_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    with open('memory_log.txt', 'a') as f:  # 'a' mode for append to the log file
        print(f"Memory Usage: {memory_usage_kb / 1024} MB", file=f)

def create_lagged_features(stock_data):
    # 'intervals' could be a list of intervals like [1, 15, 60, 1440] representing minutes
    # 'window' could be a fixed size or you can adjust as needed, e.g., 30
    lagged_data = stock_data.copy()
    for interval in intervals:
        for feature in ['closing_price', 'high_price', 'low_price', 'volume']:
            for lag in range(1, lagwindow): 
                lagged_column_name = f'{feature}_lag_{interval * lag}'
                lagged_data[lagged_column_name] = stock_data[feature].shift(lag * interval)
    return lagged_data

def calculate_global_min_max(historical_data_jdst, historical_data_nugt):
    # Combine both stock data sets to calculate global min and max
    combined_stock_data = pd.concat([historical_data_jdst, historical_data_nugt])
    
    # Calculate global min and max for each column
    global_min = combined_stock_data[['closing_price', 'high_price', 'low_price', 'volume']].min()
    global_max = combined_stock_data[['closing_price', 'high_price', 'low_price', 'volume']].max()
    
    return global_min, global_max

def combine_and_average_sentiments(sentiment_data):
    # Average the scores and combine the tokenized sentiments
    averaged_data = (sentiment_data
                     .groupby(['date_published', 'subject_id'])
                     .agg({'high_score': 'mean',
                           'low_score': 'mean',
                           'average_score': 'mean',
                           'token_values': lambda x: list(set().union(*x))})
                     .reset_index())
    return averaged_data

def process_sentiment_data(sentiment_data):
    # Ensure no duplicate tokens in the 'token_values' column
    sentiment_data['token_values'] = sentiment_data['token_values'].apply(lambda x: list(set(x)))

    # Add time (00:00:00) to the date and localize to 'America/New_York' timezone
    sentiment_data['date_published'] = pd.to_datetime(sentiment_data['date_published'])
    sentiment_data['date_published'] = sentiment_data['date_published'].apply(lambda x: x.combine(x, time.min))
    sentiment_data['date_published'] = sentiment_data['date_published'].dt.tz_convert('UTC')

    # Group by 'date_published' and 'subject_id' and aggregate the data
    processed_sentiment = sentiment_data.groupby(['date_published', 'subject_id'], as_index=False).agg({
        'high_score': 'mean',
        'low_score': 'mean',
        'average_score': 'mean',
        'token_values': lambda x: list(set().union(*x))
    })

    # Split the processed sentiment data into two separate DataFrames based on 'subject_id'
    sentiment_gold = processed_sentiment[processed_sentiment['subject_id'] == 1]
    sentiment_usd = processed_sentiment[processed_sentiment['subject_id'] == 2]

    return sentiment_gold, sentiment_usd

def normalize_data_global_and_impute(stock_data, global_min, global_max):
    # Assuming that 'stock_data' includes data for both stocks and is ready for global normalization
    # Perform Min-Max normalization across the entire dataset using the provided global min and max
    for column in ['closing_price', 'high_price', 'low_price', 'volume']:
        stock_data[column] = (stock_data[column] - global_min[column]) / (global_max[column] - global_min[column])
    
    # Forward fill to impute missing values for each stock
    imputed_data = stock_data.ffill().bfill()
    
    return imputed_data

def process_in_batches(df, batch_size):
    for start in range(0, len(df), batch_size):           
        log_memory_usage()
        sys.stdout.flush()
        end = min(start + batch_size, len(df))
        batch = df[start:end]
        # Create lagged features for batch without re-normalizing
        batch_with_lagged_features = create_lagged_features(batch, [1, 15, 60, 1440])
        yield batch_with_lagged_features

def get_data_from_db(chunksize=10000):
    print(f"=========before loading data from db===========")
    log_memory_usage()
    print(f"===============================================")
    sys.stdout.flush()
    # Obtain DB credentials from environment variables
    db_config = {
        'dbname': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASSWORD'],
        'host': os.environ['DB_HOST']
    }

    # Initialize empty DataFrames
    historical_data = pd.DataFrame()
    sentiment_data = pd.DataFrame()
    
    with psycopg2.connect(**db_config) as conn:
        # Fetch all historical data in chunks
        for chunk in pd.read_sql('SELECT * FROM stockhistory', conn, parse_dates=['date_time'], chunksize=chunksize):
            historical_data = pd.concat([historical_data, chunk])

        # Fetch all sentiment data in chunks
        for chunk in pd.read_sql('SELECT * FROM sentiment_analysis', conn, parse_dates=['date_published'], chunksize=chunksize):
            sentiment_data = pd.concat([sentiment_data, chunk])

    print(f"=========after loading data from db===========")
    log_memory_usage()
    print(f"===============================================")
    sys.stdout.flush()
    # Process the sentiment data
    sentiment_gold, sentiment_usd = process_sentiment_data(sentiment_data)

    print(f"=========after processing sentiment data=======")
    log_memory_usage()
    print(f"===============================================")
    sys.stdout.flush()

    # Split the historical data into two datasets based on 'stock_id'
    historical_data_jdst = historical_data[historical_data['stock_id'] == 1]
    historical_data_nugt = historical_data[historical_data['stock_id'] == 2]

    # At this point, you would also want to ensure that the historical data
    # has a column ready for merging with sentiment data, like a normalized date column

    del chunk
    gc.collect()

    return historical_data_jdst, historical_data_nugt, sentiment_gold, sentiment_usd

def integrate_sentiment(stock_data, sentiment_data):
    # Instead of duplicating sentiment data, join it with the stock data
    # The join will be performed such that each row in stock_data will be matched with the corresponding sentiment data based on the date
    stock_data_with_sentiment = pd.merge_asof(stock_data.sort_values('date_time'), 
                                              sentiment_data.sort_values('date_published'),
                                              left_on='date_time', right_on='date_published', 
                                              direction='forward')
    return stock_data_with_sentiment

def prepare_dataloaders(stock_data_with_sentiment, batch_size):
    dataloaders = []
    for batch in process_in_batches(stock_data_with_sentiment, batch_size):
        # Drop the target column 'closing_price' to create input features tensor
        tensor_x = torch.Tensor(batch.drop('closing_price', axis=1).values.astype(np.float32))
        # Create target tensor from 'closing_price'
        tensor_y = torch.Tensor(batch['closing_price'].values.astype(np.float32))
        # Create your dataset and DataLoader
        dataset = TensorDataset(tensor_x, tensor_y)
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=False)
        dataloaders.append(dataloader)
    return dataloaders

def process_data(batch_size):
    # Fetch the data from the DB
    historical_data_jdst, historical_data_nugt, sentiment_gold, sentiment_usd = get_data_from_db()

    # Combine and normalize the datasets without duplicating sentiment data
    combined_data = pd.concat([historical_data_jdst, historical_data_nugt])

    # Obtain global min and max for normalization
    global_min, global_max = calculate_global_min_max(historical_data_jdst, historical_data_nugt)

    # Normalize and impute the combined data
    combined_data_normalized_imputed = normalize_data_global_and_impute(combined_data, global_min, global_max)

    # Integrate sentiment scores with each stock's normalized and imputed data separately
    combined_data_jdst_with_sentiment = integrate_sentiment(combined_data_normalized_imputed[combined_data_normalized_imputed['stock_id'] == 1], sentiment_gold)
    combined_data_nugt_with_sentiment = integrate_sentiment(combined_data_normalized_imputed[combined_data_normalized_imputed['stock_id'] == 2], sentiment_usd)

    # Re-combine the data with sentiment
    final_combined_data = pd.concat([combined_data_jdst_with_sentiment, combined_data_nugt_with_sentiment])

    # Process the final combined data in batches
    dataloaders = prepare_dataloaders(final_combined_data, batch_size)

    # The rest of the code remains the same...
    latest_data_snapshot = final_combined_data.tail(1)
    return latest_data_snapshot  # Return the dataloaders as well if they will be used later.


if __name__ == '__main__':
    # Define the batch size
    batch_size = 64

    # Call the process_data function to process the data
    latest_data_snapshot = process_data(batch_size)

    # Since process_data is yielding DataLoader objects, we would typically
    # have a loop here to iterate through these DataLoader objects.
    # However, since we're only interested in the latest data snapshot here,
    # we'll convert that to JSON for easy viewing.
    
    # Convert the latest data snapshot to JSON for easy viewing
    json_snapshot = latest_data_snapshot.to_json(orient='records', date_format='iso')

    # Print the JSON snapshot
    print(json_snapshot)

