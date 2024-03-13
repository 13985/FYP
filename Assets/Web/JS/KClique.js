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
var KCliqueAlgorithm;
(function (KCliqueAlgorithm) {
    class KCliqueCC extends VisualizationUtils.ConnectedComponent {
        constructor(clique = 1) {
            super();
            this.clique = -1;
            this.polygonOpacity = 0.4;
            this.polygon = null;
            this.clique = clique;
        }
    }
    KCliqueCC.POOL = new VisualizationUtils.ObjectPool(KCliqueCC);
    class CliqueComponets {
        constructor(clique = 0) {
            this.connectedComponents = [];
            this.clique = -1;
            this.color = new Color(0, 0, 0);
            this.clique = clique;
        }
    }
    class ConnectedComponetInfo {
        constructor(c, i) {
            this.clique = 0;
            this.index = 0;
            this.clique = c;
            this.index = i;
        }
    }
    class TreeNode extends VisualizationUtils.TreeNodeBase {
        clear() { }
    }
    TreeNode.POOL = new VisualizationUtils.ObjectPool(TreeNode);
    /**
     * @refer resetVisualElements in class Graph
     */
    class DataState {
        constructor() {
            this.step = 0;
            this.color = "var(--reverse-color-2)";
            this.opacity = 0.4;
            this.width = 1;
        }
        clear() {
        }
    }
    DataState.POOL = new VisualizationUtils.ObjectPool(DataState);
    class State extends VisualizationUtils.StateManager {
        constructor(graph) {
            super(graph);
            this.init();
        }
        setDataKeys() {
            this.dataKeys.length = this.graph.vertices.length + this.graph.edges.length;
            const verticesCount = this.graph.vertices.length;
            for (let i = 0; i < verticesCount; ++i) {
                this.dataKeys[i] = this.graph.vertices[i].id;
            }
            for (let i = 0; i < this.graph.edges.length; ++i) {
                const e = this.graph.edges[i];
                this.dataKeys[i + verticesCount] = this.graph.getEdgeHashCode(e.source.id, e.target.id);
            }
        }
        init() {
            for (const kvp of this.dataStates) {
                for (const ds of kvp[1]) {
                    DataState.POOL.release(ds);
                }
            }
            super.clear();
            super.init();
            for (const v of this.graph.vertices) {
                const ds = DataState.POOL.get();
                this.dataStates.set(v.id, [ds]);
            }
            for (const e of this.graph.edges) {
                const ds = DataState.POOL.get();
                this.dataStates.set(this.graph.getEdgeHashCode(e.source.id, e.target.id), [ds]);
            }
        }
        getTreeNode() {
            return TreeNode.POOL.get();
        }
        releaseTreeNode(node) {
            TreeNode.POOL.release(node);
        }
    }
    /**
     * @brief
     * note that any subgraph of a fully connected graph is also fully connected
     */
    class KClique extends VisualizationUtils.Algorithm {
        setIndexStructure(other) {
            this.cliqueComponents = other.cliqueComponents;
            return this;
        }
        constructor(graph, svg) {
            super(graph, svg);
            /**************************UI******************************************/
            /**************************helper data structures**********************/
            this.set = new Set();
            /**************************index data structures**********************/
            this.cliqueComponents = [];
            this.vertexToInfo = new Map();
        }
        setColorGradient(start_, end_) {
            const start = start_.clone(); //copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const end = end_.clone(); //copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const kCliqueCount = this.cliqueComponents.length;
            const interval = kCliqueCount - 1;
            for (let i = 0; i < kCliqueCount; ++i) {
                Color.lerp(this.cliqueComponents[i].color, start, end, i / interval);
            }
            return this;
        }
        setVisualElementsColor(defaultColor) {
            if (defaultColor) {
                this.graph.resetVisualElements();
            }
            else {
                for (const cc_ of this.cliqueComponents) {
                    if (cc_.clique <= 1) {
                        for (const cc of cc_.connectedComponents) {
                            for (const v of cc.vertices) {
                                v.setColor(cc_.color);
                                v.circle.setAttribute("fill-opacity", "0.5");
                            }
                        }
                        continue;
                    }
                    for (const cc of cc_.connectedComponents) {
                        const colorStr = cc_.color.toString();
                        for (const from of cc.vertices) {
                            for (const to of cc.vertices) {
                                if (from.id == to.id) {
                                    continue;
                                }
                                const e = this.graph.getEdge(from.id, to.id);
                                const line = e.line;
                                line.setAttribute("stroke", colorStr);
                                line.setAttribute("stroke-opacity", "1");
                                line.setAttribute("stroke-width", `${1 + cc.clique * 3 / (this.cliqueComponents.length)}`);
                                from.setColorString(colorStr);
                                from.circle.setAttribute("fill-opacity", KClique.VERTEX_OPACITY.toString());
                            }
                        }
                    }
                }
            }
            return this;
        }
        createIndexStructure() {
            for (const kc of this.cliqueComponents) {
                for (const cc of kc.connectedComponents) {
                    KCliqueCC.POOL.release(cc);
                }
            }
            this.cliqueComponents.length = 0;
            { //for 1 cliques
                const kc = new CliqueComponets(1);
                this.cliqueComponents.push(kc);
                this.graph.adjacencyList.forEach((vl, v_id) => {
                    if (vl.others.length > 0) {
                        return;
                    }
                    const cc = KCliqueCC.POOL.get();
                    cc.clique = 1;
                    cc.vertices.push(vl.main);
                    kc.connectedComponents.push(cc);
                });
            }
            if (this.graph.edges.length <= 0) {
            }
            else {
                /**
                clique 1 {a0 a1 a2 ai an}
                clique 2 {a0 a1 a2 aj an}

                 */
                const kc = new CliqueComponets(2);
                this.cliqueComponents.push(kc);
                for (const e of this.graph.edges) {
                    const cc = KCliqueCC.POOL.get();
                    cc.clique = 2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }
                for (let currentClique = 3, noUpdate = false; noUpdate == false; ++currentClique) {
                    const kc = new CliqueComponets(currentClique);
                    noUpdate = true;
                    const previous = this.cliqueComponents[currentClique - 2].connectedComponents; //currentClique == .length+2
                    for (let i = 0; i < previous.length; ++i) {
                        const first = previous[i];
                        Label_1: for (let j = i + 1; j < previous.length; ++j) {
                            const second = previous[j];
                            this.set.clear();
                            for (const v of first.vertices) {
                                this.set.add(v.id);
                            }
                            let nonIntersectSize = 0;
                            Label_2: {
                                let left_v;
                                for (const v of second.vertices) {
                                    if (this.set.has(v.id)) {
                                        this.set.delete(v.id);
                                    }
                                    else if (nonIntersectSize >= 1) {
                                        break Label_2;
                                    }
                                    else {
                                        left_v = v;
                                        nonIntersectSize = 1;
                                    }
                                }
                                for (const v_id of this.set) {
                                    if (this.graph.getEdge(left_v.id, v_id) == undefined) {
                                        break Label_2;
                                    }
                                }
                                first.vertices.push(left_v);
                                KCliqueCC.POOL.release(second);
                                kc.connectedComponents.push(first);
                                previous[j] = previous[previous.length - 1];
                                previous.pop();
                                if (i < previous.length - 1) {
                                    previous[i] = previous[previous.length - 1];
                                    previous.pop();
                                    --i; //prevent the increment of i
                                }
                                noUpdate = false;
                                break Label_1;
                            }
                        }
                    }
                    this.cliqueComponents.push(kc);
                }
            }
            return this;
        }
        createState() {
            if (this.state == undefined) {
                this.state = new State(this.graph);
            }
            else {
                this.state.init();
            }
            VisualizationUtils.DescriptionDisplay.codeDescription.innerHTML = KClique.CODE_DESCRIPTION;
            VisualizationUtils.DescriptionDisplay.setCodes(KClique.PSEUDO_CODES);
            let step = 1;
            { //for 1 cliques
                const color = this.cliqueComponents[0].color.toString();
                for (const v of this.graph.vertices) {
                    const ds = DataState.POOL.get();
                    ds.color = color;
                    ds.step = step;
                    this.state.dataStatePush(v.id, ds);
                }
                this.state.localStatePush({ step: step, codeStep: 1, stepDescription: "set all vertices" });
                ++step;
            }
            if (this.graph.edges.length <= 0) {
                this.state.localStatePush({ step: step, codeStep: 1, stepDescription: "highest clique:1" });
                ++step;
            }
            else {
                let previous = [];
                let newGenerated = [];
                for (const e of this.graph.edges) {
                    const cc = KCliqueCC.POOL.get();
                    cc.clique = 2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    previous.push(cc);
                }
                const string = this.cliqueComponents[1].color.toString();
                for (const v of this.graph.vertices) {
                    const ds = DataState.POOL.get();
                    ds.step = step;
                    ds.color;
                    this.state.dataStatePush(v.id, ds);
                }
                for (const e of this.graph.edges) {
                    const ds = DataState.POOL.get();
                    ds.step = step;
                    this.state.dataStatePush(this.graph.getEdgeHashCode(e.source.id, e.target.id), ds);
                }
                this.state.localStatePush({ step: step, codeStep: 2, stepDescription: "set all connected vertices to 2-clique" });
                ++step;
                for (let currentClique = 3, noUpdate = false; noUpdate == false; ++currentClique) {
                    noUpdate = true;
                    newGenerated.length = 0;
                    this.state.localStatePush({ step: step, codeStep: 3, stepDescription: `for ${currentClique}-Clique` });
                    ++step;
                    for (let i = 0; i < previous.length; ++i) {
                        function ccToString(cc) {
                            let ret = "";
                            for (const v of cc.vertices) {
                                ret += `${v.id},`;
                            }
                            return ret.substring(0, ret.length - 1);
                        }
                        /**
                         * @todo find a way to do this....
                         */
                        const highlightCC = (cc) => {
                            var _a, _b;
                            for (const v of cc.vertices) {
                                const ds = DataState.POOL.get();
                                ds.opacity = 1;
                                ds.step = step;
                                (_a = this.state) === null || _a === void 0 ? void 0 : _a.dataStatePush(v.id, ds);
                            }
                            const verticesCount = cc.vertices.length;
                            for (let i = 0; i < verticesCount; ++i) {
                                for (let j = i + 1; j < verticesCount; ++j) {
                                    const ds = DataState.POOL.get();
                                    ds.opacity = 1;
                                    ds.step = step;
                                    ds.width = 1 + (cc.clique * 3 / this.cliqueComponents.length + 2);
                                    (_b = this.state) === null || _b === void 0 ? void 0 : _b.dataStatePush(this.graph.getEdgeHashCode(cc.vertices[i].id, cc.vertices[j].id), ds);
                                }
                            }
                        };
                        const unhighlightCC = (cc) => {
                            var _a, _b;
                            for (const v of cc.vertices) {
                                const ds = DataState.POOL.get();
                                ds.opacity = KClique.VERTEX_OPACITY;
                                ds.step = step;
                                (_a = this.state) === null || _a === void 0 ? void 0 : _a.dataStatePush(v.id, ds);
                            }
                            const verticesCount = cc.vertices.length;
                            for (let i = 0; i < verticesCount; ++i) {
                                for (let j = i + 1; j < verticesCount; ++j) {
                                    const ds = DataState.POOL.get();
                                    ds.opacity = KClique.VERTEX_OPACITY;
                                    ds.step = step;
                                    ds.width = 1;
                                    (_b = this.state) === null || _b === void 0 ? void 0 : _b.dataStatePush(this.graph.getEdgeHashCode(cc.vertices[i].id, cc.vertices[j].id), ds);
                                }
                            }
                        };
                        const first = previous[i];
                        highlightCC(first);
                        this.state.localStatePush({ step: step, codeStep: 4, stepDescription: `clique: ${ccToString(first)}` });
                        ++step;
                        Label_1: for (let j = i + 1; j < previous.length; ++j) {
                            const second = previous[j];
                            highlightCC(second);
                            this.set.clear();
                            this.state.localStatePush({ step: step, codeStep: 5, stepDescription: `check with clique: ${ccToString(second)}` });
                            ++step;
                            for (const v of first.vertices) {
                                this.set.add(v.id);
                            }
                            let nonIntersectSize = 0;
                            Label_2: {
                                let left_v;
                                for (const v of second.vertices) {
                                    if (this.set.has(v.id)) {
                                        this.set.delete(v.id);
                                    }
                                    else if (nonIntersectSize >= 1) {
                                        break Label_2;
                                    }
                                    else {
                                        left_v = v;
                                        nonIntersectSize = 1;
                                    }
                                }
                                for (const v_id of this.set) {
                                    if (this.graph.getEdge(left_v.id, v_id) == undefined) {
                                        break Label_2;
                                    }
                                }
                                first.vertices.push(left_v);
                                KCliqueCC.POOL.release(second);
                                newGenerated.push(first);
                                previous[j] = previous[previous.length - 1];
                                previous.pop();
                                if (i < previous.length - 1) {
                                    previous[i] = previous[previous.length - 1];
                                    previous.pop();
                                    --i; //prevent the increment of i
                                }
                                noUpdate = false;
                                this.state.localStateTop({ step: step, codeStep: 6, stepDescription: `merge` });
                                ++step;
                                this.state.localStateTop({ step: step, codeStep: 7, stepDescription: `set no_update=false` });
                                ++step;
                                this.state.localStatePop(step);
                                ++step;
                                unhighlightCC(second);
                                ++step;
                                break Label_1;
                            }
                            this.state.localStatePop(step);
                            ++step;
                            unhighlightCC(second);
                        }
                        unhighlightCC(first);
                        this.state.localStatePop(step);
                        ++step;
                    }
                    this.state.localStatePop(step);
                    ++step;
                }
            }
            this.state.localStatePop(step);
            return this;
        }
        animate() {
            return __awaiter(this, void 0, void 0, function* () {
            });
        }
        addVertex(a) {
            if (this.graph.addVertex(a) == null) {
                return false;
            }
            throw new Error("Method not implemented.");
            return true;
        }
        removeVertex(a) {
            if (this.graph.removeVertex(a) == null) {
                return false;
            }
            throw new Error("Method not implemented.");
            return true;
        }
        addEdge(from, to) {
            if (this.graph.addEdge(from, to) == false) {
                return false;
            }
            throw new Error("Method not implemented.");
            return true;
        }
        removeEdge(from, to) {
            if (this.graph.removeEdge(from, to) == false) {
                return false;
            }
            throw new Error("Method not implemented.");
            return true;
        }
    }
    KClique.VERTEX_OPACITY = 0.4;
    KClique.CODE_DESCRIPTION = `iteration manner`;
    KClique.PSEUDO_CODES = [
        { code: "all the vertices are belonging to 1-clique", step: 1 },
        { code: "all the vertices of edges are belonging to 2-clique", step: 2 },
        { code: "while true :{", step: undefined },
        { code: "   no_update=true;", step: 3 },
        { code: "   for all cliques in the highest cliques group;", step: 4 },
        { code: "      check it against other clique :{", step: 5 },
        { code: "         if they intersect in size vertex count-1 and<br> remaining two vertices are connected :{", step: 7 },
        { code: "            merge them;", step: 6 },
        { code: "            no_update=false;", step: 7 },
        { code: "         }", step: undefined },
        { code: "      }", step: undefined },
        { code: "   }", step: undefined },
        { code: "   if no_update is true,break", step: 8 },
        { code: "}", step: undefined },
    ];
    KCliqueAlgorithm.KClique = KClique;
})(KCliqueAlgorithm || (KCliqueAlgorithm = {}));
