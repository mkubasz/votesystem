pragma solidity ^0.4.2;

import 'Case.sol';
//import 'Validation.sol';
contract Chairman {

    mapping (string=>Case) cases;
    address validation;

    function Chairman(){
        Validation val = new Validation();
        validation = address(val);
    }

    function createCase(){
      Case c = new Case('Glosowanie na papieza',3600,validation);
      cases['papiez'] = c;
    }

    function getCase(string name) public returns(Case) {
        return cases[name];        
    }
}

contract Validation {
     mapping(address => Voter) Voters;

     function isValid(address voter) returns (bool) {
             if(address(Voters[voter]) == voter){
                return true;
             }
             return false;
     }

     function addVoter(address voter) {
             if (isValid(voter)) {
                     Voters[voter] = new Voter();
             } else {
                     throw;
             }
     }
}

contract Voter {

  address owner;
  uint weight;
  address chairman;
  function Voter(){
    owner = msg.sender;
    weight = 1;
  }

  function vote(string name, uint proposal) {
    Chairman ch = Chairman(chairman);
    Case c = ch.getCase(name);
    c.createVote(proposal,weight);
  }
}
