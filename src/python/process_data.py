import sys
import json

def process_data(data):
    # Log the received data to understand its structure
    print("Received data:")
    print(json.dumps(data, indent=4))
    
    count = len(data)  # Count the data points
    result = {"count": count}
    
    # Write the result to a results file
    with open('results.json', 'w') as result_file:
        json.dump(result, result_file)

if __name__ == '__main__':
    data_file = sys.argv[1]
    with open(data_file, 'r') as file:
        data = json.load(file)
    process_data(data)
