"use strict";
class FloatingPanel {
    constructor(selector) {
        this.previousX = 0;
        this.previousY = 0;
        this.outerOffsetX = 0;
        this.outerOffsetY = 0;
        this.isDragging = false;
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
            }
        });
        this.topDiv.addEventListener("mouseup", () => {
            this.isDragging = false;
        });
        this.topDiv.addEventListener("mouseleave", () => {
            this.isDragging = false;
        });
        this.topDiv.addEventListener("mousemove", (me) => {
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
        });
    }
    setCloseCallback(callback) {
        this.closeButton.addEventListener("click", () => {
            callback();
        });
        return this;
    }
    close() {
        this.isDragging = false;
        this.outerOffsetX = 0;
        this.outerOffsetY = 0;
        this.outerDiv.style.top = "";
        this.outerDiv.style.left = "";
        document.body.removeChild(this.outerDiv);
        this.originalParent.appendChild(this.outerDiv);
        setTimeout(() => {
            this.outerDiv.classList.toggle("floating-panel-open");
        }, 1); //no idea why it needs to wait some time
    }
    open() {
        const rect = this.outerDiv.getBoundingClientRect();
        this.outerOffsetX = rect.left + window.scrollX;
        this.outerOffsetY = rect.top + window.scrollY;
        this.outerDiv.style.left = `${this.outerOffsetX}px`;
        this.outerDiv.style.top = `${this.outerOffsetY}px`;
        this.originalParent.removeChild(this.outerDiv);
        document.body.appendChild(this.outerDiv);
        setTimeout(() => {
            this.outerDiv.classList.toggle("floating-panel-open");
        }, 1); //no idea why it needs to wait some time
    }
}
/**
 * @field
 * hierarchy:
 * container        (html element)
 * --innerSVG       (svg element)
 *   --circles      (svg g element, created by this class)
 *   --links        (svg g element, created by this class)
 */
class GraphWindow {
    constructor(g, containerSelector, innerSVGSelector) {
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
        this.mouseX = 0;
        this.mouseY = 0;
        this.magnifier = 1;
        this.width = 500;
        this.height = 500;
        this._isMouseOverContainer = false;
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
        this.graph = g;
        this.container = document.querySelector(containerSelector);
        this.innerSVG = document.querySelector(innerSVGSelector);
        const svg = d3.select(innerSVGSelector)
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewbox", [0, 0, this.width, this.height]);
        this.linksG = svg.append("g")
            .attr("stroke", "#444")
            .attr("stroke-opacity", 0.6);
        this.circlesG = svg.append("g");
        this.setGraph(g);
        this.forceToX.x(this.width / 2);
        this.forceToY.y(this.height / 2);
        this.container.addEventListener("mouseleave", () => { this._isMouseOverContainer = false; });
        this.container.addEventListener("mouseenter", () => { this._isMouseOverContainer = true; });
    }
    setGraph(g) {
        this.graph = g;
        return this.updateSimulation();
    }
    setVertexDragStartCallback(callback = undefined) {
        this.onVertexMoved = callback;
        return this;
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
        const ticked = () => {
            link.attr("x1", (e) => e.source.x)
                .attr("y1", (e) => e.source.y)
                .attr("x2", (e) => e.target.x)
                .attr("y2", (e) => e.target.y);
            node.attr("cx", (v) => v.x)
                .attr("cy", (v) => v.y);
            if (this.simulationStable == false && this.onVertexMoved != undefined) {
                console.log("hi");
                for (const v of this.graph.vertices) {
                    this.onVertexMoved(v);
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
            .each(function (v, _idx, _circles) {
            v.circle = this;
        }).merge(node);
        node.append("title").
            text(function (n, _i) {
            return n.id.toString();
        });
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
    allowMoveGraph(allow) {
        if (allow) {
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
        this.offsetX = centerX - x;
        this.offsetY = centerY - y;
        return this.setGTransforms();
    }
    resetContainerTransform() {
        this.offsetX = this.offsetY = 0;
        this.scaleX = this.scaleY = 1;
        return this.setGTransforms();
    }
    setGTransforms() {
        this.linksG.attr("transform", `translate(${this.offsetX} ${this.offsetY}) scale(${this.scaleX} ${this.scaleY})`);
        this.circlesG.attr("transform", `translate(${this.offsetX} ${this.offsetY}) scale(${this.scaleX} ${this.scaleY})`);
        return this;
    }
}
