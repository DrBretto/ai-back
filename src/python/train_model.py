import sys
import pandas as pd
import json

def inspect_data(historical_path, realtime_path, sentiment_path):
    # Reading data from the CSV files
    historical_data = pd.read_csv(historical_path)
    realtime_data = pd.read_csv(realtime_path)
    sentiment_data = pd.read_csv(sentiment_path)

    # Filtering data by stock_id or subject_id
    nugt_historical = historical_data[historical_data['stock_id'] == 1]
    jdst_historical = historical_data[historical_data['stock_id'] == 2]

    nugt_realtime = realtime_data[realtime_data['stock_id'] == 1]
    jdst_realtime = realtime_data[realtime_data['stock_id'] == 2]

    nugt_sentiment = sentiment_data[sentiment_data['subject_id'] == 2]
    jdst_sentiment = sentiment_data[sentiment_data['subject_id'] == 1]

    # Extracting the first line of each data section
    first_line = {
        'NUGT': {
            'historical': nugt_historical.iloc[0].to_dict() if not nugt_historical.empty else None,
            'realtime': nugt_realtime.iloc[0].to_dict() if not nugt_realtime.empty else None,
            'sentiment': nugt_sentiment.iloc[0].to_dict() if not nugt_sentiment.empty else None
        },
        'JDST': {
            'historical': jdst_historical.iloc[0].to_dict() if not jdst_historical.empty else None,
            'realtime': jdst_realtime.iloc[0].to_dict() if not jdst_realtime.empty else None,
            'sentiment': jdst_sentiment.iloc[0].to_dict() if not jdst_sentiment.empty else None
        }
    }
    return first_line

if __name__ == '__main__':
    if len(sys.argv) != 5:
        print("Usage: python train_model.py <historical_path> <realtime_path> <sentiment_path> <result_path>")
        sys.exit(1)

    historical_path = sys.argv[1]
    realtime_path = sys.argv[2]
    sentiment_path = sys.argv[3]
    result_path = sys.argv[4]

    # Inspecting the data
    result = inspect_data(historical_path, realtime_path, sentiment_path)

    # Writing the result to a new file
    with open(result_path, 'w') as file:
        json.dump(result, file)
