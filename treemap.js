/**
 * Created by federicolaggiard on 14/10/14.
 */

var baseTreemap = {

    renderDivId: '',                      //Rendering div. Must be set before drawing call
    width: 500,                           //Width and height of the canvas
    height: 500,
    canvas: null,                         //Reference to the drawing canvas
    curInputUrl: '',                      //Url used to fetch JSON. Must be set before drawing call
    curData: null,                        //Current data loaded into the treemap
    treemap: null,                        //Ref to the current treemap
    cells: null,                          //Ref to svg group containing cells
    color: d3.scale.category10(),         //D3 color scale used by the treemap

    /***
     * Method to start drawing process of treemap
     * @param inputUrl Url for fetching data
     */
    draw: function(inputUrl){

        if( !this.renderDivId ) return console.error("NO RENDER DIV ID");
        if( !inputUrl ) return console.error("NO JSON URL PROVIDED");

        //Creating svg canvas
        this.canvas = d3.select(this.renderDivId)
            .append("svg")
            .attr("width",this.width)
            .attr("height",this.height);

        //storing called URL
        this.curInputUrl = inputUrl;

        //Call JSON with D3 method
        var that = this;
        d3.json(this.curInputUrl, function(data){

            //storing current data
            that.curData = data;

            //start drawing treemap
            that.treemap = d3.layout.treemap()
                .size([that.width,that.height])//setting size == to canvas size. TODO: padding?
                .nodes(that.curData)//binding data source
            ;

            //create all groups that contains the cells, appending a g for each data element
            that.cells = that.canvas.selectAll(".cell")
                .data(that.treemap)
                .enter()
                    .append("g")
                    .attr("class","cell")
            ;

            //append to each group a rectangle, starting at position x,y
            //and with dimension dx,dy those values are already provided by d3.treemap in each dataItem (element of data)
            that.cells.append("rect")
                .attr("x",function(dataItem){ return dataItem.x; })
                .attr("y",function(dataItem){ return dataItem.y; })
                .attr("width",function(dataItem){return dataItem.dx - 1; })
                .attr("height",function(dataItem){return dataItem.dy - 1; })
                //apply a color for each group using the scale color based on the parent (so leaf from the same parent shares colors)
                //that after checking if the cur item has children (so only the leaf)
                .attr("fill", function(d){ return d.children ? null : that.color(d.parent.name) })
                .attr("stroke","#FFF")
            ;

        })

    }
};