import torch
import torch.nn as nn
import psycopg2
import pandas as pd
import numpy as np
import os
from torch.utils.data import TensorDataset, DataLoader, Dataset
import gc
import resource
import sys
from datetime import time
from torch.nn.utils.rnn import pad_sequence


# Define the window and intervals outside of the function
lagwindow = 30
defaultIntervals = [1, 15, 60, 1440]


def log_memory_usage():
    memory_usage_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    with open('memory_log.txt', 'a') as f:  # 'a' mode for append to the log file
        print(f"Memory Usage: {memory_usage_kb / 1024} MB", file=f)

def create_future_price_points(stock_data, future_window=30, future_interval=1):

    new_frames = []
    for lead in range(future_interval, future_window * future_interval + 1, future_interval):
        for feature in ['closing_price', 'high_price', 'low_price', 'volume']:
            future_column_name = f'{feature}_future_{lead}'
            future_feature = stock_data[feature].shift(-lead)
            future_feature_frame = future_feature.to_frame(name=future_column_name)
            new_frames.append(future_feature_frame)

    future_data = pd.concat([stock_data] + new_frames, axis=1)
    # Drop the rows at the end that do not have a full set of future data points
    future_data = future_data.dropna(subset=[f'{feature}_future_{future_window * future_interval}' for feature in ['closing_price', 'high_price', 'low_price', 'volume']])
    
    return future_data


def create_lagged_features(stock_data, intervals=defaultIntervals):
    # ... (rest of your existing code for the function)
    new_frames = []
    for interval in intervals:
        for feature in ['closing_price', 'high_price', 'low_price', 'volume']:
            for lag in range(1, lagwindow + 1):
                lagged_column_name = f'{feature}_lag_{interval * lag}'
                lagged_feature = stock_data[feature].shift(lag * interval)
                lagged_feature_frame = lagged_feature.to_frame(name=lagged_column_name)
                new_frames.append(lagged_feature_frame)
    lagged_data = pd.concat([stock_data] + new_frames, axis=1)
    return lagged_data

def calculate_global_min_max(historical_data_jdst, historical_data_nugt):
    # Combine both stock data sets to calculate global min and max
    combined_stock_data = pd.concat([historical_data_jdst, historical_data_nugt])
    
    # Calculate global min and max for each column
    global_min = combined_stock_data[['closing_price', 'high_price', 'low_price', 'volume']].min()
    global_max = combined_stock_data[['closing_price', 'high_price', 'low_price', 'volume']].max()
    
    return global_min, global_max

def process_sentiment_data(sentiment_data):
    # Ensure no duplicate tokens in the 'token_values' column
    sentiment_data['token_values'] = sentiment_data['token_values'].apply(lambda x: list(set(x)))

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

def process_in_batches(df, batch_size, intervals=defaultIntervals, lagwindow=30, future_window=30, future_interval=1):
    for start in range(0, len(df), batch_size):
        log_memory_usage()
        sys.stdout.flush()
        end = min(start + batch_size + lagwindow, len(df))  
        batch = df[start:end]
        if end + lagwindow > len(df):
            batch = df[start:]  
        
        batch_with_lagged_features = create_lagged_features(batch, intervals)
        # Create future price points here
        batch_with_future_price_points = create_future_price_points(batch_with_lagged_features, future_window, future_interval)
        
        yield batch_with_future_price_points



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

    sys.stdout.flush()
    # Process the sentiment data
    sentiment_gold, sentiment_usd = process_sentiment_data(sentiment_data)

    print(f"=========after processing sentiment data=======")
    log_memory_usage()

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
class OverlappingWindowDataset(Dataset):
    def __init__(self, data, lagwindow):
        self.data = data
        self.window_size = lagwindow

    def __len__(self):
        # Total windows are the total data points minus one full window size,
        # adjusted to start at the first possible full window
        return len(self.data) - (2 * self.window_size) + 1

    def __getitem__(self, index):
        # Slices the data to get the input window and the output window.
        # The output window immediately follows the input window in time.
        input_sequence = self.data.iloc[index:index+self.window_size].values.astype(np.float32)
        target_sequence = self.data.iloc[index+self.window_size:index+(2*self.window_size)].values.astype(np.float32)
        return torch.Tensor(input_sequence), torch.Tensor(target_sequence)

def prepare_dataloaders(stock_data_with_sentiment, lagwindow, batch_size):
    # Assuming 'stock_data_with_sentiment' is pre-processed to have the required columns only

    # Initialize the OverlappingWindowDataset with the data and lagwindow
    dataset = OverlappingWindowDataset(
        data=stock_data_with_sentiment, 
        lagwindow=lagwindow
    )

    # Prepare the DataLoader using the custom dataset
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=False)

    return dataloader

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
    
    # Instead of calling prepare_dataloaders directly, you iterate over the batches
    for batch_data in process_in_batches(final_combined_data, batch_size):
        dataloader = prepare_dataloaders(batch_data, lagwindow, batch_size)

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

