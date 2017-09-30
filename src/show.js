(function() {
'use strict';

var el = document.getElementById('user-regex');
var reg = null;

var v = localStorage.getItem('v');
if (v) {
    el.value = v;
}

var speedEl = document.getElementById('speed');
var animationSpeed = Math.abs(1.9 - parseFloat(speedEl.value)) || 0.5;
speedEl.addEventListener('change', function() {
    animationSpeed = Math.abs(1.9 - parseFloat(this.value)) || 0.5;
}, false);
var matchResultEl = document.getElementById('match-result');

el.addEventListener('change', function() {
    printNFA(el.value);
    localStorage.setItem('v', el.value);
}, false);
el.focus();

var matchFn = function() {
    if (!reg) {
        return;
    }
    var str = this.value;
    var time = animationSpeed;
    var prevs = [d3.select()];
    // var lastI = -1;
    var result = reg.test(str, function(n/*, strIndex*/) {
        var nId = 'reg-circle-' + n.id;
        setTimeout(function() {
            prevs.shift().attr('stroke', 'black');
            var dEl = d3.select(document.getElementById(nId)).attr('stroke', 'red');
            prevs.push(dEl);
        }, time * 1000);
        time += animationSpeed;
    });
    matchResultEl.innerHTML = 'Match result for string <b>' + str + '</b>: ' + result;

    setTimeout(function() {
        prevs.forEach(function(dEl) {
            dEl.attr('stroke', 'black');
        });
    }, time * 1000);
};

document.getElementById('test-user-string').addEventListener('click', function() {
    matchFn.call(document.getElementById('user-string'));
}, false);

var printNFA = function(pattern) {
    var _msg = 'Your regex has ' + pattern.length + ' characters. ' +
        'This can take some time or even freeze you browser. Are you sure?';
    if (pattern.length > 200 && !window.confirm(_msg)) {
        return;
    }
    reg = new Rexp(pattern);
    var nfa = reg.getNFA();

    var ns = [nfa.startState];

    var nodes = [];
    var links = [];
    var nodesMap = {};
    while (ns.length) {
        var node = ns.pop();
        if (node.id in nodesMap) {
            continue;
        }
        var id = node.id;

        nodesMap[id] = 1;
        nodes.push({
            id: id,
            index: id,
            symbol: id + ' ' + node.symbol,
            isInitial: node.isInitial,
            isEnd: node.isEnd || false
        });

        ['outOne', 'outTwo'].forEach(function(k) {
            if (node[k]) {
                ns.push(node[k]);
                links.push({
                    source: id,
                    target: node[k].id,
                    symbol: node.symbol || 'ɛ'
                });
            }
        });
    }
    d3.select("svg").selectAll('*').remove();

    var svg = d3.select("svg").attr('width', window.innerWidth - 20).attr('height', window.innerHeight - 20),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    // http://bl.ocks.org/couchand/7190660
    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) {
            return d.id;
        }))
        .force("charge", d3.forceCollide(80))
        .force("center", d3.forceCenter(width / 2, height / 2));

    svg.append('defs')
        .append("marker")
        .attr("id", 'arrow')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 16.5)
        .attr('refY', 3)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth')
        .attr('xoverflow', 'visible')
        .append('path')
        .attr('d', 'M0,0 L0,6 L9,3 z')
        .attr('fill', 'black');

    var text = 're: ' + pattern + ' ; ' + "nodes: " + nodes.length;
    /*var textEl = */svg.append("text")
        .attr("class", "title")
        .attr('y', 30)
        .attr('x', 400)
        .html(text);

    var linkG = svg.append("g")
        .attr("class", "links")
        .selectAll("g")
        .data(links)
        .enter()
        .append('g')

    var linkText = linkG.append('text').text(function(data) {
        return data.symbol;
    });

    var link = linkG.append("line")
        .attr('marker-end', "url(#arrow)")
        .attr('stroke', "#000")
        .attr("stroke-width", '2');

    var nodeG = svg.append("g")
        .attr("class", "nodes")
        .selectAll("rect")
        .data(nodes)
        .enter()
        .append('g');

    var circleNodes = nodeG.append("circle")
        .attr("r", 15)
        .attr("stroke-width", 3)
        .attr('stroke', 'black')
        .attr('id', function(d) {
            return 'reg-circle-' + d.id;
        })
        .attr("fill", function(d) {
            if (d.isInitial) {
                return 'gray';
            }
            else if (d.isEnd) {
                return 'black';
            }
            else {
                return 'white';
            }
        });

    /*var nodeText = */nodeG.append("text")
        .attr('font-size', 20)
        .attr("fill", function() {
            return 'black';
        });

    simulation
        .nodes(nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(links);
        // .distance(25);

    function ticked() {
        link.attr("x1", function(d) {
            return d.source.x;
        })
        .attr("y1", function(d) {
            return d.source.y;
        })
        .attr("x2", function(d) {
            return d.target.x;
        })
        .attr("y2", function(d) {
            return d.target.y;
        });


        linkText.attr("x", function(d) {
            return (d.target.x + d.source.x) / 2;
        })
        .attr("y", function(d) {
            return (d.target.y + d.source.y) / 2;
        });

        nodeG.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    }

};

printNFA(el.value);

})();
