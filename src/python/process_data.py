import sys
import json

def process_data(data):
    print(len(data))

if __name__ == '__main__':
    with open(sys.argv[1], 'r') as file:
        data = json.load(file)
        # Log length of data read from file and first few data points
        print(f'Length of data read from file: {len(data)}')
        print(f'First 10 data points read from file: {data[:10]}')  
        process_data(data)
