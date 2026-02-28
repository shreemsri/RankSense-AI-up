FROM node:18-alpine

WORKDIR /app

# Copy package management files
COPY package.json package-lock.json* ./

# Install dependencies based on lockfile availability
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else npm config set legacy-peer-deps true && npm install; \
  fi

# Copy the rest of the application
COPY . .

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
