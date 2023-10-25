from flask import Flask
from data_router import data_router

app = Flask(__name__)
app.register_blueprint(data_router, url_prefix='/api/data')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
