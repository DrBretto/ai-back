import sys
import json

def process_data(data):
    print(len(data))

if __name__ == '__main__':
    data = json.loads(sys.argv[1])
    process_data(data)
