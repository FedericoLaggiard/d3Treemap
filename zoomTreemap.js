/**
 * Created by federicolaggiard on 16/10/14.
 */

var zoomTreemap = {

    renderDivId: 'treemap',               //Rendering div. Must be set before drawing call
    width: 831,                           //Width and height of the canvas
    height: 340,
    canvas: null,                         //Reference to the drawing canvas
    curData: null,                        //Current data loaded into the treemap
    treemap: null,                        //Ref to the current treemap
    cells: null,                          //Ref to svg group containing cells
    color: d3.scale.category20(),         //D3 color scale used by the treemap

    draw: function(data){

        var w = this.width,
            h = this.height,
            x = d3.scale.linear().range([0, w]),
            y = d3.scale.linear().range([0, h]),
            color = this.color,
            root,
            node
            ;

        this.treemap = d3.layout.treemap()
            .round(false)
            .size([w, h])
            .sticky(true)
            .value(function (d) {
                return d.size + 20;
            })
            .sort(function(a,b) {
                return b.value - a.value;
            });

        this.canvas = d3.select('#' + this.renderDivId)
            .attr("class", "chart")
            .style("width", w + "px")
            .style("height", h + "px")
            .append("svg:svg")
            .attr("width", w)
            .attr("height", h)
            .append("svg:g")
            .attr("transform", "translate(.5,.5)");

        node = root = data;

        var nodes = this.treemap.nodes(root)
            .filter(function (d) {
                return !d.children;
            });

        var cells = this.canvas.selectAll("g")
            .data(nodes)
            .enter().append("svg:g")
            .attr("class", "cell")
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .on("click", function (d) {
                return zoom(node == d.parent ? root : d.parent);
            });

        cells.append("svg:rect")
            .attr("width", function (d) {
                return d.dx - 1;
            })
            .attr("height", function (d) {
                return d.dy - 1;
            })
            .style("fill", function (d) {
                //return color(d.parent.name);
                return 'rgb(66, 161, 201)';
            });

        cells.append("svg:text")
            .attr("x", function (d) {
                return d.dx / 2;
            })
            .attr("y", function (d) {
                return d.dy / 2;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(function (d) {
                return d.name;
            })
            .style("opacity", function (d) {
                d.w = this.getComputedTextLength();
                return d.dx > d.w ? 1 : 0;
            });

        d3.select(window).on("click", function () {
            zoom(root);
        });

//        d3.select("select").on("change", function () {
//            this.treemap.value(this.value == "size" ? size : count).nodes(root);
//            zoom(node);
//        });

        function size(d) {
            return d.size + 300;
        }

        function count(d) {
            return 1;
        }

        var that = this;
        function zoom(d) {
            var kx = w / d.dx, ky = h / d.dy;
            x.domain([d.x, d.x + d.dx]);
            y.domain([d.y, d.y + d.dy]);

            var t = that.canvas.selectAll("g.cell").transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .attr("transform", function (d) {
                    return "translate(" + x(d.x) + "," + y(d.y) + ")";
                });

            t.select("rect")
                .attr("width", function (d) {
                    return kx * d.dx - 1;
                })
                .attr("height", function (d) {
                    return ky * d.dy - 1;
                });

            t.select("text")
                .attr("x", function (d) {
                    return kx * d.dx / 2;
                })
                .attr("y", function (d) {
                    return ky * d.dy / 2;
                })
                .style("opacity", function (d) {
                    return kx * d.dx > d.w ? 1 : 0;
                });

            node = d;
            d3.event.stopPropagation();
        }


    }

};

function parseData(data) {

    var formattedChildren = _.each(data.groups, function(item){

        item.drillDownLevel = 1;
        item.children = item.Sons;
        item.size = Math.abs(parseFloat(item.TotValue));
        item.size === 0 ? item.size = 1 : item.size;
        item.name = item.GroupDescription;
        _.each(item.children, function(child){

            child.drillDownLevel = 2;
            child.name = child.GroupDescription;
            child.size = Math.abs(parseFloat(child.TotValue));
            child.size === 0 ? child.size = 1 : child.size;
            child.children = child.Sons;
            _.each(child.children, function(childOfChild){
                childOfChild.drillDownLevel = 3;
                childOfChild.size = Math.abs(parseFloat(childOfChild.TotValue));
                childOfChild.size === 0 ? childOfChild.size = 1 : childOfChild.size;
                childOfChild.name = childOfChild.GroupDescription;
            });
        });
    });
    parsedData = {
        name: "a",
        drillDownLevel: 0,
        children: formattedChildren
    };
    return parsedData;

}