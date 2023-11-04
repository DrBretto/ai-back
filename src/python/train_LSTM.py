import torch
import torch.nn as nn
import psycopg2
import pandas as pd
import numpy as np
import os
from torch.utils.data import TensorDataset, DataLoader, Dataset
import gc
import resource
from datetime import time
from torch.nn.utils.rnn import pad_sequence
import sys
import json

# Define the window and intervals outside of the function
_lagwindow = 30
_defaultIntervals = [1, 15, 60, 1440]
_future_window = 96
_future_interval = 15

class OverlappingWindowDataset(Dataset):
    def __init__(self, data, lagwindow):
        self.data = data
        self.window_size = lagwindow

    def __len__(self):
        return len(self.data) - (2 * self.window_size) + 1

    def __getitem__(self, index):
        input_sequence = self.data.iloc[index:index+self.window_size].values.astype(np.float32)
        target_sequence = self.data.iloc[index+self.window_size:index+(2*self.window_size)].values.astype(np.float32)
        return torch.Tensor(input_sequence), torch.Tensor(target_sequence)

def create_future_price_points(stock_data, future_window=96, future_interval=15):
    new_frames = []
    for lead in range(future_interval, future_window * future_interval + 1, future_interval):
        for feature in ['closing_price', 'high_price', 'low_price', 'volume']:
            future_column_name = f'{feature}_future_{lead}'
            future_feature = stock_data[feature].shift(-lead)
            future_feature_frame = future_feature.to_frame(name=future_column_name)
            new_frames.append(future_feature_frame)
    future_data = pd.concat([stock_data] + new_frames, axis=1)
    return future_data

def create_lagged_features(stock_data, intervals, lagwindow):
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
    combined_stock_data = pd.concat([historical_data_jdst, historical_data_nugt])
    global_min = combined_stock_data[['closing_price', 'high_price', 'low_price', 'volume']].min()
    global_max = combined_stock_data[['closing_price', 'high_price', 'low_price', 'volume']].max()
    return global_min, global_max

def process_sentiment_data(sentiment_data):
    sentiment_data['token_values'] = sentiment_data['token_values'].apply(lambda x: list(set(x)))
    processed_sentiment = sentiment_data.groupby(['date_published', 'subject_id'], as_index=False).agg({
        'high_score': 'mean',
        'low_score': 'mean',
        'average_score': 'mean',
        'token_values': lambda x: list(set().union(*x))
    })

    sentiment_gold = processed_sentiment[processed_sentiment['subject_id'] == 1]
    sentiment_usd = processed_sentiment[processed_sentiment['subject_id'] == 2]

    print(f"Processed sentiment_gold size: {sentiment_gold.shape}")
    print(f"Processed sentiment_usd size: {sentiment_usd.shape}")

    return sentiment_gold, sentiment_usd

def normalize_data(stock_data):
    columns_to_normalize = ['closing_price', 'high_price', 'low_price', 'volume']
    min_values = stock_data[columns_to_normalize].min()
    max_values = stock_data[columns_to_normalize].max()
    for column in columns_to_normalize:
        stock_data[column] = (stock_data[column] - min_values[column]) / (max_values[column] - min_values[column])
    return stock_data

def process_in_batches(df, batch_size, intervals=_defaultIntervals, lagwindow=_lagwindow, future_window=_future_window, future_interval=_future_interval):
    max_lag = max(intervals) * lagwindow
    future_offset = future_window * future_interval
    start_index = max_lag
    end_index = len(df) - future_offset
 
    for start in range(start_index, end_index, batch_size):
        end = start + batch_size

        if end > end_index:
            end = end_index  

        batch = df.iloc[(start - max_lag):end + future_offset].copy()
        batch_with_features = create_lagged_features(batch, intervals, lagwindow)
        batch_with_features = create_future_price_points(batch_with_features, future_window, future_interval)
        batch_with_features = batch_with_features.iloc[max_lag:(max_lag + batch_size)]

        if batch_with_features.empty:
            sys.stderr.write(f"Warning: Batch data is empty after feature creation. Start index: {start}, End index: {end}\n")
            continue 
 
        print(f"Batch processed from index {start} to {end}.")
        print(f"Batch size with features and future price: {batch_with_features.shape}")
        yield batch_with_features

