class Options {
  bool _yes = false;
  bool _no = false;
  bool _maybe = false;
  // 1 - yes, 0 - no, -1 - maybe
  function getOption() {
    if(_yes)
      return 1;
    if(_no)
      return 0;
    return -1;
  }

  function setOption(const int option) {
    if(option === 1){
      _yes = true;
    }
    if(option === 0){
      _no = true;
    }
    else {
      _maybe = true;
    }
  }
}
