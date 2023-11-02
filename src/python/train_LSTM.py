import torch
import torch.nn as nn
from torch.autograd import Variable
import psycopg2
import pandas as pd
import numpy as np
import os
from torch.utils.data import TensorDataset, DataLoader
import json
import gc
import resource
import time
import sys


def log_memory_usage():
    memory_usage_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    with open('memory_log.txt', 'a') as f:  # 'a' mode for append to the log file
        print(f"Memory Usage: {memory_usage_kb / 1024} MB", file=f)



# Define the window and intervals outside of the function
lagwindow = 30
intervals = [1, 15, 60, 1440]

# Define your model class as before, no change needed here

# Modify the normalize_data function to accept min and max values
def normalize_data(df, min_vals, max_vals):
    for column in ['closing_price', 'high_price', 'low_price', 'volume']:
        df[column] = (df[column] - min_vals[column]) / (max_vals[column] - min_vals[column])
    return df

# Define a function to calculate global min and max values for normalization
def get_global_min_max(historical_data):
    min_vals = historical_data[['closing_price', 'high_price', 'low_price', 'volume']].min()
    max_vals = historical_data[['closing_price', 'high_price', 'low_price', 'volume']].max()
    return min_vals, max_vals


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


# def normalize_data(df):
#     # Perform Min-Max normalization manually using pandas
#     for column in ['closing_price', 'high_price', 'low_price', 'volume']:
#         min_column = df[column].min()
#         max_column = df[column].max()
#         df[column] = (df[column] - min_column) / (max_column - min_column)
#     return df


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


def combine_and_average_sentiments(sentiment_data):
    # Average the scores and combine the tokenized sentiments
    averaged_data = (sentiment_data
                     .groupby(['date_published', 'subject_id'])
                     .agg({'high_score': 'mean',
                           'low_score': 'mean',
                           'average_score': 'mean',
                           'tokenized_sentiments': lambda x: list(set().union(*x))})
                     .reset_index())
    return averaged_data

def process_sentiment_data(sentiment_data):
    # Separate by subject_id
    sentiment_gold = sentiment_data[sentiment_data['subject_id'] == 1]
    sentiment_usd = sentiment_data[sentiment_data['subject_id'] == 2]
    
    # Combine and average sentiments
    sentiment_gold = combine_and_average_sentiments(sentiment_gold)
    sentiment_usd = combine_and_average_sentiments(sentiment_usd)

    return sentiment_gold, sentiment_usd


def process_in_batches(df, batch_size):
    for start in range(0, len(df), batch_size):           
        log_memory_usage()
        sys.stdout.flush()
        end = min(start + batch_size, len(df))
        batch = df[start:end]
        # Normalize batch
        batch_normalized = normalize_data(batch)
        # Create lagged features for batch
        batch_with_lagged_features = create_lagged_features(batch_normalized, [1, 15, 60, 1440])
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
    global_min_vals, global_max_vals = get_global_min_max(historical_data)

    # Split the historical data into two datasets based on 'stock_id'
    historical_data_jdst = historical_data[historical_data['stock_id'] == 1]
    historical_data_nugt = historical_data[historical_data['stock_id'] == 2]

    # At this point, you would also want to ensure that the historical data
    # has a column ready for merging with sentiment data, like a normalized date column

    del chunk
    gc.collect()

    return historical_data_jdst, historical_data_nugt, sentiment_gold, sentiment_usd, global_min_vals, global_max_vals


