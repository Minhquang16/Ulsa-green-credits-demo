FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN apt-get update && apt-get install -y dos2unix \
    && dos2unix entrypoint.sh \
    && chmod +x entrypoint.sh

RUN npx hardhat compile

EXPOSE 8545

ENTRYPOINT ["./entrypoint.sh"]