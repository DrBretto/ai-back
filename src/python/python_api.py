from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/hello', methods=['GET'])
def hello():
    return jsonify({'message': 'Hello, world!!'})

if __name__ == '__main__':
    app.run(port=5001)  # Choose a port that doesn't conflict with your Node.js app
