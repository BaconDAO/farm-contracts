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
const { BigNumber, utils } = ethers;

describe('MemberToken contract', function () {

  beforeEach(async function () {
    [signer1, signer2, signer3] = await ethers.getSigners();

    snapshotId = await takeSnapshot();

    const { memberToken } = await deploy();
  });

  afterEach(async () => {
    await revertToSnapshot(snapshotId);
  });

  describe('mint()', async function () {
    it(`allows minter to mint`, async function () {

      await memberToken.grantRole(utils.id("MINTER_ROLE"), signer1.address)
      await memberToken.mint(signer1.address, 1);
    });

    it(`blocks non-minter from minting`, async function () {
      await expect(memberToken.connect(signer2).mint(signer2.address, 1))
        .to.be.revertedWith("MemberToken: must have minter role to mint"
        )
    });
  });

  describe('burn()', async function () {
    it(`allows burner to burn`, async function () {

      await memberToken.grantRole(utils.id("MINTER_ROLE"), signer1.address)
      await memberToken.mint(signer1.address, 1);

      await memberToken.grantRole(utils.id("BURNER_ROLE"), signer1.address)
      await memberToken.burn(signer1.address, 1);
    });

    it(`blocks non-burner from burning`, async function () {

      await memberToken.grantRole(utils.id("MINTER_ROLE"), signer2.address)
      await memberToken.connect(signer2).mint(signer2.address, 1);
      await expect(memberToken.connect(signer2).burn(signer2.address, 1)).to.be.revertedWith("MemberToken: must have burner role to burn");
    });
  });

  describe('transfer()', async function () {
    it(`should revert`, async function () {
      await memberToken.grantRole(utils.id("MINTER_ROLE"), signer1.address)
      await memberToken.mint(signer1.address, 1);

      await expect(memberToken.transfer(signer2.address, 1))
        .to.be.revertedWith("MemberToken: transfer not allowed")
    });
  });


  describe('transferFrom()', async function () {
    beforeEach(async function () {
      await memberToken.grantRole(utils.id("MINTER_ROLE"), signer1.address)
      await memberToken.mint(signer1.address, 1);

      expect(await memberToken.approve(signer2.address, 1))
        .to.emit(memberToken, 'Approval')
        .withArgs(signer1.address, signer2.address, 1);
    })

    it(`should revert`, async function () {
      await expect(memberToken.connect(signer2).transferFrom(signer1.address, signer2.address, 1))
        .to.be.revertedWith("MemberToken: transfer not allowed")
    });
  });
});