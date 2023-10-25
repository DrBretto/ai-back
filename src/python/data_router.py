from flask import Blueprint, request, jsonify
import data_preprocessing
import LSTM_model

data_router = Blueprint('data_router', __name__)

@data_router.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    preprocessed_data = data_preprocessing.preprocess(data)
    prediction = LSTM_model.predict(preprocessed_data)
    return jsonify(prediction)
