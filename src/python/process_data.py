import sys
import json

def process_data(data):
    print(len(data))

if __name__ == '__main__':
    data_str = sys.argv[1]
    data = json.loads(data_str)
    process_data(data)
