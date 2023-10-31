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
        # Load data from database
        historical_data = pd.read_sql('SELECT * FROM historical_data', conn)
        realtime_data = pd.read_sql('SELECT * FROM realtime_data', conn)
        sentiment_data = pd.read_sql('SELECT * FROM sentiment_data', conn)

        # Convert Timestamp objects to string
        historical_data = historical_data.applymap(lambda x: x.isoformat() if isinstance(x, pd.Timestamp) else x)
        realtime_data = realtime_data.applymap(lambda x: x.isoformat() if isinstance(x, pd.Timestamp) else x)
        sentiment_data = sentiment_data.applymap(lambda x: x.isoformat() if isinstance(x, pd.Timestamp) else x)

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
