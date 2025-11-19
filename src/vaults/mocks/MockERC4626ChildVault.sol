// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ExtendedChildERC4626Vault is ERC20, ERC4626, Ownable, Pausable, ReentrancyGuard {
    /// @notice Maximum total assets allowed in the vault (0 = no cap)
    uint256 public depositCap;

    /// @dev Override decimals to resolve ambiguity between ERC20 and ERC4626
    function decimals() public view virtual override(ERC20, ERC4626) returns (uint8) {
        return super.decimals();
    }

    /// @notice If true, only whitelisted addresses can deposit/mint
    bool public restrictedDeposits;

    /// @notice Whitelist of addresses allowed to deposit when `restrictedDeposits == true`
    mapping(address => bool) public isWhitelistedDepositor;

    event DepositCapUpdated(uint256 newCap);
    event RestrictedDepositsUpdated(bool restricted);
    event DepositorWhitelisted(address indexed depositor, bool allowed);

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_
    )
        ERC20(name_, symbol_)
        ERC4626(asset_)
        Ownable(msg.sender)
    {}

    // --------------------------------------------------
    // Admin configuration
    // --------------------------------------------------

    /// @notice Set a cap on total assets (in `asset()` units). 0 = no cap.
    function setDepositCap(uint256 _cap) external onlyOwner {
        depositCap = _cap;
        emit DepositCapUpdated(_cap);
    }

    /// @notice Enable or disable restricted deposit mode.
    /// @dev When true, only whitelisted addresses can deposit/mint.
    function setRestrictedDeposits(bool _restricted) external onlyOwner {
        restrictedDeposits = _restricted;
        emit RestrictedDepositsUpdated(_restricted);
    }

    /// @notice Add or remove a whitelisted depositor.
    function setWhitelistedDepositor(address _depositor, bool _allowed) external onlyOwner {
        isWhitelistedDepositor[_depositor] = _allowed;
        emit DepositorWhitelisted(_depositor, _allowed);
    }

    /// @notice Pause all deposits, mints, withdrawals, and redeems.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause all operations.
    function unpause() external onlyOwner {
        _unpause();
    }

    // --------------------------------------------------
    // Internal helpers
    // --------------------------------------------------

    /// @dev Check deposit restrictions (cap + whitelist).
    function _beforeDepositCheck(address caller, uint256 assets) internal view {
        if (restrictedDeposits && !isWhitelistedDepositor[caller]) {
            revert("Deposits restricted");
        }

        if (depositCap != 0) {
            // totalAssets() is an ERC4626 view that returns current managed assets
            uint256 newTotal = totalAssets() + assets;
            if (newTotal > depositCap) {
                revert("Deposit cap exceeded");
            }
        }
    }

    // --------------------------------------------------
    // ERC4626 overrides: deposit / mint / withdraw / redeem
    // --------------------------------------------------

    /// @inheritdoc ERC4626
    function deposit(uint256 assets, address receiver)
        public
        override(ERC4626)
        whenNotPaused
        nonReentrant
        returns (uint256 shares)
    {
        _beforeDepositCheck(msg.sender, assets);
        shares = super.deposit(assets, receiver);
    }

    /// @inheritdoc ERC4626
    function mint(uint256 shares, address receiver)
        public
        override(ERC4626)
        whenNotPaused
        nonReentrant
        returns (uint256 assets)
    {
        // Figure out required assets, then apply checks
        assets = previewMint(shares);
        _beforeDepositCheck(msg.sender, assets);
        assets = super.mint(shares, receiver);
    }

    /// @inheritdoc ERC4626
    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    )
        public
        override(ERC4626)
        whenNotPaused
        nonReentrant
        returns (uint256 shares)
    {
        shares = super.withdraw(assets, receiver, owner_);
    }

    /// @inheritdoc ERC4626
    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    )
        public
        override(ERC4626)
        whenNotPaused
        nonReentrant
        returns (uint256 assets)
    {
        assets = super.redeem(shares, receiver, owner_);
    }

    // --------------------------------------------------
    // Convenience / helper views
    // --------------------------------------------------

    /// @notice Return the underlying asset explicitly.
    function underlying() external view returns (address) {
        return address(asset());
    }

    /// @notice Returns true if an address can deposit when restrictedDeposits is enabled.
    function canDeposit(address depositor) external view returns (bool) {
        if (!restrictedDeposits) return true;
        return isWhitelistedDepositor[depositor];
    }

    // --------------------------------------------------
    // Owner rescue utilities
    // --------------------------------------------------

    /// @notice Rescue any ERC20 accidentally sent to this contract (except the underlying asset).
    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(asset()), "Cannot rescue underlying");
        IERC20(token).transfer(to, amount);
    }
}
