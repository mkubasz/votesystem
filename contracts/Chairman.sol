pragma solidity ^0.4.7;

contract Chairman {
    mapping (string => Case) cases;
    Validation validation;

    function Chairman(){
        validation = new Validation();
    }

    function createCase(string name) public {
        Case c = new Case('Glosowanie na papieza',3600,address(validation));
        cases[name] = c;
    }

    function getCase(string name) public returns(Case) {
        return cases[name];        
    }

    function getValidation() public returns(Validation){
      return validation;
    }
}

contract Validation {
     mapping(address => Voter) voters;

     function isValid(address owner) public returns (bool) {
        return address(voters[owner]) != 0;
     }

     function addVoter(address chairman) public returns(Voter) {
        if (!isValid(msg.sender)) {
            voters[msg.sender] = new Voter(chairman, msg.sender);
            return voters[msg.sender];
        } else {
            throw;
        }
     }

     function getVoter(address addr) public returns(Voter) {
       return voters[addr];
     }
}

contract Voter {
  address owner;
  Voter delegateVoter;
  uint delegateWeight;
  uint weight;
  Chairman chairman;

  function Voter(address _chairmanAddress, address _owner){
    chairman = Chairman(_chairmanAddress);
    owner = _owner;
    weight = 1;
  }

    function delegateTo(Voter _delegateVoter) public {
      if(weight == 0)
          throw;
      delegateVoter = _delegateVoter;
      delegateVoter.receiveDelegation(weight);
      delegateWeight += weight;
      weight = 0;
    }

    function receiveDelegation(uint _weight) public {
      if(address(delegateVoter)== 0)
        weight += _weight;
      else
        delegateVoter.receiveDelegation(_weight);
    }

    function revokeDelegation() public {
      if(address(delegateVoter) != 0) {
        weight += delegateVoter.returnWeight(delegateWeight);
        delegateVoter = Voter(0);
      }
    }

    function returnWeight(uint _delegateWeight) public returns(uint) {
      if(weight >= _delegateWeight){
          weight -= _delegateWeight;
        return _delegateWeight;
      }
      return 0;
    }

    function getWeight() public returns(uint) {
     return weight;
  }

}

contract Case {

   string name;
   uint startTime;
   uint finishTime;
   uint duration;
   address vote;
   Validation validation;
   mapping(address => bool) voters;

   struct Proposal {
     uint votes;
     string name;
   }

    Proposal []proposal;

   function Case(string _name,uint _duration, address _validation)  {
     name = _name;
     duration = _duration;
     validation = Validation(_validation);
   }

   modifier started(){
      if(startTime != 0)
           _;
   }

   modifier pending(){
      if(finishTime > now)
          _;
   }

   modifier validate() {
     if(validation.isValid(msg.sender))
        _;
   }
   
    function createVote(uint value) public started pending validate {
      if(voters[msg.sender])
          throw;
        voters[msg.sender] = true;
        proposal[value].votes += validation.getVoter(msg.sender).getWeight();
    }

    function getName() public returns(string) {
      return name;
    }
    function x() public returns(address) {
      return msg.sender;
    }
    function addProposal(string name) public {
      proposal.push(Proposal({name: name, votes: 0}));
    }

    function start() public {
      startTime = now;
      finishTime = duration + startTime;
    }

    function result(uint number) public returns(uint){
      return proposal[number].votes;
    }
}