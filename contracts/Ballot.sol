pragma solidity ^0.4.7;
import option from "option";

contract Ballot {

   const string name;
   const Date date;
   const address vote;

   mapping(address => Vote) votes;

   function Ballot(string _name) {
     name = _name;
     date = new Date();
   }

   modifier canVote(){
      if(msg.sender)
   }

    function createVote() {
      let v = new Vote();
      vote = v.getAddress();
      votes.add(vote);
    }

    function calculateVotes() return Options(){

    }
}
