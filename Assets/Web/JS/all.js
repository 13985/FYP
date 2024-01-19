"use strict";
window.onload = function () {
    const themeButton = document.getElementById("theme-button-set");
    const html = document.body.parentNode;
    const graphContainer = document.getElementById("graph-container");
    const graphSVG_ = document.getElementById("graph-container");
    /* d3-svg declarations */
    const graphSVG = d3.select("#graph-container>svg")
        .attr("width", graphSVG_.clientWidth)
        .attr("height", graphSVG_.clientHeight)
        .attr("viewbox", [0, 0, graphSVG_.clientWidth, graphSVG_.clientHeight]);
    const svgLinksG = graphSVG.append("g")
        .attr("stroke", "#444")
        .attr("stroke-opacity", 0.6);
    const svgLinks = svgLinksG
        .selectAll("link");
    const svgCirclesG = graphSVG.append("g");
    /*.attr("stroke", "#000")
    .attr("stroke-width",1.5);*/
    const svgCircles = svgCirclesG
        .selectAll("circle");
    var SVGGOffsetX = 0, SVGGOffsetY = 0;
    const graph = new Graph();
    const scrollbarDarkCSS = "\
        html::-webkit-scrollbar-button{\
            background-color:var(--background-dark);\
            border-color:var(--background-light);\
        }\
        html::-webkit-scrollbar{\
            background-color: var(--background-light);\
        }\
        html::-webkit-scrollbar-thumb{\
            background-color:var(--background-dark);\
            border-color:var(--background-light);\
        }\
        html::-webkit-scrollbar-thumb:active{\
            background-color: rgb(80, 80, 80);\
        }\
    ";
    const scrollBarDarkSytle = document.createElement("style");
    scrollBarDarkSytle.innerText = scrollbarDarkCSS;
    /**************************************************Vertex pop up****************************************************/
    const vertexPopupInput = document.getElementById("vertex-popup-input");
    const vertexSetColor = document.getElementById("vertex-set-color");
    themeButton.addEventListener("change", () => {
        if (themeButton.checked == true) {
            for (let i = 0; i < 5; ++i) {
                html.style.setProperty(`--main-color${i}`, `var(--dark-theme-color${i})`);
                html.style.setProperty(`--reverse-color${i}`, `var(--light-theme-color${i})`);
            }
        }
        else {
            for (let i = 0; i < 5; ++i) {
                html.style.setProperty(`--main-color${i}`, `var(--light-theme-color${i})`);
                html.style.setProperty(`--reverse-color${i}`, `var(--dark-theme-color${i})`);
            }
        }
    });
    /****************************************************Graph pop up**************************************************/
    const fileInput = document.getElementById("graphupload");
    const graphUploadButton = document.getElementById("graph-upload-button");
    const graphStatusP = document.getElementById("graph-VE-status");
    graphUploadButton.addEventListener("click", () => {
        if (fileInput.files == null || fileInput.files.length <= 0) {
            return;
        }
        const f = fileInput.files[0];
        f.text().then((value) => {
            loadGraph(value);
            fileInput.value = "";
        }, null).catch((reason) => {
            console.log(reason);
        });
    });
    function setVENumber() {
        graphStatusP.innerHTML = `|V|: ${graph.vertices.length}<br>|E|: ${graph.edges.length}`;
    }
    const forceToX = d3.forceX().strength(0.15);
    const forceToY = d3.forceY().strength(0.15);
    var simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-150))
        .force("x", forceToX)
        .force("y", forceToY);
    /**
     * @reference https://gist.github.com/mbostock/1095795
     * @reference https://observablehq.com/@d3/force-directed-graph/2?intent=fork
     */
    function updateSimulation() {
        const nodes = graph.vertices;
        const links = graph.edges;
        const width = graphSVG_.clientWidth;
        const height = graphSVG_.clientHeight;
        forceToX.x(width / 2);
        forceToY.y(height / 2);
        simulation.nodes(nodes)
            .force("link", d3.forceLink(links))
            .on("tick", ticked);
        let link = svgLinksG.selectAll("line")
            .data(links, function (datum) {
            //return `${(<Edge>datum).source.id}-${(<Edge>datum).target.id}`;
            return datum.source.id * 16384 + datum.target.id;
        });
        link.exit().remove();
        link = link.enter().append("line")
            .attr("stroke-width", 1)
            .each(function (e, _idx, _lines) {
            e.line = this;
        }).merge(link);
        let node = svgCirclesG.selectAll("circle")
            .data(nodes, function (data) { return data.id; });
        node.exit().remove();
        node = node.enter().append("circle")
            .attr("r", function (n, _i) {
            return n.radius;
        })
            .attr("fill", function (n) {
            return n.getColor();
        })
            .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
            .each(function (v, _idx, _circles) {
            v.circle = this;
        }).merge(node);
        node.append("title").
            text(function (n, _i) {
            return n.id.toString();
        });
        function ticked() {
            link.attr("x1", (e) => e.source.x)
                .attr("y1", (e) => e.source.y)
                .attr("x2", (e) => e.target.x)
                .attr("y2", (e) => e.target.y);
            node.attr("cx", (v) => v.x)
                .attr("cy", (v) => v.y);
        }
        function dragstarted(event, _vertex) {
            if (!event.active)
                simulation.alphaTarget(0.3).restart();
            vertexPopupInput.value = event.subject.id.toString();
            vertexSetColor.value = event.subject.getColor();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event, _vertex) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event, _vertex) {
            if (!event.active)
                simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        simulation.alpha(1).restart();
    }
    function loadGraph(edgeList) {
        graph.clear(true);
        graph.from(edgeList);
        updateSimulation();
        setVENumber();
        SVGGOffsetX = 0;
        SVGGOffsetY = 0;
        graphSVG.selectAll("g").attr("transform", `translate(${SVGGOffsetX} ${SVGGOffsetY})`);
    }
    loadGraph("0 1\r\n\
    1 2\r\n\
    1 14\r\n\
    1 15\r\n\
    2 2\r\n\
    3 3\r\n\
    4 3\r\n\
    5 5\r\n\
    6 4\r\n\
    6 7\r\n\
    7 19\r\n\
    8 5\r\n\
    8 3\r\n\
    9 4\r\n\
    9 3\r\n\
    9 13\r\n\
    9 6\r\n\
    9 10\r\n\
    9 12\r\n\
    10 3\r\n\
    11 11\r\n\
    11 12\r\n\
    11 10\r\n\
    12 12\r\n\
    13 15\r\n\
    13 3\r\n\
    13 9\r\n\
    13 4\r\n\
    14 14\r\n\
    15 15\r\n\
    16 16\r\n\
    17 17\r\n\
    18 18\r\n\
    19 19\r\n\
    20 8\r\n\
    21 7\r\n\
    21 22\r\n\
    22 21\r\n\
    23 23\r\n\
    24 24\r\n\
    ");
    /****************************************************Vertex pop up**************************************************/
    const vertexUpdateSelect = document.getElementById("vertex-update");
    const vertexUpdateButton = document.getElementById("vertex-update-button");
    vertexSetColor.style.display = vertexUpdateSelect.value == "color" ? "block" : "none";
    vertexUpdateSelect.addEventListener("input", () => {
        vertexSetColor.style.display = vertexUpdateSelect.value == "color" ? "block" : "none";
    });
    vertexPopupInput.addEventListener("change", () => {
        if (vertexPopupInput.value.length == 0) {
            return;
        }
        const theVertex = parseInt(vertexPopupInput.value);
        switch (vertexUpdateSelect.value) {
            case "color": {
                const vl = graph.adjacencyList.get(theVertex);
                if (vl == undefined) {
                    break;
                }
                vertexSetColor.value = vl.main.getColor();
                break;
            }
            case "create":
            case "remove":
                break;
        }
    });
    vertexUpdateButton.addEventListener("click", () => {
        if (vertexPopupInput.value.length == 0) {
            return;
        }
        const theVertex = parseInt(vertexPopupInput.value);
        switch (vertexUpdateSelect.value) {
            case "create": {
                if (graph.tryAddVertex(theVertex) == null) {
                    break;
                }
                updateSimulation();
                setVENumber();
                break;
            }
            case "remove": {
                if (graph.tryRemoveVertex(theVertex) == null) {
                    break;
                }
                updateSimulation();
                setVENumber();
                break;
            }
            case "color":
                const vl = graph.adjacencyList.get(theVertex);
                if (vl == undefined) {
                    break;
                }
                vl.main.setColor(vertexSetColor.value);
                break;
        }
    });
    /****************************************************Camera pop up****************************************************/
    const zoomSlider = document.getElementById("zoom-slider");
    const zoomNumberInput = document.getElementById("zoom-typing");
    function setZoomBound() {
        const min = (0.1).toString();
        const max = (20).toString();
        zoomSlider.setAttribute("min", min);
        zoomSlider.setAttribute("max", max);
        zoomNumberInput.setAttribute("min", min);
        zoomNumberInput.setAttribute("max", max);
    }
    setZoomBound();
    zoomSlider.addEventListener('change', () => {
        zoomNumberInput.value = zoomSlider.value;
    });
    zoomNumberInput.addEventListener('change', () => {
        zoomSlider.value = zoomNumberInput.value;
    });
    const moveCameraButton = document.getElementById("camera-move-set");
    const moveSpeedControl = document.getElementById("move-speed-control");
    moveSpeedControl.max = (20).toString();
    moveSpeedControl.min = (0.1).toString();
    moveSpeedControl.valueAsNumber = 2;
    var moveCameraAllowed = false, isDragging = false;
    var previousX, previousY;
    moveCameraButton.addEventListener("change", () => {
        moveCameraAllowed = !moveCameraAllowed;
        if (moveCameraAllowed) {
            graphContainer.setAttribute("oncontextmenu", "return false;"); //disable right click call context menu
        }
        else {
            graphContainer.removeAttribute("oncontextmenu");
        }
    });
    function moveGraph(dx, dy) {
        SVGGOffsetX += dx * moveSpeedControl.valueAsNumber;
        SVGGOffsetY += dy * moveSpeedControl.valueAsNumber;
        graphSVG.selectAll("g").attr("transform", `translate(${SVGGOffsetX} ${SVGGOffsetY})`);
    }
    window.addEventListener("keydown", function (ke) {
        if (moveCameraAllowed == false)
            return;
        switch (ke.code) {
            case "ArrowLeft":
            case "KeyA":
                moveGraph(-1, 0);
                break;
            case "ArrowRight":
            case "KeyD":
                moveGraph(1, 0);
                break;
            case "ArrowUp":
            case "KeyW":
                moveGraph(0, -1);
                break;
            case "ArrowDown":
            case "KeyS":
                moveGraph(0, 1);
                break;
        }
    });
    graphContainer.addEventListener("mousedown", (me) => {
        isDragging = me.button == 2 && moveCameraAllowed; //right button
        if (isDragging) {
            previousX = me.offsetX;
            previousY = me.offsetY;
        }
    });
    graphContainer.addEventListener("mouseup", (_me) => {
        isDragging = false; //right button
    });
    graphContainer.addEventListener("mousemove", (me) => {
        if (isDragging == false)
            return;
        const dx = me.offsetX - previousX;
        const dy = me.offsetY - previousY;
        previousX = me.offsetX;
        previousY = me.offsetY;
        moveGraph(dx, dy);
    });
    const teleportButton = document.getElementById("camera-teleport-button");
    const teleportVertexInput = document.getElementById("camera-teleport-input");
    teleportButton.addEventListener("click", () => {
        if (teleportVertexInput.value.length == 0) {
            return;
        }
        const val = parseInt(teleportVertexInput.value);
        const vl = graph.adjacencyList.get(val);
        if (vl == undefined) {
            return;
        }
        const centerX = graphSVG_.clientWidth / 2;
        const centerY = graphSVG_.clientHeight / 2;
        SVGGOffsetX = centerX - vl.main.x;
        SVGGOffsetY = centerY - vl.main.y;
        graphSVG.selectAll("g").attr("transform", `translate(${SVGGOffsetX} ${SVGGOffsetY})`);
    });
    /****************************************************Algo popup **********************************************/
    const fromShell = document.getElementById("from-shell-value");
    const toShell = document.getElementById("to-shell-value");
};
