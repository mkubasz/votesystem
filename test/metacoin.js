contract('Chairman', function (accounts) {
  it("should work", function () {
    var kardynale, validation;
    var chairman = Chairman.deployed();
    var voters = [];
    return chairman
      .createCase.sendTransaction("kardynal",{from: accounts[0], gas:500000})
       .then(function (c) {
       return chairman.getCase.call("kardynal");
      })
      .then(function(k){
        kardynale = Case.at(k);
        kardynale.addProposal.sendTransaction("Burke",{from: accounts[0], gas:70000});
        kardynale.addProposal.sendTransaction("Kramer",{from: accounts[0], gas:70000});
        kardynale.start.sendTransaction({from:accounts[0], gas:70000});
        return chairman.getValidation.call();
      })
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
       console.log(value);
       return kardynale.result.call(0);
     })
       .then(function (result) {
         assert.equal(result.valueOf(), 1, "Kramer win ;(");
       });
  });

  it("should get name", function () {
    var kardynal;
    var chairman = Chairman.deployed();
   return chairman
      .createCase.sendTransaction('kardynal',{from: accounts[0]})
      .then(function () {
        return chairman.getCase.call("kardynal");
      })
    .then(function (result) {
        kardynal = Case.at(result);
        return kardynal.getName.call();
      })
    .then(function (result) {
        assert.equal(result.toString(), "Glosowanie na papieza", "Nie ma nazwy")
      });
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