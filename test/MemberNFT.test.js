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

describe('MemberNFT contract', function () {

  // reward period duration is 14 days = 1210000 seconds
  // reward amount divided by duration in seconds equals rewardRate
  // This should give us a reward rate of 1000 tokens per second
  const SECONDS_IN_DURATION = BigNumber.from(1210000)
  const ONE_THOUSAND_PER_SECOND = SECONDS_IN_DURATION.mul(1000);

  beforeEach(async function () {
    [signer1, signer2, signer3] = await ethers.getSigners();

    snapshotId = await takeSnapshot();

    const { memberToken, memberNFT, farm1 } = await deploy();

    // set signer1 as the rewardDistributionManager, who can add additional rewards
    await farm1.setRewardDistribution(signer1.address);
  });

  afterEach(async () => {
    await revertToSnapshot(snapshotId);
  });

  describe('safeTransferFrom()', async function () {
    beforeEach(async function () {
      expect(await memberToken.approve(farm1.address, NFT_COSTS[2] * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm1.address, NFT_COSTS[2] * 10);
    })

    it(`should revert`, async function () {
      let id = NFT_IDS[0]
      let data = ethers.utils.id("");
      await expect(memberNFT.safeTransferFrom(signer1.address, signer2.address, id, 1, data))
        .to.be.revertedWith("MemberNFT: transfer not allowed")
    });
  });

  describe('safeBatchTransferFrom()', async function () {
    beforeEach(async function () {
      expect(await memberToken.approve(farm1.address, NFT_COSTS[2] * 10))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, farm1.address, NFT_COSTS[2] * 10);
    })

    it(`should revert`, async function () {
      let id = NFT_IDS[0]
      let data = ethers.utils.id("");
      await expect(memberNFT.safeBatchTransferFrom(signer1.address, signer2.address, [id], [1], data))
        .to.be.revertedWith("MemberNFT: transfer not allowed")
    });
  });

  describe('mint()', async function () {
    it('can mint 1 NFT', async function () {
      let id = NFT_IDS[0]
      let data = ethers.utils.id("")
      await memberNFT.grantRole(ethers.utils.id("MINTER_ROLE"), signer1.address);
      await expect(memberNFT.mint(signer1.address, id, 1, data)).to.emit(memberNFT, "TransferSingle");
    })

    it('cannot mint 2 NFTs at once', async function () {
      let id = NFT_IDS[0]
      let data = ethers.utils.id("")
      await memberNFT.grantRole(ethers.utils.id("MINTER_ROLE"), signer1.address);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
      await memberNFT.mint(signer1.address, id, 2, data);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
    })

    it('cannot mint 1 NFT twice', async function () {
      let id = NFT_IDS[0]
      let data = ethers.utils.id("")
      await memberNFT.grantRole(ethers.utils.id("MINTER_ROLE"), signer1.address);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(0);
      await expect(memberNFT.mint(signer1.address, id, 1, data)).to.emit(memberNFT, "TransferSingle");
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
      await memberNFT.mint(signer1.address, id, 1, data);
      expect(await memberNFT.balanceOf(signer1.address, id)).to.equal(1);
    })
  });
});