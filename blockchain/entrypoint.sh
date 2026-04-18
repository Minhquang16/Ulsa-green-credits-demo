#!/bin/bash
set -e

echo "Starting Hardhat node..."
npx hardhat node --hostname 0.0.0.0 &
NODE_PID=$!

echo "Waiting for RPC..."
sleep 5 

echo "Deploying contracts..."
npx hardhat run scripts/deploy.js --network localhost

echo "Hardhat node is running (pid=$NODE_PID)."
wait $NODE_PID