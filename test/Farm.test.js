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

describe('Farm contract', function () {

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

  describe('notifyRewardAmount()', async function () {
    it(`can assign first reward amount`, async function () {
      expect(await memberToken.transfer(farm.address, ONE_THOUSAND_PER_SECOND));
      expect(await farm.notifyRewardAmount(ONE_THOUSAND_PER_SECOND));
      expect(await farm.rewardRate()).to.equal(1000);
    });
  });

  describe('stake()', async function () {
    beforeEach(async function () {
      await expect(memberToken.approve(farm.address, NFT_COST * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm.address, NFT_COST * 10);
    })
    it(`can stake tokens and record correct amount`, async function () {
      let balanceBefore = await memberToken.balanceOf(signer1.address);
      expect(await farm.stake(NFT_COST - 1))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, NFT_COST - 1);
      expect(await farm.balanceOf(signer1.address)).to.equal(NFT_COST - 1);
      let balanceAfter = await memberToken.balanceOf(signer1.address);
      let amountDeducted = balanceBefore.sub(balanceAfter);
      expect(amountDeducted).to.equal(NFT_COST - 1);
      expect(await memberNFT.balanceOf(signer1.address, 0)).to.equal(0);
    });

    it(`can stake enough tokens to mint 1 NFT`, async function () {
      expect(await farm.stake(NFT_COST))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, ethers.constants.AddressZero, signer1.address, 0, 1);
    });

    it(`can stake enough tokens to mint 5 NFT`, async function () {
      expect(await farm.stake(NFT_COST * 5))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, ethers.constants.AddressZero, signer1.address, 0, 5);
    });
  });

  describe('unstake()', async function () {
    beforeEach(async function () {
      expect(await memberToken.approve(farm.address, NFT_COST * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm.address, NFT_COST * 10);
    })

    it(`can unstake tokens and record correct amount`, async function () {

      // stake 10000
      expect(await farm.stake(NFT_COST * 10))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, NFT_COST * 10);
      // unstake 1000
      expect(await farm.unstake(NFT_COST))
        .to.emit(farm, 'Unstaked')
        .withArgs(signer1.address, NFT_COST);
      // balance 9000
      expect(await farm.balanceOf(signer1.address)).to.equal(NFT_COST * 9);
    });

    it(`can unstake tokens to burn 1 NFT`, async function () {
      // stake 10000
      expect(await farm.stake(NFT_COST * 10))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, NFT_COST * 10);
      // balance of 10 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, NFT_ID)).to.equal(10);

      // unstake 1000, should show burning of 1 NFT
      expect(await farm.unstake(NFT_COST))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, signer1.address, ethers.constants.AddressZero, NFT_ID, 1);
      // balance of 9 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, NFT_ID)).to.equal(9);
    });

    it(`can unstake tokens to burn 5 NFT`, async function () {
      // stake 10000
      expect(await farm.stake(NFT_COST * 10))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, NFT_COST * 10);
      // balance of 10 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, NFT_ID)).to.equal(10);

      // unstake 1000, should show burning of 5 NFT
      expect(await farm.unstake(NFT_COST * 5))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, signer1.address, ethers.constants.AddressZero, NFT_ID, 5);
      // balance of 5 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, NFT_ID)).to.equal(5);
    });
  });
  // tested upto here
});
