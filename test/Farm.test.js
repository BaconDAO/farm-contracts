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

describe('farm1 contract', function () {

  // reward period duration is 14 days = 1210000 seconds
  // reward amount divided by duration in seconds equals rewardRate
  // This should give us a reward rate of 1000 tokens per second
  const DURATION_IN_SECONDS = 1210000
  const DURATION_IN_BN = BigNumber.from(DURATION_IN_SECONDS)
  const REWARD_FOR_DURATION = DURATION_IN_BN.mul(1000);

  beforeEach(async function () {
    [signer1, signer2, signer3] = await ethers.getSigners();

    snapshotId = await takeSnapshot();

    const { memberToken, memberNFT, farm1, farm2 } = await deploy();

    // set signer1 as the rewardDistributionManager, who can add additional rewards
    await farm1.setRewardDistribution(signer1.address);
  });

  afterEach(async () => {
    await revertToSnapshot(snapshotId);
  });

  describe('setNFTDetails()', async function () {

    it(`cannot set NFT details with arrays of different length`, async function () {
      await expect(farm1.setNFTDetails([memberNFT.address, memberNFT.address, memberNFT.address], [0, 1], [100, 100, 100]))
        .to.be.revertedWith("Farm: setNFTDetails input arrays need to have same length")

      await expect(farm1.setNFTDetails([memberNFT.address, memberNFT.address, memberNFT.address], [0, 1, 2], [100, 100]))
        .to.be.revertedWith("Farm: setNFTDetails input arrays need to have same length")

      await farm1.setNFTDetails([memberNFT.address, memberNFT.address, memberNFT.address], [0, 1, 2], [100, 100, 100])
    });
  });

  describe('notifyRewardAmount()', async function () {
    beforeEach(async function () {
      // add 1000 reward
      expect(await memberToken.transfer(farm1.address, REWARD_FOR_DURATION));
      expect(await farm1.notifyRewardAmount(REWARD_FOR_DURATION));
      expect(await farm1.rewardRate()).to.equal(1000);
      await expect(memberToken.approve(farm1.address, 1000))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm1.address, 1000);
    });

    it(`can stake and claim reward`, async function () {
      let currentTimetamp = (await ethers.getDefaultProvider().getBlock()).timestamp;

      expect(await farm1.stake(1000))
        .to.emit(farm1, 'Staked')
        .withArgs(signer1.address, 1000);

      let balance1 = await memberToken.balanceOf(signer1.address);

      await setNextBlockTimestamp(currentTimetamp + DURATION_IN_SECONDS)

      expect(await farm1.getReward())

      let balance2 = await memberToken.balanceOf(signer1.address);

      console.log("expected reward amount for period: ", REWARD_FOR_DURATION.toString())
      console.log("actual reward amount received: ", balance2.sub(balance1).toString())
    });
  });

  describe('stake()', async function () {
    beforeEach(async function () {
      await memberToken.transfer(signer2.address, NFT_COSTS[2] * 30);
      await expect(memberToken.approve(farm1.address, NFT_COSTS[2] * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm1.address, NFT_COSTS[2] * 10);
      await expect(memberToken.approve(farm2.address, NFT_COSTS[2] * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm2.address, NFT_COSTS[2] * 10);
      await expect(memberToken.connect(signer2).approve(farm2.address, NFT_COSTS[2] * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer2.address, farm2.address, NFT_COSTS[2] * 10);
    })
    it(`can stake tokens and record correct amount`, async function () {
      let cost = NFT_COSTS[0];
      let id = NFT_IDS[0]
      let balanceBefore = await memberToken.balanceOf(signer1.address);
      expect(await farm1.stake(cost - 1))
        .to.emit(farm1, 'Staked')
        .withArgs(signer1.address, cost - 1);
      expect(await farm1.balanceOf(signer1.address)).to.equal(cost - 1);
      let balanceAfter = await memberToken.balanceOf(signer1.address);
      let amountDeducted = balanceBefore.sub(balanceAfter);
      expect(amountDeducted).to.equal(cost - 1);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
    });

    it(`can stake enough tokens to mint 1 NFT of id=0`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
      expect(await farm1.stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, ethers.constants.AddressZero, signer1.address, id, 1);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
    });

    it(`can stake 4 times the amount and mint only 1 NFT id=0`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
      expect(await farm1.stake(cost * 4))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, ethers.constants.AddressZero, signer1.address, id, 1);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
    });

    it(`can stake 5 times the amount and mint 1 NFT id=0 and 1 NFT id=1`, async function () {
      let cost = NFT_COSTS[1]
      let id_0 = NFT_IDS[0]
      let id_1 = NFT_IDS[1]
      expect(await memberNFT.balanceOf(signer1.address, id_0)).to.equal(0);
      expect(await memberNFT.balanceOf(signer1.address, id_1)).to.equal(0);
      expect(await farm1.stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, ethers.constants.AddressZero, signer1.address, id_1, 1);
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
      expect(await farm1.stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, ethers.constants.AddressZero, signer1.address, id_2, 1);
      expect(await memberNFT.balanceOf(signer1.address, id_0)).to.equal(1);
      expect(await memberNFT.balanceOf(signer1.address, id_1)).to.equal(1);
      expect(await memberNFT.balanceOf(signer1.address, id_2)).to.equal(1);
    });

    it(`can stake enough tokens in farm1 and farm2 to mint 2 NFTs of id=0 for 2 addresses`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
      expect(await farm1.stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, ethers.constants.AddressZero, signer1.address, id, 1);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
      expect(await memberNFT.balanceOf(signer2.address, id)).to.equal(0);
      expect(await farm2.connect(signer2).stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm2.address, ethers.constants.AddressZero, signer2.address, id, 1);
      expect(await memberNFT.balanceOf(signer2.address, id)).to.equal(1);
    });

    it(`can stake enough tokens in farm1 and farm2 for same address but only mint 1 NFT maximum`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
      expect(await farm1.stake(cost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, ethers.constants.AddressZero, signer1.address, id, 1);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
      expect(await farm2.stake(cost));
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
    });

    it(`can stake enough and mint for NFT id=0 first, then stake more to mint NFT id=1`, async function () {
      let cost1 = NFT_COSTS[0]
      let id1 = NFT_IDS[0]
      expect(await memberNFT.balanceOf(signer1.address, id1)).to.equal(0);
      expect(await farm1.stake(cost1))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, ethers.constants.AddressZero, signer1.address, id1, 1);
      expect(await memberNFT.balanceOf(signer1.address, id1)).to.equal(1);

      let cost2 = NFT_COSTS[1]
      let id2 = NFT_IDS[1]
      expect(await memberNFT.balanceOf(signer1.address, id2)).to.equal(0);
      expect(await farm1.stake(cost2 - cost1))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, ethers.constants.AddressZero, signer1.address, id2, 1);
      expect(await memberNFT.balanceOf(signer1.address, id2)).to.equal(1);
    });
  });

  describe('unstake()', async function () {
    beforeEach(async function () {
      expect(await memberToken.approve(farm1.address, NFT_COSTS[2] * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm1.address, NFT_COSTS[2] * 10);
    })

    it(`can unstake tokens and record correct amount`, async function () {
      let cost = NFT_COSTS[0]
      // stake 2000
      expect(await farm1.stake(cost * 2))
        .to.emit(farm1, 'Staked')
        .withArgs(signer1.address, cost * 2);
      // unstake 1000
      expect(await farm1.unstake(cost))
        .to.emit(farm1, 'Unstaked')
        .withArgs(signer1.address, cost);
      // balance 1000
      expect(await farm1.balanceOf(signer1.address)).to.equal(cost);
    });

    it(`can unstake tokens to burn 1 NFT`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      // stake 1000
      expect(await farm1.stake(cost))
        .to.emit(farm1, 'Staked')
        .withArgs(signer1.address, cost);
      // balance of 1 NFT
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);

      // unstake 500, should show burning of 1 NFT
      expect(await farm1.unstake(cost * 0.5))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(farm1.address, signer1.address, ethers.constants.AddressZero, id, 1);
      // balance of 0 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
    });

    it(`can stake 2x tokens and unstake 1x tokens to not affect NFT balance`, async function () {
      let cost = NFT_COSTS[0]
      let id = NFT_IDS[0]
      // stake 2000
      expect(await farm1.stake(cost * 2))
        .to.emit(farm1, 'Staked')
        .withArgs(signer1.address, cost * 2);
      // balance of 1 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);

      // unstake 5000, should not burn any NFTs
      expect(await farm1.unstake(cost))
      // balance of 1 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
    });
  });
});
