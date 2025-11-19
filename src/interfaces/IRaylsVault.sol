// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

interface IRaylsVault {
    /// @notice One time initializer
    function initialize(
        address asset_,
        string calldata name_,
        string calldata symbol_,
        address registry_,
        address strategy_
    )
        external;

    /// @notice Pause normal deposits & withdrawals (registry owner only)
    function pause() external;

    /// @notice Resume operations (registry owner only)
    function unpause() external;

    /// @notice Pull all funds from the strategy into the vault (paused only)
    function emergencyWithdraw() external;

    /// @notice Returns the vault's strategy address
    /// @return registry_ Address of the strategy contract
    function getRegistry() external view returns (address registry_);

    /// @notice Returns the vault's strategy address
    /// @return strategy_ Address of the strategy contract
    function getStrategy() external view returns (address strategy_);

    /// @notice Returns the vault's version
    /// @return version_ Version of the vault
    function version() external pure returns (string memory version_);
}
