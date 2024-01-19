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
    class UnionFind {
        constructor(size) {
            this.stack = [];
            this.parents = new Array(size);
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
    KCoreAlgorithm.UnionFind = UnionFind;
    class ConnectedComponent {
        constructor() {
            this.vertices = [];
            this.shell = -1;
            this.polygon = null;
        }
    }
    KCoreAlgorithm.ConnectedComponent = ConnectedComponent;
    class ShellComponets {
        constructor() {
            this.connectedComponents = [];
            this.shell = -1;
        }
    }
    KCoreAlgorithm.ShellComponets = ShellComponets;
    class KCore {
        constructor(g) {
            this.shellComponents = [];
            this.graph = g;
            this.maxOption = null;
            this.minOption = null;
        }
        fastIteration() {
            const shells = new Map();
            const degrees = new Map();
            const inSet1 = new Map();
            const set0 = [];
            const set1 = [];
            const unionFind = new UnionFind(this.graph.vertices.length);
            let currentShell = 0, nextShell = 0;
            function removeFromSet1(target) {
                const last = set1.pop();
                const idx = inSet1.get(target);
                set0[idx] = last;
                inSet1.set(last, idx);
                inSet1.delete(target);
                degrees.set(target, -1);
            }
            this.graph.adjacencyList.forEach((vl, k) => {
                if (vl.others.length <= 0) {
                    set0.push(k);
                    degrees.set(k, 0);
                }
                else {
                    shells.set(k, -1);
                    inSet1.set(k, set1.length);
                    set1.push(k);
                    degrees.set(k, vl.others.length);
                }
            });
            while (set0.length > 0) {
                const v_id = set0.pop();
                const vl = this.graph.adjacencyList.get(v_id);
                shells.set(v_id, currentShell);
                nextShell = currentShell + 1;
                if (vl) {
                    const neighbors = vl.others;
                    for (const neighbor of neighbors) {
                        let degree = degrees.get(neighbor);
                        if (degree < 0) {
                            if (shells.get(neighbor) == currentShell) {
                                unionFind.union(neighbor, v_id);
                            }
                            continue;
                        }
                        --degree;
                        if (degree <= currentShell) {
                            removeFromSet1(neighbor);
                        }
                        else {
                            nextShell = Math.min(nextShell, degree);
                            degrees.set(neighbor, degree);
                        }
                    }
                }
                currentShell = nextShell;
                for (let i = 0; i < set1.length;) {
                    const d = degrees.get(set0[i]);
                    if (d <= currentShell) {
                        removeFromSet1(d);
                    }
                    else {
                        ++i;
                    }
                }
            }
            for (const v of this.graph.vertices) {
                v.shell = shells.get(v.id);
            }
            //at the end currenttShell=currentShell-1 (no change in nextShell and nextShell=currentShell+1)
            for (let i = 0; i < currentShell - 1; ++i) {
                this.shellComponents.push(new ShellComponets());
                this.shellComponents[i].shell = i;
            }
            degrees.clear();
            unionFind.flatten();
            const pComponentIndex = degrees;
            for (let node = 0; node < unionFind.parents.length; ++node) {
                if (node != unionFind.parents[node])
                    continue;
                const shell = shells.get(node);
                const sc = this.shellComponents[shell].connectedComponents;
                const cc = new ConnectedComponent();
                pComponentIndex.set(node, sc.length);
                cc.vertices.push(this.graph.adjacencyList.get(node).main);
                cc.shell = shell;
                sc.push(cc);
            }
            for (let node = 0; node < unionFind.parents.length; ++node) {
                if (node == unionFind.parents[node])
                    continue;
                this.shellComponents[shells.get(node)].connectedComponents[pComponentIndex.get(unionFind.parents[node])].vertices.push(this.graph.adjacencyList.get(node).main);
            }
        }
        slowIteration() {
            return __awaiter(this, void 0, void 0, function* () {
            });
        }
        translate(dx, dy) {
            this.graph.translate(dx, dy);
            for (const shellComponet of this.shellComponents) {
                for (const connectedComponent of shellComponet.connectedComponents) {
                    const polygon = connectedComponent.polygon;
                    const points = polygon.points;
                    for (let i = 0; i < points.length; ++i) {
                        const p = points[i];
                        p.x += dx;
                        p.y += dy;
                        points[i] = p;
                    }
                }
            }
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
