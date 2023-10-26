import requests
import json

def main():
    # Make a request to the Node.js endpoint to get data
    response = requests.get('http://localhost:10000/api/data')
    print(f'Response status: {response.status_code}')  # Log the response status
    print(f'Response text: {response.text}')  # Log the response text
    data = response.json()

    # ... rest of your code ...


    # Count the number of price points
    count = len(data)

    # Send result to stdout
    print(json.dumps({'count': count}))

if __name__ == "__main__":
    main()
