import requests
import json

def main():
    url = 'http://localhost:8000/api/data'
    print(f'URL: {url}')  # Log the URL
    response = requests.get(url)
    print(f'Response text: {response.text}')  # Log the response text
    try:
        data = response.json()
    except json.decoder.JSONDecodeError as e:
        print(f'JSON Decode Error: {e}')
        return
    # Assuming the rest of your code processes the data and computes a result
    result = process_data(data)  # replace with your processing function
    print(f'Result: {result}')

def process_data(data):  # replace with your actual processing function
    # ... processing logic
    count = len(data)  # example processing: count the number of data points
    return count

if __name__ == '__main__':
    main()
