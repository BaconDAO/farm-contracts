const { expect } = require('chai');

const {
  deploy,
  NFT_COSTS,
  NFT_IDS
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
      await expect(memberToken.approve(farm.address, NFT_COSTS[2] * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm.address, NFT_COSTS[2] * 10);
    })
    it(`can stake tokens and record correct amount`, async function () {
      let cost = NFT_COSTS[0];
      let id = NFT_IDS[0]
      let balanceBefore = await memberToken.balanceOf(signer1.address);
      expect(await farm.stake(cost - 1))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, cost - 1);
      expect(await farm.balanceOf(signer1.address)).to.equal(cost - 1);
      let balanceAfter = await memberToken.balanceOf(signer1.address);
      let amountDeducted = balanceBefore.sub(balanceAfter);
      expect(amountDeducted).to.equal(cost - 1);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
    });

    it(`can stake enough tokens to mint 1 NFT of id=0`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
      expect(await farm.stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, ethers.constants.AddressZero, signer1.address, id, 1);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
    });

    it(`can stake 4 times the amount and mint only 1 NFT id=0`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
      expect(await farm.stake(cost * 4))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, ethers.constants.AddressZero, signer1.address, id, 1);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
    });

    it(`can stake 5 times the amount and mint 1 NFT id=0 and 1 NFT id=1`, async function () {
      let cost = NFT_COSTS[1]
      let id_0 = NFT_IDS[0]
      let id_1 = NFT_IDS[1]
      expect(await memberNFT.balanceOf(signer1.address, id_0)).to.equal(0);
      expect(await memberNFT.balanceOf(signer1.address, id_1)).to.equal(0);
      expect(await farm.stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, ethers.constants.AddressZero, signer1.address, id_1, 1);
      expect(await memberNFT.balanceOf(signer1.address, id_0)).to.equal(1);
      expect(await memberNFT.balanceOf(signer1.address, id_1)).to.equal(1);
    });

    it(`can stake 10 times the amount and mint 1 NFT id=0 and 1 NFT id=1 and 1 NFT id=2`, async function () {
      let cost = NFT_COSTS[2]
      let id_0 = NFT_IDS[0]
      let id_1 = NFT_IDS[1]
      let id_2 = NFT_IDS[2]
      expect(await memberNFT.balanceOf(signer1.address, id_0)).to.equal(0);
      expect(await memberNFT.balanceOf(signer1.address, id_1)).to.equal(0);
      expect(await memberNFT.balanceOf(signer1.address, id_2)).to.equal(0);
      expect(await farm.stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, ethers.constants.AddressZero, signer1.address, id_2, 1);
      expect(await memberNFT.balanceOf(signer1.address, id_0)).to.equal(1);
      expect(await memberNFT.balanceOf(signer1.address, id_1)).to.equal(1);
      expect(await memberNFT.balanceOf(signer1.address, id_2)).to.equal(1);
    });
  });

  describe('unstake()', async function () {
    beforeEach(async function () {
      expect(await memberToken.approve(farm.address, NFT_COSTS[2] * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm.address, NFT_COSTS[2] * 10);
    })

    it(`can unstake tokens and record correct amount`, async function () {
      let cost = NFT_COSTS[0]
      // stake 2000
      expect(await farm.stake(cost * 2))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, cost * 2);
      // unstake 1000
      expect(await farm.unstake(cost))
        .to.emit(farm, 'Unstaked')
        .withArgs(signer1.address, cost);
      // balance 1000
      expect(await farm.balanceOf(signer1.address)).to.equal(cost);
    });

    it(`can unstake tokens to burn 1 NFT`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      // stake 1000
      expect(await farm.stake(cost))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, cost);
      // balance of 1 NFT
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);

      // unstake 500, should show burning of 1 NFT
      expect(await farm.unstake(cost * 0.5))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm.address, signer1.address, ethers.constants.AddressZero, id, 1);
      // balance of 0 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
    });

    it(`can stake 2x tokens and unstake 1x tokens to not affect NFT balance`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      // stake 2000
      expect(await farm.stake(cost * 2))
        .to.emit(farm, 'Staked')
        .withArgs(signer1.address, cost * 2);
      // balance of 1 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);

      // unstake 5000, should not burn any NFTs
      expect(await farm.unstake(cost))
      // balance of 1 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
    });
  });
});
