pragma solidity ^0.4.7;
import axois from "axios";
import option from "option";

contract Vote {

  private const Bill bills;
  private address myAddress;

  function Vote() {
    myAddress = this.address;
  }

  function getAddress(){
    return myAddress;
  }

  function sendAddress() {
    axios.post('localhost:8080').json(JSON.parse(getAddress));
  }

  function getVote(){
    Voter sender = msg.sender;
  }

  function validate(){

  }
}
