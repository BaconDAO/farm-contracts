// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract MemberToken is Context, AccessControl, ERC20 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(string memory name, string memory symbol)
        public
        ERC20(name, symbol)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function mint(address account, uint256 amount) public virtual {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "MemberToken: must have minter role to mint"
        );
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public virtual {
        require(
            hasRole(BURNER_ROLE, _msgSender()),
            "MemberToken: must have burner role to burn"
        );
        _burn(account, amount);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override(ERC20) {
        blockTransfer();
    }

    function blockTransfer() private {
        revert("MemberToken: transfer not allowed");
    }
}
