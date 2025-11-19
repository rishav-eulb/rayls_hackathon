// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { ERC4626Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { IERC20 } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { IVaultStrategy as IStrategy } from "../interfaces/IVaultStrategy.sol";
import { IRaylsVaultRegistry } from "../interfaces/IRaylsVaultRegistry.sol";
import { IRaylsVault } from "../interfaces/IRaylsVault.sol";
import { IStrategyManager } from "../interfaces/IStrategyManager.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RaylsVault is IRaylsVault, ERC4626Upgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 private constant NEXUS_SIMPLE_VAULT_V1_STORAGE_SLOT =
        0x296b99591b47fa0f35cdc6fc775909f02e6b32516fc46ef9c40e6f39a926cc00;

    struct StrategyAllocation {
        address strategy;
        uint256 targetWeight;   // bps
        uint256 currentBalance; // tracked assets in this strategy
    }

    struct RaylsVaultStorage {
        address registry;
        address strategy;          // legacy single-strategy
        address strategyManager;
        address allocationBot;
        StrategyAllocation[] strategies;
        mapping(address => uint256) strategyIndex;
        bool multiStrategyEnabled;
    }

    error ZeroAddress();
    error ZeroAmount();
    error IncorrectTokenAddress();
    error NotOwner();
    error NotBot();
    error InvalidWeight();
    error StrategyNotFound();
    error InsufficientBalance();
    error MultiStrategyNotEnabled();

    event StrategyManagerSet(address indexed strategyManager);
    event AllocationBotSet(address indexed bot);
    event StrategyAdded(address indexed strategy, uint256 targetWeight);
    event StrategyRemoved(address indexed strategy);
    event StrategyWeightUpdated(address indexed strategy, uint256 newWeight);
    event Rebalanced(address[] strategies, uint256[] amounts);
    event MultiStrategyEnabled(bool enabled);

    modifier onlyRegistryOwner() {
        if (msg.sender != OwnableUpgradeable(_getVaultStorage().registry).owner()) revert NotOwner();
        _;
    }

    modifier onlyBot() {
        RaylsVaultStorage storage ds = _getVaultStorage();
        if (msg.sender != ds.allocationBot && msg.sender != OwnableUpgradeable(ds.registry).owner()) {
            revert NotBot();
        }
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address asset_,
        string memory name_,
        string memory symbol_,
        address registry_,
        address strategy_
    )
        external
        initializer
    {
        if (asset_ == address(0) || strategy_ == address(0)) revert ZeroAddress();

        // NEW: ensure strategy operates on the same asset as the vault
        if (address(IStrategy(strategy_).want()) != asset_) revert IncorrectTokenAddress();

        __ERC20_init(name_, symbol_);
        __ERC4626_init(IERC20(asset_));
        __Pausable_init();

        RaylsVaultStorage storage ds = _getVaultStorage();
        ds.strategy = strategy_;
        ds.registry = registry_;
    }

    // ---------------- VIEWS ----------------

    function getRegistry() external view returns (address) {
        return _getVaultStorage().registry;
    }

    function getStrategy() external view returns (address) {
        return _getVaultStorage().strategy;
    }

    function getStrategyManager() external view returns (address) {
        return _getVaultStorage().strategyManager;
    }

    function getAllocationBot() external view returns (address) {
        return _getVaultStorage().allocationBot;
    }

    function isMultiStrategyEnabled() external view returns (bool) {
        return _getVaultStorage().multiStrategyEnabled;
    }

    function getStrategies() external view returns (StrategyAllocation[] memory) {
        return _getVaultStorage().strategies;
    }

    function getStrategyCount() external view returns (uint256) {
        return _getVaultStorage().strategies.length;
    }

    // ------------- ERC4626 OVERRIDES -------------

    function totalAssets() public view override(ERC4626Upgradeable) returns (uint256) {
        RaylsVaultStorage storage ds = _getVaultStorage();
        
        if (paused()) {
            return IERC20(asset()).balanceOf(address(this));
        } else if (ds.multiStrategyEnabled) {
            uint256 total = IERC20(asset()).balanceOf(address(this));
            for (uint256 i = 0; i < ds.strategies.length; i++) {
                total += IStrategy(ds.strategies[i].strategy).getTotalAssets();
            }
            return total;
        } else {
            return IStrategy(ds.strategy).getTotalAssets();
        }
    }

    function deposit(uint256 assets, address receiver)
        public
        override
        whenNotPaused
        returns (uint256 shares)
    {
        _depositPrechecks(assets, receiver);
        
        RaylsVaultStorage storage ds = _getVaultStorage();
        
        if (!ds.multiStrategyEnabled && ds.strategy != address(0)) {
            IStrategy(ds.strategy).harvest();
        }
        
        shares = super.deposit(assets, receiver);

        // NEW: report single-strategy deposit to StrategyManager
        if (!ds.multiStrategyEnabled && ds.strategyManager != address(0)) {
            _reportToStrategyManager(
                ds.strategy,
                IStrategyManager.StrategyStruct({
                    valueDeposited: assets,
                    rewardsEarned: 0,
                    amountSlashed: 0,
                    valueWithdrawn: 0
                })
            );
        }

        _pushToStrategy(assets, shares, receiver);
    }

    function _depositPrechecks(uint256 _assets, address _receiver) private pure {
        if (_assets == 0) revert ZeroAmount();
        if (_receiver == address(0)) revert ZeroAddress();
    }

    function mint(uint256 shares, address receiver)
        public
        override
        whenNotPaused
        returns (uint256 assets)
    {
        _depositPrechecks(shares, receiver);
        
        RaylsVaultStorage storage ds = _getVaultStorage();
        
        if (!ds.multiStrategyEnabled && ds.strategy != address(0)) {
            IStrategy(ds.strategy).harvest();
        }
        
        assets = super.mint(shares, receiver);

        // NEW: report single-strategy deposit in asset terms
        if (!ds.multiStrategyEnabled && ds.strategyManager != address(0)) {
            _reportToStrategyManager(
                ds.strategy,
                IStrategyManager.StrategyStruct({
                    valueDeposited: assets,
                    rewardsEarned: 0,
                    amountSlashed: 0,
                    valueWithdrawn: 0
                })
            );
        }

        _pushToStrategy(assets, shares, receiver);
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    )
        internal
        override
    {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }
        _burn(owner, shares);
        
        RaylsVaultStorage storage ds = _getVaultStorage();
        
        if (!paused()) {
            if (ds.multiStrategyEnabled) {
                _multiStrategyWithdraw(assets, receiver);
                emit Withdraw(caller, receiver, owner, assets, shares);
            } else {
                uint256 beforeBal = IERC20(asset()).balanceOf(address(this));
                _callWithdraw(ds.strategy, receiver, assets, shares);
                uint256 afterBal = IERC20(asset()).balanceOf(address(this));
                uint256 paid = afterBal - beforeBal;

                // NEW: report single-strategy withdrawal
                if (ds.strategyManager != address(0) && paid > 0) {
                    _reportToStrategyManager(
                        ds.strategy,
                        IStrategyManager.StrategyStruct({
                            valueDeposited: 0,
                            rewardsEarned: 0,
                            amountSlashed: 0,
                            valueWithdrawn: paid
                        })
                    );
                }

                SafeERC20.safeTransfer(IERC20(asset()), receiver, paid);
                emit Withdraw(caller, receiver, owner, paid, shares);
            }
        } else {
            SafeERC20.safeTransfer(IERC20(asset()), receiver, assets);
            emit Withdraw(caller, receiver, owner, assets, shares);
        }
    }

    function _multiStrategyWithdraw(uint256 assets, address receiver) internal {
        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
        
        if (vaultBalance >= assets) {
            SafeERC20.safeTransfer(IERC20(asset()), receiver, assets);
            return;
        }
        
        uint256 remaining = assets - vaultBalance;
        RaylsVaultStorage storage ds = _getVaultStorage();
        
        uint256[] memory sortedIndices = _getSortedStrategyIndicesByBalance();
        
        for (uint256 j = 0; j < sortedIndices.length && remaining > 0; j++) {
            uint256 i = sortedIndices[j];
            address strategy = ds.strategies[i].strategy;
            uint256 trackedBalance = ds.strategies[i].currentBalance;
            
            uint256 actualBalance = IStrategy(strategy).getTotalAssets();
            if (actualBalance == 0) continue;
            
            // NEW: detect rewards or losses
            if (ds.strategyManager != address(0)) {
                if (actualBalance > trackedBalance) {
                    uint256 rewardsEarned = actualBalance - trackedBalance;
                    _reportToStrategyManager(
                        strategy,
                        IStrategyManager.StrategyStruct({
                            valueDeposited: 0,
                            rewardsEarned: rewardsEarned,
                            amountSlashed: 0,
                            valueWithdrawn: 0
                        })
                    );
                } else if (actualBalance < trackedBalance) {
                    uint256 loss = trackedBalance - actualBalance;
                    _reportToStrategyManager(
                        strategy,
                        IStrategyManager.StrategyStruct({
                            valueDeposited: 0,
                            rewardsEarned: 0,
                            amountSlashed: loss,
                            valueWithdrawn: 0
                        })
                    );
                }
            }
            
            uint256 toWithdraw = remaining > actualBalance ? actualBalance : remaining;
            IStrategy(strategy).withdraw(toWithdraw);
            
            uint256 newActualBalance = IStrategy(strategy).getTotalAssets();
            ds.strategies[i].currentBalance = newActualBalance;
            
            if (ds.strategyManager != address(0)) {
                _reportToStrategyManager(
                    strategy,
                    IStrategyManager.StrategyStruct({
                        valueDeposited: 0,
                        rewardsEarned: 0,
                        amountSlashed: 0,
                        valueWithdrawn: toWithdraw
                    })
                );
            }
            
            remaining -= toWithdraw;
        }
        
        uint256 finalBalance = IERC20(asset()).balanceOf(address(this));
        if (finalBalance < assets) {
            revert InsufficientBalance();
        }
        
        SafeERC20.safeTransfer(IERC20(asset()), receiver, assets);
    }

    function _getSortedStrategyIndicesByBalance() internal view returns (uint256[] memory) {
        RaylsVaultStorage storage ds = _getVaultStorage();
        uint256 length = ds.strategies.length;
        
        uint256[] memory indices = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            indices[i] = i;
        }
        
        for (uint256 i = 0; i < length; i++) {
            for (uint256 j = i + 1; j < length; j++) {
                uint256 balanceI = IStrategy(ds.strategies[indices[i]].strategy).getTotalAssets();
                uint256 balanceJ = IStrategy(ds.strategies[indices[j]].strategy).getTotalAssets();
                
                if (balanceJ < balanceI) {
                    uint256 temp = indices[i];
                    indices[i] = indices[j];
                    indices[j] = temp;
                }
            }
        }
        
        return indices;
    }

    // -------- STRATEGY MANAGEMENT --------

    function setStrategyManager(address _strategyManager) external onlyRegistryOwner {
        if (_strategyManager == address(0)) revert ZeroAddress();
        _getVaultStorage().strategyManager = _strategyManager;
        emit StrategyManagerSet(_strategyManager);
    }

    function setAllocationBot(address _bot) external onlyRegistryOwner {
        if (_bot == address(0)) revert ZeroAddress();
        _getVaultStorage().allocationBot = _bot;
        emit AllocationBotSet(_bot);
    }

    function setMultiStrategyEnabled(bool _enabled) external onlyRegistryOwner {
        _getVaultStorage().multiStrategyEnabled = _enabled;
        emit MultiStrategyEnabled(_enabled);
    }

    function addStrategy(address _strategy, uint256 _targetWeight) external onlyRegistryOwner {
        if (_strategy == address(0)) revert ZeroAddress();
        if (_targetWeight > 10000) revert InvalidWeight();
        
        RaylsVaultStorage storage ds = _getVaultStorage();

        // NEW: enforce asset compatibility
        if (address(IStrategy(_strategy).want()) != asset()) revert IncorrectTokenAddress();
        
        for (uint256 i = 0; i < ds.strategies.length; i++) {
            if (ds.strategies[i].strategy == _strategy) revert("Strategy already exists");
        }
        
        ds.strategies.push(StrategyAllocation({
            strategy: _strategy,
            targetWeight: _targetWeight,
            currentBalance: 0
        }));
        
        ds.strategyIndex[_strategy] = ds.strategies.length - 1;
        emit StrategyAdded(_strategy, _targetWeight);
    }

    function updateStrategyWeight(address _strategy, uint256 _newWeight) external onlyRegistryOwner {
        if (_newWeight > 10000) revert InvalidWeight();
        
        RaylsVaultStorage storage ds = _getVaultStorage();
        uint256 index = ds.strategyIndex[_strategy];
        
        if (index >= ds.strategies.length || ds.strategies[index].strategy != _strategy) {
            revert StrategyNotFound();
        }
        
        ds.strategies[index].targetWeight = _newWeight;
        emit StrategyWeightUpdated(_strategy, _newWeight);
    }

    function removeStrategy(address _strategy) external onlyRegistryOwner {
        RaylsVaultStorage storage ds = _getVaultStorage();
        uint256 index = ds.strategyIndex[_strategy];
        
        if (index >= ds.strategies.length || ds.strategies[index].strategy != _strategy) {
            revert StrategyNotFound();
        }
        
        if (ds.strategies[index].currentBalance > 0) {
            revert InsufficientBalance();
        }
        
        uint256 lastIndex = ds.strategies.length - 1;
        if (index != lastIndex) {
            StrategyAllocation memory lastStrategy = ds.strategies[lastIndex];
            ds.strategies[index] = lastStrategy;
            ds.strategyIndex[lastStrategy.strategy] = index;
        }
        
        ds.strategies.pop();
        delete ds.strategyIndex[_strategy];
        emit StrategyRemoved(_strategy);
    }

    function syncStrategyBalances() public {
        RaylsVaultStorage storage ds = _getVaultStorage();
        if (!ds.multiStrategyEnabled) revert MultiStrategyNotEnabled();
        
        for (uint256 i = 0; i < ds.strategies.length; i++) {
            address strategy = ds.strategies[i].strategy;
            uint256 oldBalance = ds.strategies[i].currentBalance;
            uint256 actualBalance = IStrategy(strategy).getTotalAssets();
            
            ds.strategies[i].currentBalance = actualBalance;
            
            if (ds.strategyManager != address(0)) {
                if (actualBalance > oldBalance) {
                    uint256 rewardsEarned = actualBalance - oldBalance;
                    _reportToStrategyManager(
                        strategy,
                        IStrategyManager.StrategyStruct({
                            valueDeposited: 0,
                            rewardsEarned: rewardsEarned,
                            amountSlashed: 0,
                            valueWithdrawn: 0
                        })
                    );
                } else if (actualBalance < oldBalance) {
                    uint256 loss = oldBalance - actualBalance;
                    _reportToStrategyManager(
                        strategy,
                        IStrategyManager.StrategyStruct({
                            valueDeposited: 0,
                            rewardsEarned: 0,
                            amountSlashed: loss,
                            valueWithdrawn: 0
                        })
                    );
                }
            }
        }
    }

    function rebalance(
        uint256[] calldata _depositAmounts,
        uint256[] calldata _withdrawAmounts
    ) external onlyBot {
        RaylsVaultStorage storage ds = _getVaultStorage();
        if (!ds.multiStrategyEnabled) revert MultiStrategyNotEnabled();
        
        uint256 strategyCount = ds.strategies.length;
        if (_depositAmounts.length != strategyCount || _withdrawAmounts.length != strategyCount) {
            revert("Invalid array lengths");
        }
        
        syncStrategyBalances();
        
        for (uint256 i = 0; i < strategyCount; i++) {
            if (_withdrawAmounts[i] > 0) {
                address strategy = ds.strategies[i].strategy;
                IStrategy(strategy).withdraw(_withdrawAmounts[i]);
                ds.strategies[i].currentBalance -= _withdrawAmounts[i];
                
                if (ds.strategyManager != address(0)) {
                    _reportToStrategyManager(
                        strategy,
                        IStrategyManager.StrategyStruct({
                            valueDeposited: 0,
                            rewardsEarned: 0,
                            amountSlashed: 0,
                            valueWithdrawn: _withdrawAmounts[i]
                        })
                    );
                }
            }
        }
        
        address[] memory strategiesArr = new address[](strategyCount);
        uint256[] memory amounts = new uint256[](strategyCount);
        
        for (uint256 i = 0; i < strategyCount; i++) {
            if (_depositAmounts[i] > 0) {
                address strategy = ds.strategies[i].strategy;
                IERC20(asset()).safeTransfer(strategy, _depositAmounts[i]);
                IStrategy(strategy).deposit();
                ds.strategies[i].currentBalance += _depositAmounts[i];
                
                if (ds.strategyManager != address(0)) {
                    _reportToStrategyManager(
                        strategy,
                        IStrategyManager.StrategyStruct({
                            valueDeposited: _depositAmounts[i],
                            rewardsEarned: 0,
                            amountSlashed: 0,
                            valueWithdrawn: 0
                        })
                    );
                }
            }
            strategiesArr[i] = ds.strategies[i].strategy;
            amounts[i] = ds.strategies[i].currentBalance;
        }
        
        emit Rebalanced(strategiesArr, amounts);
    }

    // ---------- PAUSING / EMERGENCY ----------

    function pause() external onlyRegistryOwner {
        _pause();
    }

    function unpause() external onlyRegistryOwner {
        _unpause();
    }

    function emergencyWithdraw() public onlyRegistryOwner whenPaused {
        RaylsVaultStorage storage ds = _getVaultStorage();
        
        if (ds.multiStrategyEnabled) {
            for (uint256 i = 0; i < ds.strategies.length; i++) {
                IStrategy(ds.strategies[i].strategy).withdrawAll();
                ds.strategies[i].currentBalance = 0;
            }
        } else {
            IStrategy(ds.strategy).withdrawAll();
        }
    }

    // ---------- INTERNAL UTILITIES ----------

    function _pushToStrategy(uint256 amount, uint256 shares, address receiver) internal {
        if (amount == 0) return;
        RaylsVaultStorage storage ds = _getVaultStorage();
        
        if (ds.multiStrategyEnabled) {
            return;
        }
        
        _callDeposit(ds.strategy, receiver, shares, amount);
    }

    function _callDeposit(address strategy, address receiver, uint256 shares, uint256 assets) internal {
        IERC20(asset()).safeTransfer(strategy, assets);

        (bool ok, bytes memory ret) =
            strategy.call(abi.encodeWithSignature("depositFor(address,uint256,uint256)", receiver, assets, shares));

        if (ok) return;

        if (ret.length == 0) {
            IStrategy(strategy).deposit();
            return;
        }

        assembly {
            revert(add(ret, 32), mload(ret))
        }
    }

    function _callWithdraw(address strategy, address receiver, uint256 assets, uint256 shares) internal {
        (bool ok, bytes memory ret) =
            strategy.call(abi.encodeWithSignature("withdrawFor(address,uint256,uint256)", receiver, assets, shares));

        if (ok) return;

        if (ret.length == 0) {
            IStrategy(strategy).withdraw(assets);
            return;
        }

        assembly {
            revert(add(ret, 32), mload(ret))
        }
    }

    function _reportToStrategyManager(
        address strategy,
        IStrategyManager.StrategyStruct memory metrics
    ) internal {
        RaylsVaultStorage storage ds = _getVaultStorage();
        if (ds.strategyManager == address(0)) return;
        
        try IStrategyManager(ds.strategyManager).updateStrategy(strategy, metrics) {
        } catch {
        }
    }

    function version() external pure virtual returns (string memory) {
        return "V1";
    }

    function _getVaultStorage() private pure returns (RaylsVaultStorage storage ds) {
        bytes32 slot = NEXUS_SIMPLE_VAULT_V1_STORAGE_SLOT;
        assembly {
            ds.slot := slot
        }
    }
}
