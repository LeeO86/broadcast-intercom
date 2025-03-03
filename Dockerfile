FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production
ENV JANUS_URL=ws://localhost:8188/

# Create data directory for SQLite database
RUN mkdir -p /app/data && \
    chmod 777 /app/data

# Run the application
CMD ["node", ".output/server/index.mjs"]