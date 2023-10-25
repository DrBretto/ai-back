from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/process-prices', methods=['POST'])
def process_prices():
    data = request.json
    count = len(data)
    return jsonify({"count": count})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
