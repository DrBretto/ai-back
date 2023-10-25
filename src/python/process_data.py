import sys
import json

def process_data(data):
    print(f'Data read from file: {data}')
    print(len(data))

if __name__ == '__main__':
    with open(sys.argv[1], 'r') as file:
        data = json.load(file)  # This line reads the data as JSON, which will be a list in Python
        process_data(data)

