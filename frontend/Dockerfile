FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5175

# Command to run Vite in dev mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]
