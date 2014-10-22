var newTreemap = {

    renderDivId: 'treemap',               //Rendering div. Must be set before drawing call
    width: 831,                           //Width and height of the canvas
    height: 340,
    canvas: null,                         //Reference to the drawing canvas
    curData: null,                        //Current data loaded into the treemap
    treemap: null,                        //Ref to the current treemap
    cells: null,                          //Ref to svg group containing cells
    color: d3.scale.category20(),         //D3 color scale used by the treemap
    margin: {                             //Margin of the drawing area
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    },                //Margin for drawing area
    threshold: 4,                         //Threshold percent under which each data value must be resized (to prevent too little rectangles areas)
    debug: false,                         //If true debug on console is enabled
    startLevel: 'root',                   //Start rendering level
    curPath: 'root',                      //Current path of the treemap
    curLevel: 1,                          //Current level of drill-down
    maxLevel: 3,                          //Maximum level of drill-down TODO: get this value from input data
    dataByLevel:[],                       //Data divided by level
    pathSign: '|',                        //Treemap path delimiter
    transitionT: 750,                     //Time between groups changes in drill-down (ms)
    scaleX: null,                         //Scale for x dimension of rectangles
    scaleY: null,                         //Scale for y dimension of rectangles
    selectedLeaf: null,                   //Reference to the selected leaf div (if any)

    draw: function (data, threshold, debug) {

        if(threshold) this.threshold = threshold;
        if(debug) this.debug = debug;
        var margin = this.margin;
        this.width = this.width - margin.left - margin.right;
        this.height = this.height - margin.top - margin.bottom;
        this.curPath = this.startLevel;

        this.scaleX = d3.scale.linear()
            .domain([0, this.width])
            .range([0, this.width]);

        this.scaleY = d3.scale.linear()
            .domain([0, this.height])
            .range([0, this.height]);

        this.curData = this.parseData(data,this.threshold,this.debug);

        splitDataByLevel(this.curData,this.pathSign,this.dataByLevel);

        data = _.findWhere(this.dataByLevel,{ level: this.startLevel });

        this.treemap = d3.layout.treemap()
            .size([this.width, this.height])
            .sort(function(a, b) { return b.name - a.name; })
            .mode("squarify")
//            .ratio(this.height / this.width * 0.5 * (1 + Math.sqrt(5)))
            .round(false);

        this.canvas = d3.select("#" + this.renderDivId).append("div")
                .style("position", "relative")
                .style("width", (this.width + margin.left + margin.right) + "px")
                .style("height", (this.height + margin.top + margin.bottom) + "px")
                .style("left", margin.left + "px")
                .style("top", margin.top + "px")
                .attr("id", "first")
            ;

        var that = this;
        var node = this.canvas.datum(data).selectAll(".node")
                .data(this.treemap.nodes)
                .enter()
                .append("div")
                .attr("class", "node")
                .call(that._position)
                .on("click", function(d){
                    that._transition.call(that,d,this)
                })
                .style("background", function(d) { return "rgb(66, 161, 201)"; })
                .text(function(d) { return d.name; })
            ;

        function splitDataByLevel(data,pathSign,dataByLevel){

            var path = 'root';

            recursive(data,path,pathSign,dataByLevel);

            function recursive(data,path,sep,dataByLevel){

                _.each(data.children,function(item){
                    path = path + sep + item.name;
                    path = recursive(item,path,sep,dataByLevel);
                });

                var temp = _.clone(data);

                temp.level = path;
                _.each(temp.children,function (item){item.children = item.Sons = null;});
                dataByLevel.push(
                    {
                        name: temp.name,
                        level: path,
                        children: temp.children,
                        isLeaf: data.children ? false : true
                    }
                );
                temp.children = null;

                path = path.substr(0,path.lastIndexOf(sep));
                return path;
            }



        }
    },

    _transition: function(d,item){
        var newPath = this.curPath + this.pathSign + d.name;

        if(this.curLevel < this.maxLevel){
            this.curLevel ++;
            this.goToLevel(newPath);
        }else{
            this.curLevel ++;
            this.curPath = newPath;
            this.selectedLeaf = item;
            d3.select(item).style('background', function(d) { return "rgb(74, 197, 241)"; })
        }
    },

    _position: function() {

        this.style("left", function(d) { return d.x + "px"; })
            .style("top", function(d) { return d.y + "px"; })
//            .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
//            .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; })
            .style("width", function(d) {
                return (newTreemap.scaleX(d.x + d.dx) - newTreemap.scaleX(d.x)) + "px";
            })
            .style("height", function(d) {
                return (newTreemap.scaleY(d.y + d.dy) - newTreemap.scaleY(d.y)) + "px";
            })
        ;
    },

    goToLevel: function(path){

        var data2 = _.findWhere(this.dataByLevel,{ level: path });

        if(data2){

            var that = this;

            this.canvas.selectAll(".node").remove();

            var node = this.canvas.datum(data2).selectAll(".node")
                        .data(this.treemap.nodes);

            node.enter()
                .append("div")
                .attr("class", "node")
                .style("z-index",this.zIndex)
                .style("background", function(d) { return "rgb(66, 161, 201)"; })
                .on("click", function(d){
                    that._transition.call(that,d,this)
                })
            ;

            node.transition().duration(that.transitionT)
                .call(that._position)
                .text(function(d) { return d.name; })
            ;



            this.curPath = path;

        }else{
            console.error('item "'+ path +'" not found.');
        }

//        function position() {
//            this.style("left", function(d) { return d.x + "px"; })
//                .style("top", function(d) { return d.y + "px"; })
//                .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
//                .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
//        }

//        function transition(d) {
//            console.log(d);
//
//            this.goToLevel(this.curPath + this.pathSign + d.name);
//        }
    },

    goToParent: function(){

        var path = this.curPath;
        path = path.substr(0,path.lastIndexOf(this.pathSign));


        if(this.curLevel <= this.maxLevel){
            this.curLevel --;
            this.goToLevel(path);
        }else{
            this.curLevel --;
            this.curPath = path;
            d3.select( this.selectedLeaf).style('background', function(d) { return "rgb(66, 161, 201)"; })
            this.selectedLeaf = null;
        }


    },

    parseData: function(data, minThreshold, debug) {

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
        lvl1minValue = ( lvl1Max * minThreshold ) / 100 ;

        data.name = 'root'; //assign root name

        if(debug){ lvl1Debug = 'LEVEL 1 --> Max: '+ lvl1Max +' Threshold: '+ lvl1minValue +', Values: \r\n[\r\n '; }

        var formattedChildren = _.each(data.groups, function(item){

            //======================= LEVEL 1 ================================

            item.parent = data.name;
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
//                lvl2minValue = Math.round( ( lvl2Max * minThreshold ) / 100 );
//                lvl2minValue = lvl2minValue === 0 ? 1 : lvl2minValue;
                    lvl2minValue = ( lvl2Max * minThreshold ) / 100 ;

                    if(debug){ lvl2Debug += 'LEVEL 2 of ['+ item.GroupDescription +']--> Max: '+ lvl2Max +' Threshold: '+ lvl2minValue +', Values: \r\n[\r\n '; }
                }

                child.parent = item.name;
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
//                    lvl3minValue = Math.round( ( lvl3Max * minThreshold ) / 100 );
//                    lvl3minValue = lvl3minValue === 0 ? 1 : lvl3minValue;
                        lvl3minValue = ( lvl3Max * minThreshold ) / 100;

                        if (debug) {
                            lvl3Debug += 'LEVEL 3 of [' + item.GroupDescription +'->'+ child.GroupDescription + ']--> Max: ' + lvl3Max + ' Threshold: ' + lvl3minValue + ', Values: \r\n[\r\n ';
                        }
                    }

                    childOfChild.parent = child.name;
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
};

