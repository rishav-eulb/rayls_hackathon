// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

// common errors
error IncorrectTypeID(uint256 _typeId, address _sender);
error NegativePriceError();
error PriceStaleError();
error CallFailed();
error NotDepositContract(address _address);
error NotExecutor(address _address);
error NotStrategyContract(address _address);
error IncorrectTokenAddress(address _tokenAddress);
error IncorrectValue();
error IncorrectMessageAddress(address _sender);
error ZeroAddress();
error MinimumDustAmountError();
error NonPayableFunction();
error DivideByZeroError();
error PermissionDenied();
error InvalidLendingThreshold();

error NotImplemented();

// common events

//deposit events

//deposit
