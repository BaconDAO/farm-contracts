const { expect } = require('chai');

const {
  takeSnapshot,
  revertToSnapshot,
  setNextBlockTimestamp,
} = require('./utils/utils.js');
const { BigNumber } = ethers;

describe('Staking contract', function () {

  // reward period duration is 14 days = 1210000 seconds
  // reward amount divided by duration in seconds equals rewardRate
  // This should give us a reward rate of 1000 tokens per second
  const SECONDS_IN_DURATION = BigNumber.from(1210000)
  const ONE_THOUSAND_PER_SECOND = SECONDS_IN_DURATION.mul(1000);

  beforeEach(async function () {
    [signer1, signer2, signer3] = await ethers.getSigners();

    snapshotId = await takeSnapshot();

    const { memberToken, memberNFT, staking } = await deploy();

    // set signer1 as the rewardDistributionManager, who can add additional rewards
    await staking.setRewardDistribution(signer1.address);
  });

  afterEach(async () => {
    await revertToSnapshot(snapshotId);
  });

  describe('setNFTDetails()', async function () {
    it(`can set MemberNFT contract address`, async function () {
      await staking.setNFTDetails(memberNFT.address, 0, 1000);
      expect(await staking.memberNFT()).to.equal(memberNFT.address);
    });

    it(`can set NFT ID`, async function () {
      await staking.setNFTDetails(memberNFT.address, 0, 1000);
      expect(await staking.NFTId()).to.equal(0);
    });

    it(`can set NFTCost`, async function () {
      await staking.setNFTDetails(memberNFT.address, 0, 1000);
      expect(await staking.NFTCost()).to.equal(1000);
    });
  });

  describe('notifyRewardAmount()', async function () {
    it(`can assign first reward amount`, async function () {
      expect(await memberToken.transfer(staking.address, ONE_THOUSAND_PER_SECOND));
      expect(await staking.notifyRewardAmount(ONE_THOUSAND_PER_SECOND));
      expect(await staking.rewardRate()).to.equal(1000);
    });
  });

  describe('stake()', async function () {
    stakeAmount = 1000;
    beforeEach(async function () {
      await expect(memberToken.approve(staking.address, stakeAmount))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, staking.address, stakeAmount);
    })
    it(`can stake tokens and record correct amount`, async function () {
      let balanceBefore = await memberToken.balanceOf(signer1.address);
      expect(await staking.stake(stakeAmount))
        .to.emit(staking, 'Staked')
        .withArgs(signer1.address, stakeAmount);
      expect(await staking.balanceOf(signer1.address)).to.equal(stakeAmount);
      let balanceAfter = await memberToken.balanceOf(signer1.address);
      let amountDeducted = balanceBefore.sub(balanceAfter);
      expect(amountDeducted).to.equal(stakeAmount);
    });
  });

  // tested upto here
});
