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
import holidays
import torch
import torch.nn as nn
import io 

# Define the window and intervals outside of the function
_lagwindow = 30
_defaultIntervals = [1, 15, 60, 1440]
_future_window = 96
_future_interval = 15
us_holidays = holidays.US()

class FinancialLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super(FinancialLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM layer
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        
        # Fully connected layer
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, input_data):
        # Check if input_data is a list and convert elements of the list to tensors
        print(f"Input tensor shape forward: {input_data.shape}")
        print(f"Input tensor dtype forward: {input_data.dtype}")

        # Initialize hidden state with zeros
        h0 = torch.zeros(self.num_layers, input_data.size(0), self.hidden_size)
        # Initialize cell state
        c0 = torch.zeros(self.num_layers, input_data.size(0), self.hidden_size)

        # Log the shapes of input tensors
        print(f"Input tensor shape: {input_data.shape}")
        print(f"Input tensor dtype: {input_data.dtype}")

        # Forward propagate LSTM
        out, _ = self.lstm(input_data, (h0, c0))  # out: tensor of shape (batch_size, seq_length, hidden_size)

        # Log the shape of the LSTM output
        print(f"LSTM output shape: {out.shape}")

        # Decode the hidden state of the last time step
        out = self.fc(out[:, -1, :])

        # Log the shape of the final output
        print(f"Final output shape: {out.shape}")

        return out




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

    sentiment_gold = processed_sentiment[processed_sentiment['subject_id'] == 1]
    sentiment_usd = processed_sentiment[processed_sentiment['subject_id'] == 2]

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

    df['date_time'] = pd.to_datetime(df['date_time'])  

    for start in range(start_index, end_index, batch_size):
        end = start + batch_size
        if end > end_index:
            end = end_index  

        batch = df.iloc[(start - max_lag):end + future_offset].copy()
        batch = add_time_features(batch)  
        batch = normalize_data_in_batch(batch, jdst_min, jdst_max, columns_to_normalize_jdst)
        batch = normalize_data_in_batch(batch, nugt_min, nugt_max, columns_to_normalize_nugt)
        batch_with_features = create_lagged_features(batch, intervals, lagwindow)
        batch_with_features = create_future_price_points(batch_with_features, future_window, future_interval)
        batch_with_features = batch_with_features.iloc[max_lag:(max_lag + batch_size)]
        batch_with_features.drop(columns=['date_time'], inplace=True)

        if batch_with_features.empty:
            sys.stderr.write(f"Warning: Batch data is empty after feature creation. Start index: {start}, End index: {end}\n")
            continue 

        # Dynamically determine label columns and use the rest as features
        label_columns = [col for col in batch_with_features.columns if 'future_' in col]
        input_columns = [col for col in batch_with_features.columns if col not in label_columns]

        # Now split the batch into input and label data
        input_data = batch_with_features[input_columns]
        label_data = batch_with_features[label_columns]

        # Extract columns with tokenized data
        token_values_gold = input_data['token_values_gold'].tolist()
        token_values_usd = input_data['token_values_usd'].tolist()

        # Log the dtype of token_values_gold and token_values_usd
        print(f"Dtype of token_values_gold: {type(token_values_gold[0])}")
        print(f"Dtype of token_values_usd: {type(token_values_usd[0])}")


        # Drop the token columns from the original batch to handle the rest
        non_token_data = input_data.drop(columns=['token_values_gold', 'token_values_usd'])

        # Process non-token data
        non_token_tensor = torch.tensor(non_token_data.values, dtype=torch.float32)

        # Log the dtype of non_token_tensor
        print(f"Dtype of non_token_tensor: {non_token_tensor.dtype}")

        # Process tokenized data
        token_values_gold_tensors = [torch.tensor(t, dtype=torch.float32) for t in token_values_gold]
        token_values_usd_tensors = [torch.tensor(t, dtype=torch.float32) for t in token_values_usd]

        token_values_gold_tensor = torch.stack(token_values_gold_tensors)
        token_values_usd_tensor = torch.stack(token_values_usd_tensors)

        # Log the dtype of token_values_gold_tensor and token_values_usd_tensor
        print(f"Dtype of token_values_gold_tensor: {token_values_gold_tensor.dtype}")
        print(f"Dtype of token_values_usd_tensor: {token_values_usd_tensor.dtype}")

        # Combine all tensors
        input_tensor = torch.cat((non_token_tensor, token_values_gold_tensor, token_values_usd_tensor), dim=1)
        # Log the dtype of input_tensor
        print(f"Dtype of input_tensor: {input_tensor.dtype}")

        label_tensor = torch.tensor(label_data.values, dtype=torch.float32)

        print(f"Shape of label_tensor: {label_tensor.shape}, dtype: {label_tensor.dtype}")
        print(f"Input tensor shape: {input_tensor.shape}, dtype: {input_tensor.dtype}")

        yield (input_tensor, label_tensor)

