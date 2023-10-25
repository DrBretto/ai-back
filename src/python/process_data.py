import sys
import json

def process_data(data):
    print(len(data))

if __name__ == '__main__':
    file_path = sys.argv[1]
    with open(file_path, 'r') as file:
        data = json.load(file)
        process_data(data)
