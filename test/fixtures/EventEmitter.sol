pragma solidity ^0.4.11;

contract EventEmitter {
  event Emitted(uint indexed indexedValue, uint regularValue);
  event Additional(uint indexed indexedValue, uint regularValue);

  function emit (uint indexedValue, uint regularValue) public {
    Emitted(indexedValue, regularValue);
  }

  function emitAdditional (uint indexedValue, uint regularValue) public {
    Emitted(indexedValue, regularValue);
    Additional(indexedValue, regularValue);
  }
}
