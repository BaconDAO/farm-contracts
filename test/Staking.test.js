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
    NFTCost = 1000;
    beforeEach(async function () {
      await expect(memberToken.approve(staking.address, NFTCost * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, staking.address, NFTCost * 10);
    })
    it(`can stake tokens and record correct amount`, async function () {
      let balanceBefore = await memberToken.balanceOf(signer1.address);
      expect(await staking.stake(NFTCost))
        .to.emit(staking, 'Staked')
        .withArgs(signer1.address, NFTCost);
      expect(await staking.balanceOf(signer1.address)).to.equal(NFTCost);
      let balanceAfter = await memberToken.balanceOf(signer1.address);
      let amountDeducted = balanceBefore.sub(balanceAfter);
      expect(amountDeducted).to.equal(NFTCost);
      expect(await memberNFT.balanceOf(signer1.address, 0)).to.equal(0);
    });

    it(`can stake enough tokens to mint 1 NFT`, async function () {
      await staking.setNFTDetails(memberNFT.address, 0, 1000);
      expect(await staking.stake(NFTCost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(staking.address, ethers.constants.AddressZero, signer1.address, 0, 1);
    });

    it(`can stake enough tokens to mint 5 NFT`, async function () {
      await staking.setNFTDetails(memberNFT.address, 0, 1000);
      expect(await staking.stake(NFTCost * 5))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(staking.address, ethers.constants.AddressZero, signer1.address, 0, 5);
    });
  });

  describe('unstake()', async function () {
    NFTCost = 1000;
    NFTId = 0;
    beforeEach(async function () {
      expect(await memberToken.approve(staking.address, NFTCost * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, staking.address, NFTCost * 10);
    })

    it(`can unstake tokens and record correct amount`, async function () {

      // stake 10000
      expect(await staking.stake(NFTCost * 10))
        .to.emit(staking, 'Staked')
        .withArgs(signer1.address, NFTCost * 10);
      // unstake 1000
      expect(await staking.unstake(NFTCost))
        .to.emit(staking, 'Unstaked')
        .withArgs(signer1.address, NFTCost);
      // balance 9000
      expect(await staking.balanceOf(signer1.address)).to.equal(NFTCost * 9);
    });

    it(`can unstake tokens to burn 1 NFT`, async function () {
      await staking.setNFTDetails(memberNFT.address, NFTId, 1000);
      // stake 10000
      expect(await staking.stake(NFTCost * 10))
        .to.emit(staking, 'Staked')
        .withArgs(signer1.address, NFTCost * 10);
      // balance of 10 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, NFTId)).to.equal(10);

      // unstake 1000, should show burning of 1 NFT
      expect(await staking.unstake(NFTCost))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(staking.address, signer1.address, ethers.constants.AddressZero, NFTId, 1);
      // balance of 9 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, NFTId)).to.equal(9);
    });

    it(`can unstake tokens to burn 5 NFT`, async function () {
      await staking.setNFTDetails(memberNFT.address, NFTId, 1000);
      // stake 10000
      expect(await staking.stake(NFTCost * 10))
        .to.emit(staking, 'Staked')
        .withArgs(signer1.address, NFTCost * 10);
      // balance of 10 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, NFTId)).to.equal(10);

      // unstake 1000, should show burning of 5 NFT
      expect(await staking.unstake(NFTCost * 5))
        .to.emit(memberNFT, 'TransferSingle')
        .withArgs(staking.address, signer1.address, ethers.constants.AddressZero, NFTId, 5);
      // balance of 5 NFTs left
      expect(await memberNFT.balanceOf(signer1.address, NFTId)).to.equal(5);
    });
  });
  // tested upto here
});
