import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import CarpoolContract from './Carpool.json';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [rides, setRides] = useState([]);
  const [fare, setFare] = useState('');
  const [seats, setSeats] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    const connectWallet = async () => {
      try {
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum);
          const accounts = await web3.eth.requestAccounts();
          setAccount(accounts[0]);

          const networkId = await web3.eth.net.getId();
          const deployedNetwork = CarpoolContract.networks[networkId];
          if (!deployedNetwork) {
            alert('Smart contract not detected on the current network. Please connect to the correct network in MetaMask (Hardhat Network).');
            return;
          }
          const instance = new web3.eth.Contract(
            CarpoolContract.abi,
            deployedNetwork.address
          );
          setContract(instance);
        } else {
          alert('MetaMask is not installed. Please install it to use this app.');
        }
      } catch (error) {
        console.error("Error connecting wallet:", error);
        alert('Failed to connect to the wallet. Check the console for details.');
      }
    };

    window.addEventListener('load', connectWallet);
    return () => window.removeEventListener('load', connectWallet);
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          window.location.reload();
        } else {
          setAccount(null);
          alert("MetaMask account disconnected. Please connect your wallet.");
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  useEffect(() => {
    if (contract) {
      loadRides();
    }
  }, [contract]);

  const loadRides = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const rideCounter = await contract.methods.rideCounter().call();
      let ridesList = [];
      for (let i = 1; i <= rideCounter; i++) {
        const ride = await contract.methods.rides(i).call();
        if (ride.seatsAvailable > 0 && !ride.isCompleted) {
          ridesList.push({ id: i, ...ride });
        }
      }
      setRides(ridesList);
    } catch (error) {
      console.error("Error loading rides:", error);
    }
    setLoading(false);
  };

  const handleCreateRide = async () => {
    if (!fare || !seats) {
      alert("Please enter fare and seats.");
      return;
    }
    if (!contract) {
      alert("Contract not loaded, please refresh.");
      return;
    }
    setLoading(true);
    try {
      const fareInWei = Web3.utils.toWei(fare, 'ether');
      await contract.methods.createRide(fareInWei, seats).send({ from: account });
      setFare('');
      setSeats('');
      await loadRides();
      alert("Ride created successfully! 🎉");
    } catch (error) {
      console.error("Error creating ride:", error);
      alert("Failed to create ride. See console for details.");
    }
    setLoading(false);
  };

  const handleBookRide = async (rideId, rideFare) => {
    if (!contract) {
      alert("Contract not loaded, please refresh.");
      return;
    }
    setLoading(true);
    try {
      await contract.methods.bookRide(rideId).send({ from: account, value: rideFare });
      await loadRides();
      alert("Ride booked successfully! 🎉");
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Booking failed. See console for details.");
    }
    setLoading(false);
  };

  if (!account) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <div className="spinner"></div>
          <h2>Connecting to Wallet</h2>
          <p>Make sure MetaMask is unlocked and you've approved the connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🚗</span>
            <h1>Carpool DApp</h1>
          </div>
          <div className="wallet-info">
            <div className="wallet-badge">
              <span className="wallet-dot"></span>
              Connected: {account.substring(0, 6)}...{account.substring(38)}
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {/* Create Ride Section */}
          <section className="create-ride-section">
            <div className="section-card">
              <h2>Create a New Ride</h2>
              <p className="section-subtitle">Offer a ride and earn ETH</p>
              
              <div className="form-group">
                <label>Fare (ETH)</label>
                <input 
                  type="number" 
                  placeholder="0.01" 
                  value={fare} 
                  onChange={(e) => setFare(e.target.value)}
                  step="0.001"
                  min="0.001"
                />
              </div>
              
              <div className="form-group">
                <label>Seats Available</label>
                <input 
                  type="number" 
                  placeholder="2" 
                  value={seats} 
                  onChange={(e) => setSeats(e.target.value)}
                  min="1"
                  max="10"
                />
              </div>
              
              <button 
                className="create-btn"
                onClick={handleCreateRide}
                disabled={loading || !fare || !seats}
              >
                {loading ? (
                  <>
                    <div className="button-spinner"></div>
                    Creating Ride...
                  </>
                ) : (
                  'Create Ride'
                )}
              </button>
            </div>
          </section>

          {/* Available Rides Section */}
          <section className="rides-section">
            <div className="section-header">
              <h2>Available Rides</h2>
              <button className="refresh-btn" onClick={loadRides} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="loading-rides">
                <div className="spinner"></div>
                <p>Loading rides...</p>
              </div>
            ) : rides.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🚗</div>
                <h3>No Rides Available</h3>
                <p>Be the first to create a ride and start carpooling!</p>
              </div>
            ) : (
              <div className="rides-grid">
                {rides.map((ride) => (
                  <div key={ride.id} className="ride-card">
                    <div className="ride-header">
                      <div className="ride-id">Ride #{ride.id}</div>
                      <div className="seats-badge">
                        {ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? 's' : ''} left
                      </div>
                    </div>
                    
                    <div className="ride-details">
                      <div className="detail-item">
                        <span className="label">Driver:</span>
                        <span className="value">{ride.driver.substring(0, 6)}...{ride.driver.substring(38)}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="label">Price:</span>
                        <span className="price">
                          {Web3.utils.fromWei(ride.fare, 'ether')} ETH
                        </span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="label">Status:</span>
                        <span className="status active">Active</span>
                      </div>
                    </div>
                    
                    <button 
                      className="book-btn"
                      onClick={() => handleBookRide(ride.id, ride.fare)}
                      disabled={loading}
                    >
                      {loading ? 'Booking...' : 'Book This Ride'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>


    </div>
  );
}

export default App;