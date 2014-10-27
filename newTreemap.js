var newTreemap = {

    renderDivId: 'treemap',               //Rendering div. Must be set before drawing call
    width: 981,                           //Width and height of the canvas
    height: 340,
    canvas: null,                         //Reference to the drawing canvas
    curData: null,                        //Current data loaded into the treemap
    unparsedData: null,                   //Reference to unparsed data
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
    useSlider: false,                     //If true the treemap use a slider to control the threshold value. NoUISlider.js is mandatory.
    slider:{
        ref: null,                        //Reference to slider. (only if useSlider)
        width: 18,
        margin: {
            top: 0,
            left: 10,
            right: 10,
            bottom: 10
        },
        usePips: true ,                   //If true shows scale near slider
        pipsSpacing: 40,                  //Space occupied by pips
        updateOnSlide: true               //Specify if the update process is bound with slider slide event or only on slider release (consider turn to false if big input data is involved)
    },

    draw: function (data, threshold, debug) {

        var width,
            height,
            margin = { top: 0, bottom: 0, left: 0, right: 0  }
        ;

        if(threshold) this.threshold = threshold;
        if(debug) this.debug = debug;
        margin.left = this.margin.left; margin.right = this.margin.right; margin.top = this.margin.top; margin.bottom = this.margin.bottom;

        if(this.useSlider){
            if(this.slider.usePips){
                margin.right += this.slider.width +
                    2 + //+2 is for the border (1px each)
                    this.slider.pipsSpacing + //+40 is for the pips
                    this.slider.margin.left +
                    this.slider.margin.right;
            }else{
                margin.right += this.slider.width +
                    2 + //+2 is for the border (1px each)
                    this.slider.margin.left +
                    this.slider.margin.right;
            }

            width = this.width - margin.left - margin.right;
            height = this.height - margin.top - margin.bottom;

            if(this.slider.ref === null){
                var renderDiv = $('#' + this.renderDivId);
                renderDiv.css('width',width + margin.right);

                renderDiv.append('<div class="sliderContainer">');
                var sliderContainer = $('.sliderContainer');
                sliderContainer.css('height', height +'px');
                sliderContainer.css('width', this.slider.width +'px');
                if(this.slider.usePips){
                    sliderContainer.css('margin', this.slider.margin.top + 'px '+
                        (this.slider.margin.right + this.slider.pipsSpacing) + 'px '+
                        this.slider.margin.bottom +'px '+
                        this.slider.margin.left +'px');
                }else{
                    sliderContainer.css('margin',this.slider.margin.top + 'px '+
                        this.slider.margin.right + 'px '+
                        this.slider.margin.bottom +'px '+
                        this.slider.margin.left +'px');
                }
                this._drawSlider();
            }


        }else{
            width = this.width - margin.left - margin.right;
            height = this.height - margin.top - margin.bottom;
        }

        //this.curPath = this.startLevel;
        //this.curLevel = 1;

        this.scaleX = d3.scale.linear()
            .domain([0, width])
            .range([0, width]);

        this.scaleY = d3.scale.linear()
            .domain([0, height])
            .range([0, height]);

        this.unparsedData = data;
        this.curData = this.parseData(data,this.threshold,this.debug);

        splitDataByLevel(this.curData,this.pathSign,this.dataByLevel);

        data = _.findWhere(this.dataByLevel,{ level: this.curPath });

        //Creating svg canvas
        if($('#' + this.renderDivId).find('.renderDIV').length === 0) {
            this.canvas = d3.select('#' + this.renderDivId)
                .append("div")
                .attr("class", "renderDIV")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
            ;
        }else{
            this.canvas = d3.select('#' + this.renderDivId)
                .select('.renderDIV')
                .append("svg")
                .attr("width", width)
                .attr("height", height);
        }

        //start drawing treemap
        this.treemap = d3.layout.treemap()
            .size([width,height])//setting size == to canvas size.
            .nodes(data)//binding data source
            .sort(function(a,b) {
                if (a === b) return 0;
                if (a < b) return 1;
                if (a > b) return -1;
//                return a < b ? 1 : a > b ? -1 : 0;
            })
        ;

        //create all groups that contains the cells, appending a g for each data element
        this.cells = this.canvas.selectAll(".cell")
            .data(this.treemap)
            .enter()
            .append("g")
            .attr("class","cell")
        ;

        //append to each group a rectangle, starting at position x,y
        //and with dimension dx,dy those values are already provided by d3.treemap in each dataItem (element of data)
        var that = this;
        this.cells.append("rect")
            .attr("x",function(dataItem){ return dataItem.x; })
            .attr("y",function(dataItem){ return dataItem.y; })
            .attr("width",function(dataItem){return dataItem.dx - 1; })
            .attr("height",function(dataItem){return dataItem.dy - 1; })
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            //apply a color for each group using the scale color based on the parent (so leaf from the same parent shares colors)
            //that after checking if the cur item has children (so only the leaf)
            .attr("fill", function(d){ return "rgb(66, 161, 201)"; })
            .attr("stroke","#FFF")
            .attr("text-anchor", "middle")
            .on("click", function(d){
                that._transition.call(that,d,this)
            })
        ;

        this.cells.append("text")
            .attr("dy", ".75em")
            .text(function(d) { return d.name; })
            .call(this._text)
        ;

        /**************************** NEW - WITH DIV, ERROR RENDERING *****************************
        this.treemap = d3.layout.treemap()
            .size([this.width,this.height])//setting size == to canvas size. TODO: padding?
            .nodes(data)//binding data source
        ;

        //Creating svg canvas
        var that = this;
        this.canvas = d3.select("#" + this.renderDivId)
            .append("div")
            .style("position", "relative")
            .attr("width",this.width + 'px')
            .attr("height",this.height + 'px')
            .attr("id", "first")
        ;

        //create all groups that contains the cells, appending a g for each data element
        this.cells = this.canvas.selectAll(".cell")
            .data(this.treemap)
            .enter()
            .append("div")
            .call(that._position)
            .attr("class","cell")
            .on("click", function(d){
                that._transition.call(that,d,this)
            })
            .style("background", function(d) { return "rgb(66, 161, 201)"; })
            .text(function(d) { return d.name; })
        ;
        /**************************** END NEW *********************************/

        /******************** OLD - NO THRESHOLD ACCOUNTING ********************************
//        //append to each group a rectangle, starting at position x,y
//        //and with dimension dx,dy those values are already provided by d3.treemap in each dataItem (element of data)
//        this.cells.append("rect")
//            .attr("x",function(dataItem){ return dataItem.x; })
//            .attr("y",function(dataItem){ return dataItem.y; })
//            .attr("width",function(dataItem){return dataItem.dx - 1; })
//            .attr("height",function(dataItem){return dataItem.dy - 1; })
//            //apply a color for each group using the scale color based on the parent (so leaf from the same parent shares colors)
//            //that after checking if the cur item has children (so only the leaf)
//            .attr("fill", function(d){ return "rgb(66, 161, 201)"; })
//            .attr("stroke","#FFF")
//        ;

        //create all groups that contains the cells, appending a g for each data element


//        this.treemap = d3.layout.treemap()
//            .size([this.width, this.height])
//            .sort(function(a, b) { return b.name - a.name; })
////            .mode("squarify")
////            .ratio(this.height / this.width * 0.5 * (1 + Math.sqrt(5)))
//            .round(false);

//        this.canvas = d3.select("#" + this.renderDivId).append("div")
//                .style("position", "relative")
//                .style("width", (this.width + margin.left + margin.right) + "px")
//                .style("height", (this.height + margin.top + margin.bottom) + "px")
//                .style("left", margin.left + "px")
//                .style("top", margin.top + "px")
//                .attr("id", "first")
//            ;

//        var that = this;
//        var node = this.canvas.datum(data).selectAll(".node")
//                .data(this.treemap.nodes)
//                .enter()
//                .append("div")
//                .attr("class", "node")
//                .call(that._position)
//                .on("click", function(d){
//                    that._transition.call(that,d,this)
//                })
//                .style("background", function(d) { return "rgb(66, 161, 201)"; })
//                .text(function(d) { return d.name; })
//            ;
/***************************** END OLD **************************************************/

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

    _text: function(text) {
        text.attr("x", function(d) { return newTreemap.scaleX(d.x) + 6; })
            .attr("y", function(d) { return newTreemap.scaleY(d.y) + 6; });
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
            d3.select(item).attr('fill', function(d) { return "rgb(74, 197, 241)"; })
        }
    },

    _drawSlider: function(){
        // On document ready, initialize noUiSlider.
        var that = this;
        $(function(){

                var range_all_sliders = {
                    'min': [ 1 ],
                    '10%': [ 10, 1 ],
                    '50%': [ 100, 10 ],
                    'max': [ 1000 ]
                };

                that.slider.ref = $('.sliderContainer').noUiSlider({
                    start: [ newTreemap.threshold ],
                    orientation: "vertical",
                    direction: "rtl",
                    connect: "lower",
                    range: range_all_sliders
                }).on({
                    slide: function(){
                        if(that.slider.updateOnSlide === true){
                            action();
                        }
                    },
                    set: function(){
                        if(that.slider.updateOnSlide === false){
                            action();
                        }
                    }
                });

                if(that.slider.usePips){
                    that.slider.ref.noUiSlider_pips({
                        mode: 'range',
                        density: 3
                    });
                }

                _.each($('.noUi-value'),function(item){

                    item = $(item);
                    var val = parseFloat(item.html());
                    val = val / 10;
                    item.html(val+'%')

                });

                function action(){
                    var threshold = parseFloat( $('.sliderContainer').val() ) / 10,
                        curPath = that.curPath,
                        curLevel = that.curLevel,
                        data = that.unparsedData,
                        debug = that.debug
                        ;

                    $("#txtThreshold").val( threshold );

                    that.destroy();
                    that.curPath = curPath;
                    that.curLevel = curLevel;
                    that.draw(data,threshold,debug);
                    //that.goToLevel(that.curPath);
                }
        });

    },

    _position: function() {

        this.style("left", function(d) { return d.x + "px"; })
            .style("top", function(d) { return d.y + "px"; })
            .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
            .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; })
