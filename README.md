# Trading Bias Test App

A modern application for testing your ability to predict price movements in various financial assets including cryptocurrencies and equities.

## Architecture

This application uses:
- **FastAPI** backend for API endpoints and data processing
- **React** frontend for user interface
- **PostgreSQL** database for storing asset data and test results
- **Redis** for caching API responses
- **Docker Compose** for local development and deployment

## Features

- Test your bias prediction skills for multiple assets
- View detailed results with setup and outcome charts
- Track your performance over time
- Support for both cryptocurrencies and equities

## Project Structure

```
trading-bias-app/
├── backend/               # FastAPI application
│   ├── app/                 # Application code
│   │   ├── api/               # API endpoints
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   ├── main.py            # FastAPI entry point
│   │   ├── database.py        # Database connection
│   │   └── config.py          # Configuration
│   ├── requirements.txt     # Dependencies
│   └── Dockerfile           # Backend Dockerfile
├── frontend/              # React application
│   ├── src/                 # React source code
│   │   ├── components/        # UI components
│   │   ├── services/          # API services
│   │   ├── App.js             # Main component
│   │   └── index.js           # Entry point
│   ├── package.json         # Dependencies
│   └── Dockerfile           # Frontend Dockerfile
└── docker-compose.yml     # Docker Compose configuration
```

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Running the Application

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/trading-bias-app.git
   cd trading-bias-app
   ```

2. Start the application:
   ```bash
   docker-compose up
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Development

- Backend code is in the `backend/` directory
- Frontend code is in the `frontend/` directory
- Both have hot-reloading enabled for development

## API Endpoints

- `GET /api/assets` - List all available assets
- `GET /api/test/{asset_symbol}` - Get test data for an asset
- `POST /api/test/{asset_symbol}` - Submit test answers and get results

## Database Schema

- `assets` - Asset information (symbol, name, type)
- `price_data` - OHLC data for assets
- `test_data` - Test questions and correct answers
- `user_results` - User test submissions and scores

## Data Sources

- Cryptocurrencies: CoinGecko API
- Equities: Alpha Vantage API

## License

This project is licensed under the MIT License - see the LICENSE file for details.