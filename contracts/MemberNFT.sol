// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./IFarm.sol";

/**
 * @dev {ERC1155} token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - a minter role that allows for token minting (creation)
 *  - a burner role that allows to stop all token transfers
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles - head to its documentation for details.
 *
 * The account that deploys the contract will be granted the minter and burner
 * roles, as well as the default admin role, which will let it grant both minter
 * and burner roles to other accounts.
 */
contract MemberNFT is Context, AccessControl, Ownable, ERC1155 {
    using SafeMath for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE` to the account that deploys the contract.
     */
    constructor(string memory uri) ERC1155(uri) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /**
     * @dev Creates `amount` new tokens for `to`, of token type `id`.
     *
     * See {ERC1155-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "MemberNFT: must have minter role to mint"
        );
        // only mint if the amount to mint is less than or equal to 1, and the current balance is 0
        // this allows multiple farms to stake and attempt to mint NFT without reverting
        if (amount <= 1 && balanceOf(to, id) == 0) {
            _mint(to, id, amount, data);
        }
    }

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] variant of {mint}.
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "MemberNFT: must have minter role to mint"
        );
        for (uint256 i = 0; i < ids.length; i++) {
            // loop through all mints of batch
            // only mint if the amount to mint is less than or equal to 1, and the current balance is 0
            // this allows multiple farms to stake and attempt to mint NFT without reverting
            if (amounts[i] <= 1 && balanceOf(to, ids[i]) == 0) {
                _mint(to, ids[i], amounts[i], data);
            }
        }
    }

    /**
     * @dev Destroys `amount` of tokens for `account`, of token type `id`.
     *
     * See {ERC1155-_burn}.
     *
     * Requirements:
     *
     * - the caller must have the `BURNER_ROLE`.
     */
    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) public virtual {
        require(
            hasRole(BURNER_ROLE, _msgSender()),
            "MemberNFT: must have burner role to burn"
        );

        _burn(account, id, amount);
    }

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] variant of {burn}.
     */
    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public virtual {
        require(
            hasRole(BURNER_ROLE, _msgSender()),
            "MemberNFT: must have burner role to burn"
        );

        _burnBatch(account, ids, amounts);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override(ERC1155) {
        revert("MemberNFT: transfer not allowed");
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory dat
    ) public virtual override(ERC1155) {
        revert("MemberNFT: transfer not allowed");
    }
}
