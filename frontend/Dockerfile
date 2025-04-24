FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies including lightweight-charts
RUN npm install
RUN npm install lightweight-charts@^4.1.1

# Copy the rest of the application
COPY . .

# Set environment variables
ENV REACT_APP_API_URL=http://localhost:8000/api

# Build the app for production (used in production mode)
RUN npm run build

# Install serve to run the application in production mode
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Default to production mode
# Start the application using serve (for production)
# This will be overridden by docker-compose for development
CMD ["serve", "-s", "build", "-l", "3000", "--single"]