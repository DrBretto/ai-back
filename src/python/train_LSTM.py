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
        for feature in ['closing_price_nugt', 'closing_price_jdst']:
            future_column_name = f'{feature}_future_{lead}'
            future_feature = stock_data[feature].shift(-lead).fillna(method='ffill')
            future_feature_frame = future_feature.to_frame(name=future_column_name)
            new_frames.append(future_feature_frame)
    future_data = pd.concat([stock_data] + new_frames, axis=1)
    return future_data

def create_future_price_points(stock_data, future_window=96, future_interval=15):
    new_frames = []
    for lead in range(future_interval, future_window * future_interval + 1, future_interval):
        for feature in ['closing_price_nugt', 'closing_price_jdst']:
            future_column_name = f'{feature}_future_{lead}'
            future_feature = stock_data[feature].shift(-lead).fillna(method='ffill')
            future_feature_frame = future_feature.to_frame(name=future_column_name)
            new_frames.append(future_feature_frame)
    future_data = pd.concat([stock_data] + new_frames, axis=1)
    return future_data

def create_lagged_features(stock_data, intervals, lagwindow):
    new_frames = []
    column_names = set()  # Use a set to track existing column names for uniqueness

    for interval in intervals:
        for feature in ['closing_price_nugt', 'high_price_nugt', 'low_price_nugt', 'volume_nugt', 'closing_price_jdst', 'high_price_jdst', 'low_price_jdst', 'volume_jdst']:
            for lag in range(1, lagwindow + 1):
                lagged_column_name = f'{feature}_lag_{interval * lag}'
                
                # Skip if this column name already exists
                if lagged_column_name in column_names:
                    continue

                column_names.add(lagged_column_name)  # Track the new column name

                # Create lagged feature, fill NaN values with forward fill, backward fill, and then fill any remaining NaNs with 0
                lagged_feature = stock_data[feature].shift(lag * interval).ffill().bfill().fillna(0)
                lagged_feature_frame = lagged_feature.to_frame(name=lagged_column_name)
                new_frames.append(lagged_feature_frame)
                
    lagged_data = pd.concat([stock_data] + new_frames, axis=1)
    return lagged_data

def calculate_min_max(historical_data):
    min_value = historical_data.min()
    max_value = historical_data.max()
    return min_value, max_value

def process_sentiment_data(sentiment_data):
    sentiment_data['token_values'] = sentiment_data['token_values'].apply(lambda x: list(set(x)))
    processed_sentiment = sentiment_data.groupby(['date_published', 'subject_id'], as_index=False).agg({
        'high_score': 'mean',
        'low_score': 'mean',
        'average_score': 'mean',
        'token_values': lambda x: list(set().union(*x))
    })

    print("Before aggregation,gold token values:", sentiment_data[sentiment_data['subject_id'] == 1]['token_values'])
    print("Before aggregation, USD token values:", sentiment_data[sentiment_data['subject_id'] == 2]['token_values'])


    sentiment_gold = processed_sentiment[processed_sentiment['subject_id'] == 1]
    sentiment_usd = processed_sentiment[processed_sentiment['subject_id'] == 2]

    print("Aggregated gold token values:", processed_sentiment[processed_sentiment['subject_id'] == 1]['token_values'])
    print("Aggregated USD token values:", processed_sentiment[processed_sentiment['subject_id'] == 2]['token_values'])


    # If any of the expected columns are empty, log the columns
    if sentiment_gold.isnull().any().any() or sentiment_usd.isnull().any().any():
        print("Null values found in sentiment_gold or sentiment_usd")
        print("Null columns in sentiment_gold:", sentiment_gold.columns[sentiment_gold.isnull().any()])
        print("Null columns in sentiment_usd:", sentiment_usd.columns[sentiment_usd.isnull().any()])

    return sentiment_gold, sentiment_usd

def normalize_data_in_batch(batch_data, min_values, max_values, columns_to_normalize):
    for column in columns_to_normalize:
        batch_data[column] = (batch_data[column] - min_values[column]) / (max_values[column] - min_values[column])
    return batch_data

