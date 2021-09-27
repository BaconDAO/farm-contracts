// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

pragma solidity ^0.7.0;

interface IMemberToken is IERC20 {
    function mint(address account, uint256 amount) external;

    function burn(address account, uint256 amount) external;
}
