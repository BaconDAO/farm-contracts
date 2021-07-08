const { expect } = require('chai');

const {
  deploy,
  NFT_COST,
} = require('./utils/setup.js');

const {
  takeSnapshot,
  revertToSnapshot,
  setNextBlockTimestamp,
} = require('./utils/utils.js');
const { BigNumber } = ethers;

describe('MemberNFT contract', function () {

  // reward period duration is 14 days = 1210000 seconds
  // reward amount divided by duration in seconds equals rewardRate
  // This should give us a reward rate of 1000 tokens per second
  const SECONDS_IN_DURATION = BigNumber.from(1210000)
  const ONE_THOUSAND_PER_SECOND = SECONDS_IN_DURATION.mul(1000);

  beforeEach(async function () {
    [signer1, signer2, signer3] = await ethers.getSigners();

    snapshotId = await takeSnapshot();

    const { memberToken, memberNFT, farm } = await deploy();

    // set signer1 as the rewardDistributionManager, who can add additional rewards
    await farm.setRewardDistribution(signer1.address);
  });

  afterEach(async () => {
    await revertToSnapshot(snapshotId);
  });

  describe('transfer()', async function () {
    beforeEach(async function () {
      expect(await memberToken.approve(farm.address, NFT_COST * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm.address, NFT_COST * 10);
    })

    it(`cannot transfer NFT`, async function () {
      // stake 10000 from signer1
      await expect(farm.stake(NFT_COST * 1))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, NFT_COST * 1);
      // have to specify the function as there are two overloaded "safeTransferFrom" functions 
      const safeTransferFrom = memberNFT['safeTransferFrom(address,address,uint256)']
      await expect(safeTransferFrom(signer1.address, signer2.address, 0))
        .to.be.revertedWith("MemberNFT: transfer not allowed")
    });
  });

  describe('mint()', async function () {
    it('cannot have more than 1 NFT', async function () {
      await memberNFT.grantRole(ethers.utils.id("MINTER_ROLE"), signer1.address);
      await expect(memberNFT.mint(signer1.address));
      await expect(memberNFT.mint(signer1.address)).to.be.revertedWith("MemberNFT: each address can have at most 1 NFT")
    })
  })
});
