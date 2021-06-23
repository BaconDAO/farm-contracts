const { expect } = require('chai');

const {
  deploy,
  NFT_COST,
  NFT_ID
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

  describe('transferStake()', async function () {
    beforeEach(async function () {
      expect(await memberToken.approve(farm.address, NFT_COST * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm.address, NFT_COST * 10);
    })

    it(`can transfer 1 NFT and corresponding stake amount`, async function () {
      // stake 10000 from signer1
      expect(await farm.stake(NFT_COST * 10))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, NFT_COST * 10);
      // transfer 1 NFT from signer1 to signer2
      let data = ethers.utils.id("")
      expect(await memberNFT.safeTransferFrom(signer1.address, signer2.address, NFT_ID, 1, data))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(signer1.address, signer1.address, signer2.address, NFT_ID, 1);
      // signer1 balance 9000
      // signer2 balance 1000
      expect(await farm.balanceOf(signer1.address)).to.equal(NFT_COST * 9);
      expect(await farm.balanceOf(signer2.address)).to.equal(NFT_COST);
    });
  });
});
