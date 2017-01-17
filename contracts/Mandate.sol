pragma solidity ^0.4.7;
import option from "option";

contract Mandate {

  private bytes32 guid;
  private address addressBallot = null;
  private address addressVote = null;
  private address addressPresentContract = null;
  private Options option = null;

  function Mandate(address _addressVote, Options _option){
    if(addressVote === null) {
      addressBallot = msg.sender;
      addressVote = _addressVote;
      option = _options;
    }
  }

  function setAddress(let _addressVote){
    if(canVote(_addressVote))
      addressVote = _addressVote;
    else
      throw;
  }

  function forwardMandate(address _addressPresentContract) {
    if(addressVote != null)
      addressPresentContract = _addressPresentContract;
    else
      throw;
  }

  function canVote(let _addressVote) return bool{
    return  _addressVote != addressVote || addressVote === null;
  }
}
