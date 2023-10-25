import sys
import json

def process_data(data):
    count = len(data)
    print(f'Number of price points received: {count}')

if __name__ == '__main__':
    data_file = sys.argv[1]
    with open(data_file, 'r') as file:
        data = json.load(file)
    process_data(data)