def add_time_features(df):
    # Add basic time features
    df['year'] = df['date_time'].dt.year
    df['month'] = df['date_time'].dt.month
    df['day'] = df['date_time'].dt.day
    df['day_of_week'] = df['date_time'].dt.dayofweek
    df['hour'] = df['date_time'].dt.hour
    df['minute'] = df['date_time'].dt.minute

    # Identify weekends
    df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)

    # Identify holidays
    df['is_holiday'] = df['date_time'].apply(lambda x: 1 if x in us_holidays else 0)
    
    return df

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

def train_model(model, input_data_tensor, label_data_tensor, criterion, optimizer, num_epochs):
    model.train()
    for epoch in range(num_epochs):
        outputs = model(input_data_tensor)
        loss = criterion(outputs, label_data_tensor)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        print(f'Epoch [{epoch+1}/{num_epochs}], Loss: {loss.item():.4f}')

def save_model_parameters(model, db_config):
    # Serialize model state to a byte stream
    byte_stream = io.BytesIO()
    torch.save(model.state_dict(), byte_stream)
    byte_stream.seek(0)
    
    with psycopg2.connect(**db_config) as conn:
        with conn.cursor() as cursor:
            # Save the byte stream as binary data in the database
            cursor.execute('INSERT INTO model_parameters (parameters) VALUES (%s)', (byte_stream.getvalue(),))
            conn.commit()

def load_model_parameters(model_id, model, db_config):
    with psycopg2.connect(**db_config) as conn:
        with conn.cursor() as cursor:
            cursor.execute('SELECT parameters FROM model_parameters WHERE id = %s', (model_id,))
            result = cursor.fetchone()
            if result:
                byte_stream = io.BytesIO(result[0])
                byte_stream.seek(0)
                # Deserialize state dict and load into model
                model.load_state_dict(torch.load(byte_stream, map_location=torch.device('cpu')))
            else:
                raise ValueError('No model parameters found in the database for the provided model_id.')

def get_or_initialize_model(model_id, input_size, hidden_size, num_layers, output_size):
    # Database configuration from environment variables
    db_config = {
        'dbname': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASSWORD'],
        'host': os.environ['DB_HOST']
    }

    model = FinancialLSTM(input_size, hidden_size, num_layers, output_size)
    if model_id is not None:
        try:
            with psycopg2.connect(**db_config) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT parameters FROM model_parameters WHERE id = %s", (model_id,))
                    result = cursor.fetchone()
                    if result is not None:
                        byte_stream = io.BytesIO(result[0])
                        byte_stream.seek(0)
                        # Deserialize state dict and load into model
                        model.load_state_dict(torch.load(byte_stream, map_location=torch.device('cpu')))
                        print(f"Model parameters loaded for model_id: {model_id}")
                    else:
                        print("No existing model parameters found. Initializing new model.")
        except Exception as e:
            print(f"Error accessing the database: {e}")
            # Handle error accordingly. You may want to re-raise the error or handle it in some way.
    else:
        print("No model_id provided. Initializing new model.")

    return model

