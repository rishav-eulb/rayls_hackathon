// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import { NexusOwnable } from "./utils/NexusOwnable.sol";
import { NotDepositContract, CallFailed, ZeroAddress, IncorrectValue } from "./utils/Helpers.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/*
    NexusFee contract is responsible for collecting fee from user operations depending on the action performed

    TODO: Implement this contract later on
*/

contract NexusFee is NexusOwnable {
    address public deposit;
    address public owner;

    uint256 public onboardingFee;
    uint256 public withdrawalFee;
    uint256 public maintenanceFee;

    uint256 public constant BASE_POINT = 100_000;

    //error

    //events
    event NexusFeeChanged(uint256 _onboardingFee, uint256 _withdrawalFee, uint256 _maintenanceFee);
    event FeeCollected(address _tokenAddress, uint256 _fee);
    event FeeSent(address _tokenAddress, address _receiver, uint256 _value);

    modifier onlyDeposit() {
        if (msg.sender != deposit) revert NotDepositContract(msg.sender);
        _;
    }

    constructor(address _deposit) {
        deposit = _deposit;
        _ownableInit(msg.sender);
    }

    function changeFee(uint256 _onboardingFee, uint256 _withdrawalFee, uint256 _maintenanceFee) external onlyOwner {
        if (
            _onboardingFee >= BASE_POINT / 10 || _withdrawalFee >= BASE_POINT / 10 || _maintenanceFee >= BASE_POINT / 10
        ) revert IncorrectValue();
        onboardingFee = _onboardingFee;
        withdrawalFee = _withdrawalFee;
        maintenanceFee = _maintenanceFee;
        emit NexusFeeChanged(_onboardingFee, _withdrawalFee, _maintenanceFee);
    }

    function collectFee(address _tokenAddress, uint256 _value) external payable onlyDeposit {
        if (_tokenAddress == address(0)) {
            emit FeeCollected(address(0), msg.value);
        } else {
            SafeERC20.safeTransferFrom(IERC20(_tokenAddress), msg.sender, address(this), _value);
            emit FeeCollected(_tokenAddress, _value);
        }
    }

    function withdrawCollectedFee(address _tokenAddress, uint256 _value, address _receiver) external onlyOwner {
        if (_receiver == address(0)) revert ZeroAddress();
        if (_tokenAddress == address(0)) {
            (bool success,) = _receiver.call{ value: _value }("");
            if (!success) {
                revert CallFailed();
            }
        } else {
            SafeERC20.safeTransfer(IERC20(_tokenAddress), _receiver, _value);
        }
        emit FeeSent(_tokenAddress, _receiver, _value);
    }
}
