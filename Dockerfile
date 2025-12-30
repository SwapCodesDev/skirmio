# Use Node 18 Alpine for a small footprint
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (production only if preferred, but standard install is safer for now)
RUN npm install

# Copy source code
COPY . .

# Expose the port Railway expects
EXPOSE 8080

# Define the start command
CMD [ "npm", "start" ]
