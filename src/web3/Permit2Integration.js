import { ethers } from 'ethers';

// Permit2 contract address (same on all chains)
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

// Permit2 ABI (minimal)
const PERMIT2_ABI = [
  'function permit(address owner, tuple(address token, uint160 amount, uint48 expiration, uint48 nonce) permitSingle, address spender, uint256 sigDeadline, bytes calldata signature) external',
  'function permitTransferFrom(tuple(address from, address to, uint160 amount, address token) transferDetails, tuple(address token, uint256 amount, uint256 nonce, uint256 deadline) permit, address owner, bytes calldata signature) external',
  'function allowance(address owner, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)'
];

export class Permit2Integration {
  constructor(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    this.permit2Contract = new ethers.Contract(PERMIT2_ADDRESS, PERMIT2_ABI, signer);
    
    // Domain for EIP-712 signatures
    this.DOMAIN_NAME = 'Permit2';
    this.DOMAIN_VERSION = '1';
  }

  async getDomain() {
    const chainId = await this.provider.getNetwork().then(n => n.chainId);
    
    return {
      name: this.DOMAIN_NAME,
      version: this.DOMAIN_VERSION,
      chainId: chainId,
      verifyingContract: PERMIT2_ADDRESS
    };
  }

  // Create permit data for WETCAT token spending
  async createPermitData(tokenAddress, spender, amount, deadline = null) {
    const owner = await this.signer.getAddress();
    
    // Get current nonce
    const allowanceData = await this.permit2Contract.allowance(owner, tokenAddress, spender);
    const nonce = allowanceData.nonce;
    
    // Set deadline to 1 hour from now if not specified
    if (!deadline) {
      deadline = Math.floor(Date.now() / 1000) + 3600;
    }
    
    const permitSingle = {
      details: {
        token: tokenAddress,
        amount: amount,
        expiration: deadline,
        nonce: nonce
      },
      spender: spender,
      sigDeadline: deadline
    };
    
    return permitSingle;
  }

  // Sign permit for gasless approval
  async signPermit(tokenAddress, spender, amount) {
    const owner = await this.signer.getAddress();
    const permitData = await this.createPermitData(tokenAddress, spender, amount);
    const domain = await this.getDomain();
    
    // EIP-712 types
    const types = {
      PermitSingle: [
        { name: 'details', type: 'PermitDetails' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' }
      ],
      PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint160' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' }
      ]
    };
    
    // Sign the permit
    const signature = await this.signer._signTypedData(domain, types, permitData);
    
    return {
      permitData,
      signature,
      owner
    };
  }

  // Create transfer permit for direct token transfers
  async signTransferPermit(tokenAddress, to, amount) {
    const from = await this.signer.getAddress();
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const nonce = Date.now(); // Simple nonce strategy
    
    const domain = await this.getDomain();
    
    // Transfer permit data
    const permit = {
      permitted: {
        token: tokenAddress,
        amount: amount
      },
      nonce: nonce,
      deadline: deadline
    };
    
    const transferDetails = {
      from: from,
      to: to,
      amount: amount,
      token: tokenAddress
    };
    
    // EIP-712 types for transfer
    const types = {
      PermitTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ],
      TokenPermissions: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    };
    
    // Sign the transfer permit
    const signature = await this.signer._signTypedData(domain, types, permit);
    
    return {
      permit,
      transferDetails,
      signature,
      owner: from
    };
  }

  // Execute gasless approval (called by relayer/backend)
  async executePermit(permitData, signature, owner) {
    const tx = await this.permit2Contract.permit(
      owner,
      permitData.details,
      permitData.spender,
      permitData.sigDeadline,
      signature
    );
    
    return tx.wait();
  }

  // Execute gasless transfer (called by relayer/backend)
  async executeTransfer(transferDetails, permit, owner, signature) {
    const tx = await this.permit2Contract.permitTransferFrom(
      transferDetails,
      permit,
      owner,
      signature
    );
    
    return tx.wait();
  }

  // Check if user has approved Permit2 for WETCAT token
  async hasApprovedPermit2(tokenAddress, userAddress = null) {
    if (!userAddress) {
      userAddress = await this.signer.getAddress();
    }
    
    // Create token contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function allowance(address owner, address spender) view returns (uint256)'],
      this.provider
    );
    
    // Check if user has approved Permit2
    const allowance = await tokenContract.allowance(userAddress, PERMIT2_ADDRESS);
    return allowance > 0;
  }

  // One-time approval of Permit2 (required before using permits)
  async approvePermit2(tokenAddress) {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      this.signer
    );
    
    // Approve max uint256 for Permit2
    const tx = await tokenContract.approve(
      PERMIT2_ADDRESS,
      ethers.MaxUint256
    );
    
    return tx.wait();
  }

  // Helper to create gasless reward claim
  async createGaslessRewardClaim(wetcatTokenAddress, gameRewardsAddress, amount) {
    // First check if Permit2 is approved
    const hasApproval = await this.hasApprovedPermit2(wetcatTokenAddress);
    
    if (!hasApproval) {
      throw new Error('Must approve Permit2 first. Call approvePermit2()');
    }
    
    // Create permit for game rewards contract
    const { permitData, signature, owner } = await this.signPermit(
      wetcatTokenAddress,
      gameRewardsAddress,
      amount
    );
    
    return {
      permitData,
      signature,
      owner,
      tokenAddress: wetcatTokenAddress,
      spender: gameRewardsAddress,
      amount
    };
  }
}

// Example usage in World App:
/*
// In the game rewards claim flow:
const permit2 = new Permit2Integration(provider, signer);

// 1. One-time: Approve Permit2 (only needed once per user)
if (!await permit2.hasApprovedPermit2(WETCAT_TOKEN_ADDRESS)) {
  await permit2.approvePermit2(WETCAT_TOKEN_ADDRESS);
}

// 2. Create gasless claim (no gas needed from user)
const claimData = await permit2.createGaslessRewardClaim(
  WETCAT_TOKEN_ADDRESS,
  GAME_REWARDS_ADDRESS,
  ethers.parseEther("100") // 100 WETCAT reward
);

// 3. Send to backend/relayer
const response = await fetch('/api/claim-gasless', {
  method: 'POST',
  body: JSON.stringify(claimData)
});
*/