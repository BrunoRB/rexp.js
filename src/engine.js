// eslint-disable-next-line
var Rexp = (function() {
    'use strict';

    var stateId = 0;

    var State = function(symbol, state1, state2) {
        this.symbol = symbol || null;
        this.outOne = state1 || null;
        this.outTwo = state2 || null;
        // a unique id for the state, useful if you need to differentiate between many of them
        this.id = ++stateId;
    };

    var NFA = function(start, end) {
        this.startState = start;
        this.endState = end || new State();
    };

    var Matcher = function(reg) {
        this.reg = reg;
        this._i = 0;
        this._level = 0;
        this._nfa = this.build(reg);
        this._nfa.startState.isInitial = true;
        this._nfa.endState.isEnd = true;
    };

    Matcher.prototype.getNFA = function() {
        return this._nfa;
    };

    Matcher.prototype.test = function(stringoriginal, _fn) {
        for (var k=0; k<stringoriginal.length; k++) {
            var states = [this._nfa.startState];
            var string = stringoriginal.substring(k);
            for (var i=0; i<string.length; i++) {
                var s = string[i];
                var nextStates = [];
                for (var j=0; j<states.length; j++) {
                    var node = states[j];
                    if (_fn) {
                        _fn(node, i);
                    }
                    if (node.isEnd) {
                        return true;
                    }
                    ['outOne', 'outTwo'].forEach(function(n) {
                        var out = node[n];
                        if (out) {
                            // do epsilon transitions
                            if (node.symbol === null) {
                                states.push(out);
                            }
                            else if (node.symbol === s) {
                                nextStates.push(out);
                            }
                        }
                    });
                }
                states = nextStates;
            }

            for(var i2=0; i2<states.length; i2++) {
                var state = states[i2];
                if (_fn) {
                    _fn(state);
                }
                if (state.isEnd) {
                    return true;
                }
                else if (state.symbol === null) {
                    if (state.outOne) {
                        states.push(state.outOne);
                    }
                    if (state.outTwo) {
                        states.push(state.outTwo);
                    }
                }
            }
        }

        return false;
    };

    Matcher.prototype.build = function() {
        var reg = this.reg;
        if (!reg.length) {
            return new NFA(new State(), new State());
        }
        var stack = [];
        var join = function() {
            while (stack.length >= 2) {
                var d1 = stack.pop();
                var d2 = stack.pop();
                d2.endState.outOne = d1.startState;
                stack.push(new NFA(d2.startState, d1.endState));
            }
        };

        while (this._i < reg.length) {
            var i = this._i;
            var s = reg[i];
            var next = (i + 1) < reg.length ? reg[i + 1] : null;
            this._i++;
            var s1;
            var s2;
            switch(s) {
                default:
                    s1 = new State(s);
                    s2 = new State();
                    s1.outOne = s2;
                    var nfa;
                    if (stack.length && next !== '?' && next !== '+' && next !== '*') {
                        var prevDefault = stack.pop();
                        prevDefault.endState.outOne = s1;
                        nfa = new NFA(prevDefault.startState, s2);
                    }
                    else {
                        nfa = new NFA(s1, s2);
                    }
                    stack.push(nfa);
                    break;
                case '?':
                case '+':
                case '*':
                    var prev = stack.pop();
                    s1 = new State();
                    s2 = new State();
                    if (s === '*') {
                        s1.outOne = prev.startState;
                        s1.outTwo = s2;
                        prev.endState.outOne = s2;
                        prev.endState.outTwo = prev.startState;
                    }
                    else if (s === '+') {
                        s1.outOne = prev.startState;
                        prev.endState.outOne = s2;
                        prev.endState.outTwo = prev.startState;
                    }
                    else { // ?
                        s1.outOne = prev.startState;
                        s1.outTwo = s2;
                        prev.endState.outOne = s2;
                    }

                    stack.push(new NFA(s1, s2));
                    break;
                case '|':
                    var entryLevel = this._level;
                    join();
                    var prevOr = stack.pop();
                    var alter = this.build();
                    s1 = new State();
                    s2 = new State();
                    s1.outOne = prevOr.startState;
                    s1.outTwo = alter.startState;
                    prevOr.endState.outOne = s2;
                    alter.endState.outOne = s2;
                    stack.push(new NFA(s1, s2));
                    if (entryLevel > this._level) {
                        return stack.pop();
                    }
                    break;
                case '(':
                    this._level++;
                    stack.push(this.build());
                    break;
                case ')':
                    if (!this._level) {
                        throw 'Invaid regex, missing (';
                    }
                    this._level--;
                    join();
                    return stack.pop();
            }
        }

        join();
        return stack.pop();
    };

    return Matcher;
})();
