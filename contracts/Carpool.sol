// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Carpool {
    struct Ride {
        address driver;
        uint fare;
        uint seatsAvailable;
        bool isCompleted;
    }

    mapping(uint => Ride) public rides;
    uint public rideCounter;
    mapping(uint => address[]) public bookedPassengers;
    mapping(uint => bool) public rideExists;

    event RideCreated(uint rideId, address driver, uint fare, uint seatsAvailable);
    event RideBooked(uint rideId, address passenger);
    event RideCompleted(uint rideId);

    modifier onlyDriver(uint _rideId) {
        require(rideExists[_rideId], "Ride does not exist");
        require(msg.sender == rides[_rideId].driver, "Only driver can complete the ride");
        _;
    }
    
    modifier rideExistsModifier(uint _rideId) {
        require(rideExists[_rideId], "Ride does not exist");
        _;
    }

    function createRide(uint _fare, uint _seatsAvailable) public {
        require(_seatsAvailable > 0, "Must offer at least one seat");
        require(_fare > 0, "Fare must be greater than 0");
        
        rideCounter++;
        rides[rideCounter] = Ride(msg.sender, _fare, _seatsAvailable, false);
        rideExists[rideCounter] = true;
        emit RideCreated(rideCounter, msg.sender, _fare, _seatsAvailable);
    }

    function bookRide(uint _rideId) public payable rideExistsModifier(_rideId) {
        Ride storage ride = rides[_rideId];
        require(ride.seatsAvailable > 0, "No seats available");
        require(!ride.isCompleted, "Ride is completed");
        require(msg.value == ride.fare, "Incorrect fare");
        require(msg.sender != ride.driver, "Driver cannot book their own ride");
        
        ride.seatsAvailable--;
        bookedPassengers[_rideId].push(msg.sender);
        payable(ride.driver).transfer(msg.value);
        emit RideBooked(_rideId, msg.sender);
    }

    function completeRide(uint _rideId) public onlyDriver(_rideId) {
        rides[_rideId].isCompleted = true;
        emit RideCompleted(_rideId);
    }

    function getRide(uint _rideId) public view rideExistsModifier(_rideId) returns (address, uint, uint, bool) {
        Ride memory ride = rides[_rideId];
        return (ride.driver, ride.fare, ride.seatsAvailable, ride.isCompleted);
    }

    function getBookedPassengers(uint _rideId) public view rideExistsModifier(_rideId) returns (address[] memory) {
        return bookedPassengers[_rideId];
    }

    function getRideCount() public view returns (uint) {
        return rideCounter;
    }
}