def get_data_from_db(chunksize=10000):
 
    db_config = {
        'dbname': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASSWORD'],
        'host': os.environ['DB_HOST']
    }

    historical_data = pd.DataFrame()
    sentiment_data = pd.DataFrame()

    with psycopg2.connect(**db_config) as conn:
        for chunk in pd.read_sql('SELECT * FROM stockhistory', conn, parse_dates=['date_time'], chunksize=chunksize):
            historical_data = pd.concat([historical_data, chunk])
        for chunk in pd.read_sql('SELECT * FROM sentiment_analysis', conn, parse_dates=['date_published'], chunksize=chunksize):
            sentiment_data = pd.concat([sentiment_data, chunk])
    sentiment_gold, sentiment_usd = process_sentiment_data(sentiment_data)
    historical_data_jdst = historical_data[historical_data['stock_id'] == 1]
    historical_data_nugt = historical_data[historical_data['stock_id'] == 2]

    del chunk
    gc.collect()

    return historical_data_jdst, historical_data_nugt, sentiment_gold, sentiment_usd

def integrate_sentiment(stock_data, sentiment_data):
    stock_data_with_sentiment = pd.merge_asof(stock_data.sort_values('date_time'), 
                                              sentiment_data.sort_values('date_published'),
                                              left_on='date_time', right_on='date_published', 
                                              direction='forward')
    return stock_data_with_sentiment

def prepare_dataloaders(stock_data_with_sentiment, lagwindow, batch_size):

    dataset = OverlappingWindowDataset(
        data=stock_data_with_sentiment, 
        lagwindow=lagwindow
    )

    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=False)

    return dataloader

def process_data(batch_size):
    historical_data_jdst, historical_data_nugt, sentiment_gold, sentiment_usd = get_data_from_db()

    if historical_data_jdst.empty or historical_data_nugt.empty:
        sys.stderr.write("Error: One or more stock datasets from the database are empty.\n")
        return pd.DataFrame()

    all_datetimes = pd.DataFrame(pd.date_range(start=historical_data_jdst['date_time'].min(), 
                                               end=historical_data_jdst['date_time'].max(), 
                                               freq='T'), columns=['date_time'])

    # Merge and fill missing JDST data
    historical_data_jdst = pd.merge(all_datetimes, historical_data_jdst, on='date_time', how='left')
    historical_data_jdst.fillna(method='ffill', inplace=True)  # Forward fill
    historical_data_jdst.fillna(method='bfill', inplace=True)  # Backward fill if any NA values are still left
    historical_data_jdst.fillna(0, inplace=True)               # Fill remaining NA's with 0 if there are any
    # Normalize JDST data
    historical_data_jdst = normalize_data(historical_data_jdst)

    # Merge and fill missing NUGT data
    historical_data_nugt = pd.merge(all_datetimes, historical_data_nugt, on='date_time', how='left')
    historical_data_nugt.fillna(method='ffill', inplace=True)  # Forward fill
    historical_data_nugt.fillna(method='bfill', inplace=True)  # Backward fill if any NA values are still left
    historical_data_nugt.fillna(0, inplace=True)               # Fill remaining NA's with 0 if there are any
    # Normalize NUGT data
    historical_data_nugt = normalize_data(historical_data_nugt)

    # Merge sentiment data
    combined_sentiment = pd.merge(sentiment_gold, sentiment_usd, on='date_published', how='outer', suffixes=('_gold', '_usd'))
    combined_sentiment.fillna(method='ffill', inplace=True)

    # Combine stock and sentiment data
    combined_stocks = pd.merge(historical_data_jdst, historical_data_nugt, on='date_time', how='outer', suffixes=('_jdst', '_nugt'))
    final_combined_data = pd.merge(combined_stocks, combined_sentiment, left_on='date_time', right_on='date_published', how='left')
    final_combined_data.drop(columns=['date_published'], inplace=True)  # Drop duplicate date column if needed

    if final_combined_data.empty:
        sys.stderr.write("Error: Final combined data is empty.\n")
        return pd.DataFrame()

    print(f"Final combined_data size: {final_combined_data.shape}")

    latest_data_slice = pd.DataFrame()

    # Process the data in batches
    for batch_data in process_in_batches(final_combined_data, batch_size):
        latest_data_slice = batch_data.tail(1)
        dataloader = prepare_dataloaders(batch_data, _lagwindow, batch_size)
        break

    return latest_data_slice




if __name__ == '__main__':
    batch_size = 256
    latest_data_slice = process_data(batch_size)

    if latest_data_slice.empty:
        sys.stderr.write("The DataFrame is empty. Check the process_data function and ensure it's populating the DataFrame correctly.\n")
    else:
        csv_snapshot = latest_data_slice.to_csv(index=False)
        sys.stdout.write(csv_snapshot)