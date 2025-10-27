const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Carpool", function () {
  let Carpool;
  let carpool;
  let owner;
  let driver;
  let passenger;

  beforeEach(async function () {
    [owner, driver, passenger] = await ethers.getSigners();
    
    Carpool = await ethers.getContractFactory("Carpool");
    carpool = await Carpool.deploy();
  });

  it("Should create a ride", async function () {
    const fare = ethers.parseEther("0.01"); // No .utils in ethers v6
    const seats = 2;
    
    await carpool.connect(driver).createRide(fare, seats);
    
    const ride = await carpool.getRide(1);
    expect(ride[0]).to.equal(driver.address); // Returns array in v6
    expect(ride[1]).to.equal(fare);
    expect(ride[2]).to.equal(seats);
    expect(ride[3]).to.equal(false);
  });

  it("Should book a ride", async function () {
    const fare = ethers.parseEther("0.01");
    const seats = 2;
    
    await carpool.connect(driver).createRide(fare, seats);
    await carpool.connect(passenger).bookRide(1, { value: fare });
    
    const ride = await carpool.getRide(1);
    expect(ride[2]).to.equal(seats - 1); // seatsAvailable is at index 2
  });

  it("Should not allow booking with incorrect fare", async function () {
    const fare = ethers.parseEther("0.01");
    const wrongFare = ethers.parseEther("0.02");
    const seats = 2;
    
    await carpool.connect(driver).createRide(fare, seats);
    
    await expect(
      carpool.connect(passenger).bookRide(1, { value: wrongFare })
    ).to.be.revertedWith("Incorrect fare");
  });

  it("Should not allow booking when no seats available", async function () {
    const fare = ethers.parseEther("0.01");
    const seats = 1;
    
    await carpool.connect(driver).createRide(fare, seats);
    await carpool.connect(passenger).bookRide(1, { value: fare });
    
    await expect(
      carpool.connect(owner).bookRide(1, { value: fare })
    ).to.be.revertedWith("No seats available");
  });

  it("Should complete ride by driver", async function () {
    const fare = ethers.parseEther("0.01");
    const seats = 2;
    
    await carpool.connect(driver).createRide(fare, seats);
    await carpool.connect(driver).completeRide(1);
    
    const ride = await carpool.getRide(1);
    expect(ride[3]).to.equal(true); // isCompleted is at index 3
  });

  it("Should not allow non-driver to complete ride", async function () {
    const fare = ethers.parseEther("0.01");
    const seats = 2;
    
    await carpool.connect(driver).createRide(fare, seats);
    
    await expect(
      carpool.connect(passenger).completeRide(1)
    ).to.be.revertedWith("Only driver can complete the ride");
  });

  it("Should return correct ride count", async function () {
    const fare = ethers.parseEther("0.01");
    
    await carpool.connect(driver).createRide(fare, 2);
    await carpool.connect(driver).createRide(fare, 3);
    
    expect(await carpool.getRideCount()).to.equal(2);
  });
});