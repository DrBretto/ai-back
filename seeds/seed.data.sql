INSERT INTO Stocks (symbol) VALUES ('JDST'), ('NUGT');
INSERT INTO subjects (name) VALUES ('gold'), ('dollar');
INSERT INTO sources (name) VALUES ('tradingview');


UPDATE sentiment_analysis
SET token_values = NULL;

TRUNCATE master_tokens RESTART IDENTITY CASCADE;

INSERT INTO master_tokens (term
) VALUES
('Bullish'),
('Bearish'),
('Overbought'),
('Oversold'),
('Fear/Greed Index'),
('Market Volatility (VIX)'),
('GDP Growth Rate (US)'),
('Unemployment Rate (US)'),
('Inflation Rate (US)'),
('Interest Rate (Federal Reserve Rate)'),
('Consumer Confidence Index (US)'),
('Trade Balance (US)'),
('Trade War'),
('Sanctions'),
('Political Instability (US & gold-producing regions)'),
('Military Conflict (Impacting US or gold-producing regions)'),
('Gold (Spot, Futures, ETFs, Physical)'),
('US Dollar Index (DXY)'),
('Treasury Bonds'),
('Commodities (other than gold)'),
('Mining Sector'),
('Financial Sector (US economy and dollar)'),
('Energy Sector (Oil prices)'),
('Monetary Policy (Federal Reserve decisions)'),
('Fiscal Policy (US)'),
('Trade Policy (US)'),
('Gold Reserves'),
('Exchange Rates (USD with major currencies)'),
('Federal Reserve Meetings'),
('US Economic Data Releases'),
('Gold Production and Demand Reports'),
('Blockchain (gold-backed digital assets)'),
('FinTech (forex and gold trading)'),
('Mining Regulations'),
('Sustainability (gold mining)'),
('Corporate Governance (gold mining companies)'),
('Economic Stability in major gold-buying countries'),
('Central Bank Gold Reserves');