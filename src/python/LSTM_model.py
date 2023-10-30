import tensorflow as tf

def build_model(input_shape):
    model = tf.keras.models.Sequential([
        tf.keras.layers.LSTM(50, return_sequences=True, input_shape=input_shape),
        tf.keras.layers.LSTM(50),
        tf.keras.layers.Dense(1)
    ])
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model

def train_model(model, train_data, train_labels, val_data=None, val_labels=None):
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint('model.h5', save_best_only=True, save_weights_only=True),
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)
    ]
    history = model.fit(
        train_data, train_labels, 
        epochs=100, 
        batch_size=32, 
        validation_data=(val_data, val_labels) if val_data and val_labels else None,
        callbacks=callbacks
    )
    return history


def make_prediction(model, input_data):
    prediction = model.predict(input_data)
    return prediction


def load_model(model_path, input_shape):
    model = build_model(input_shape)
    model.load_weights(model_path)
    return model

# Usage:
# model = load_model('model.h5', input_shape)
# train_model(model, new_train_data, new_train_labels, ...)



