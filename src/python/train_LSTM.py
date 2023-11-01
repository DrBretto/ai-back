import torch
import torch.nn as nn
from torch.autograd import Variable
import psycopg2
import pandas as pd
import numpy as np
import os
from torch.utils.data import TensorDataset, DataLoader

class SimpleLSTM(nn.Module):
    def __init__(self, input_size=1, hidden_layer_size=100, output_size=1):
        super().__init__()
        self.hidden_layer_size = hidden_layer_size

        self.lstm = nn.LSTM(input_size, hidden_layer_size)

        self.linear = nn.Linear(hidden_layer_size, output_size)

        self.hidden_cell = (torch.zeros(1,1,self.hidden_layer_size),
                            torch.zeros(1,1,self.hidden_layer_size))

    def forward(self, input_seq):
        lstm_out, self.hidden_cell = self.lstm(input_seq.view(len(input_seq) ,1, -1), self.hidden_cell)
        predictions = self.linear(lstm_out.view(len(input_seq), -1))
        return predictions[-1]

def get_data_from_db():
    # Obtain DB credentials from environment variables
    db_config = {
        'dbname': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASSWORD'],
        'host': os.environ['DB_HOST']
    }
    with psycopg2.connect(**db_config) as conn:
        # Fetch only the first row from each table
        historical_data = pd.read_sql('SELECT * FROM stockhistory LIMIT 1', conn, parse_dates=['date_time'])
        realtime_data = pd.read_sql('SELECT * FROM stockrealtime LIMIT 1', conn, parse_dates=['date_time'])
        sentiment_data = pd.read_sql('SELECT * FROM sentiment_analysis LIMIT 1', conn, parse_dates=['date_published'])

        # Convert to ISO 8601 format
        historical_data['date_time'] = historical_data['date_time'].dt.strftime('%Y-%m-%dT%H:%M:%S')
        realtime_data['date_time'] = realtime_data['date_time'].dt.strftime('%Y-%m-%dT%H:%M:%S')
        sentiment_data['date_published'] = sentiment_data['date_published'].dt.strftime('%Y-%m-%dT%H:%M:%S')

    return historical_data, realtime_data, sentiment_data


def preprocess_data():
    historical_data, realtime_data, sentiment_data = get_data_from_db()

    # Sorting data by date
    historical_data.sort_values(by='date_time', inplace=True)
    realtime_data.sort_values(by='date_time', inplace=True)
    sentiment_data.sort_values(by='date_published', inplace=True)

    # Assuming 'price' is what we want to predict
    X_data = historical_data.drop('closing_price', axis=1)  
    y_data = historical_data['closing_price']
    
    split_idx = int(len(X_data) * 0.8)  # 80% training, 20% testing
    X_train, X_test = X_data[:split_idx], X_data[split_idx:]
    y_train, y_test = y_data[:split_idx], y_data[split_idx:]
    
    tensor_x = torch.Tensor(X_train.values.astype(np.float32))  # transform to torch tensor
    tensor_y = torch.Tensor(y_train.values.astype(np.float32))

    dataset = TensorDataset(tensor_x, tensor_y)  # create your dataset
    dataloader = DataLoader(dataset, batch_size=256)  # create your dataloader

    return dataloader



if __name__ == '__main__':
    dataloader = preprocess_data()
    model = SimpleLSTM()
    loss_function = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    epochs = 150
    for i in range(epochs):
        for seq, labels in dataloader:
            optimizer.zero_grad()
            model.hidden_cell = (torch.zeros(1, 1, model.hidden_layer_size),
                            torch.zeros(1, 1, model.hidden_layer_size))

            y_pred = model(seq)

            single_loss = loss_function(y_pred, labels)
            single_loss.backward()
            optimizer.step()

            if i%25 == 1:
                print(f'Epoch {i} Iteration loss: {single_loss.item()}')

    print('Data handled successfully')



