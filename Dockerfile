FROM node:20-slim

WORKDIR /app

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Install server dependencies (production only)
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/

ENV PORT=3001
EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
