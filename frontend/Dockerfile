FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies including lightweight-charts
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variables
ENV REACT_APP_API_URL=http://localhost:8000/api

# For development mode (used by docker-compose)
CMD ["npm", "start"]

# Build the app for production (used in production mode)
# This section will run in standalone/production mode
FROM node:18-alpine as production

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install lightweight-charts@^4.1.1

# Copy the rest of the application
COPY . .

# Build the app
RUN npm run build

# Install serve to run the application
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Start the application using serve
CMD ["serve", "-s", "build", "-l", "3000", "--single"]