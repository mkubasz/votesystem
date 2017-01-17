class Options {
  contruct(){
  this._yes = false;
  this._no = false;
  this._maybe = false;
  }

  // 1 - yes, 0 - no, -1 - maybe
  getOption() {
    if(_yes)
      return 1;
    if(_no)
      return 0;
    return -1;
  }

  setOption(option) {
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
