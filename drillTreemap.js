/**
 * Created by federicolaggiard on 16/10/14.
 */

var drillTreemap = {

    renderDivId: 'treemap',               //Rendering div. Must be set before drawing call
    width: 831,                           //Width and height of the canvas
    height: 340,
    canvas: null,                         //Reference to the drawing canvas
    curData: null,                        //Current data loaded into the treemap
    treemap: null,                        //Ref to the current treemap
    cells: null,                          //Ref to svg group containing cells
    color: d3.scale.category20(),         //D3 color scale used by the treemap

    draw: function (data) {

        var margin = {top: 20, right: 0, bottom: 0, left: 0},
            width = this.width,
            height = this.height - margin.top - margin.bottom,
            formatNumber = d3.format(",d"),
            transitioning;

        var x = d3.scale.linear()
            .domain([0, width])
            .range([0, width]);

        var y = d3.scale.linear()
            .domain([0, height])
            .range([0, height]);

        this.treemap = d3.layout.treemap()
            .children(function(d, depth) { return depth ? null : d._children; })
            .sort(function(a, b) { return b.name - a.name; })
            .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
            .round(false);

        this.canvas = d3.select("#" + this.renderDivId).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top)
            .style("margin-left", -margin.left + "px")
            .style("margin.right", -margin.right + "px")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .style("shape-rendering", "crispEdges");


        var grandparent = this.canvas.append("g")
            .attr("class", "grandparent");

        grandparent.append("rect")
            .attr("y", -margin.top)
            .attr("width", width)
            .attr("height", margin.top);

        grandparent.append("text")
            .attr("x", 6)
            .attr("y", 6 - margin.top)
            .attr("dy", ".75em");

        var root = data;

        initialize(root);
        accumulate(root);
        layout(root);
        display(root);


        //===================== METHODS ========================

        function initialize(root) {
            root.x = root.y = 0;
            root.dx = width;
            root.dy = height;
            root.depth = 0;
        }

        // Aggregate the values for internal nodes. This is normally done by the
        // treemap layout, but not here because of our custom implementation.
        // We also take a snapshot of the original children (_children) to avoid
        // the children being overwritten when when layout is computed.
        function accumulate(d) {
            return (d._children = d.children)
                ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
                : d.value; //<--
        }

        // Compute the treemap layout recursively such that each group of siblings
        // uses the same size (1×1) rather than the dimensions of the parent cell.
        // This optimizes the layout for the current zoom state. Note that a wrapper
        // object is created for the parent node for each group of siblings so that
        // the parent’s dimensions are not discarded as we recurse. Since each group
        // of sibling was laid out in 1×1, we must rescale to fit using absolute
        // coordinates. This lets us use a viewport to zoom.
        function layout(d) {
            if (d._children) {
                this.drillTreemap.treemap.nodes({_children: d._children});
                d._children.forEach(function(c) {
                    c.x = d.x + c.x * d.dx;
                    c.y = d.y + c.y * d.dy;
                    c.dx *= d.dx;
                    c.dy *= d.dy;
                    c.parent = d;
                    layout(c);
                });
            }
        }

        function display(d) {
            grandparent
                .datum(d.parent)
                .on("click", transition)
                .select("text")
                .text(name(d));

            var g1 = this.drillTreemap.canvas.insert("g", ".grandparent")
                .datum(d)
                .attr("class", "depth");

            var g = g1.selectAll("g")
                .data(d._children)
                .enter().append("g");

            g.filter(function(d) { return d._children; })
                .classed("children", true)
                .on("click", transition);

            g.selectAll(".child")
                .data(function(d) { return d._children || [d]; })
                .enter().append("rect")
                .attr("class", "child")
                .call(rect);

            g.append("rect")
                .attr("class", "parent")
                .call(rect)
                .append("title")
                .text(function(d) { return formatNumber(d.value); });

            g.append("text")
                .attr("dy", ".75em")
                .text(function(d) { return d.name; })
                .call(text);


            function transition(d) {
                if (transitioning || !d) return;
                transitioning = true;

                var g2 = display(d),
                    t1 = g1.transition().duration(750),
                    t2 = g2.transition().duration(750);

                // Update the domain only after entering new elements.
                x.domain([d.x, d.x + d.dx]);
                y.domain([d.y, d.y + d.dy]);

                // Enable anti-aliasing during the transition.
                drillTreemap.canvas.style("shape-rendering", null);

                // Draw child nodes on top of parent nodes.
                drillTreemap.canvas.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

                // Fade-in entering text.
                g2.selectAll("text").style("fill-opacity", 0);

                // Transition to the new view.
                t1.selectAll("text").call(text).style("fill-opacity", 0);
                t2.selectAll("text").call(text).style("fill-opacity", 1);
                t1.selectAll("rect").call(rect);
                t2.selectAll("rect").call(rect);

                // Remove the old node when the transition is finished.
                t1.remove().each("end", function() {
                    drillTreemap.canvas.style("shape-rendering", "crispEdges");
                    transitioning = false;
                });
            }

            return g;
        }

        function text(text) {
            text.attr("x", function(d) { return x(d.x) + 6; })
                .attr("y", function(d) { return y(d.y) + 6; });
        }

        function rect(rect) {
            rect.attr("x", function(d) { return x(d.x); })
                .attr("y", function(d) { return y(d.y); })
                .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
                .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
                .style("fill", function(d) { return 'rgb(66, 161, 201)'; })
                .attr("stroke","#fff")
            ;
        }

        function name(d) {
            return d.parent
                ? name(d.parent) + "." + d.name
                : d.name + " - " + d.value;
        }
    }



};