def integrate_sentiment(stock_data, sentiment_gold, sentiment_usd):
    # Ensure that 'date_time' in stock_data is at the same granularity as 'date_published' in sentiment data
    
    # Forward-fill the sentiment data so that each stock timestamp has the latest available sentiment scores
    stock_data_with_gold = pd.merge_asof(stock_data.sort_values('date_time'), 
                                         sentiment_gold.sort_values('date_published'),
                                         left_on='date_time', right_on='date_published', 
                                         by='subject_id', direction='forward', suffixes=('', '_gold'))
    
    stock_data_with_gold_usd = pd.merge_asof(stock_data_with_gold.sort_values('date_time'), 
                                             sentiment_usd.sort_values('date_published'),
                                             left_on='date_time', right_on='date_published', 
                                             by='subject_id', direction='forward', suffixes=('', '_usd'))
    
    # Now stock_data_with_gold_usd contains both gold and USD sentiment scores for each timestamp
    return stock_data_with_gold_usd


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
    # Fetch the split data from the DB
    historical_data_jdst, historical_data_nugt, sentiment_gold, sentiment_usd, global_min_vals, global_max_vals = get_data_from_db()

    # Sort the data by date
    historical_data_jdst.sort_values(by='date_time', inplace=True)
    historical_data_nugt.sort_values(by='date_time', inplace=True)
    sentiment_gold.sort_values(by='date_published', inplace=True)
    sentiment_usd.sort_values(by='date_published', inplace=True)

    # Normalize the historical data using the global min and max values
    historical_data_jdst_normalized = normalize_data(historical_data_jdst, global_min_vals, global_max_vals)
    historical_data_nugt_normalized = normalize_data(historical_data_nugt, global_min_vals, global_max_vals)

    # Create the lagged features
    historical_data_jdst_with_features = create_lagged_features(historical_data_jdst_normalized)
    historical_data_nugt_with_features = create_lagged_features(historical_data_nugt_normalized)

    # Integrate sentiment scores with stock data
    historical_data_jdst_with_sentiment = integrate_sentiment(historical_data_jdst_with_features, sentiment_gold, sentiment_usd)
    historical_data_nugt_with_sentiment = integrate_sentiment(historical_data_nugt_with_features, sentiment_gold, sentiment_usd)

    # Add stock_id back to the datasets if not present
    historical_data_jdst_with_sentiment['stock_id'] = 1
    historical_data_nugt_with_sentiment['stock_id'] = 2

    # Combine the datasets
    combined_data = pd.concat([historical_data_jdst_with_sentiment, historical_data_nugt_with_sentiment])
    combined_data.sort_values(by='date_time', inplace=True)

    # Here we will process the combined data in batches
    for start in range(0, len(combined_data), batch_size):
        end = min(start + batch_size, len(combined_data))
        batch = combined_data.iloc[start:end].copy()
        
        # Create lagged features for batch
        batch_with_lagged_features = create_lagged_features(batch)
        
        # Prepare DataLoader for the batch
        tensor_x = torch.Tensor(batch_with_lagged_features.drop('closing_price', axis=1).values.astype(np.float32))
        tensor_y = torch.Tensor(batch_with_lagged_features['closing_price'].values.astype(np.float32))
        dataset = TensorDataset(tensor_x, tensor_y)
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=False)
        
        # Training loop can be inserted here if needed
        # ...

        # Delete the variables to free up memory
        del batch
        del batch_with_lagged_features
        del tensor_x
        del tensor_y
        del dataset
        del dataloader
        gc.collect()

    latest_data_snapshot = combined_data.tail(1)
    return latest_data_snapshot



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



# if __name__ == '__main__':
#     dataloader = process_data()
#     model = SimpleLSTM()
#     loss_function = nn.MSELoss()
#     optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

#     epochs = 150
#     for i in range(epochs):
#         for seq, labels in dataloader:
#             optimizer.zero_grad()
#             model.hidden_cell = (torch.zeros(1, 1, model.hidden_layer_size),
#                             torch.zeros(1, 1, model.hidden_layer_size))

#             y_pred = model(seq)

#             single_loss = loss_function(y_pred, labels)
#             single_loss.backward()
#             optimizer.step()

#             if i%25 == 1:
#                 print(f'Epoch {i} Iteration loss: {single_loss.item()}')

#     print(json.dumps({'message': 'Data handled successfully'}))



