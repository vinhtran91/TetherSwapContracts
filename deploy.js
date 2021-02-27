const { ethers, Wallet, ContractFactory } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const YFTetherArtifact = "./prodartifacts/YFTether.json";
const TetherswapRouterArtifact = "./prodartifacts/TetherswapRouter.json";
const TetherswapPairArtifact = "./prodartifacts/TetherswapPair.json";
const TetherswapPriceOracleArtifact =
  "./prodartifacts/TetherswapPriceOracle.json";
const TetherswapFactoryArtifact = "./prodartifacts/TetherswapFactory.json";

let wethToken,
  usdtToken,
  yftetherToken,
  uniswapFactory,
  usdtEthChainlinkOracle,
  wethUsdChainlinkOracle,
  TetherswapRouterAddress,
  TetherswapPriceOracleAddress,
  TetherswapPairAddress,
  TetherswapFactoryAddress;

let provider, wallet, connectedWallet;

if (process.env.NETWORK == "mainnet") {
  provider = new ethers.providers.InfuraProvider(
    "homestead",
    process.env.INFURA_APIKEY
  );
  yftetherToken = "0x94f31ac896c9823d81cf9c2c93feceed4923218f";
  usdtToken = "0xdac17f958d2ee523a2206206994597c13d831ec7";
  wethToken = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  usdtEthChainlinkOracle = "0xa874fe207df445ff19e7482c746c4d3fd0cb9ace"; // https://market.link/feeds/5e09222d-1148-4314-9862-61f4752ec53d?network=1
  wethUsdChainlinkOracle = "0xF79D6aFBb6dA890132F9D7c355e3015f15F3406F";
  uniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  TetherswapPairAddress = "0x60B3e9B03B9Fa9F8bF5948D4275B9355A9c4eB13";
  TetherswapPriceOracleAddress = "0x61edc745eDD8c5A3df1625Fd38BEe3a073aA4171";
  TetherswapFactoryAddress = "0xA31850f20A70102fC7378810c4b60Ff858631c16";
  TetherswapRouterAddress = "0x3dc429e4F888068B4df6ac4D72048D9B59D8158B";
} else if (process.env.NETWORK == "ropsten") {
  // provider = ethers.getDefaultProvider(
  //   "https://ropsten.infura.io/v3/" + process.env.INFURA_APIKEY
  // );
  provider = new ethers.providers.InfuraProvider(
    "ropsten",
    process.env.INFURA_APIKEY
  );
  usdtToken = "0xb404c51bbc10dcbe948077f18a4b8e553d160084"; // USDT Token on Ropsten
  wethToken = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
  yftetherToken = "0x42ecE4692c515e959B3631479e16a4C60461bFa2"; // Deployed
  uniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  usdtEthChainlinkOracle = "0xc08fe0c4d97ccda6b40649c6da621761b628c288"; // https://market.link/feeds/f769de02-793c-450a-9085-78549589f551
  wethUsdChainlinkOracle = "0x4a504064996f695dd8add2452645046289c4811c"; // https://market.link/feeds/750c5ec1-d7ef-4979-90f6-48b2413b742c
  TetherswapPairAddress = "0x4a4cCfcD2975bA8089444AE74F8304EEA88c74C1";
  TetherswapPriceOracleAddress = "0x5C31fC8e8230D27C45C1C4E9ED2B9CDAe6c7cf47";
  TetherswapFactoryAddress = "0x4732aeFa1f4501E740140B1d7343f5B4f4B56A03";
  TetherswapRouterAddress = "0x032E38ffBe6eBa7493734Cb59840594cF0bB9B02";
}

wallet = Wallet.fromMnemonic(process.env.MNEMONIC);
connectedWallet = wallet.connect(provider);

// Test addresses
const governance = process.env.GOVERNANACE_ADDRESS;
const treasury = process.env.TREASURY_ADDRESS;
const usdtListingFeeInUsd = 2500 * 100000000;
const wethListingFeeInUsd = 3000 * 100000000;
const yfteListingFeeInUsd = 2000 * 100000000;
const treasuryListingFeeShare = 100000;
const minListingLockupAmountInUsd = 5000 * 100000000;
const targetListingLockupAmountInUsd = 25000 * 100000000;
const minListingLockupPeriod = 7 * 24 * 60 * 60;
const targetListingLockupPeriod = 30 * 24 * 60 * 60;
const lockupAmountListingFeeDiscountShare = 500000;

const unpackArtifact = (artifactPath) => {
  let contractData = JSON.parse(fs.readFileSync(artifactPath));

  const contractBytecode = contractData["bytecode"];
  const contractABI = contractData["abi"];
  const constructorArgs = contractABI.filter((itm) => {
    return itm.type == "constructor";
  });

  let constructorStr;
  if (constructorArgs.length < 1) {
    constructorStr = " -- No constructor arguments -- ";
  } else {
    constructorJSON = constructorArgs[0].inputs;
    constructorStr = JSON.stringify(
      constructorJSON.map((c) => {
        return {
          name: c.name,
          type: c.type,
        };
      })
    );
  }

  return {
    abi: contractABI,
    bytecode: contractBytecode,
    contractName: contractData.contractName,
    constructor: constructorStr,
  };
};

const deployContract = async (
  contractABI,
  contractBytecode,
  wallet,
  provider,
  args = []
) => {
  const factory = new ContractFactory(
    contractABI,
    contractBytecode,
    wallet.connect(provider)
  );
  return await factory.deploy(...args);
};

const deploy = async (artifactPath, args) => {
  try {
    let tokenUnpacked = unpackArtifact(artifactPath);
    console.log(
      `${tokenUnpacked.contractName} \n Constructor: ${tokenUnpacked.constructor}`
    );
    const token = await deployContract(
      tokenUnpacked.abi,
      tokenUnpacked.bytecode,
      wallet,
      provider,
      args
    );
    console.log(`⌛ Deploying ${tokenUnpacked.contractName}...`);

    await connectedWallet.provider.waitForTransaction(
      token.deployTransaction.hash
    );
    console.log(
      `✅ Deployed ${tokenUnpacked.contractName} to ${token.address}`
    );
  } catch (err) {
    console.log("deploy ======>", err);
  }
};

// From here, all the args are to be determined.
if (!yftetherToken) {
  deploy(YFTetherArtifact);
  return;
}

if (!TetherswapPairAddress) {
  deploy(TetherswapPairArtifact);
  return;
}

if (!TetherswapPriceOracleAddress) {
  deploy(TetherswapPriceOracleArtifact, [
    uniswapFactory,
    usdtToken,
    wethToken,
    yftetherToken,
    usdtEthChainlinkOracle,
    wethUsdChainlinkOracle,
  ]);
  return;
}

if (!TetherswapFactoryAddress) {
  deploy(TetherswapFactoryArtifact, [
    governance,
    treasury,
    TetherswapPriceOracleAddress,
    usdtListingFeeInUsd,
    wethListingFeeInUsd,
    yfteListingFeeInUsd,
    treasuryListingFeeShare,
    minListingLockupAmountInUsd,
    targetListingLockupAmountInUsd,
    minListingLockupPeriod,
    targetListingLockupPeriod,
    lockupAmountListingFeeDiscountShare,
    usdtToken,
    wethToken,
    yftetherToken,
  ]);

  return;
}

if (!TetherswapRouterAddress) {
  deploy(TetherswapRouterArtifact, [TetherswapFactoryAddress, wethToken]);
  return;
}
