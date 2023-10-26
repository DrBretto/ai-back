import sys
import json

def count_records(data):
    # Counting the number of records
    record_count = len(data)
    return str(record_count)

if __name__ == '__main__':
    data_path = sys.argv[1]
    result_path = sys.argv[2]

    # Reading data from the file
    with open(data_path, 'r') as file:
        data = json.load(file)

    # Counting the records
    result = count_records(data)

    # Writing the result to a new file
    with open(result_path, 'w') as file:
        json.dump({"count": result}, file)

