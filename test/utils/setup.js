const { BigNumber } = ethers;

// MemberToken Params
const MEMBER_TOKEN_NAME = 'Member';
const MEMBER_TOKEN_SYMBOL = 'MEMBER';
// total supply 100Million, taking into account 1e18 decimals
const MEMBER_TOKEN_TOTAL_SUPPLY = BigNumber.from(10000000).mul(ethers.constants.WeiPerEther);

const URI = 'http://localhost:3000';
const NFT_COST = 1000;
const NFT_ID = 0;

deploy = async () => {
  memberTokenFactory = await ethers.getContractFactory('MemberToken');
  memberToken = await memberTokenFactory.deploy(
    MEMBER_TOKEN_NAME,
    MEMBER_TOKEN_SYMBOL,
    MEMBER_TOKEN_TOTAL_SUPPLY
  );
  await memberToken.deployed();

  memberNFTFactory = await ethers.getContractFactory('MemberNFT');
  memberNFT = await memberNFTFactory.deploy(
    URI
  );
  await memberNFT.deployed();

  farmFactory = await ethers.getContractFactory('Farm');
  // simple deployment of farm and rewarding the same token (ie. BACON)
  farm = await farmFactory.deploy(memberToken.address, memberToken.address);
  await farm.deployed()

  await memberNFT.grantRole(ethers.utils.id("MINTER_ROLE"), farm.address);
  await memberNFT.grantRole(ethers.utils.id("BURNER_ROLE"), farm.address);

  await farm.grantRole(ethers.utils.id("TRANSFER_ROLE"), memberNFT.address)
  await farm.setNFTDetails([memberNFT.address], [NFT_ID], [NFT_COST]);

  return { memberToken, memberNFT, farm };
};

module.exports = {
  deploy,
  URI,
  NFT_COST,
  NFT_ID
};
