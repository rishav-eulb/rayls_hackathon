// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { NexusOwnable } from "./utils/NexusOwnable.sol";
import { UUPSUpgreadable } from "./utils/UUPSUpgreadable.sol";
import { IStrategyManager } from "./interfaces/IStrategyManager.sol";
import { IStrategy } from "./strategies/interfaces/IStrategy.sol";
import { CallFailed, NotDepositContract, ZeroAddress } from "./utils/Helpers.sol";

contract StrategyManager is IStrategyManager, NexusOwnable, UUPSUpgreadable {
    /*
    Type of strategy Execution
    if returns :
        1. 100 - deposit
        2. 101 - withdrawal
    */

    address public depositL1;

    mapping(address => address) public strategies;

    mapping(address => StrategyStruct) public strategyDeposits;

    /// @notice Mapping of authorized callers (vaults or depositL1)
    mapping(address => bool) public authorizedCallers;

    modifier onlyDeposit() {
        if (msg.sender != depositL1 && !authorizedCallers[msg.sender]) revert NotDepositContract(msg.sender);
        _;
    }

    event AuthorizedCallerSet(address indexed caller, bool authorized);

    function initialize() public initilizeOnce {
        _ownableInit(msg.sender);
    }

    function fetchStrategyDeposit(address _strategy) external view override returns (StrategyStruct memory) {
        return strategyDeposits[_strategy];
    }

    function updateProxy(address _newImplemetation) public onlyOwner {
        if (_newImplemetation == address(0)) revert ZeroAddress();
        updateCodeAddress(_newImplemetation);
    }

    function fetchStrategy(address _tokenAddress) external view override returns (uint256, address) {
        return (IStrategy(strategies[_tokenAddress]).tokenPrice(), strategies[_tokenAddress]);
    }

    function setDeposit(address _deposit) external onlyOwner {
        depositL1 = _deposit;
        emit DepositAddressSet(_deposit);
    }

    /// @notice Set an authorized caller (e.g., a vault) that can update strategy metrics
    function setAuthorizedCaller(address _caller, bool _authorized) external onlyOwner {
        if (_caller == address(0)) revert ZeroAddress();
        authorizedCallers[_caller] = _authorized;
        emit AuthorizedCallerSet(_caller, _authorized);
    }

    function addStrategy(address _strategy) external onlyOwner {
        StrategyStruct memory strategyBalance;
        address _tokenAddress = IStrategy(_strategy).TOKEN_ADDRESS();
        if (strategies[_tokenAddress] != address(0)) {
            strategyBalance = strategyDeposits[strategies[_tokenAddress]];
        }
        strategies[_tokenAddress] = _strategy;
        strategyDeposits[_strategy] = strategyBalance;
        (bool success, bytes memory returndata) =
            depositL1.call(abi.encodeWithSignature("whitelistToken(address)", _tokenAddress));
        if (!success) {
            if (returndata.length == 0) revert CallFailed();
            assembly {
                revert(add(32, returndata), mload(returndata))
            }
        }
        emit StrategyAdded(_tokenAddress, _strategy);
    }

    function strategyExists(address _strategy) public view override returns (bool) {
        address _token = IStrategy(_strategy).TOKEN_ADDRESS();
        if (strategies[_token] == _strategy) return true;
        return false;
    }

    function updateStrategy(address _strategy, StrategyStruct memory _changeBalane) external override onlyDeposit {
        strategyDeposits[_strategy].valueDeposited += _changeBalane.valueDeposited;
        strategyDeposits[_strategy].valueWithdrawn += _changeBalane.valueWithdrawn;
        strategyDeposits[_strategy].rewardsEarned += _changeBalane.rewardsEarned;
        strategyDeposits[_strategy].amountSlashed += _changeBalane.amountSlashed;
        emit StrategyBalanceUpdated(_changeBalane);
    }
}
