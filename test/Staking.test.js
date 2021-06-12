const { expect } = require('chai');

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
  const REWARD_AMOUNT = BigNumber.from(1210000).mul(1000);

  beforeEach(async function () {
    [signer1, signer2, signer3] = await ethers.getSigners();

    snapshotId = await takeSnapshot();

    const { memberToken, memberNFT, staking } = await deploy();

    // set signer1 as the rewardDistributionManager, who can add additional rewards
    await staking.setRewardDistribution(signer1.address);

    await expect(memberToken.approve(staking.address, REWARD_AMOUNT))
      .to.emit(memberToken, 'Approval')
      .withArgs(signer1.address, staking.address, REWARD_AMOUNT);
  });

  afterEach(async () => {
    await revertToSnapshot(snapshotId);
  });

  describe('constructor()', async function () {
    it(`can start reward period correctly`, async function () {
      expect(await memberToken.transfer(staking.address, REWARD_AMOUNT));
      expect(await staking.notifyRewardAmount(REWARD_AMOUNT));
      console.log((await staking.rewardRate()).toString());
    });
  });
});
