// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/PaymentEscrow.sol";


contract PaymentEscrowDeployment is Script {

    function run() external {

         uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
         
        vm.startBroadcast(deployerPrivateKey);

        MockERC20 token = new MockERC20();

        PaymentEscrow escrow = new PaymentEscrow(address(token));

        vm.stopBroadcast();

        console.log("MockERC20 deployed at:", address(token));
        console.log("PaymentEscrow deployed at:", address(escrow));
    }
}
