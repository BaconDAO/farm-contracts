# BaconFarm

Deployment guide:

1. Deploy token
2. Deploy NFT
3. Deploy Farm
4. Set NFT contract as TRASNFER_ROLE in Farm contract
5. Call SetNFTDetails in farm contract
6. Set Farm contract as MINTER_ROLE and BURNER_ROLE in NFT contract
7. Call setRewardDistribution in Farm contract as deployer, so deployer can send reward tokens to top up farm.