def adjust_token_values_length(token_values, max_length):
    if len(token_values) > max_length:
        return token_values[:max_length]  # Truncate the list if it's too long
    else:
        return token_values + [-1] * (max_length - len(token_values))  # Pad the list if it's too short

def process_data(batch_size):
    historical_data_jdst, historical_data_nugt, sentiment_gold, sentiment_usd = get_data_from_db()

    if historical_data_jdst.empty or historical_data_nugt.empty:
        sys.stderr.write("Error: One or more stock datasets from the database are empty.\n")
        return pd.DataFrame()

    max_length_gold = 100
    max_length_usd = 100

    # Applying the adjustment to the sentiment dataframes
    sentiment_gold['token_values'] = sentiment_gold['token_values'].apply(
        lambda x: adjust_token_values_length(x, max_length_gold))

    sentiment_usd['token_values'] = sentiment_usd['token_values'].apply(
        lambda x: adjust_token_values_length(x, max_length_usd))



    # Right after the aggregation
    max_length_observed_gold = sentiment_gold['token_values'].str.len().max()
    max_length_observed_usd = sentiment_usd['token_values'].str.len().max()

    print(f"Max length observed for gold: {max_length_observed_gold}")
    print(f"Max length observed for USD: {max_length_observed_usd}")

    if max_length_observed_gold > max_length_gold or max_length_observed_usd > max_length_usd:
        print("Observed token_values lists longer than expected maximum lengths.")
        # Optionally, raise an error to halt the process and inspect the data
        # raise ValueError("token_values lists longer than expected maximum lengths found.")

    # Before padding, add a check for any lists that are already longer than the max_length
    over_length_gold = sentiment_gold[sentiment_gold['token_values'].str.len() > max_length_gold]
    over_length_usd = sentiment_usd[sentiment_usd['token_values'].str.len() > max_length_usd]

    if not over_length_gold.empty or not over_length_usd.empty:
        print("Found token_values lists longer than the maximum length before padding:")
        print(over_length_gold)
        print(over_length_usd)
        # Again, you can raise an error here to inspect the problematic rows
        # raise ValueError("Found token_values lists longer than the maximum length before padding.")

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
    final_combined_data.reset_index(drop=True, inplace=True)

    if final_combined_data.empty:
        sys.stderr.write("Error: Final combined data is empty.\n")
        return pd.DataFrame()

    jdst_columns = [col for col in final_combined_data.columns if '_jdst' in col]
    nugt_columns = [col for col in final_combined_data.columns if '_nugt' in col]

    jdst_min, jdst_max = calculate_min_max(final_combined_data[jdst_columns])
    nugt_min, nugt_max = calculate_min_max(final_combined_data[nugt_columns])

    print("final_combined_data shape:", final_combined_data.shape)

    input_size = 1102
    output_size = 192
    hidden_size = 1000  
    num_layers = 2  
    model_id=None
    
    model = get_or_initialize_model(model_id, input_size, hidden_size, num_layers, output_size)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    # Train in batches using DataLoader
    for input_tensor, label_tensor in process_in_batches(final_combined_data, jdst_min, jdst_max, nugt_min, nugt_max, batch_size):
        
        input_dataset = TensorDataset(input_tensor)
        label_dataset = TensorDataset(label_tensor)
            
        input_dataloader = DataLoader(input_dataset, batch_size=batch_size, shuffle=False)
        label_dataloader = DataLoader(label_dataset, batch_size=batch_size, shuffle=False)

        train_model(model, input_dataloader, label_dataloader, criterion, optimizer, num_epochs=10)

    return model


if __name__ == '__main__':
    batch_size = 256
    trained_model = process_data(batch_size)
    
    db_config = {
        'dbname': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASSWORD'],
        'host': os.environ['DB_HOST']
    }

    save_model_parameters(trained_model, db_config)
    print("Model parameters saved to the database.")

