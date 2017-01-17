pragma solidity ^0.4.5;

contract Validation {
     mapping(address => Voter) Voters;

     function isValidate(address voter) return bool {
             return Voters[voter] != null;
     }
}