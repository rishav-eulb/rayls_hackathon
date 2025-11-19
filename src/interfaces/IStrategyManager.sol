// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

interface IStrategyManager {
    struct StrategyStruct {
        uint256 valueDeposited;
        uint256 rewardsEarned;
        uint256 amountSlashed;
        uint256 valueWithdrawn;
    }

    //events
    event DepositAddressSet(address _depositAddress);
    event StrategyAdded(address _tokenAddress, address _strategyAddress);
    event StrategyBalanceUpdated(StrategyStruct _balanceChange);

    function fetchStrategy(address _tokenAddress) external view returns (uint256, address);
    function fetchStrategyDeposit(address _strategy) external view returns (StrategyStruct memory);
    function updateStrategy(address _strategy, StrategyStruct memory _changeBalane) external;
    function strategyExists(address _strategy) external view returns (bool);
}
