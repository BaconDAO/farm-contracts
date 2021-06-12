const { ethers } = require("ethers")

//taken from https://medium.com/fluidity/standing-the-time-of-test-b906fcc374a9
takeSnapshot = () => new ethers.providers.JsonRpcProvider().send('evm_snapshot')

revertToSnapshot = (id) =>
  new ethers.providers.JsonRpcProvider().send('evm_revert', [id])

setNextBlockTimestamp = async (timestamp) => {
  await network.provider.send("evm_setNextBlockTimestamp", [timestamp])
  await network.provider.send("evm_mine")
}

module.exports = {
  takeSnapshot,
  revertToSnapshot,
  setNextBlockTimestamp
}