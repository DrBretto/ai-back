import sys
import json

def process_data(data):
    print(len(data))

if __name__ == '__main__':
    with open(sys.argv[1], 'r') as file:
        data_str = file.read()
        data = json.loads(data_str)  # Parse the string back into a JSON object
        process_data(data)