def process_in_batches(df, jdst_min, jdst_max, nugt_min, nugt_max, batch_size, intervals=_defaultIntervals, lagwindow=_lagwindow, future_window=_future_window, future_interval=_future_interval):
    max_lag = max(intervals) * lagwindow
    future_offset = future_window * future_interval
    start_index = max_lag
    end_index = len(df) - future_offset
    columns_to_normalize_jdst = ['closing_price_jdst', 'high_price_jdst', 'low_price_jdst', 'volume_jdst']
    columns_to_normalize_nugt = ['closing_price_nugt', 'high_price_nugt', 'low_price_nugt', 'volume_nugt']
    
    for start in range(start_index, end_index, batch_size):
        end = start + batch_size
        if end > end_index:
            end = end_index  

        batch = df.iloc[(start - max_lag):end + future_offset].copy()
        batch = normalize_data_in_batch(batch, jdst_min, jdst_max, columns_to_normalize_jdst)
        batch = normalize_data_in_batch(batch, nugt_min, nugt_max, columns_to_normalize_nugt)
        batch_with_features = create_lagged_features(batch, intervals, lagwindow)
        batch_with_features = create_future_price_points(batch_with_features, future_window, future_interval)
        batch_with_features = batch_with_features.iloc[max_lag:(max_lag + batch_size)]
        
        if batch_with_features.empty:
            sys.stderr.write(f"Warning: Batch data is empty after feature creation. Start index: {start}, End index: {end}\n")
            continue 

        # Log column names after final slicing
        final_columns = batch_with_features.columns.tolist()
        sys.stderr.write(f"Final column names: {final_columns}\n")
 
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

    # Merge sentiment data
    max_length_gold = max(sentiment_gold['token_values'].apply(len))
    sentiment_gold['token_values'] = sentiment_gold['token_values'].apply(lambda x: x + [-1]*(max_length_gold - len(x)))
    max_length_usd = max(sentiment_usd['token_values'].apply(len))
    sentiment_usd['token_values'] = sentiment_usd['token_values'].apply(lambda x: x + [-1]*(max_length_usd - len(x)))

    combined_sentiment = pd.merge(sentiment_gold, sentiment_usd, on='date_published', how='outer', suffixes=('_gold', '_usd'))
    combined_sentiment['token_values_gold'] = combined_sentiment['token_values_gold'].apply(lambda x: x if isinstance(x, list) else [-1]*max_length_gold)
    combined_sentiment['token_values_usd'] = combined_sentiment['token_values_usd'].apply(lambda x: x if isinstance(x, list) else [-1]*max_length_usd)

    combined_sentiment.drop(['subject_id_gold', 'subject_id_usd'], axis=1, inplace=True)
    combined_sentiment.fillna(method='ffill', inplace=True)
    combined_sentiment.fillna(method='bfill', inplace=True)

    # Combine JDST and NUGT data
    combined_stocks = pd.merge(historical_data_jdst, historical_data_nugt, on='date_time', how='outer', suffixes=('_jdst', '_nugt'))
    combined_stocks.drop(['id_jdst', 'stock_id_jdst', 'id_nugt', 'stock_id_nugt'], axis=1, inplace=True)

    combined_stocks.sort_values('date_time', inplace=True)
    combined_sentiment.sort_values('date_published', inplace=True)

    # Merge using merge_asof
    final_combined_data = pd.merge_asof(
    combined_stocks,
    combined_sentiment,
    left_on='date_time',
    right_on='date_published',
    direction='nearest'
    )   

    final_combined_data.drop(columns=['date_published'], inplace=True)  # Drop duplicate date column

    if final_combined_data.empty:
        sys.stderr.write("Error: Final combined data is empty.\n")
        return pd.DataFrame()


    latest_data_slice = pd.DataFrame()

    jdst_columns = [col for col in final_combined_data.columns if '_jdst' in col]
    nugt_columns = [col for col in final_combined_data.columns if '_nugt' in col]

    jdst_min, jdst_max = calculate_min_max(final_combined_data[jdst_columns])
    nugt_min, nugt_max = calculate_min_max(final_combined_data[nugt_columns])

    print("final_combined_data shape:", final_combined_data.shape)

    # Process the data in batches, passing min and max values for normalization
    for batch_data in process_in_batches(final_combined_data, jdst_min, jdst_max, nugt_min, nugt_max, batch_size):
        latest_data_slice = batch_data.tail(1)
        dataloader = prepare_dataloaders(batch_data, _lagwindow, batch_size)

        break

    return latest_data_slice



# In your main block
if __name__ == '__main__':
    batch_size = 256
    latest_data_slice = process_data(batch_size)

    if latest_data_slice.empty:
        sys.stderr.write("The DataFrame is empty. Check the process_data function and ensure it's populating the DataFrame correctly.\n")
    else:
        # Print out the full DataFrame to manually scan for NaNs
        for index, row in latest_data_slice.iterrows():
            formatted_row = f"Index {index}:\n" + "\n".join(
                f"{col}: {row[col]}" for col in latest_data_slice.columns
            )
            sys.stdout.write(formatted_row + "\n\n")

