contract('Chairman', function (accounts) {
  var chairman, _case,kardynale;

  var createCase = function(title, name, duration){
    chairman = Chairman.deployed();
    return chairman
      .createCase.sendTransaction(title,name, duration, {from: accounts[0], gas:500000});
      };

  var getCase = function(name){
    return chairman.getCase.call(name);
  };

  var setCase = function(c){
    _case = Case.at(c);
  };

  var getNameCase = function(result){
        return Case.at(result).getName.call();
  };

  var getResultCase = function(){
        return _case.result.call(0);
  };
  var getProposalsCase = function(result){

      return Case.at(result).getName.call();
  };

  var getAssert = function(result, expect, exception){
    assert.equal(result, expect, exception)
  };

  var addProposal = function(){
        _case.addProposal.sendTransaction("Burke",{from: accounts[0], gas:70000});
        _case.addProposal.sendTransaction("Kramer",{from: accounts[0], gas:70000});
        _case.start.sendTransaction({from:accounts[0], gas:70000});
  };

  it("should get name", function () {
   return createCase('Glosowanie na papieza', 'kardynal', 3600)
      .then(function () {return getCase('kardynal'); })
      .then(getNameCase)
      .then(function(result){getAssert(result.toString(),'Glosowanie na papieza', 'Brak imienia')});
  });

  it("should vote", function () {
    var validation,kardynale;
    var chairman = Chairman.deployed();
    var voters = [];
    return createCase('Glosowanie na papieza', 'kardynal', 3600)
      .then(function () {return getCase('kardynal'); })
      .then(function(c){
        kardynale = Case.at(c);})
      .then(function(){
        kardynale.addProposal.sendTransaction("Burke",{from: accounts[0], gas:70000});
        kardynale.addProposal.sendTransaction("Kramer",{from: accounts[0], gas:70000});
        kardynale.start.sendTransaction({from:accounts[0], gas:70000});
      })
      .then(function(k){return chairman.getValidation.call();})
      .then(function (val) {
        validation = Validation.at(val);
        return validation.addVoter.sendTransaction(chairman.address,{from: accounts[0], gas:500000});
      })
      .then(function (val) {
        voters.push(val);
        return kardynale.createVote.sendTransaction(0,{from: accounts[0], gas:300000});
      })
     .then(function (value) {
       return kardynale.result.call(0);
     })
     .then(function(result){getAssert(result.valueOf(),1, 'Kramer win ;(')});
  });

  });

contract('Delegate', function (accounts) {
  var chairman, _case,kardynale;

  var createCase = function(title, name, duration){
    chairman = Chairman.deployed();
    return chairman
      .createCase.sendTransaction(title,name, duration, {from: accounts[0], gas:500000});
      };

  var getCase = function(name){
    return chairman.getCase.call(name);
  };

  var setCase = function(c){
    _case = Case.at(c);
  };

  var getNameCase = function(result){
        return Case.at(result).getName.call();
  };

  var getResultCase = function(){
        return _case.result.call(0);
  };
  var getProposalsCase = function(result){

      return Case.at(result).getName.call();
  };

  var getAssert = function(result, expect, exception){
    assert.equal(result, expect, exception)
  };

  var addProposal = function(){
        _case.addProposal.sendTransaction("Burke",{from: accounts[0], gas:70000});
        _case.addProposal.sendTransaction("Kramer",{from: accounts[0], gas:70000});
        _case.start.sendTransaction({from:accounts[0], gas:70000});
  };

  it("should delegate", function () {
    var validation,kardynale;
    var chairman = Chairman.deployed();
    var voters = [];
    return createCase('Glosowanie na papieza', 'kardynal', 3600)
      .then(function () {return getCase('kardynal'); })
      .then(function(c){
        kardynale = Case.at(c);})
      .then(function(){
        kardynale.addProposal.sendTransaction("Burke",{from: accounts[0], gas:70000});
        kardynale.addProposal.sendTransaction("Kramer",{from: accounts[0], gas:70000});
        kardynale.start.sendTransaction({from:accounts[0], gas:70000});
      })
      .then(function(k){return chairman.getValidation.call();})
      .then(function (val) {
        validation = Validation.at(val);
        return validation.addVoter.sendTransaction(chairman.address,{from: accounts[0], gas:500000});
      })
      .then(function (val) {
        return validation.getVoter.call(accounts[0]);
      })
      .then(function (val) {
        voters.push(val);
        return validation.addVoter.sendTransaction(chairman.address,{from: accounts[1], gas:500000});
      })
      .then(function (val) {
        return validation.getVoter.call(accounts[1]);
      })
      .then(function (val) {
        voters.push(val);
        return validation.addVoter.sendTransaction(chairman.address,{from: accounts[2], gas:500000});
      })
      .then(function (val) {
        return validation.getVoter.call(accounts[2]);
      })
      .then(function (val) {
        voters.push(val);
                Voter.at(voters[1]).delegateTo.sendTransaction(voters[0],{from: accounts[1], gas:500000});
         Voter.at(voters[2]).delegateTo.sendTransaction(voters[1],{from: accounts[1], gas:500000});
        Voter.at(voters[1]).revokeDelegation.sendTransaction({from: accounts[1], gas:500000});
        return kardynale.createVote.sendTransaction(0,{from: accounts[0], gas:300000});
      })
     .then(function (value) {
       return kardynale.result.call(0);
     })
     .then(function(result){getAssert(result.valueOf(),2, 'Kramer win ;(')});
  });

         // .then(function (voter) {
      //   //voters.push(Voter.at(voter));
      //   return validation.addVoter.sendTransaction(chairman.address,{from: address[1], gas:500000});
      // })
      // .then(function (voter) {
      //   //voters.push(Voter.at(voter));
      //   return validation.addVoter.sendTransaction(chairman.address,{from: address[2], gas:500000});
      // })
      // .then(function (voter) {
      //   //voters.push(Voter.at(voter));
      //   //voters[1].delegateTo.sendTransaction(voters[0],{from: accounts[0], gas:300000});
      //   return kardynale.createVote.sendTransaction(0,{from: accounts[0], gas:300000});
      // })
  });