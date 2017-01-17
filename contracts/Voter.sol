pragma solidity ^0.4.7;
import option from "option";

contract Voter {

  private address owner;
  private const Bill bills;

  function Voter(){
    owner = msg.sender;
  }

  function getVote(){
    let addressVote = connectVote();
    let vote = block.coinbase(addressVote);
    vote.getVote();
    bills = vote.getBill();
    }

  function connectVote() return Vote(){
    validate();
    return web3.eth.contract(nameVote);
  }

  function delegate() {

  }
}
