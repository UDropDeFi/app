// Web3 Wallet Connection Script for UDrop
document.addEventListener('DOMContentLoaded', function() {
  // Check if Web3Modal dependencies are loaded
  if (typeof Web3Modal === 'undefined' || 
      typeof WalletConnectProvider === 'undefined' || 
      typeof CoinbaseWalletSDK === 'undefined' || 
      typeof ethers === 'undefined') {
    console.error("Web3 dependencies not loaded. Make sure all required libraries are included.");
    
    // Add error handling for connect buttons
    const connectButtons = document.querySelectorAll('.connect-btn');
    connectButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        alert("Web3 wallet connection is not available in this preview. This functionality will work when deployed with proper dependencies.");
      });
    });
    return;
  }

  // Global variables
  let web3;
  let provider;
  let accounts = [];
  let chainId;
  let signer;
  let connected = false;

  // Contract addresses and ABIs
  const UDROP_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890"; // Replace with actual contract address
  const USDC_CONTRACT_ADDRESS = "0x0987654321098765432109876543210987654321"; // Replace with actual USDC contract address

  // ABI snippets for basic functionality
  const UDROP_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];

  const USDC_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];

  // Initialize Web3Modal
  let web3Modal;
  
  async function initWeb3Modal() {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: "YOUR_INFURA_ID", // Replace with your Infura ID
        }
      },
      coinbasewallet: {
        package: CoinbaseWalletSDK,
        options: {
          appName: "UDrop",
          infuraId: "YOUR_INFURA_ID", // Replace with your Infura ID
          rpc: "",
          chainId: 1, // Ethereum Mainnet
          darkMode: false
        }
      }
    };

    web3Modal = new Web3Modal({
      cacheProvider: true,
      providerOptions,
      disableInjectedProvider: false,
      theme: {
        background: "#faf9fe",
        main: "#6f42c1",
        secondary: "#5f6380",
        border: "#e5e3f1",
        hover: "#563099"
      }
    });

    // Auto-connect if previously connected
    if (web3Modal.cachedProvider) {
      connectWallet();
    }
  }

  // Connect wallet function
  async function connectWallet() {
    try {
      // Show loading state
      updateUIState('connecting');
      
      // Connect to the provider
      provider = await web3Modal.connect();
      
      // Create ethers provider
      const ethersProvider = new ethers.providers.Web3Provider(provider);
      web3 = ethersProvider;
      
      // Get accounts and chain ID
      signer = ethersProvider.getSigner();
      accounts = await ethersProvider.listAccounts();
      chainId = (await ethersProvider.getNetwork()).chainId;
      
      // Set connected state
      connected = accounts.length > 0;
      
      // Update UI
      updateUIState('connected');
      
      // Update account information
      updateAccountInfo();
      
      // Setup event listeners
      setupProviderEvents();
      
      return true;
    } catch (error) {
      console.error("Connection error:", error);
      updateUIState('error', error.message);
      return false;
    }
  }

  // Disconnect wallet function
  async function disconnectWallet() {
    if (provider && provider.close) {
      await provider.close();
    }
    
    // Clear cache
    if (web3Modal) {
      web3Modal.clearCachedProvider();
    }
    
    // Reset state
    provider = null;
    web3 = null;
    accounts = [];
    chainId = null;
    signer = null;
    connected = false;
    
    // Update UI
    updateUIState('disconnected');
  }

  // Setup provider events
  function setupProviderEvents() {
    if (!provider) return;
    
    // Subscribe to accounts change
    provider.on("accountsChanged", (newAccounts) => {
      accounts = newAccounts;
      connected = accounts.length > 0;
      
      if (connected) {
        updateAccountInfo();
        updateUIState('connected');
      } else {
        updateUIState('disconnected');
      }
    });
    
    // Subscribe to chainId change
    provider.on("chainChanged", (newChainId) => {
      chainId = newChainId;
      updateAccountInfo();
    });
    
    // Subscribe to provider disconnection
    provider.on("disconnect", (error) => {
      disconnectWallet();
    });
  }

  // Update account information
  async function updateAccountInfo() {
    if (!connected || !accounts[0]) return;
    
    try {
      // Format account address for display
      const shortAddress = formatAddress(accounts[0]);
      const walletAddressElement = document.getElementById('wallet-address');
      if (walletAddressElement) {
        walletAddressElement.textContent = shortAddress;
      }
      
      // Get UDROP balance
      if (web3 && UDROP_CONTRACT_ADDRESS) {
        const udropContract = new ethers.Contract(UDROP_CONTRACT_ADDRESS, UDROP_ABI, web3);
        const udropBalance = await udropContract.balanceOf(accounts[0]);
        const formattedUdropBalance = ethers.utils.formatUnits(udropBalance, 18);
        
        const udropBalanceElement = document.getElementById('udrop-balance');
        if (udropBalanceElement) {
          udropBalanceElement.textContent = parseFloat(formattedUdropBalance).toFixed(2);
        }
        
        const walletBalanceElement = document.getElementById('wallet-balance');
        if (walletBalanceElement) {
          walletBalanceElement.textContent = parseFloat(formattedUdropBalance).toFixed(2) + " UDROP";
        }
      }
      
      // Get USDC balance
      if (web3 && USDC_CONTRACT_ADDRESS) {
        const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, web3);
        const usdcBalance = await usdcContract.balanceOf(accounts[0]);
        const formattedUsdcBalance = ethers.utils.formatUnits(usdcBalance, 6);
        
        const usdcBalanceElement = document.getElementById('usdc-balance');
        if (usdcBalanceElement) {
          usdcBalanceElement.textContent = parseFloat(formattedUsdcBalance).toFixed(2);
        }
      }
      
      // Enable swap functionality
      enableSwapFunctionality();
    } catch (error) {
      console.error("Error updating account info:", error);
    }
  }

  // Format address for display (0x1234...5678)
  function formatAddress(address) {
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  // Update UI state based on connection status
  function updateUIState(state, errorMessage = '') {
    const connectButtons = document.querySelectorAll('.connect-btn');
    const walletInfo = document.getElementById('wallet-info');
    const swapForm = document.getElementById('swap-form');
    const connectWalletSwapBtn = document.getElementById('connect-wallet-swap');
    const swapButton = document.getElementById('swap-button');
    
    switch (state) {
      case 'connecting':
        connectButtons.forEach(btn => {
          btn.textContent = 'Connecting...';
          btn.disabled = true;
        });
        break;
        
      case 'connected':
        connectButtons.forEach(btn => {
          btn.textContent = 'Disconnect Wallet';
          btn.disabled = false;
          btn.classList.add('connected');
        });
        
        if (walletInfo) walletInfo.style.display = 'block';
        if (swapForm) swapForm.style.display = 'block';
        if (connectWalletSwapBtn) connectWalletSwapBtn.style.display = 'none';
        break;
        
      case 'disconnected':
        connectButtons.forEach(btn => {
          btn.textContent = 'Connect Wallet';
          btn.disabled = false;
          btn.classList.remove('connected');
        });
        
        if (walletInfo) walletInfo.style.display = 'none';
        if (swapForm) swapForm.style.display = 'none';
        if (connectWalletSwapBtn) connectWalletSwapBtn.style.display = 'block';
        break;
        
      case 'error':
        connectButtons.forEach(btn => {
          btn.textContent = 'Connect Wallet';
          btn.disabled = false;
        });
        
        // Show error message
        alert('Connection error: ' + errorMessage);
        break;
    }
  }

  // Enable swap functionality
  function enableSwapFunctionality() {
    const swapButton = document.getElementById('swap-button');
    if (!swapButton) return;
    
    swapButton.disabled = false;
    
    // Remove any existing event listeners
    swapButton.removeEventListener('click', performSwap);
    
    // Add new event listener
    swapButton.addEventListener('click', performSwap);
  }

  // Perform token swap
  async function performSwap() {
    if (!connected || !accounts[0]) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      const usdcAmountElement = document.getElementById('usdc-amount');
      if (!usdcAmountElement) return;
      
      const usdcAmount = usdcAmountElement.value;
      if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
        alert('Please enter a valid USDC amount');
        return;
      }
      
      // Show loading state
      const swapButton = document.getElementById('swap-button');
      if (!swapButton) return;
      
      swapButton.textContent = 'Processing...';
      swapButton.disabled = true;
      
      // Convert amount to wei (USDC has 6 decimals)
      const usdcAmountWei = ethers.utils.parseUnits(usdcAmount, 6);
      
      // Get contracts
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer);
      const udropContract = new ethers.Contract(UDROP_CONTRACT_ADDRESS, UDROP_ABI, signer);
      
      // Check allowance
      const allowance = await usdcContract.allowance(accounts[0], UDROP_CONTRACT_ADDRESS);
      
      // If allowance is insufficient, request approval
      if (allowance.lt(usdcAmountWei)) {
        const approveTx = await usdcContract.approve(UDROP_CONTRACT_ADDRESS, ethers.constants.MaxUint256);
        await approveTx.wait();
      }
      
      // Perform the swap (this would call a specific function on the UDROP contract)
      // Note: This is a placeholder. The actual function name and parameters would depend on your contract implementation
      const swapTx = await udropContract.buyTokens(usdcAmountWei);
      await swapTx.wait();
      
      // Update account info after swap
      updateAccountInfo();
      
      // Reset UI
      swapButton.textContent = 'Swap & Receive UDROP';
      swapButton.disabled = false;
      usdcAmountElement.value = '';
      
      // Show success message
      alert('Swap completed successfully!');
      
    } catch (error) {
      console.error("Swap error:", error);
      
      // Reset UI
      const swapButton = document.getElementById('swap-button');
      if (swapButton) {
        swapButton.textContent = 'Swap & Receive UDROP';
        swapButton.disabled = false;
      }
      
      // Show error message
      alert('Swap failed: ' + (error.message || 'Unknown error'));
    }
  }

  // Calculate swap amounts based on input
  function calculateSwap() {
    const usdcAmountElement = document.getElementById('usdc-amount');
    if (!usdcAmountElement) return;
    
    const usdcAmount = parseFloat(usdcAmountElement.value) || 0;
    
    // Calculate amounts based on tokenomics
    const aidAmount = usdcAmount * 0.05;
    const lpAmount = usdcAmount * 0.01;
    const receiveAmount = usdcAmount * 0.94 * 1000000; // 1 USDC = 1,000,000 UDROP
    
    // Update UI
    const aidAmountElement = document.getElementById('aid-amount');
    if (aidAmountElement) {
      aidAmountElement.textContent = aidAmount.toFixed(2) + ' USDC';
    }
    
    const lpAmountElement = document.getElementById('lp-amount');
    if (lpAmountElement) {
      lpAmountElement.textContent = lpAmount.toFixed(2) + ' USDC';
    }
    
    const receiveAmountElement = document.getElementById('receive-amount');
    if (receiveAmountElement) {
      receiveAmountElement.textContent = receiveAmount.toLocaleString() + ' UDROP';
    }
    
    const udropAmountElement = document.getElementById('udrop-amount');
    if (udropAmountElement) {
      udropAmountElement.value = receiveAmount.toLocaleString();
    }
  }

  // Initialize when document is loaded
  try {
    // Initialize Web3Modal
    initWeb3Modal();
    
    // Add event listeners to connect buttons
    const connectButtons = document.querySelectorAll('.connect-btn');
    connectButtons.forEach(btn => {
      btn.addEventListener('click', async function() {
        if (connected) {
          await disconnectWallet();
        } else {
          await connectWallet();
        }
      });
    });
    
    // Add event listener to USDC amount input for calculating swap
    const usdcAmountInput = document.getElementById('usdc-amount');
    if (usdcAmountInput) {
      usdcAmountInput.addEventListener('input', calculateSwap);
    }
  } catch (error) {
    console.error("Initialization error:", error);
    
    // Add fallback for connect buttons
    const connectButtons = document.querySelectorAll('.connect-btn');
    connectButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        alert("Web3 wallet connection is not available in this preview. This functionality will work when deployed with proper dependencies.");
      });
    });
  }
});