//            .style("width", function(d) {
//                return (newTreemap.scaleX(d.x + d.dx) - newTreemap.scaleX(d.x)) + "px";
//            })
//            .style("height", function(d) {
//                return (newTreemap.scaleY(d.y + d.dy) - newTreemap.scaleY(d.y)) + "px";
//            })
        ;
    },

    goToLevel: function(path){

        var data2 = _.findWhere(this.dataByLevel,{ level: path });

        if(data2){

            var that = this;
            this.canvas.selectAll(".cell").remove();

            //start drawing treemap
            this.treemap = d3.layout.treemap()
                .size([this.width,this.height])//setting size == to canvas size. TODO: padding?
                .nodes(data2)//binding data source
                .sort(function(a,b) {
                    if (a === b) return 0;
                    if (a < b) return 1;
                    if (a > b) return -1;
//                return a < b ? 1 : a > b ? -1 : 0;
                })
            ;

            //create all groups that contains the cells, appending a g for each data element
            this.cells = this.canvas.selectAll(".cell")
                .data(this.treemap)
                .enter()
                .append("g")
                .attr("class","cell")
            ;

            //append to each group a rectangle, starting at position x,y
            //and with dimension dx,dy those values are already provided by d3.treemap in each dataItem (element of data)
            this.cells.append("rect")
                .attr("x",function(dataItem){ return dataItem.x; })
                .attr("y",function(dataItem){ return dataItem.y; })
                .attr("width",function(dataItem){return dataItem.dx - 1; })
                .attr("height",function(dataItem){return dataItem.dy - 1; })
                //apply a color for each group using the scale color based on the parent (so leaf from the same parent shares colors)
                //that after checking if the cur item has children (so only the leaf)
                .attr("fill", function(d){ return "rgb(66, 161, 201)"; })
                .attr("stroke","#FFF")
                .attr("text-anchor", "middle")
                .on("click", function(d){
                    that._transition.call(that,d,this)
                })
            ;

            this.cells.append("text")
                .attr("dy", ".75em")
                .text(function(d) { return d.name; })
                .call(this._text)
            ;

            /**************** OLD - DIV no threshold *********************************
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
            /*********************** END OLD ***************************************/


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

        if(this.curLevel > 1){
            var path = this.curPath;
            path = path.substr(0,path.lastIndexOf(this.pathSign));

            if(this.curLevel <= this.maxLevel){
                this.curLevel --;
                this.goToLevel(path);
            }else{
                this.curLevel --;
                this.curPath = path;
                d3.select( this.selectedLeaf).attr('fill', function(d) { return "rgb(66, 161, 201)"; })
                this.selectedLeaf = null;
            }
        }

    },

    destroy: function(){

        if(this.canvas){
            this.canvas.remove();
        }

        this.canvas = null;
        this.curData = null;
        this.treemap = null;
        this.cells = null;
        this.startLevel = 'root';
        this.curPath = 'root';
        this.curLevel = 1;
        this.maxLevel = 3;
        this.dataByLevel =[];
        this.selectedLeaf = null;
        this.margin = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };
    },

    parseData: function(dataOrig, minThreshold, debug) {

        window.lvl1Debug="";
        window.lvl2Debug="";
        window.lvl3Debug="";

        var lvl1Max,lvl1Min,lvl2Max,lvl2Min,lvl3Max,lvl3Min,
            lvl1Count=0,lvl2Count=0,lvl3Count=0,
            lvl1Arr,lvl2Arr,lvl3Arr,
            lvl1minValue,lvl2minValue,lvl3minValue,
            lastGroup2,lastGroup3,
            data
            ;

        lvl1Arr = new Array();
        lvl2Arr = new Array();
        lvl3Arr = new Array();

        // Deep copy
        data = jQuery.extend(true, {}, dataOrig);

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

