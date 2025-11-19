// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { IStrategyManager } from "../../interfaces/IStrategyManager.sol";

interface IStrategy {
    struct RewardStruct {
        uint256 amount;
        bool slashing;
    }

    function TOKEN_ADDRESS() external view returns (address);
    function tokenPrice() external view returns (uint256);
    function getRewards(
        address receiver,
        IStrategyManager.StrategyStruct memory _strategyBalance
    )
        external
        view
        returns (RewardStruct memory);
}

