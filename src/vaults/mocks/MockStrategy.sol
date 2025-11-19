// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { IVaultStrategy } from "../../interfaces/IVaultStrategy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ERC4626ChildStrategy
 * @notice Strategy that deposits the vault's asset into a child ERC4626 vault.
 */
contract ERC4626ChildStrategy is IVaultStrategy {
    using SafeERC20 for IERC20;

    IERC20 public immutable WANT;
    IERC4626 public immutable CHILD_VAULT;
    address private _vault; // RaylsVault that owns this strategy

    error NotVault();

    constructor(address want_, address childVault_) {
        require(want_ != address(0) && childVault_ != address(0), "Zero address");
        WANT = IERC20(want_);
        CHILD_VAULT = IERC4626(childVault_);
    }

    // -------------------------------
    // IVaultStrategy implementation
    // -------------------------------

    /// @notice Token that this strategy manages (must match RaylsVault.asset()).
    function want() external view override returns (IERC20) {
        return WANT;
    }

    /// @notice Vault that controls this strategy.
    function getVault() external view override returns (address) {
        return _vault;
    }

    /// @notice Set the controlling vault (only once).
    function setVault(address vault_) external override {
        require(_vault == address(0), "Vault already set");
        require(vault_ != address(0), "Invalid vault");
        _vault = vault_;
    }

    /// @notice Total underlying assets managed by this strategy.
    /// @dev Computed via child ERC4626 vault's convertToAssets().
    function getTotalAssets() external view override returns (uint256) {
        uint256 shares = CHILD_VAULT.balanceOf(address(this));
        if (shares == 0) return 0;
        return CHILD_VAULT.convertToAssets(shares);
    }

    /// @notice Deposit all idle WANT in this contract into the child vault.
    /// @dev RaylsVault already transferred assets here before calling this.
    function deposit() external override {
        uint256 bal = WANT.balanceOf(address(this));
        if (bal == 0) return;

        WANT.safeIncreaseAllowance(address(CHILD_VAULT), bal);
        CHILD_VAULT.deposit(bal, address(this));
    }

    /// @notice Withdraw a given amount of WANT back to the vault.
    /// @dev RaylsVault expects to receive WANT; we redeem from CHILD_VAULT.
    function withdraw(uint256 amount) external override {
        if (msg.sender != _vault) revert NotVault();
        if (amount == 0) return;

        // Calculate how many shares to redeem for this asset amount
        uint256 shares = CHILD_VAULT.previewWithdraw(amount);
        if (shares == 0) return;

        CHILD_VAULT.withdraw(amount, _vault, address(this));
    }

    /// @notice Withdraw everything back to the vault (for emergencyWithdraw).
    function withdrawAll() external override {
        if (msg.sender != _vault) revert NotVault();
        uint256 shares = CHILD_VAULT.balanceOf(address(this));
        if (shares == 0) return;

        CHILD_VAULT.redeem(shares, _vault, address(this));
    }

    /// @notice Harvest hook.
    /// @dev If CHILD_VAULT is auto-compounding, this may be a no-op.
    function harvest() external override {
        // If the child vault accrues yield in its share price,
        // there might be nothing to do here.
        // For more complex protocols, you'd:
        // - claim rewards, swap to WANT, and deposit again.
    }

    // ------------------------------------
    // Optional: depositFor / withdrawFor
    // ------------------------------------

    /// @notice Called by RaylsVault._callDeposit if depositFor exists.
    /// @dev Assets have already been transferred to this strategy.
    function depositFor(address /*receiver*/, uint256 assets, uint256 /*shares*/) external {
        if (msg.sender != _vault) revert NotVault();
        if (assets == 0) return;

        WANT.safeIncreaseAllowance(address(CHILD_VAULT), assets);
        CHILD_VAULT.deposit(assets, address(this));
    }

    /// @notice Called by RaylsVault._callWithdraw if withdrawFor exists.
    /// @dev We redeem from child vault and send assets directly to receiver.
    function withdrawFor(address receiver, uint256 assets, uint256 /*shares*/) external {
        if (msg.sender != _vault) revert NotVault();
        if (assets == 0) return;

        uint256 shares = CHILD_VAULT.previewWithdraw(assets);
        if (shares == 0) return;

        CHILD_VAULT.withdraw(assets, receiver, address(this));
    }
}
