const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Helper function to convert BigInt to string for JSON serialization
function bigIntReplacer(key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function main() {
  console.log("🚀 Deploying Carpool contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the contract
  const Carpool = await ethers.getContractFactory("Carpool");
  const carpool = await Carpool.deploy();
  
  // Wait for deployment to complete
  console.log("⏳ Waiting for deployment confirmation...");
  await carpool.waitForDeployment();
  
  const contractAddress = await carpool.getAddress();
  console.log("✅ Carpool contract deployed to:", contractAddress);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  
  // Save contract address to a JSON file
  const addressData = {
    address: contractAddress,
    network: Number(network.chainId), // Convert BigInt to number
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('./deployed-address.json', JSON.stringify(addressData, bigIntReplacer, 2));
  console.log("📄 Contract address saved to deployed-address.json");

  // Also save to a simple text file for easy copying
  fs.writeFileSync('./contract-address.txt', contractAddress);
  console.log("📄 Contract address also saved to contract-address.txt");

  // Ensure client/src/contracts directory exists
  const clientContractsDir = './client/src/contracts';
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }

  // Copy ABI to client
  const artifactPath = './artifacts/contracts/Carpool.sol/Carpool.json';
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath));
    const abiData = {
      abi: artifact.abi,
      contractName: artifact.contractName,
      address: contractAddress
    };
    
    fs.writeFileSync(
      path.join(clientContractsDir, 'Carpool.json'), 
      JSON.stringify(abiData, null, 2)
    );
    console.log("📄 ABI saved to client/src/contracts/Carpool.json");
  } else {
    console.log("❌ Artifact not found at:", artifactPath);
  }

  console.log("🎉 Deployment completed successfully!");
  console.log("🔗 Contract Address:", contractAddress);
  
  // Test the contract
  console.log("🧪 Testing contract functionality...");
  try {
    const rideCount = await carpool.getRideCount();
    console.log("✅ Contract test - Initial ride count:", Number(rideCount));
    
    // Test creating a ride
    const testFare = ethers.parseEther("0.01");
    await carpool.createRide(testFare, 2);
    
    const newRideCount = await carpool.getRideCount();
    console.log("✅ Contract test - Ride count after creation:", Number(newRideCount));
    
    const ride = await carpool.getRide(1);
    console.log("✅ Contract test - Ride created successfully");
    console.log("   Driver:", ride[0]);
    console.log("   Fare:", ethers.formatEther(ride[1]), "ETH");
    console.log("   Seats:", Number(ride[2]));
    
  } catch (testError) {
    console.log("⚠️  Contract test failed (but deployment succeeded):", testError.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });