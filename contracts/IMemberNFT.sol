// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Enumerable.sol";

interface IMemberNFT is IERC721Enumerable {
    function mint(address to) external;

    function burn(uint256 id) external;
}