//function parseData(data,minThreshold,debug){
//
//    var drillLevel = 1,
//        minMaxLvl = {
//            lvl1: {min: 0,max: 0},
//            lvl2: {min: 0,max: 0},
//            lvl3: {min: 0,max: 0}
//        }
//        ;
//
//    function getMinMaxByLevel(minMaxLvl){
//
//    }
//
//    function recursive(data,minThreshold,debug,drillLevel){
//        _.each(data, function(item){
//
//            if(item.Sons !== null && item.Sons !== undefined){
//
//                recursive(item.Sons,minThreshold,debug,drillLevel);
//
//            }else{
//
//                item.drillDownLevel = drillLevel;
//                item.children = item.Sons;
//                item.value = Math.abs(parseFloat(item.TotValue));
//                item.value < lvl1minValue ? item.value = lvl1minValue : item.value;
//
//
//            }
//
//            drillLevel ++;
//
//        })
//    }
//
//
//}

function parseData(data, minThreshold, debug) {

    window.lvl1Debug="";
    window.lvl2Debug="";
    window.lvl3Debug="";

    var lvl1Max,lvl1Min,lvl2Max,lvl2Min,lvl3Max,lvl3Min,
        lvl1Count=0,lvl2Count=0,lvl3Count=0,
        lvl1Arr,lvl2Arr,lvl3Arr,
        lvl1minValue,lvl2minValue,lvl3minValue,
        lastGroup2,lastGroup3
    ;

    lvl1Arr = new Array();
    lvl2Arr = new Array();
    lvl3Arr = new Array();

    if (debug === undefined || debug === null) debug = false;

    lvl1Arr = _.pluck(data.groups,'TotValue');
    for (var i = 0; i<lvl1Arr.length;i++){
        lvl1Arr[i] = parseFloat(lvl1Arr[i]);
    }
    lvl1Max = _.max(lvl1Arr);
    lvl1Min = _.min(lvl1Arr);
    lvl1minValue = ( lvl1Max * minThreshold ) / 100;

    if(debug){ lvl1Debug = 'LEVEL 1 --> Max: '+ lvl1Max +' Threshold: '+ lvl1minValue +', Values: \r\n[\r\n '; }

    var formattedChildren = _.each(data.groups, function(item){

        //======================= LEVEL 1 ================================
        item.drillDownLevel = 1;
        item.children = item.Sons;
        item.value = Math.abs(parseFloat(item.TotValue));
        item.value < lvl1minValue ? item.value = lvl1minValue : item.value;
        item.name = item.GroupDescription;

        if(debug){ lvl1Debug += item.GroupDescription +' -> orig:'+ parseFloat(item.TotValue) +',new:' + item.value; }

        _.each(item.children, function(child){

            //======================= LEVEL 2 ================================
            if(lvl2Arr.length === 0 || item.GroupDescription !== lastGroup2){

                lastGroup2 = item.GroupDescription;

                lvl2Arr = lvl2Arr.concat(_.pluck(item.children,'TotValue'));
                for (var i = 0; i<lvl2Arr.length;i++){
                    lvl2Arr[i] = parseFloat(lvl2Arr[i]);
                }
                lvl2Max = _.max(lvl2Arr);
                lvl2Min = _.min(lvl2Arr);
                lvl2minValue = ( lvl2Max * minThreshold ) / 100;

                if(debug){ lvl2Debug += 'LEVEL 2 of ['+ item.GroupDescription +']--> Max: '+ lvl2Max +' Threshold: '+ lvl2minValue +', Values: \r\n[\r\n '; }
            }

            child.drillDownLevel = 2;
            child.name = child.GroupDescription;
            child.value = Math.abs(parseFloat(child.TotValue));
            child.value < lvl2minValue ? child.value = lvl2minValue : child.value;
            child.children = child.Sons;

            if(debug){ lvl2Debug += child.GroupDescription + ' -> orig:'+ parseFloat(child.TotValue) +',new:' + child.value; }

            _.each(child.children, function(childOfChild){

                //======================= LEVEL 3 ================================
                if(lvl3Arr.length === 0 || child.GroupDescription !== lastGroup3) {

                    lastGroup3 = child.GroupDescription;

                    lvl3Arr = lvl3Arr.concat(_.pluck(child.children, 'TotValue'));
                    for (var i = 0; i < lvl3Arr.length; i++) {
                        lvl3Arr[i] = parseFloat(lvl3Arr[i]);
                    }
                    lvl3Max = _.max(lvl3Arr);
                    lvl3Min = _.min(lvl3Arr);
                    lvl3minValue = ( lvl3Max * minThreshold ) / 100;

                    if (debug) {
                        lvl3Debug += 'LEVEL 3 of [' + child.GroupDescription + ']--> Max: ' + lvl3Max + ' Threshold: ' + lvl3minValue + ', Values: \r\n[\r\n ';
                    }
                }

                childOfChild.drillDownLevel = 3;
                childOfChild.value = Math.abs(parseFloat(childOfChild.TotValue));
                childOfChild.value < lvl3minValue ? childOfChild.value = lvl3minValue : childOfChild.value;
                childOfChild.name = childOfChild.GroupDescription;

                if(debug){ lvl3Debug += childOfChild.GroupDescription + ' -> orig:'+ parseFloat(childOfChild.TotValue) +',new:' + childOfChild.value +'\r\n'; }
            });

            if(debug){ lvl3Debug += ']\r\n';}
            if(debug){ lvl2Debug += '\r\n';}

        });
        if(debug){ lvl2Debug += ']\r\n';}
        if(debug){ lvl1Debug += '\r\n';}

    });

    if(debug){ lvl1Debug += ']';  console.log(lvl1Debug);}
    if(debug){ lvl2Debug += ']';  console.log(lvl2Debug);}
    if(debug){ lvl3Debug += ']';  console.log(lvl3Debug);}



    parsedData = {
        name: "a",
        drillDownLevel: 0,
        children: formattedChildren
    };
    return parsedData;

}

var recoursivePluck = function (data,prop,outArray) {

    _.each(data,function(item){
        if(item.Sons !== null && item.Sons != undefined) {
            return outArray.concat(recPluck(item.Sons,prop,outArray));
        }else{
            outArray.push( parseFloat(item[prop]) );
        }
    });

};

var par = function(data,prop, tempArray){



};