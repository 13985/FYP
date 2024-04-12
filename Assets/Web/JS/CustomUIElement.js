"use strict";
class FloatingPanel {
    constructor(selector, toggler) {
        this.previousX = 0;
        this.previousY = 0;
        this.outerOffsetX = 0;
        this.outerOffsetY = 0;
        this.isDragging = false;
        this.isOpened = false;
        this.onMouseMove = (me) => {
            if (this.isDragging == false) {
                return;
            }
            me.preventDefault();
            this.outerOffsetX += me.clientX - this.previousX;
            this.outerOffsetY += me.clientY - this.previousY;
            this.previousX = me.clientX;
            this.previousY = me.clientY;
            this.outerDiv.style.top = `${this.outerOffsetY}px`;
            this.outerDiv.style.left = `${this.outerOffsetX}px`;
        };
        this.toggler = toggler;
        this.outerDiv = document.querySelector(selector);
        this.originalParent = this.outerDiv.parentElement;
        this.topDiv = this.outerDiv.querySelector(".panel-top");
        this.contentDiv = this.outerDiv.querySelector(".panel-content");
        this.closeButton = this.topDiv.querySelector("button[type=button]");
        this.closeButton.addEventListener("click", this.close.bind(this));
        this.topDiv.addEventListener("mousedown", (me) => {
            if (me.button == 0) {
                this.isDragging = true;
                this.previousX = me.clientX;
                this.previousY = me.clientY;
                document.addEventListener("mousemove", this.onMouseMove);
            }
        });
        this.topDiv.addEventListener("mouseup", () => {
            this.isDragging = false;
            document.removeEventListener("mousemove", this.onMouseMove);
        });
        this.toggler.addEventListener("input", () => {
            if (this.toggler.checked) {
                this.open();
            }
            else {
                this.close();
            }
        });
    }
    contentElement() {
        return this.contentDiv;
    }
    close() {
        this.toggler.checked = false;
        if (this.isOpened) {
            this.isDragging = false;
            this.outerOffsetX = 0;
            this.outerOffsetY = 0;
            this.outerDiv.style.top = "";
            this.outerDiv.style.left = "";
            document.body.removeChild(this.outerDiv);
            this.originalParent.appendChild(this.outerDiv);
            this.isOpened = false;
            setTimeout(() => {
                this.outerDiv.classList.toggle("floating-panel-open");
            }, 1); //no idea why it needs to wait some time
        }
        else {
        }
    }
    open() {
        this.toggler.checked = true;
        if (this.isOpened) {
        }
        else {
            const rect = this.outerDiv.getBoundingClientRect();
            this.outerOffsetX = rect.left;
            this.outerOffsetY = rect.top;
            this.outerDiv.style.left = `${this.outerOffsetX}px`;
            this.outerDiv.style.top = `${this.outerOffsetY}px`;
            this.originalParent.removeChild(this.outerDiv);
            document.body.appendChild(this.outerDiv);
            this.isOpened = true;
            setTimeout(() => {
                this.outerDiv.classList.toggle("floating-panel-open");
            }, 1); //no idea why it needs to wait some time
        }
    }
}
class GraphWindow {
    static main() {
        GraphWindow.template = document.getElementById("graph-window-template").content;
    }
    constructor(g) {
        var _a, _b, _c, _d;
        this.forceToX = d3.forceX().strength(0.15);
        this.forceToY = d3.forceY().strength(0.15);
        this.simulation = d3.forceSimulation()
            .force("charge", d3.forceManyBody().strength(-150))
            .force("x", this.forceToX)
            .force("y", this.forceToY);
        this.simulationStable = false;
        this.moveSpeed = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scaleX = 0;
        this.scaleY = 0;
        this.isDraggingContainer = false;
        this.moveCameraAllowed = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.magnifier = 1;
        this.width = 500;
        this.height = 500;
        this._isMouseOverContainer = false;
        this.firstSelectedVertex = -1;
        this.secondSelectedVertex = -1;
        this.pressNumber = 0;
        this.pressToSelectVertex = false;
        this.isCreateEdge = false;
        this.onVertexMoved = undefined;
        this.containerDragStarted = (me) => {
            if (me.button == 2) {
                this.isDraggingContainer = true;
                this.mouseX = me.offsetX;
                this.mouseY = me.offsetY;
            }
            else {
                this.isDraggingContainer = false;
            }
        };
        this.containerDragged = (me) => {
            if (this.isDraggingContainer == false) {
                return;
            }
            const dx = me.offsetX - this.mouseX;
            const dy = me.offsetY - this.mouseY;
            this.mouseX = me.offsetX;
            this.mouseY = me.offsetY;
            this.moveGraph(dx, dy);
        };
        this.containerDragEnded = (_me) => {
            this.isDraggingContainer = false;
        };
        this.onResizeHorizontally = () => {
            const dx = this.container.clientWidth - this.width;
            this.width = this.container.clientWidth;
            //this.offsetX+=dx/2;
            this.setWH(this.width, this.height);
            this.simulation.restart();
        };
        this.moveGraphByKey = (ke) => {
            if (this.isDraggingContainer == false) {
                return;
            }
            switch (ke.code) {
                case "ArrowLeft":
                case "KeyA":
                    this.moveGraph(-1, 0);
                    break;
                case "ArrowRight":
                case "KeyD":
                    this.moveGraph(1, 0);
                    break;
                case "ArrowUp":
                case "KeyW":
                    this.moveGraph(0, -1);
                    break;
                case "ArrowDown":
                case "KeyS":
                    this.moveGraph(0, 1);
                    break;
            }
        };
        this.edgeEditMode = (ke) => {
            switch (ke.key) {
                case "c": {
                    this.removeVerticesHighlight(this.firstSelectedVertex);
                    this.removeVerticesHighlight(this.secondSelectedVertex);
                    this.firstSelectedVertex = -1;
                    this.secondSelectedVertex = -1;
                    this.pressNumber = 0;
                    break;
                }
                case "Enter": {
                    this.doEdgeAction();
                    /*
                    this.removeVerticesHighlight(this.firstSelectedVertex);
                    this.removeVerticesHighlight(this.secondSelectedVertex);
                    this.firstSelectedVertex=-1;
                    this.secondSelectedVertex=-1;
                    this.pressNumber=0;
                    */
                    break;
                }
            }
        };
        this.graph = g;
        this.container = GraphWindow.template.querySelector("div.graph-window").cloneNode(true);
        document.getElementById("graphs-container").appendChild(this.container);
        new ResizeObserver(this.onResizeHorizontally).observe(this.container);
        this.innerSVG = this.container.querySelector("svg.graph-svg");
        this.allG = this.innerSVG.querySelector("g.all");
        const svg = d3.select(this.innerSVG)
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewbox", [0, 0, this.width, this.height]);
        const innerG = svg.select("g.all");
        this.linksG = innerG.append("g")
            .attr("stroke", "#444")
            .attr("stroke-opacity", 1);
        this.circlesG = innerG.append("g");
        this.setGraph(g);
        this.forceToX.x(this.width / 2);
        this.forceToY.y(this.height / 2);
        this.container.addEventListener("mouseleave", () => { this._isMouseOverContainer = false; });
        this.container.addEventListener("mouseenter", () => { this._isMouseOverContainer = true; });
        const control = this.container.querySelector("div.control");
        {
            const expand = control.querySelector("div.camera");
            const idstr = `bfquiwcycvyqw-${GraphWindow.ID}`;
            let innerId = 0;
            (_a = expand.querySelector("input.switch")) === null || _a === void 0 ? void 0 : _a.setAttribute("id", idstr);
            (_b = expand.querySelector(".switch.text>label")) === null || _b === void 0 ? void 0 : _b.setAttribute("for", idstr);
            const menu = expand.querySelector(".menu");
            const zoomSlider = menu.querySelector('input[type="range"].zoom');
            const zoomNumberInput = menu.querySelector('input[type="number"].zoom');
            {
                const zoomMin = 0, zoomMax = 5;
                const min = zoomMin.toString();
                const max = zoomMax.toString();
                zoomSlider.setAttribute("min", min);
                zoomSlider.setAttribute("max", max);
                zoomNumberInput.setAttribute("min", min);
                zoomNumberInput.setAttribute("max", max);
            }
            zoomSlider.addEventListener('input', () => {
                zoomNumberInput.value = zoomSlider.value;
                this.scaleGraph(zoomNumberInput.valueAsNumber);
            });
            zoomNumberInput.addEventListener('input', () => {
                zoomSlider.value = zoomNumberInput.value;
                this.scaleGraph(zoomNumberInput.valueAsNumber);
            });
            const previousMagnifier = 1;
            zoomNumberInput.valueAsNumber = previousMagnifier;
            zoomSlider.valueAsNumber = previousMagnifier;
            const moveCameraButton = menu.querySelector("input.move");
            const moveCameraLabel = menu.querySelector("label.move");
            moveCameraButton.setAttribute("id", `${idstr}-${innerId}`);
            moveCameraLabel.setAttribute("for", `${idstr}-${innerId}`);
            moveCameraButton.addEventListener("change", () => {
                this.allowMoveGraph();
            });
            ++innerId;
            const moveSpeedControl = menu.querySelector("input.speed");
            const moveSpeedLabel = menu.querySelector("label.speed");
            moveSpeedControl.setAttribute("id", `${idstr}-${innerId}`);
            moveSpeedLabel.setAttribute("for", `${idstr}-${innerId}`);
            moveSpeedControl.max = (20).toString();
            moveSpeedControl.min = (0.1).toString();
            moveSpeedControl.valueAsNumber = 2;
            this.moveSpeed = 2;
            moveSpeedControl.addEventListener("input", () => {
                this.moveSpeed = moveSpeedControl.valueAsNumber;
            });
            const teleportButton = menu.querySelector("button.teleport");
            const teleportVertexInput = menu.querySelector("input.teleport");
            teleportButton.addEventListener("click", () => {
                if (teleportVertexInput.value.length == 0) {
                    return;
                }
                const val = parseInt(teleportVertexInput.value);
                const vl = this.graph.adjacencyList.get(val);
                if (vl == undefined) {
                    return;
                }
                this.setCenter(vl.main.x, vl.main.y);
            });
        }
        {
            const expand = control.querySelector("div.vertex");
            const idstr = `enyrdhbae-${GraphWindow.ID}`;
            let innerId = 0;
            (_c = expand.querySelector("input.switch")) === null || _c === void 0 ? void 0 : _c.setAttribute("id", idstr);
            (_d = expand.querySelector(".switch.text>label")) === null || _d === void 0 ? void 0 : _d.setAttribute("for", idstr);
            const menu = expand.querySelector(".menu");
            const showIdLabel = menu.querySelector("label.show-id");
            const showIdCheckBox = menu.querySelector("input.show-id");
            showIdLabel.setAttribute("for", `${idstr}-${innerId}`);
            showIdCheckBox.setAttribute("id", `${idstr}-${innerId}`);
            ++innerId;
            showIdCheckBox.checked = true;
            showIdCheckBox.addEventListener("input", () => {
                this.displayVertexIds(showIdCheckBox.checked);
            });
        }
        ++GraphWindow.ID;
    }
    setGraph(g) {
        this.graph = g;
        return this.updateSimulation();
    }
    setVertexMovingCallback(callback = undefined) {
        this.onVertexMoved = callback;
        return this;
    }
    display(show) {
        this.container.classList.toggle("hide", !show);
    }
    setWH(width, height) {
        this.width = width;
        this.height = height;
        this.forceToX.x(this.width / 2);
        this.forceToY.y(this.height / 2);
        this.innerSVG.setAttribute("width", `${this.width}`);
        this.innerSVG.setAttribute("height", `${this.height}`);
        this.innerSVG.setAttribute("viewbox", `[0,0,${this.width},${this.height}]`);
        return this;
    }
    /**
     * @reference https://gist.github.com/mbostock/1095795
     * @reference https://observablehq.com/@d3/force-directed-graph/2?intent=fork
     */
    updateSimulation() {
        const nodes = this.graph.vertices;
        const links = this.graph.edges;
        this.simulation.stop();
        this.simulationStable = false;
        const ticked = () => {
            link.attr("x1", (e) => e.source.x)
                .attr("y1", (e) => e.source.y)
                .attr("x2", (e) => e.target.x)
                .attr("y2", (e) => e.target.y);
            node.attr("cx", (v) => v.x)
                .attr("cy", (v) => v.y);
            if (this.simulationStable == false) {
                if (this.onVertexMoved != undefined) {
                    for (const v of this.graph.vertices) {
                        this.onVertexMoved(v);
                    }
                }
                for (const v of this.graph.vertices) {
                    v.updateTextPosition();
                }
            }
        };
        this.simulation.nodes(nodes)
            .force("link", d3.forceLink(links))
            .on("tick", ticked)
            .on("end", () => {
            this.simulationStable = true;
        });
        let link = this.linksG.selectAll("line")
            .data(links, function (datum) {
            //return `${(<Edge>datum).source.id}-${(<Edge>datum).target.id}`;
            return datum.source.id * 16384 + datum.target.id;
        });
        link.exit().remove();
        link = link.enter().append("line")
            .attr("stroke-width", 1)
            .each(function (e, _idx, _lines) {
            e.line = this;
            e.line.setAttribute("stroke", "var(--reverse-color4)");
        }).merge(link);
        let node = this.circlesG.selectAll("circle")
            .data(nodes, function (data) { return data.id; });
        node.exit().remove();
        node = node.enter().append("circle")
            .attr("fill", "var(--reverse-color2)")
            .attr("r", function (n, _i) {
            return n.radius;
        })
            .call(d3.drag()
            .on("start", this.vertexDragstarted.bind(this))
            .on("drag", this.VertexDragged.bind(this))
            .on("end", this.vertexDragended.bind(this)))
            .each((v, idx, circles) => {
            v.circle = circles[idx];
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            v.text = text;
            this.circlesG.node().append(text);
            v.updateTextPosition();
            text.innerHTML = v.id.toString();
            text.classList.add("text");
            text.classList.add("vertex");
        }).merge(node);
        this.simulation.alpha(1).restart();
        return this;
    }
    vertexDragstarted(event, v) {
        if (!event.active) {
            this.simulation.alphaTarget(0.3).restart();
        }
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        this.simulationStable = false;
        if (this.pressToSelectVertex && this.secondSelectedVertex != event.subject.id && this.firstSelectedVertex != event.subject.id) {
            event.subject.circle.classList.toggle("highlight-vertex", true);
            if (this.pressNumber == 1) {
                this.removeVerticesHighlight(this.secondSelectedVertex);
                this.secondSelectedVertex = event.subject.id;
                this.pressNumber = 0;
            }
            else {
                this.removeVerticesHighlight(this.firstSelectedVertex);
                this.firstSelectedVertex = event.subject.id;
                this.pressNumber = 1;
            }
        }
        MainApp.instance().setVertexInput(this.graph.adjacencyList.get(event.subject.id).main);
    }
    VertexDragged(event, v) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        this.simulationStable = false;
    }
    vertexDragended(event, _v) {
        if (!event.active) {
            this.simulation.alphaTarget(0);
        }
        event.subject.fx = null;
        event.subject.fy = null;
        this.simulationStable = false;
    }
    isMouseOverContainer() {
        return this._isMouseOverContainer;
    }
    allowMoveGraph() {
        this.moveCameraAllowed = !this.moveCameraAllowed;
        if (this.moveCameraAllowed) {
            this.innerSVG.addEventListener("mousedown", this.containerDragStarted);
            this.innerSVG.addEventListener("mousemove", this.containerDragged);
            this.innerSVG.addEventListener("mouseup", this.containerDragEnded);
            this.innerSVG.addEventListener("keypress", this.moveGraphByKey);
            this.innerSVG.setAttribute("oncontextmenu", "return false;");
        }
        else {
            this.innerSVG.removeEventListener("mousedown", this.containerDragStarted);
            this.innerSVG.removeEventListener("mousemove", this.containerDragged);
            this.innerSVG.removeEventListener("mouseup", this.containerDragEnded);
            this.innerSVG.removeEventListener("keypress", this.moveGraphByKey);
            this.innerSVG.removeAttribute("oncontextmenu");
        }
        return this;
    }
    moveGraph(dx, dy) {
        this.offsetX += dx * this.moveSpeed;
        this.offsetY += dy * this.moveSpeed;
        this.setGTransforms();
    }
    scaleGraph(magnifier) {
        this.offsetX -= (magnifier - this.magnifier) * this.width / 2;
        this.offsetY -= (magnifier - this.magnifier) * this.height / 2; //move the graph the top left by the size/2 and the different between current and previous magnifier
        this.magnifier = magnifier;
        this.scaleX = magnifier;
        this.scaleY = magnifier;
        return this.setGTransforms();
    }
    setCenter(x, y) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        this.offsetX = centerX - x * this.scaleX;
        this.offsetY = centerY - y * this.scaleY;
        return this.setGTransforms();
    }
    resetContainerTransform() {
        this.offsetX = this.offsetY = 0;
        this.scaleX = this.scaleY = 1;
        return this.setGTransforms();
    }
    pressToAddEdge(allow) {
        if (allow) {
            this.firstSelectedVertex = -1;
            this.secondSelectedVertex = -1;
            this.pressNumber = 0;
            this.pressToSelectVertex = true;
            window.addEventListener("keypress", this.edgeEditMode);
        }
        else {
            this.pressToSelectVertex = false;
            this.removeVerticesHighlight(this.firstSelectedVertex);
            this.removeVerticesHighlight(this.secondSelectedVertex);
            this.firstSelectedVertex = -1;
            this.secondSelectedVertex = -1;
            window.removeEventListener("keypress", this.edgeEditMode);
        }
    }
    doEdgeAction() {
        if (this.firstSelectedVertex == -1 || this.secondSelectedVertex == -1) {
            return;
        }
        if (this.isCreateEdge) {
            //dont change the order to prevent short circuit evaluation
            graphHasUpdated = VisualizationUtils.Algorithm.addEdge(this.firstSelectedVertex, this.secondSelectedVertex) || graphHasUpdated;
        }
        else {
            graphHasUpdated = VisualizationUtils.Algorithm.removeEdge(this.firstSelectedVertex, this.secondSelectedVertex) || graphHasUpdated;
        }
        this.updateSimulation();
    }
    removeVerticesHighlight(v) {
        if (v >= 0) {
            const vertex = this.graph.adjacencyList.get(v).main;
            vertex.circle.classList.toggle("highlight-vertex", false);
        }
    }
    setGTransforms() {
        this.allG.setAttribute("transform", `translate(${this.offsetX} ${this.offsetY}) scale(${this.scaleX} ${this.scaleY})`);
        return this;
    }
    displayVertexIds(show) {
        var _a;
        const value = show ? "visible" : "hidden";
        for (const v of this.graph.vertices) {
            (_a = v.text) === null || _a === void 0 ? void 0 : _a.setAttribute("visibility", value);
        }
    }
}
GraphWindow.ID = 0;
