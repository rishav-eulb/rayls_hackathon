// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IVaultStrategy
/// @notice Interface that all vault strategies must implement
/// @dev This interface defines the contract between RaylsVault and yield strategies
interface IVaultStrategy {
    /// @notice The ERC20 token that this strategy manages
    /// @return The IERC20 token interface
    function want() external view returns (IERC20);

    /// @notice The vault that owns this strategy
    /// @return The address of the vault contract
    function getVault() external view returns (address);

    /// @notice Set the vault address (typically called once during initialization)
    /// @param vault The address of the vault contract
    function setVault(address vault) external;

    /// @notice Get the total assets managed by this strategy (including earned rewards)
    /// @return The total amount of want tokens held by this strategy
    function getTotalAssets() external view returns (uint256);

    /// @notice Called by vault to deposit funds into the strategy
    /// @dev Vault will transfer tokens to strategy before calling this
    function deposit() external;

    /// @notice Withdraw a specific amount back to the vault
    /// @param amount The amount of want tokens to withdraw
    function withdraw(uint256 amount) external;

    /// @notice Emergency function to withdraw all funds back to vault
    /// @dev Should be owner/vault gated in the strategy implementation
    function withdrawAll() external;

    /// @notice Harvest rewards and compound them (optional)
    /// @dev Strategies can claim external rewards and reinvest them
    function harvest() external;
}

