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

    const { memberToken, memberNFT } = await deploy();
    await expect(memberToken.approve(memberNFT.address, BALANCE_REQUIRED))
      .to.emit(memberToken, 'Approval')
      .withArgs(signer1.address, memberNFT.address, BALANCE_REQUIRED);
  });

  afterEach(async () => {
    await revertToSnapshot(snapshotId);
  });

  describe('constructor()', async function () {
    it(`can initialize number of tickets correctly`, async function () {
      let ticket = await memberNFT.memberNFTs(ticketId);
      expect(ticket.numTickets.toNumber()).to.equals(
        NUM_TICKETS[ticketId % NUM_TICKETS.length]
      );
    });
  });
});
