pragma solidity ^0.4.2;

contract Case {

   string name;
   uint finishTime;
   address vote;
   address validation;
   uint []proposal;
   struct Voter {
     bool voted;
     uint value;
     uint wieght;
   }

  mapping(address => bool) voters;

   function Case(string _name, uint _duration, address _validation) {
     name = _name;
     finishTime = now + _duration;
     validation = _validation;
   }

   modifier pennding(){
      if(finishTime <= now){
        throw;
      }
      _;
   }

    function createVote(uint value, uint weight) pennding {
      if(voters[msg.sender])
        throw;
      voters[msg.sender] = true;
      proposal[value] += weight;
    }

    function getName() returns(string name) {
      return name;
    }
}
