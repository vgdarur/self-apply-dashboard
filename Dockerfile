FROM node:20-bullseye-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.cjs"]
