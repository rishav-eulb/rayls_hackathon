// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { ZeroAddress } from "./Helpers.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Ownable Contract
 * @author RohitAudit
 * @dev This contract is used to implement ownable features to the contracts
 */
contract NexusOwnable is Pausable {
    address private owner;
    bool private initialized = false;

    event OwnerChanged(address oldOwner, address newOwner);

    error NotOwner();
    error ContractAlreadyInitialized();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier initilizeOnce() {
        if (initialized) revert ContractAlreadyInitialized();
        _;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function _ownableInit(address _owner) internal {
        owner = _owner;
        initialized = true;
    }

    /**
     * This function transfers the ownership of the contract
     * @param newOwner New Owner of the contract
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();

        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
