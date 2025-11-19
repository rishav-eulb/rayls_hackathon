/**
 * Static Knowledge Base for Nexus Vault System
 * 
 * This contains detailed information about vault mechanics, DeFi concepts,
 * and how-to guides that the AI can reference.
 */

export const VAULT_KNOWLEDGE = {
  concepts: {
    shares: `Vault shares are like receipts for your deposit. When you deposit tokens:
    
    - You receive shares proportional to your deposit value
    - Share price = Total Vault Assets / Total Shares
    - As strategies earn yield, share value increases
    - Example: Deposit 100 tokens, get 95 shares. Later those 95 shares might be worth 110 tokens
    - Your share count stays the same, but value grows
    - When withdrawing, you burn shares to get back underlying tokens`,

    rebalancing: `The rebalancing bot automatically maintains optimal fund distribution:
    
    - Runs periodically (typically every hour)
    - Only rebalances if any strategy deviates > threshold (usually 1%)
    - Withdraws from over-allocated strategies
    - Deposits to under-allocated strategies
    - Ensures your funds maintain target percentages
    - Example: Target is 33/33/33, but it drifts to 40/30/30 → bot rebalances back to 33/33/33
    - You don't need to do anything - it's fully automated
    - Costs gas but improves overall returns`,

    strategies: `Strategies are different DeFi protocols where your funds are deployed:
    
    - Each strategy has a target allocation weight (e.g., 30%, 40%, 30%)
    - Your deposit is automatically split across all active strategies
    - Strategies might include: Lending protocols, Liquidity pools, Yield farms, etc.
    - Diversification reduces risk - if one fails, you don't lose everything
    - Each strategy earns different APY based on market conditions
    - Vault's total APY is weighted average of all strategy APYs`,

    multiStrategy: `Multi-strategy mode allows the vault to use multiple strategies simultaneously:
    
    - Funds split across 2-10 strategies based on target weights
    - Better risk distribution than single strategy
    - If one strategy underperforms, others compensate
    - Automated rebalancing maintains target allocations
    - New deposits stay in vault until bot distributes them
    - Withdrawals pull from lowest-balance strategies first`,

    erc4626: `ERC4626 is a standard for tokenized vaults:
    
    - Standardizes how vaults handle deposits/withdrawals
    - Makes vaults composable with other DeFi protocols
    - Your vault shares are ERC20 tokens (can transfer, trade, etc.)
    - Standard functions: deposit(), withdraw(), mint(), redeem()
    - Ensures vaults work consistently across platforms`,

    tvl: `Total Value Locked (TVL) is the total amount of assets in the vault:
    
    - Includes all user deposits across all strategies
    - Higher TVL often means more trusted/established vault
    - TVL changes as users deposit/withdraw and strategies earn yield
    - Check TVL to gauge vault popularity and liquidity`,

    apy: `Annual Percentage Yield (APY) shows yearly return rate:
    
    - Includes compound interest (interest on interest)
    - Higher than APR because of compounding
    - Example: 10% APY compounded daily > 10% APR
    - Vault APY is weighted average of strategy APYs
    - Historical/estimated, not guaranteed
    - Can change based on market conditions`,

    slippage: `Slippage is the price difference between expected and actual execution:
    
    - Set as percentage tolerance (0.5%, 1%, 2%, etc.)
    - 1% slippage = willing to accept up to 1% worse price
    - Higher slippage = faster execution, potentially worse price
    - Lower slippage = better price protection, might fail if market volatile
    - For stablecoin vaults, 0.5% is usually sufficient
    - For volatile assets, might need 2-5%`,

    gasOptimization: `Gas costs are transaction fees paid to blockchain:
    
    - Varies based on network congestion
    - Check gas prices before transacting (use tools like Etherscan Gas Tracker)
    - Consider batching multiple actions
    - Deposit/withdraw during low-activity times (weekends, late night UTC)
    - For small amounts, gas might exceed profit
    - Example: $50 deposit with $30 gas = bad; $5000 deposit with $30 gas = fine`,
  },

  risks: {
    smartContractRisk: `Smart contract risk applies to all DeFi protocols:
    
    - Even audited contracts can have vulnerabilities
    - Bugs, exploits, or hacks can lead to loss of funds
    - Risk is higher for newer, unaudited protocols
    - Mitigation: Use audited vaults, start with small amounts, diversify
    - Never deposit more than you can afford to lose`,

    strategyRisk: `Each strategy interacts with external protocols:
    
    - Strategy could be exploited or the external protocol could fail
    - Some strategies are riskier than others (check risk ratings)
    - Leverage strategies amplify both gains AND losses
    - Multi-strategy diversification helps but doesn't eliminate risk
    - Research each strategy's underlying protocol`,

    impermanentLoss: `Impermanent Loss (IL) affects liquidity pool strategies:
    
    - Occurs when token prices diverge from when you deposited
    - If you had just held tokens, you'd have more value
    - "Impermanent" because it only becomes real if you withdraw
    - Can be offset by trading fees earned
    - More severe with volatile token pairs
    - Stablecoin pairs have minimal IL`,

    liquidityRisk: `Liquidity risk affects your ability to withdraw:
    
    - Some strategies may have lock periods
    - Large withdrawals might impact strategy performance
    - During extreme market conditions, withdrawals might be temporarily paused
    - Check if strategies have any withdrawal restrictions`,

    regulatoryRisk: `DeFi regulatory landscape is evolving:
    
    - Regulations vary by country
    - Future regulations could impact protocol operations
    - Some jurisdictions may restrict DeFi access
    - Stay informed about local regulations`,

    volatilityRisk: `Market volatility affects returns:
    
    - APY can fluctuate based on market conditions
    - Strategies might earn less during bear markets
    - Asset prices can drop, affecting total value
    - Stablecoin vaults have less volatility risk`,
  },

  howTo: {
    deposit: `How to Deposit into the Vault:
    
    Step 1: Connect Your Wallet
    - Click "Connect Wallet" button
    - Select your wallet provider (MetaMask, WalletConnect, etc.)
    - Approve connection in wallet popup
    
    Step 2: Approve Token Spending (First Time Only)
    - Click "Deposit" button
    - Enter amount you want to deposit
    - Click "Approve" button
    - Confirm approval transaction in wallet
    - Wait for confirmation (usually 15-60 seconds)
    
    Step 3: Deposit Tokens
    - Enter deposit amount
    - Review estimated shares you'll receive
    - Check slippage tolerance setting
    - Review gas cost estimate
    - Click "Deposit" button
    - Confirm transaction in wallet
    - Wait for confirmation
    
    Step 4: Verify Success
    - You'll see vault shares in your wallet
    - Balance should update in vault UI
    - Transaction will appear in your history
    
    Tips:
    - Start with small amount to test
    - Check gas prices before depositing
    - Small deposits might not be worth gas costs
    - You can deposit multiple times`,

    withdraw: `How to Withdraw from the Vault:
    
    Step 1: Navigate to Withdraw
    - Click "Withdraw" button in vault UI
    - You'll see your current share balance
    
    Step 2: Enter Withdrawal Amount
    - Enter amount in underlying tokens OR shares
    - UI will calculate the other automatically
    - Review estimated amount you'll receive
    
    Step 3: Review Details
    - Check slippage tolerance
    - Review gas cost estimate
    - Note any withdrawal fees (usually 0% for this vault)
    - Verify the amount looks correct
    
    Step 4: Execute Withdrawal
    - Click "Withdraw" button
    - Confirm transaction in wallet
    - Wait for confirmation
    
    Step 5: Verify Success
    - Tokens should appear in your wallet
    - Vault shares should be reduced/burned
    - Check transaction in blockchain explorer
    
    Important Notes:
    - Withdrawals are pulled from strategies (lowest balance first)
    - Large withdrawals might take longer
    - You'll receive underlying tokens, not shares
    - No lock period - withdraw anytime`,

    checkAPY: `How to Check Your Current APY:
    
    Method 1: Vault Dashboard
    - Look for "Current APY" or "Vault APY" on main page
    - This shows the combined APY from all strategies
    - Usually displayed prominently near top
    
    Method 2: Strategy Breakdown
    - Navigate to "Strategies" tab
    - See individual APY for each strategy
    - Your effective APY is weighted average
    
    Method 3: Personal Earnings
    - Go to "My Dashboard" or "Portfolio"
    - See your actual earned amount
    - Compare current value vs deposited amount
    
    Understanding APY Display:
    - Shows historical/estimated rate
    - Updates periodically (daily/weekly)
    - Past performance doesn't guarantee future returns
    - Your personal APY might differ slightly due to timing`,

    checkBalance: `How to Check Your Vault Balance:
    
    Method 1: Vault UI
    - Connect wallet
    - Your balance shows in dashboard
    - Displays both shares owned and token value
    
    Method 2: Wallet
    - Vault shares appear as tokens in wallet
    - Shows share count, not token value
    - Need to check vault UI for token value
    
    Method 3: Blockchain Explorer
    - Go to Etherscan/block explorer
    - Enter your wallet address
    - Find vault share token
    - See share balance (multiply by share price for token value)
    
    Understanding Balance Display:
    - "Shares Owned": Your vault tokens
    - "Token Value": What shares are worth
    - "Deposited": Original deposit amount
    - "Earned": Difference between current and deposited`,

    rebalance: `Understanding Rebalancing (You Don't Need to Do This):
    
    What Happens:
    - Bot runs automatically every hour
    - Checks if strategies deviate from targets
    - If deviation > 1%, triggers rebalance
    - Withdraws from over-allocated strategies
    - Deposits to under-allocated strategies
    
    Why It Matters:
    - Maintains optimal diversification
    - Ensures strategies stay at target weights
    - Improves overall risk/return profile
    
    As a User:
    - You don't need to do anything
    - Rebalancing is fully automated
    - Happens in background
    - Doesn't affect your shares
    - Might see small TVL fluctuations during rebalancing
    
    If You're Curious:
    - Check "Recent Activity" or "Rebalancing History"
    - See when last rebalance occurred
    - View amounts moved between strategies`,

    troubleshooting: `Common Issues and Solutions:
    
    Transaction Failing:
    - Increase slippage tolerance (try 1-2%)
    - Check if you have enough gas (ETH)
    - Verify token balance is sufficient
    - Try again during lower network activity
    
    Approval Not Working:
    - Make sure you confirmed in wallet
    - Wait for approval confirmation before depositing
    - Check if you have enough ETH for gas
    - Try refreshing page after approval confirms
    
    Balance Not Updating:
    - Refresh page
    - Disconnect and reconnect wallet
    - Clear browser cache
    - Check transaction on block explorer
    
    Gas Too High:
    - Wait for lower network activity
    - Check gas prices on Etherscan
    - Consider if transaction value justifies cost
    
    Can't Connect Wallet:
    - Make sure wallet extension is installed
    - Try different browser
    - Check if wallet is unlocked
    - Verify you're on correct network`,
  },

  bestPractices: {
    depositing: `Best Practices for Depositing:
    
    - Start small to test the system
    - Check gas prices before transacting
    - Consider deposit size vs gas cost
    - Understand the strategies being used
    - Review historical APY performance
    - Check vault's total TVL and age
    - Read audit reports if available
    - Don't deposit more than you can afford to lose`,

    withdrawing: `Best Practices for Withdrawing:
    
    - Understand share to token conversion
    - Check if there are any withdrawal fees
    - Consider gas costs
    - Don't withdraw during high volatility
    - Verify withdrawal amount before confirming
    - Keep some shares for continued earning
    - No need to rush - no lock periods`,

    security: `Security Best Practices:
    
    - Never share private keys or seed phrases
    - Verify contract addresses before interacting
    - Use hardware wallet for large amounts
    - Keep wallet software updated
    - Be careful of phishing sites
    - Double-check URLs (bookmark official site)
    - Review transaction details before signing
    - Start with small amounts to test`,

    optimization: `Optimization Tips:
    
    - Deposit during low gas times (weekends, late night UTC)
    - Consider batching multiple actions
    - Larger deposits are more gas-efficient
    - Let shares compound - don't withdraw too frequently
    - Monitor APY trends to optimize timing
    - Diversify across multiple vaults (don't put all eggs in one basket)`,
  },
};

export default VAULT_KNOWLEDGE;

