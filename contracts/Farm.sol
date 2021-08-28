// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IMemberNFT.sol";

contract Farm is Ownable, AccessControl {
    // this contract lets users stake/unstake ERC20 tokens and mints/burns ERC1155 tokens that represent their stake/membership
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public stakeToken;
    IERC20 public rewardToken;
    struct connectedNFT {
        IMemberNFT memberNFT;
        uint256 id;
        uint256 cost;
    }
    mapping(uint256 => connectedNFT) public connectedNFTs;
    uint256 public NFTCount;

    uint256 public constant DURATION = 14 days;
    uint256 private _totalSupply;
    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    address public rewardDistribution;

    mapping(address => uint256) private _balances;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Transfered(
        address indexed user1,
        address indexed user2,
        uint256 amount
    );
    event RewardPaid(address indexed user, uint256 reward);
    event RecoverToken(address indexed token, uint256 indexed amount);

    modifier onlyRewardDistribution() {
        require(
            msg.sender == rewardDistribution,
            "Caller is not reward distribution"
        );
        _;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(IERC20 _stakeToken, IERC20 _rewardToken) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
    }

    function setNFTDetails(
        IMemberNFT[] memory NFTContracts,
        uint256[] memory ids,
        uint256[] memory costs
    ) public onlyOwner {
        require(
            NFTContracts.length == ids.length && ids.length == costs.length,
            "Farm: setNFTDetails input arrays need to have same length"
        );
        for (uint256 i = 0; i < NFTContracts.length; i++) {
            connectedNFTs[i].memberNFT = NFTContracts[i];
            connectedNFTs[i].cost = costs[i];
            connectedNFTs[i].id = ids[i];
        }
        NFTCount = NFTContracts.length;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply() == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored.add(
                lastTimeRewardApplicable()
                    .sub(lastUpdateTime)
                    .mul(rewardRate)
                    .mul(1e18)
                    .div(totalSupply())
            );
    }

    function earned(address account) public view returns (uint256) {
        return
            balanceOf(account)
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    function updateNFTBalance() internal {
        for (uint256 i = 0; i < NFTCount; i++) {
            IMemberNFT memberNFT = connectedNFTs[i].memberNFT;
            uint256 cost = connectedNFTs[i].cost;
            uint256 id = connectedNFTs[i].id;
            if (address(memberNFT) == address(0) || cost <= 0) {
                // NFT or cost not defined, skip id
                continue;
            }
            uint256 currentNFTBalance = memberNFT.balanceOf(msg.sender, id);
            if (_balances[msg.sender] >= (cost)) {
                // staked balance over threshold, make sure we have exactly 1 NFT
                if (currentNFTBalance == 0) {
                    // have 0 right now, mint 1
                    bytes memory data;
                    memberNFT.mint(msg.sender, id, 1, data);
                } else if (currentNFTBalance > 1) {
                    // have more than 1 right now, burn the extra
                    memberNFT.burn(msg.sender, id, currentNFTBalance - 1);
                } else {
                    // have exactly 1, skip id
                    continue;
                }
            } else {
                // staked balance fall below threshold, make sure we have 0 NFT
                if (currentNFTBalance > 0) {
                    // have more than 0 right now, burn the extra
                    memberNFT.burn(msg.sender, id, currentNFTBalance);
                } else {
                    // have 0, skip id
                    continue;
                }
            }
        }
    }

    function stake(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
        updateNFTBalance();
    }

    function unstake(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        stakeToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
        updateNFTBalance();
    }

    function exit() external {
        unstake(balanceOf(msg.sender));
        getReward();
    }

    function getReward() public updateReward(msg.sender) {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function notifyRewardAmount(uint256 reward)
        external
        onlyRewardDistribution
        updateReward(address(0))
    {
        require(
            reward < uint256(-1) / 10**22,
            "Farm: rewards too large, would lock"
        );
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(DURATION);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(DURATION);
        }
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(DURATION);
        emit RewardAdded(reward);
    }

    function setRewardDistribution(address _rewardDistribution)
        external
        onlyOwner
    {
        rewardDistribution = _rewardDistribution;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function recoverExcessToken(address token, uint256 amount)
        external
        onlyOwner
    {
        IERC20(token).safeTransfer(_msgSender(), amount);
        emit RecoverToken(token, amount);
    }
}
