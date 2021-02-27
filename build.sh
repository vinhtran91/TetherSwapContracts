#!/usr/bin/env bash
echo 'set cwd..'
cd "$(dirname "$0")"
rm -rf cache
rm -rf artifacts
echo 'flattening StakingRewardsFactory...'
npx truffle-flattener contracts/YFTether.sol | awk '/SPDX-License-Identifier/&&c++>0 {next} 1' | awk '/pragma experimental ABIEncoderV2;/&&c++>0 {next} 1' >> flattened-contracts/YFLink.sol
npx truffle-flattener contracts/TetherswapFactory.sol | awk '/SPDX-License-Identifier/&&c++>0 {next} 1' | awk '/pragma experimental ABIEncoderV2;/&&c++>0 {next} 1' >> flattened-contracts/TetherswapFactory.sol
npx truffle-flattener contracts/TetherswapPair.sol | awk '/SPDX-License-Identifier/&&c++>0 {next} 1' | awk '/pragma experimental ABIEncoderV2;/&&c++>0 {next} 1' >> flattened-contracts/TetherswapPair.sol
npx truffle-flattener contracts/TetherswapPriceOracle.sol | awk '/SPDX-License-Identifier/&&c++>0 {next} 1' | awk '/pragma experimental ABIEncoderV2;/&&c++>0 {next} 1' >> flattened-contracts/TetherswapPriceOracle.sol
npx truffle-flattener contracts/TetherswapRouter.sol | awk '/SPDX-License-Identifier/&&c++>0 {next} 1' | awk '/pragma experimental ABIEncoderV2;/&&c++>0 {next} 1' >> flattened-contracts/TetherswapRouter.sol
cd flattened-contracts
echo 'Compiling flattened contracts...'
yarn compile
echo "Copying artifacts to Prodartifacts..."
cp -rf ../artifacts/contracts/YFTether.sol/YFTether.json ../prodartifacts/YFTether.json
cp -rf ../artifacts/contracts/TetherswapFactory.sol/TetherswapFactory.json ../prodartifacts/TetherswapFactory.json
cp -rf ../artifacts/contracts/TetherswapPair.sol/TetherswapPair.json ../prodartifacts/TetherswapPair.json
cp -rf ../artifacts/contracts/TetherswapPriceOracle.sol/TetherswapPriceOracle.json ../prodartifacts/TetherswapPriceOracle.json
cp -rf ../artifacts/contracts/TetherswapRouter.sol/TetherswapRouter.json ../prodartifacts/TetherswapRouter.json
echo 'done!'
