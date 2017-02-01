var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("Chairman error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("Chairman error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("Chairman contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of Chairman: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to Chairman.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: Chairman not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "_title",
            "type": "string"
          },
          {
            "name": "_name",
            "type": "string"
          },
          {
            "name": "_duration",
            "type": "uint256"
          }
        ],
        "name": "createCase",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "getValidation",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_name",
            "type": "string"
          }
        ],
        "name": "getCase",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [],
        "payable": false,
        "type": "constructor"
      }
    ],
    "unlinked_binary": "0x606060405234610000575b60405161055580610a9583396040519101819003906000f080156100005760008054600160a060020a031916600160a060020a03929092169190911790555b5b610a3c806100596000396000f300606060405263ffffffff60e060020a6000350416633c517929811461003a57806395ca4bb5146100ce578063d4e06826146100f7575b610000565b34610000576100cc600480803590602001908201803590602001908080601f0160208091040260200160405190810160405280939291908181526020018383808284375050604080516020601f89358b01803591820183900483028401830190945280835297999881019791965091820194509250829150840183828082843750949650509335935061016692505050565b005b34610000576100db6102b8565b60408051600160a060020a039092168252519081900360200190f35b34610000576100db600480803590602001908201803590602001908080601f016020809104026020016040519081016040528093929190818152602001838380828437509496506102c895505050505050565b60408051600160a060020a039092168252519081900360200190f35b6000805460405185918491600160a060020a03909116906106d58061033c8339016020818101849052600160a060020a038316604083015260608083528551908301528451829160808301919087019080838382156101e0575b8051825260208311156101e057601f1990920191602091820191016101c0565b505050905090810190601f16801561020c5780820380516001836020036101000a031916815260200191505b50945050505050604051809103906000f08015610000579050806001846040518082805190602001908083835b602083106102585780518252601f199092019160209182019101610239565b51815160209384036101000a60001901801990921691161790529201948552506040519384900301909220805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a03949094169390931790925550505b50505050565b600054600160a060020a03165b90565b60006001826040518082805190602001908083835b602083106102fc5780518252601f1990920191602091820191016102dd565b51815160209384036101000a6000190180199092169116179052920194855250604051938490030190922054600160a060020a0316925050505b9190505600606060405234610000576040516106d53803806106d583398101604090815281516020830151918301519201915b8260019080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061007957805160ff19168380011785556100a6565b828001600101855582156100a6579182015b828111156100a657825182559160200191906001019061008b565b5b506100c79291505b808211156100c357600081556001016100af565b5090565b5050600482905560008054600160a060020a031916600160a060020a0383161790555b5050505b6105d8806100fd6000396000f300606060405263ffffffff60e060020a60003504166317d7de7c81146100505780632fdae3c5146100dd5780633c59405914610132578063be9a655514610154578063fa954aa014610163575b610000565b346100005761005d610175565b6040805160208082528351818301528351919283929083019185019080838382156100a3575b8051825260208311156100a357601f199092019160209182019101610083565b505050905090810190601f1680156100cf5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3461000057610130600480803590602001908201803590602001908080601f0160208091040260200160405190810160405280939291908181526020018383808284375094965061021295505050505050565b005b34610000576101426004356103a4565b60408051918252519081900360200190f35b34610000576101306103cd565b005b34610000576101306004356103dd565b005b604080516020808201835260008252600180548451600282841615610100026000190190921691909104601f8101849004840282018401909552848152929390918301828280156102075780601f106101dc57610100808354040283529160200191610207565b820191906000526020600020905b8154815290600101906020018083116101ea57829003601f168201915b505050505090505b90565b600780548060010182818154818355818115116102c0576002028160020283600052602060002091820191016102c091905b808211156102ad576000600082016000905560018201805460018160011615610100020316600290046000825580601f1061027f57506102b1565b601f0160209004906000526020600020908101906102b191905b808211156102ad5760008155600101610299565b5090565b5b5050600201610244565b5090565b5b505050916000526020600020906002020160005b60406040519081016040528060008152602001858152509091909150600082015181600001556020820151816001019080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061034d57805160ff191683800117855561037a565b8280016001018555821561037a579182015b8281111561037a57825182559160200191906001019061035f565b5b5061039b9291505b808211156102ad5760008155600101610299565b5090565b50505050505b50565b6000600782815481101561000057906000526020600020906002020160005b505490505b919050565b426002819055600454016003555b565b600254156103a1574260035411156103a1576000805460408051602090810184905281517f8b1b925f000000000000000000000000000000000000000000000000000000008152600160a060020a03338116600483015292519290931693638b1b925f9360248082019492918390030190829087803b156100005760325a03f115610000575050604051511590506103a157600160a060020a03331660009081526006602052604090205460ff161561049557610000565b600160a060020a033381166000818152600660209081526040808320805460ff1916600117905582548151830184905281517fd4f50f980000000000000000000000000000000000000000000000000000000081526004810195909552905194169363d4f50f9893602480820194918390030190829087803b156100005760325a03f1156100005750505060405180519050600160a060020a031663a9b4b7806000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b156100005760325a03f1156100005750505060405180519050600782815481101561000057906000526020600020906002020160005b50805490910190555b5b5b5b5b5b5b505600a165627a7a72305820970097d5b17bf0f7301f41381119d72d044432b2b258ab9c8d4fb7accfea66b20029a165627a7a7230582082f760e3e29c2d291e059a41ee47b09e73bafd75c259d3aab0391a71c1ff61e40029606060405234610000575b61053c806100196000396000f300606060405263ffffffff60e060020a6000350416638b1b925f811461003a578063d4f50f9814610067578063f4ab9adf1461009c575b610000565b3461000057610053600160a060020a03600435166100d1565b604080519115158252519081900360200190f35b3461000057610080600160a060020a03600435166100f4565b60408051600160a060020a039092168252519081900360200190f35b3461000057610080600160a060020a0360043516610115565b60408051600160a060020a039092168252519081900360200190f35b600160a060020a038082166000908152602081905260409020541615155b919050565b600160a060020a03808216600090815260208190526040902054165b919050565b6000610120336100d1565b1515610035578133604051610361806101b08339600160a060020a03938416910190815291166020820152604080519182900301906000f080156100005733600160a060020a039081166000908152602081905260409020805473ffffffffffffffffffffffffffffffffffffffff191692821692909217918290551690506100ef565b610000565b5b9190505600606060405234610000576040516040806103618339810160405280516020909101515b60008054600160a060020a03808516600160a060020a031992831617909255600280549284169290911691909117905560016004555b50505b6102f78061006a6000396000f300606060405263ffffffff60e060020a600035041663a4d318058114610050578063a9b4b7801461005f578063ac637c7a1461007e578063b9e98d1114610099578063e9ebaeec146100bb575b610000565b346100005761005d6100cd565b005b346100005761006c610184565b60408051918252519081900360200190f35b346100005761005d600160a060020a036004351661018b565b005b346100005761006c60043561022b565b60408051918252519081900360200190f35b346100005761005d600435610251565b005b600154600160a060020a03161561018157600154600354604080516000602091820181905282517fb9e98d1100000000000000000000000000000000000000000000000000000000815260048101949094529151600160a060020a039094169363b9e98d1193602480820194918390030190829087803b156100005760325a03f11561000057505060405151600480549091019055506001805473ffffffffffffffffffffffffffffffffffffffff191690555b5b565b6004545b90565b600454151561019957610000565b6001805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a038381169190911791829055600480546040805160e260020a633a7aebbb0281529283019190915251929091169163e9ebaeec9160248082019260009290919082900301818387803b156100005760325a03f1156100005750506004805460038054909101905560009055505b50565b60008160045410151561024857506004805482900390558061024c565b5060005b919050565b600154600160a060020a03161515610270576004805482019055610228565b6001546040805160e260020a633a7aebbb028152600481018490529051600160a060020a039092169163e9ebaeec9160248082019260009290919082900301818387803b156100005760325a03f115610000575050505b5b505600a165627a7a723058208b5bfe5fc9728405f989b2746aa10699675060c7b2740ff425ddb227962d8e380029a165627a7a7230582046c8b9b0d24ceb7dcbeec7e9bc213cadf92e383de386374f1431acd1c43d443c0029",
    "events": {},
    "updated_at": 1485908028300,
    "links": {},
    "address": "0x683b6dedc632a65e523cb201ff0a82c73aac279b"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "Chairman";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.Chairman = Contract;
  }
})();
