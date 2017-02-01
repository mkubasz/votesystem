pragma solidity ^0.4.7;

contract Chairman {

  Validation validation;
  mapping (string => Case) cases;

  function Chairman(){
    validation = new Validation();
  }

  function createCase(string _title, string _name, uint _duration) public {
    Case c = new Case(_title, _duration, address(validation));
    cases[_name] = c;
  }

  function getCase(string _name) public returns(Case) {
    return cases[_name];        
  }

  function getValidation() public returns(Validation){
    return validation;
  }
}

contract Validation {
  mapping(address => Voter) voters;

  function isValid(address _owner) public returns (bool) {
    return address(voters[_owner]) != 0;
  }

  function addVoter(address _chairman) public returns(Voter) {
    if (!isValid(msg.sender)) {
      voters[msg.sender] = new Voter(_chairman, msg.sender);
      return voters[msg.sender];
    } else {
      throw;
    }
  }

  function getVoter(address _address) public returns(Voter) {
    return voters[_address];
  }
}

contract Voter {

  Chairman chairman;
  Voter delegateVoter;
  address owner;
  uint delegateWeight;
  uint weight;


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
    if(address(delegateVoter) == 0)
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

  Validation validation;
  string name;
  uint startTime;
  uint finishTime;
  uint duration;
  address vote;

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
   
  function createVote(uint _number) public started pending validate {
    if(voters[msg.sender])
      throw;
    voters[msg.sender] = true;
    proposal[_number].votes += validation.getVoter(msg.sender).getWeight();
  }

  function getName() public returns(string) {
    return name;
  }

  function addProposal(string _name) public {
    proposal.push(Proposal({name: _name, votes: 0}));
  }

  function start() public {
    startTime = now;
    finishTime = duration + startTime;
  }

  function result(uint _number) public returns(uint){
    return proposal[_number].votes;
  }
}