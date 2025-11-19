// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { RaylsVault } from "./RaylsVault.sol";
import { IRaylsVaultRegistry } from "../interfaces/IRaylsVaultRegistry.sol";

/**
 * @title RaylsVaultRegistry
 * @author Raga Finance
 * @notice Simplified registry without upgradeability - owner set at deployment
 */
contract RaylsVaultRegistry is Ownable, IRaylsVaultRegistry {
    /*──────────────────────────────────────────────────────────────
                              CONSTANTS
    ──────────────────────────────────────────────────────────────*/
    uint16 public constant MAX_BPS = 5000; // 50 %

    /*──────────────────────────────────────────────────────────────
                              STORAGE
    ──────────────────────────────────────────────────────────────*/
    address public immutable vaultImplementation;
    address public treasury;
    Fee public fees;
    
    mapping(address => address[]) public assetVaults;
    address[] public allVaults;

    /*──────────────────────────────────────────────────────────────
                              ERRORS
    ──────────────────────────────────────────────────────────────*/
    error InvalidFee();
    error ZeroAddress();

    /*──────────────────────────────────────────────────────────────
                            CONSTRUCTOR
    ──────────────────────────────────────────────────────────────*/
    constructor(
        address _vaultImplementation,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        if (_vaultImplementation == address(0) || _treasury == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }
        
        vaultImplementation = _vaultImplementation;
        treasury = _treasury;
    }

    /*──────────────────────────────────────────────────────────────
                           DEPLOY VAULT
    ──────────────────────────────────────────────────────────────*/
    function deployVault(
        address asset_,
        string calldata name_,
        string calldata symbol_,
        address strategy_
    )
        external
        onlyOwner
        returns (address vault)
    {
        if (asset_ == address(0) || strategy_ == address(0)) revert ZeroAddress();

        // Deploy vault as a minimal proxy clone
        bytes32 salt = keccak256(abi.encodePacked(asset_, strategy_, block.timestamp));
        vault = Clones.cloneDeterministic(vaultImplementation, salt);

        // Initialize the vault
        RaylsVault(vault).initialize(
            asset_,
            string.concat("Rayls ", name_),
            string.concat("r", symbol_),
            address(this),
            strategy_
        );

        assetVaults[asset_].push(vault);
        allVaults.push(vault);

        emit VaultDeployed(vault, asset_, strategy_);
    }

    /*──────────────────────────────────────────────────────────────
                             FEE SETTERS
    ──────────────────────────────────────────────────────────────*/
    function _checkBps(uint16 bps) private pure {
        if (bps > MAX_BPS) revert InvalidFee();
    }

    function setDepositFee(uint16 bps) public onlyOwner {
        _checkBps(bps);
        fees.deposit = bps;
        emit DepositFeeSet(bps);
    }

    function setManagementFee(uint16 bps) public onlyOwner {
        _checkBps(bps);
        fees.management = bps;
        emit ManagementFeeSet(bps);
    }

    function setPerformanceFee(uint16 bps) public onlyOwner {
        _checkBps(bps);
        fees.performance = bps;
        emit PerformanceFeeSet(bps);
    }

    function setWithdrawFee(uint16 bps) public onlyOwner {
        _checkBps(bps);
        fees.withdraw = bps;
        emit WithdrawFeeSet(bps);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setFees(
        uint16 depositBps,
        uint16 managementBps,
        uint16 performanceBps,
        uint16 withdrawBps
    )
        external
        onlyOwner
    {
        setDepositFee(depositBps);
        setManagementFee(managementBps);
        setPerformanceFee(performanceBps);
        setWithdrawFee(withdrawBps);
    }

    /*──────────────────────────────────────────────────────────────
                               VIEWS
    ──────────────────────────────────────────────────────────────*/
    function getFees() external view returns (Fee memory) {
        return fees;
    }

    function allVaultsLength() external view returns (uint256) {
        return allVaults.length;
    }

    function getVaults(address asset_) external view returns (address[] memory) {
        return assetVaults[asset_];
    }

    function getTreasury() external view returns (address) {
        return treasury;
    }

    function getTimelock() external pure returns (TimelockController) {
        return TimelockController(payable(address(0))); // No timelock in simple version
    }
}

