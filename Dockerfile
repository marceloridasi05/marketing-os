FROM node:20-slim

WORKDIR /app

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/

EXPOSE 3001

CMD ["node", "--import", "tsx", "server/src/index.ts"]
