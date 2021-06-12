const { expect } = require('chai');

const {
  takeSnapshot,
  revertToSnapshot,
  setNextBlockTimestamp,
} = require('./utils/utils.js');
const { BigNumber } = ethers;

describe('MemberNFT contract', function () {
  beforeEach(async function () {
    [signer1, signer2, signer3] = await ethers.getSigners();

    snapshotId = await takeSnapshot();

    const { memberToken, memberNFT, staking } = await deploy();
    await expect(memberToken.approve(staking.address, 1000))
      .to.emit(memberToken, 'Approval')
      .withArgs(signer1.address, staking.address, 1000);
  });

  afterEach(async () => {
    await revertToSnapshot(snapshotId);
  });

  describe('constructor()', async function () {
    it(`can initialize correctly`, async function () {
    });
  });
});
