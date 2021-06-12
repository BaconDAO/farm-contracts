const { BigNumber } = ethers;

// MemberToken Params
const MEMBER_TOKEN_NAME = 'Member';
const MEMBER_TOKEN_SYMBOL = 'MEMBER';
// total supply 100Million, taking into account 1e18 decimals
const MEMBER_TOKEN_TOTAL_SUPPLY = BigNumber.from(10000000).mul(ethers.constants.WeiPerEther);

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

  stakingFactory = await ethers.getContractFactory('Staking');
  // simple deployment of staking and rewarding the same token (ie. BACON)
  staking = await stakingFactory.deploy(memberToken.address, memberToken.address);
  await staking.deployed()

  return { memberToken, memberNFT, staking };
};

module.exports = {
  deploy,
  URI
};
