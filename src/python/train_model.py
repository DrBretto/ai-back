import sys
import json

def inspect_data(data):
    # Extracting the first line of each data section
    first_line = {
        'NUGT': {
            'historical': data['NUGT']['historical'][0] if data['NUGT']['historical'] else None,
            'realtime': data['NUGT']['realtime'][0] if data['NUGT']['realtime'] else None,
            'sentiment': data['NUGT']['sentiment'][0] if data['NUGT']['sentiment'] else None
        },
        'JDST': {
            'historical': data['JDST']['historical'][0] if data['JDST']['historical'] else None,
            'realtime': data['JDST']['realtime'][0] if data['JDST']['realtime'] else None,
            'sentiment': data['JDST']['sentiment'][0] if data['JDST']['sentiment'] else None
        }
    }
    return first_line

if __name__ == '__main__':
    data_path = sys.argv[1]
    result_path = sys.argv[2]

    # Reading data from the file
    with open(data_path, 'r') as file:
        data = json.load(file)

    # Inspecting the data
    result = inspect_data(data)

    # Writing the result to a new file
    with open(result_path, 'w') as file:
        json.dump(result, file)
