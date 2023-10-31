import psycopg2
import pandas as pd
import os
import json

def get_data_from_db():
    # Obtain DB credentials from environment variables
    db_config = {
        'dbname': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASSWORD'],
        'host': os.environ['DB_HOST']
    }
    with psycopg2.connect(**db_config) as conn:
        # Query data from database and convert date columns to pandas Timestamp objects
        historical_data = pd.read_sql('SELECT * FROM historical_data', conn, parse_dates=['date_column'])
        realtime_data = pd.read_sql('SELECT * FROM realtime_data', conn, parse_dates=['date_column'])
        sentiment_data = pd.read_sql('SELECT * FROM sentiment_data', conn, parse_dates=['date_column'])

        # Convert Timestamp objects to ISO 8601 format
        historical_data['date_column'] = historical_data['date_column'].dt.isoformat()
        realtime_data['date_column'] = realtime_data['date_column'].dt.isoformat()
        sentiment_data['date_column'] = sentiment_data['date_column'].dt.isoformat()

    return historical_data, realtime_data, sentiment_data

def inspect_data(historical_data, realtime_data, sentiment_data):
    first_line = {
        'historical': historical_data.iloc[0].to_dict() if not historical_data.empty else None,
        'realtime': realtime_data.iloc[0].to_dict() if not realtime_data.empty else None,
        'sentiment': sentiment_data.iloc[0].to_dict() if not sentiment_data.empty else None
    }
    return first_line

if __name__ == '__main__':
    historical_data, realtime_data, sentiment_data = get_data_from_db()
    result = inspect_data(historical_data, realtime_data, sentiment_data)
    print(json.dumps(result))  # Output the result so it can be captured by Node.js
