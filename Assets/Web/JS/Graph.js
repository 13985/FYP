"use strict";
class Vertex {
    constructor(id) {
        this.list = undefined;
        this.id = id;
        this.radius = 5.5;
        this.circle = null;
        this.text = null;
        this.color = new Color(0, 0, 0);
    }
    clone() {
        const v = new Vertex(this.id);
        v.radius = this.radius;
        v.x = this.x;
        v.y = this.y;
        v.vx = this.vx;
        v.vy = this.vy;
        v.fx = this.fx;
        v.fy = this.fy;
        v.index = this.index;
        return v;
    }
    updateTextPosition() {
        var _a, _b;
        (_a = this.text) === null || _a === void 0 ? void 0 : _a.setAttribute("x", `${this.x + this.radius}`);
        (_b = this.text) === null || _b === void 0 ? void 0 : _b.setAttribute("y", `${this.y + this.radius}`);
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
/*
class VerticeList_{
    public main:Vertex;
    public others:Array<number>;
    public otherEdges:Array<Edge>;
    private indexer:Map<number,number>;

    public constructor(v:Vertex){
        this.main=v;
        this.otherEdges=[];
        this.others=[];
        this.indexer=new Map<number,number>();
    }


    public addVertex(v:Vertex,e:Edge):void{
        if(this.indexer.get(v.id)!=undefined){
            return;
        }
        this.indexer.set(v.id,this.others.length);
        this.others.push(v.id);
        this.otherEdges.push(e);
    }
}
*/
class VerticeList {
    constructor(main) {
        this.main = main;
        this.main.list = this;
        this.others = new Array();
    }
    remove(other) {
        const length = this.others.length;
        for (let i = 0; i < length; ++i) {
            if (this.others[i] == other) {
                this.others[i] = this.others[length - 1];
                this.others.pop();
                return;
            }
        }
    }
    clone() {
        const list = new VerticeList(this.main.clone());
        for (let i = 0; i < this.others.length; ++i) {
            list.others.push(this.others[i]);
        }
        return list;
    }
}
/**
 * @summary
 * the hash code of getting an egde is first*MAXIMUM_VERTICES+second
 * so it not supports MAXIMUM_VERTICES or more vertices other the code will collide
 * maximum safe integer in javascript is 9007199254740991 and the limit of vertices number is 94906265
 */
class Graph {
    constructor() {
        this.adjacencyList = new Map();
        this.edges = new Array();
        this.vertices = new Array();
        this.existsEdges = new Map();
    }
    from(edgeListRaw) {
        this.adjacencyList.clear();
        this.vertices.length = 0;
        this.edges.length = 0;
        this.existsEdges.clear();
        const edges = edgeListRaw.split(/[\r\n|\r|\n]+/);
        for (const e of edges) {
            if (Graph.edgeFormat.test(e) == false) {
                continue;
            }
            const matchedValues = e.match(/(\d+)/g);
            if (matchedValues == undefined) {
                continue;
            }
            const vs = matchedValues.map((val, _i, _arr) => parseInt(val));
            const see = (parent, child) => {
                let list = this.adjacencyList.get(parent);
                if (list == undefined) {
                    list = new VerticeList(new Vertex(parent));
                    this.vertices.push(list.main);
                    this.adjacencyList.set(parent, list);
                }
                list.others.push(child);
                return list.main;
            };
            if (vs[0] == vs[1]) {
                if (this.adjacencyList.get(vs[0]) == undefined) {
                    const list = new VerticeList(new Vertex(vs[0]));
                    this.adjacencyList.set(vs[0], list);
                    this.vertices.push(list.main);
                }
            }
            else {
                const code = this.getEdgeHashCode(vs[0], vs[1]);
                if (this.existsEdges.get(code) != undefined) {
                    continue;
                }
                this.existsEdges.set(code, this.edges.length);
                this.edges.push(new Edge(see(vs[0], vs[1]), see(vs[1], vs[0])));
            }
        }
        return this;
    }
    getEdgeHashCode(v0, v1) {
        if (v0 < v1) {
            return v0 * Graph.MAXIMUM_VERTICES + v1;
        }
        else {
            return v1 * Graph.MAXIMUM_VERTICES + v0;
        }
    }
    copyTo(g) {
        g.clear(true);
        for (let i = 0; i < this.vertices.length; ++i) {
            const id = this.vertices[i].id;
            const list = this.adjacencyList.get(id);
            const listClone = list.clone();
            g.adjacencyList.set(id, listClone);
            g.vertices.push(listClone.main);
        }
        for (let i = 0; i < this.edges.length; ++i) {
            g.edges.push(new Edge(g.adjacencyList.get(this.edges[i].source.id).main, g.adjacencyList.get(this.edges[i].target.id).main));
        }
        this.existsEdges.forEach((val, key) => {
            g.existsEdges.set(key, val);
        });
    }
    clear(removeSVG = false) {
        this.adjacencyList.clear();
        if (removeSVG) {
            for (const v of this.vertices) {
                v.circle.remove();
                v.text.remove();
            }
            for (let i = 0; i < this.edges.length; ++i) {
                this.edges[i].line.remove();
            }
        }
        this.edges.length = 0;
        this.vertices.length = 0;
        this.existsEdges.clear();
        return this;
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
    removeVertex(theVertex) {
        var _a, _b, _c;
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
            const v = this.vertices[i];
            if (v.id != vl.main.id) {
                continue;
            }
            (_a = v.circle) === null || _a === void 0 ? void 0 : _a.remove();
            (_b = v.text) === null || _b === void 0 ? void 0 : _b.remove();
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
                (_c = e.line) === null || _c === void 0 ? void 0 : _c.remove();
                this.edges[i] = this.edges[lengthLeft - 1];
                --lengthLeft;
            }
        }
        this.edges.length = lengthLeft;
        return vl.main;
    }
    addVertex(theVertex) {
        if (this.adjacencyList.get(theVertex) != undefined) {
            return null;
        }
        const v = new Vertex(theVertex);
        const vl = new VerticeList(v);
        v.list = vl;
        this.adjacencyList.set(theVertex, vl);
        this.vertices.push(v);
        return v;
    }
    addEdge(a, b) {
        if (this.adjacencyList.get(a) == undefined || this.adjacencyList.get(b) == undefined) {
            return false;
        }
        const code = this.getEdgeHashCode(a, b);
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
    removeEdge(a, b) {
        var _a;
        if (this.adjacencyList.get(a) == undefined || this.adjacencyList.get(b) == undefined) {
            return false;
        }
        const code = this.getEdgeHashCode(a, b);
        const idx = this.existsEdges.get(code);
        if (idx == undefined) {
            return false;
        }
        const e = this.edges[this.edges.length - 1];
        this.existsEdges.set(this.getEdgeHashCode(e.source.id, e.target.id), idx);
        this.existsEdges.delete(code);
        (_a = this.edges[idx].line) === null || _a === void 0 ? void 0 : _a.remove();
        this.edges[idx] = e;
        this.edges.pop();
        const a_vl = this.adjacencyList.get(a);
        const b_vl = this.adjacencyList.get(b);
        a_vl.remove(b);
        b_vl.remove(a);
        return true;
    }
    getEdge(v0, v1) {
        const code = this.getEdgeHashCode(v0, v1);
        const idx = this.existsEdges.get(code);
        if (idx == undefined) {
            return undefined;
        }
        return this.edges[idx];
    }
    displayVertex(v_id, visible) {
        const value = visible ? "visible" : "hidden";
        const vl = this.adjacencyList.get(v_id);
        vl.main.circle.setAttribute("visibility", value);
        vl.main.text.setAttribute("visibility", value);
        for (const n of vl.others) {
            const code = this.getEdgeHashCode(v_id, n);
            const e = this.edges[this.existsEdges.get(code)];
            e.line.setAttribute("visibility", value);
        }
    }
    resetVisualElements() {
        for (const v of this.vertices) {
            v.circle.setAttribute("fill", "var(--reverse-color2)");
            v.circle.setAttribute("fill-opacity", "1");
        }
        for (const e of this.edges) {
            const line = e.line;
            line.setAttribute("stroke", "var(--reverse-color2)");
            line.setAttribute("stroke-opacity", "0.6");
            line.setAttribute("stroke-width", "1");
        }
        return this;
    }
}
Graph.MAXIMUM_VERTICES = 100000;
Graph.edgeFormat = /[\s?\d+\s?][,|\s?][\d+\s?]/;
