import psycopg2
import pandas as pd
import os
import json
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import TimeSeriesSplit
from tensorflow import keras

Sequential = keras.models.Sequential
LSTM = keras.layers.LSTM
Dense = keras.layers.Dense
ModelCheckpoint = keras.callbacks.ModelCheckpoint

def get_data_from_db():
    # Obtain DB credentials from environment variables
    db_config = {
        'dbname': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASSWORD'],
        'host': os.environ['DB_HOST']
    }
    with psycopg2.connect(**db_config) as conn:
        # Fetch only the first row from each table
        historical_data = pd.read_sql('SELECT * FROM stockhistory LIMIT 1', conn, parse_dates=['date_time'])
        realtime_data = pd.read_sql('SELECT * FROM stockrealtime LIMIT 1', conn, parse_dates=['date_time'])
        sentiment_data = pd.read_sql('SELECT * FROM sentiment_analysis LIMIT 1', conn, parse_dates=['date_published'])

        # Convert to ISO 8601 format
        historical_data['date_time'] = historical_data['date_time'].dt.strftime('%Y-%m-%dT%H:%M:%S')
        realtime_data['date_time'] = realtime_data['date_time'].dt.strftime('%Y-%m-%dT%H:%M:%S')
        sentiment_data['date_published'] = sentiment_data['date_published'].dt.strftime('%Y-%m-%dT%H:%M:%S')

    return historical_data, realtime_data, sentiment_data


def preprocess_data(batch_size):
    historical_data, realtime_data, sentiment_data = get_data_from_db()

    # Sort data by date
    historical_data.sort_values(by='date_time', inplace=True)
    realtime_data.sort_values(by='date_time', inplace=True)
    sentiment_data.sort_values(by='date_published', inplace=True)

    # Combine and preprocess data here as needed...
    # For now, let's assume X_data and y_data are obtained from historical_data
    # Replace these lines with actual data preprocessing
    X_data = historical_data.drop('closing_price', axis=1)  # Assuming 'price' is what we want to predict
    y_data = historical_data['closing_price']

    # Split the dataset into training and testing sets
    tscv = TimeSeriesSplit()
    for train_index, test_index in tscv.split(X_data):
        X_train, X_test = X_data.iloc[train_index], X_data.iloc[test_index]
        y_train, y_test = y_data.iloc[train_index], y_data.iloc[test_index]
        
        # Process each batch
        for i in range(0, len(X_train), batch_size):
            X_batch = X_train[i:i+batch_size]
            y_batch = y_train[i:i+batch_size]
            # Further processing...
    return "Data loaded and sorted successfully"
        
if __name__ == '__main__':
    success_message = preprocess_data(batch_size=256)
    print(success_message) 