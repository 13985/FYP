"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var KCoreAlgorithm;
(function (KCoreAlgorithm) {
    class ConnectedComponent {
        constructor() {
            this.vertices = [];
            this.shell = -1;
            this.polygonOpacity = 0;
            this.polygon = null;
        }
    }
    KCoreAlgorithm.ConnectedComponent = ConnectedComponent;
    class ShellComponets {
        constructor() {
            this.connectedComponents = [];
            this.shell = -1;
            this.color = new Color(0, 0, 0);
        }
    }
    KCoreAlgorithm.ShellComponets = ShellComponets;
    class KCore {
        constructor(g) {
            this.shellComponents = [];
            /******************helper data structures*****************/
            this.shells = new Map();
            this.degrees = new Map();
            this.inSet1 = new Map();
            this.set0 = [];
            this.set1 = [];
            this.unionFind = new UnionFind();
            this.graph = g;
            this.maxOption = null;
            this.minOption = null;
        }
        setGraph(g) {
            this.graph = g;
            this.fastIteration();
            return this;
        }
        setColor(start, end) {
            var _a;
            const color0 = Color.fromString(start);
            const color1 = Color.fromString(end);
            const shellCount = this.shellComponents.length;
            const interval = shellCount - 1;
            for (let i = 0; i < shellCount; ++i) {
                Color.lerp(this.shellComponents[i].color, color0, color1, i / interval);
            }
            for (const sc of this.shellComponents) {
                for (const cc of sc.connectedComponents) {
                    (_a = cc.polygon) === null || _a === void 0 ? void 0 : _a.setAttribute("fill", sc.color.toString(cc.polygonOpacity));
                    for (const v of cc.vertices) {
                        v.circle.setAttribute("fill", sc.color.toString());
                    }
                }
            }
            return this;
        }
        fastIteration() {
            this.unionFind.set(this.graph.vertices.length);
            this.clearHelpers();
            let currentShell = 0, nextShell = 1;
            this.graph.adjacencyList.forEach((vl, k) => {
                if (vl.others.length <= 0) {
                    this.set0.push(k);
                    this.degrees.set(k, -1);
                }
                else {
                    this.shells.set(k, -1);
                    this.inSet1.set(k, this.set1.length);
                    this.set1.push(k);
                    this.degrees.set(k, vl.others.length);
                    nextShell = Math.min(nextShell, vl.others.length);
                }
            });
            while (true) {
                while (this.set0.length > 0) {
                    const v_id = this.set0.pop();
                    const vl = this.graph.adjacencyList.get(v_id);
                    this.shells.set(v_id, currentShell);
                    vl.main.shell = currentShell;
                    for (const neighbor of vl.others) {
                        let degree = this.degrees.get(neighbor);
                        if (degree < 0) {
                            if (this.shells.get(neighbor) == currentShell) {
                                this.unionFind.union(neighbor, v_id);
                            }
                            continue;
                        }
                        --degree;
                        if (degree <= currentShell) {
                            this.removeFromSet1(neighbor);
                        }
                        else {
                            nextShell = Math.min(nextShell, degree);
                            this.degrees.set(neighbor, degree);
                        }
                    }
                }
                currentShell = nextShell;
                if (this.set1.length <= 0) {
                    break;
                }
                nextShell = currentShell + 1;
                for (let i = 0; i < this.set1.length;) {
                    const d = this.degrees.get(this.set1[i]);
                    if (d <= currentShell) {
                        this.removeFromSet1(this.set1[i]);
                    }
                    else {
                        ++i;
                    }
                }
            }
            for (let i = 0; i < currentShell; ++i) {
                this.shellComponents.push(new ShellComponets());
                this.shellComponents[i].shell = i;
            }
            this.degrees.clear();
            this.unionFind.flatten();
            const pComponentIndex = this.degrees;
            for (let node = 0; node < this.unionFind.parents.length; ++node) {
                if (node != this.unionFind.parents[node])
                    continue;
                const shell = this.shells.get(node);
                const sc = this.shellComponents[shell].connectedComponents;
                const cc = new ConnectedComponent();
                pComponentIndex.set(node, sc.length);
                cc.vertices.push(this.graph.adjacencyList.get(node).main);
                cc.shell = shell;
                sc.push(cc);
            }
            for (let node = 0; node < this.unionFind.parents.length; ++node) {
                if (node == this.unionFind.parents[node])
                    continue;
                this.shellComponents[this.shells.get(node)].connectedComponents[pComponentIndex.get(this.unionFind.parents[node])].vertices.push(this.graph.adjacencyList.get(node).main);
            }
            return this;
        }
        slowIteration() {
            return __awaiter(this, void 0, void 0, function* () {
                this.unionFind.set(this.graph.vertices.length);
                this.clearHelpers();
                let currentShell = 0, nextShell = 1;
                this.graph.adjacencyList.forEach((vl, k) => {
                    if (vl.others.length <= 0) {
                        this.set0.push(k);
                        this.degrees.set(k, -1);
                    }
                    else {
                        this.shells.set(k, -1);
                        this.inSet1.set(k, this.set1.length);
                        this.set1.push(k);
                        this.degrees.set(k, vl.others.length);
                        nextShell = Math.min(nextShell, vl.others.length);
                    }
                });
                while (true) {
                    while (this.set0.length > 0) {
                        const v_id = this.set0.pop();
                        const vl = this.graph.adjacencyList.get(v_id);
                        this.shells.set(v_id, currentShell);
                        vl.main.shell = currentShell;
                        for (const neighbor of vl.others) {
                            let degree = this.degrees.get(neighbor);
                            if (degree < 0) {
                                if (this.shells.get(neighbor) == currentShell) {
                                    this.unionFind.union(neighbor, v_id);
                                }
                                continue;
                            }
                            --degree;
                            if (degree <= currentShell) {
                                this.removeFromSet1(neighbor);
                            }
                            else {
                                nextShell = Math.min(nextShell, degree);
                                this.degrees.set(neighbor, degree);
                            }
                        }
                    }
                    currentShell = nextShell;
                    if (this.set1.length <= 0) {
                        break;
                    }
                    nextShell = currentShell + 1;
                    for (let i = 0; i < this.set1.length;) {
                        const d = this.degrees.get(this.set1[i]);
                        if (d <= currentShell) {
                            this.removeFromSet1(this.set1[i]);
                        }
                        else {
                            ++i;
                        }
                    }
                }
            });
        }
        removeFromSet1(target) {
            this.set0.push(target);
            this.degrees.set(target, -1);
            const last = this.set1[this.set1.length - 1];
            const idx = this.inSet1.get(target);
            this.inSet1.delete(target);
            this.set1[idx] = last;
            this.inSet1.set(last, idx);
            this.set1.pop();
        }
        clearHelpers() {
            this.degrees.clear();
            this.inSet1.clear();
            this.shells.clear();
            this.set0.length = 0;
            this.set1.length = 0;
            this.shellComponents.length = 0;
        }
        setSelects(min, max) {
            this.minOption = min;
            this.maxOption = max;
            this.createOptions(0, this.shellComponents.length, this.minOption);
            this.createOptions(0, this.shellComponents.length, this.maxOption);
            this.minOption.addEventListener("change", () => {
                this.createOptions(parseInt(this.minOption.value), this.shellComponents.length, this.maxOption);
            });
            this.maxOption.addEventListener("change", () => {
                this.createOptions(0, parseInt(this.maxOption.value) + 1, this.minOption);
            });
            this.minOption.value = "0";
            this.maxOption.value = (this.shellComponents.length - 1).toString();
        }
        createOptions(start, end, select) {
            const val = parseInt(select.value);
            select.innerHTML = "";
            for (let i = start; i < end; ++i) {
                select.innerHTML += `
                <option value="${i}">${i}</option>
                `;
            }
            select.value = Math.max(start, Math.min(end - 1, val)).toString();
        }
    }
    KCoreAlgorithm.KCore = KCore;
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }
    KCoreAlgorithm.Point = Point;
    class ConvesHull {
        static cross(o, a, b) {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        }
        static Solve(cc) {
            const polygon = cc.polygon;
            polygon.points.clear();
            if (cc.vertices.length < 4) {
                for (const vertex of cc.vertices) {
                    const p = new DOMPoint(vertex.x, vertex.y);
                    polygon.points.appendItem(p);
                }
                return;
            }
            function approximately(a, b) {
                return Math.abs(a - b) < 0.0001;
            }
            cc.vertices.sort((a, b) => {
                if (approximately(a.x, b.x)) {
                    if (approximately(a.y, b.y)) {
                        return 0;
                    }
                    else {
                        return a.y - b.y;
                    }
                }
                else {
                    return a.x - b.x;
                }
            });
            ConvesHull.points.length = 0;
            for (const vertex of cc.vertices) {
                const p = new Point(vertex.x, vertex.y);
                while (ConvesHull.points.length > 1 && ConvesHull.cross(ConvesHull.points[ConvesHull.points.length - 2], ConvesHull.points[ConvesHull.points.length - 1], p) <= 0) {
                    --ConvesHull.points.length;
                }
                ConvesHull.points.push(p);
            }
            const base = ConvesHull.points.length;
            for (let i = cc.vertices.length - 2; i >= 0; --i) {
                const vertex = cc.vertices[i];
                const p = new Point(vertex.x, vertex.y);
                while (ConvesHull.points.length > base && ConvesHull.cross(ConvesHull.points[ConvesHull.points.length - 2], ConvesHull.points[ConvesHull.points.length - 1], p) <= 0) {
                    --ConvesHull.points.length;
                }
                ConvesHull.points.push(p);
            }
            for (const p of ConvesHull.points) {
                polygon.points.appendItem(new DOMPoint(p.x, p.y));
            }
        }
    }
    KCoreAlgorithm.ConvesHull = ConvesHull;
})(KCoreAlgorithm || (KCoreAlgorithm = {}));
class UnionFind {
    constructor() {
        this.parents = [];
        this.stack = [];
    }
    set(size) {
        this.parents.length = size;
        for (let i = 0; i < size; ++i) {
            this.parents[i] = i;
        }
    }
    union(a, b) {
        const p_a = this.find(a), p_b = this.find(b);
        if (p_a == p_b) {
            return true;
        }
        else {
            this.parents[p_a] = p_b;
            return false;
        }
    }
    find(a) {
        let p = a;
        while (this.parents[p] != p) {
            this.stack.push(p);
            p = this.parents[p];
        }
        while (this.stack.length > 0) {
            const node = this.stack.pop();
            this.parents[node] = p;
        }
        return p;
    }
    flatten() {
        for (let i = 0; i < this.parents.length; ++i) {
            this.parents[i] = this.find(i);
        }
    }
}
class Color {
    constructor(r, g, b, a = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = 255;
    }
    validate() {
        this.r = Math.max(0, Math.min(this.r, 255));
        this.g = Math.max(0, Math.min(this.g, 255));
        this.b = Math.max(0, Math.min(this.b, 255));
        this.a = Math.max(0, Math.min(this.a, 255));
        return this;
    }
    toString(a) {
        return `rgb(${this.r},${this.g},${this.b},${a == undefined ? this.a : a})`;
    }
    assignFrom(other) {
        this.r = other.r;
        this.g = other.g;
        this.b = other.b;
        this.a = other.a;
        return this;
    }
    static fromString(val) {
        let r, g, b, a;
        if (val[0].startsWith("#")) {
            if (val.length == 7) {
                r = parseInt(val.substring(1, 3), 16);
                g = parseInt(val.substring(3, 5), 16);
                b = parseInt(val.substring(5, 7), 16);
                a = 255;
            }
            else if (val.length == 9) {
                r = parseInt(val.substring(1, 3), 16);
                g = parseInt(val.substring(3, 5), 16);
                b = parseInt(val.substring(5, 7), 16);
                a = parseInt(val.substring(7, 9), 16);
            }
            else {
                return new Color(-1, -1, -1);
            }
        }
        else if (val.startsWith("rgb(")) {
            const numbers = val.split(/\d+/g).map((val) => parseFloat(val));
            if (numbers.length == 3) {
                r = numbers[0];
                g = numbers[1];
                b = numbers[2];
                a = 255;
            }
            else if (numbers.length == 4) {
                r = numbers[0];
                g = numbers[1];
                b = numbers[2];
                a = numbers[3];
            }
            else {
                return new Color(-1, -1, -1);
            }
        }
        else {
            return new Color(-1, -1, -1);
        }
        return new Color(r, g, b, a).validate();
    }
    static lerp(ret, start, end, t) {
        ret.r = start.r * (1 - t) + end.r * t;
        ret.g = start.g * (1 - t) + end.g * t;
        ret.b = start.b * (1 - t) + end.b * t;
        ret.a = start.a * (1 - t) + end.a * t;
    }
}
