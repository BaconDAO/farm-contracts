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
import "hardhat/console.sol";

contract Staking is Ownable, AccessControl {
    // this contract lets users stake/unstake ERC20 tokens and mints/burns ERC1155 tokens that represent their stake/membership
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    IERC20 public stakeToken;
    IERC20 public rewardToken;
    IMemberNFT public memberNFT;
    uint256 public NFTId; // this ID decides which NFT ID this farm mints/burns
    uint256 public NFTCost;

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
        _setRoleAdmin(TRANSFER_ROLE, DEFAULT_ADMIN_ROLE);

        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
    }

    function setNFTDetails(
        IMemberNFT _memberNFT,
        uint256 _NFTId,
        uint256 _NFTCost
    ) public onlyOwner {
        memberNFT = _memberNFT;
        NFTId = _NFTId;
        NFTCost = _NFTCost;
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

    function stake(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);

        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);

        // mint memberNFT based on new balance
        if (address(memberNFT) != address(0) && NFTCost > 0) {
            uint256 numToMint = _balances[msg.sender].div(NFTCost);
            bytes memory data;
            memberNFT.mint(msg.sender, NFTId, numToMint, data);
        }
    }

    function unstake(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        stakeToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);

        // burn memberNFT based on new balance
        if (address(memberNFT) != address(0) && NFTCost > 0) {
            uint256 newNumOfNFT = _balances[msg.sender].div(NFTCost);
            uint256 oldNumOfNFT = memberNFT.balanceOf(msg.sender, 0);
            uint256 numToBurn = newNumOfNFT;
            bytes memory data;
            memberNFT.burn(msg.sender, NFTId, numToBurn);
        }
    }

    function transferStake(
        address from,
        address to,
        uint256 amount
    ) external {
        require(
            hasRole(TRANSFER_ROLE, _msgSender()),
            "Staking: must have transfer role to transfer stake"
        );
        require(amount > 0, "Cannot transfer 0");
        _balances[from] = _balances[from].sub(amount);
        _balances[to] = _balances[to].add(amount);
        emit Transfered(from, to, amount);
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
