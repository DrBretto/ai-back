DROP TABLE IF EXISTS users, Stocks, StockHistory;

CREATE TABLE users (
    id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL UNIQUE,
    date_created TIMESTAMP DEFAULT now() NOT NULL,
    date_modified TIMESTAMP
);

CREATE TABLE Stocks (
    stock_id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE StockHistory (
    history_id SERIAL PRIMARY KEY,
    stock_id INT REFERENCES Stocks(stock_id),
    date_time TIMESTAMPTZ NOT NULL,
    closing_price DECIMAL(10, 4) NOT NULL,
    high_price DECIMAL(10, 4) NOT NULL,
    low_price DECIMAL(10, 4) NOT NULL,
    volume INT NOT NULL,
    UNIQUE(stock_id, date_time)
);

CREATE TABLE StockRealtime (
    history_id SERIAL PRIMARY KEY,
    stock_id INT REFERENCES Stocks(stock_id),
    date_time TIMESTAMPTZ NOT NULL,
    closing_price DECIMAL(10, 4) NOT NULL,
    high_price DECIMAL(10, 4) NOT NULL,
    low_price DECIMAL(10, 4) NOT NULL,
    volume INT NOT NULL,
    UNIQUE(stock_id, date_time)
);