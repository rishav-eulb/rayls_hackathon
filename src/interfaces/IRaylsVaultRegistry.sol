// SPDX‑License‑Identifier: GPL‑3.0
pragma solidity 0.8.28;

import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";

interface IRaylsVaultRegistry {
    /* ---------------------------------------------------------- */
    /*                          STRUCTS                           */
    /* ---------------------------------------------------------- */
    struct Fee {
        uint16 deposit; // bps
        uint16 management; // bps
        uint16 withdraw; // bps
        uint16 performance; // bps
    }

    /* ---------------------------------------------------------- */
    /*                           EVENTS                           */
    /* ---------------------------------------------------------- */
    event VaultDeployed(address indexed vault, address indexed asset, address strategy);
    event DepositFeeSet(uint16 bps);
    event ManagementFeeSet(uint16 bps);
    event PerformanceFeeSet(uint16 bps);
    event WithdrawFeeSet(uint16 bps);
    event TreasurySet(address indexed treasury);

    /* ---------------------------------------------------------- */
    /*                       VIEW FUNCTIONS                       */
    /* ---------------------------------------------------------- */
    function getTimelock() external view returns (TimelockController);
    function getFees() external view returns (Fee memory);
    function getTreasury() external view returns (address);

    function getVaults(address asset) external view returns (address[] memory);
    function allVaultsLength() external view returns (uint256);

    function MAX_BPS() external pure returns (uint16);

    /* ---------------------------------------------------------- */
    /*                   STATE‑CHANGING FUNCTIONS                 */
    /* ---------------------------------------------------------- */
    function deployVault(
        address asset,
        string calldata name,
        string calldata symbol,
        address strategy
    )
        external
        returns (address vault);

    /* ---- Fee setters (individual) ---- */
    function setDepositFee(uint16 bps) external;
    function setManagementFee(uint16 bps) external;
    function setPerformanceFee(uint16 bps) external;
    function setWithdrawFee(uint16 bps) external;

    /* ---- Fee setter (batch) ---- */
    function setFees(uint16 depositBps, uint16 managementBps, uint16 performanceBps, uint16 withdrawBps) external;
}
