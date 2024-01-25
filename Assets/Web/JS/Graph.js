"use strict";
class Vertex {
    constructor(id) {
        this.id = id;
        this.shell = -1;
        this.radius = 5;
        this.circle = null;
        this.color = new Color(0, 0, 0);
    }
    clone() {
        var _a;
        const v = new Vertex(this.id);
        v.shell = this.shell;
        v.radius = this.radius;
        v.x = this.x;
        v.y = this.y;
        v.vx = this.vx;
        v.vy = this.vy;
        v.fx = this.fx;
        v.fy = this.fy;
        v.index = this.index;
        v.circle = (_a = this.circle) === null || _a === void 0 ? void 0 : _a.cloneNode(true);
        return v;
    }
    setColor(color) {
        this.color = color.clone();
        this.circle.setAttribute("fill", color.toString());
    }
    setColorString(color) {
        this.color = Color.fromString(color);
        this.circle.setAttribute("fill", color.toString());
    }
    getColorHexa() {
        return this.color.toHexa();
    }
    getColorString() {
        return this.color.toString();
    }
}
class Edge {
    constructor(from, to) {
        this.source = from;
        this.target = to;
        this.line = null;
    }
    toString() {
        if (this.source.id < this.target.id) {
            return `${this.source.id}-${this.target.id}`;
        }
        else {
            return `${this.target.id}-${this.source.id}`;
        }
    }
}
class VerticeList_ {
    constructor(v) {
        this.main = v;
        this.otherEdges = [];
        this.others = [];
        this.indexer = new Map();
    }
    addVertex(v, e) {
        if (this.indexer.get(v.id) != undefined) {
            return;
        }
        this.indexer.set(v.id, this.others.length);
        this.others.push(v.id);
        this.otherEdges.push(e);
    }
}
class VerticeList {
    constructor(main) {
        this.main = main;
        this.others = new Array();
    }
    clone() {
        const list = new VerticeList(this.main.clone());
        for (let i = 0; i < this.others.length; ++i) {
            list.others.push(this.others[i]);
        }
        return list;
    }
}
class Graph {
    constructor() {
        this.adjacencyList = new Map();
        this.edges = new Array();
        this.vertices = new Array();
        this.existsEdges = new Map();
    }
    from(edgeListRaw) {
        const edges = edgeListRaw.split(/[\r\n|\r|\n]+/);
        edges.forEach((e) => {
            if (Graph.edgeFormat.test(e) == false) {
                return;
            }
            const matchedValues = e.match(/(\d+)/g);
            if (matchedValues == undefined) {
                return;
            }
            const vs = matchedValues.map((val, _i, _arr) => parseInt(val));
            const see = (parent, child) => {
                let list = this.adjacencyList.get(parent);
                if (list == undefined) {
                    const v = new Vertex(parent);
                    list = new VerticeList(v);
                    this.vertices.push(v);
                    this.adjacencyList.set(parent, list);
                }
                list.others.push(child);
                return list.main;
            };
            if (vs[0] == vs[1]) {
                if (this.adjacencyList.get(vs[0]) == undefined) {
                    const v = new Vertex(vs[0]);
                    this.adjacencyList.set(vs[0], new VerticeList(v));
                    this.vertices.push(v);
                }
            }
            else {
                const code = vs[0] < vs[1] ? `${vs[0]}-${vs[1]}` : `${vs[1]}-${vs[0]}`;
                if (this.existsEdges.get(code) != undefined) {
                    return;
                }
                this.existsEdges.set(code, this.edges.length);
                this.edges.push(new Edge(see(vs[0], vs[1]), see(vs[1], vs[0])));
            }
        });
        return this;
    }
    clone() {
        const g = new Graph();
        for (let i = 0; i < this.vertices.length; ++i) {
            const id = this.vertices[i].id;
            const list = this.adjacencyList.get(id);
            g.adjacencyList.set(id, list.clone());
            g.vertices.push(list.main);
        }
        for (let i = 0; i < g.edges.length; ++i) {
            g.edges[i].source = g.adjacencyList.get(this.edges[i].source.id).main;
            g.edges[i].source = g.adjacencyList.get(this.edges[i].target.id).main;
        }
        this.existsEdges.forEach((val, key) => {
            g.existsEdges.set(`${key}`, val);
        });
        return g;
    }
    vertexCount() {
        return this.adjacencyList.size;
    }
    removeVertex(v) {
        const list = this.adjacencyList.get(v);
        if (list == undefined) {
            return false;
        }
        for (let i = 0; i < list.others.length; ++i) {
            const _l = this.adjacencyList.get(list.others[i]);
            for (let j = 0; j < _l.others.length; ++j) {
                if (_l.others[j] == v) {
                    _l.others[j] == _l.others[_l.others.length - 1];
                    _l.others.pop();
                    break;
                }
            }
        }
        return true;
    }
    addVertex(v) {
        if (this.adjacencyList.get(v) != undefined) {
            return false;
        }
        this.adjacencyList.set(v, new VerticeList(new Vertex(v)));
        return true;
    }
    clear(removeSVG = false) {
        this.adjacencyList.clear();
        if (removeSVG) {
            for (let i = 0; i < this.vertices.length; ++i) {
                this.vertices[i].circle.remove();
            }
            for (let i = 0; i < this.edges.length; ++i) {
                this.edges[i].line.remove();
            }
        }
        this.edges.length = 0;
        this.vertices.length = 0;
    }
    translate(dx, dy) {
        const translate = `translate(${dx}px,${dy}px);`;
        for (let i = 0; i < this.vertices.length; ++i) {
            const v = this.vertices[i];
            if (v.circle != null) {
                v.circle.style.transform = translate;
            }
        }
        for (let i = 0; i < this.edges.length; ++i) {
            const e = this.edges[i];
            if (e.line) {
                e.line.style.transform = translate;
            }
        }
    }
    tryRemoveVertex(theVertex) {
        const vl = this.adjacencyList.get(theVertex);
        if (vl == undefined) {
            return null;
        }
        for (const v_id of vl.others) {
            const other_vl = this.adjacencyList.get(v_id);
            for (let i = 0; i < other_vl.others.length; ++i) {
                if (other_vl.others[i] != theVertex) {
                    continue;
                }
                other_vl.others.splice(i, 1);
                break;
            }
        }
        this.adjacencyList.delete(theVertex);
        for (let i = 0; i < this.vertices.length; ++i) {
            if (this.vertices[i].id != vl.main.id) {
                continue;
            }
            //(graph.vertices[i].circle as SVGCircleElement).remove();
            this.vertices.splice(i, 1);
            break;
        }
        let lengthLeft = this.edges.length;
        for (let i = 0; i < lengthLeft;) {
            const e = this.edges[i];
            if (e.source.id != theVertex && e.target.id != theVertex) {
                ++i;
            }
            else {
                //(e.line as SVGLineElement).remove();
                this.edges[i] = this.edges[lengthLeft - 1];
                --lengthLeft;
            }
        }
        this.edges.length = lengthLeft;
        return vl.main;
    }
    tryAddVertex(theVertex) {
        if (this.adjacencyList.get(theVertex) != undefined) {
            return null;
        }
        const v = new Vertex(theVertex);
        const vl = new VerticeList(v);
        this.adjacencyList.set(theVertex, vl);
        this.vertices.push(v);
        return v;
    }
    addEdges(a, b) {
        if (this.adjacencyList.get(a) == undefined || this.adjacencyList.get(b) == undefined) {
            return false;
        }
        const code = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (this.existsEdges.get(code) != undefined) {
            return false;
        }
        const a_vl = this.adjacencyList.get(a);
        const b_vl = this.adjacencyList.get(b);
        const e = new Edge(a_vl.main, b_vl.main);
        this.existsEdges.set(code, this.edges.length);
        this.edges.push(e);
        a_vl.others.push(b);
        b_vl.others.push(a);
        return true;
    }
    removeEdges(edges) {
    }
}
Graph.edgeFormat = /[\s?\d+\s?][,|\s?][\d+\s?]/;
