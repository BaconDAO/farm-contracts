const { BigNumber } = ethers;

// MemberToken Params
const MEMBER_TOKEN_NAME = 'Member';
const MEMBER_TOKEN_SYMBOL = 'MEMBER';
const MEMBER_TOKEN_TOTAL_SUPPLY = 10000000;

const URI = 'http://localhost:3000';

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

  // set memberToken contract as a minter in memberNFT contract
  await memberNFT.setMinterRole(launchpad.address);

  return { memberToken, memberNFT, usdToken, whitelist, launchpad };
};

module.exports = {
  deploy,
  URI
};
