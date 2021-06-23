// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

interface IFarm {
    function transferStake(
        address from,
        address to,
        uint256 amount
    ) external;

    function NFTCost() external returns (uint256);
}
