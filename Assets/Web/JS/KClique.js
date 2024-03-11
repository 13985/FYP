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
    class DataState {
        constructor(step) {
            this.step = 0;
            this.step = step;
        }
    }
    class State extends VisualizationUtils.StateManager {
        setDataKeys() {
            throw new Error("Method not implemented.");
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
        /**************************animation state***************************/
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
            if (graph.vertices.length > 0) {
                this.createIndexStructure();
            }
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
            console.log(this.cliqueComponents);
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
                                console.log(from,to);
                                const e = this.graph.getEdge(from.id, to.id);
                                const line = e.line;
                                line.setAttribute("stroke", colorStr);
                                line.setAttribute("stroke-opacity", "1");
                                line.setAttribute("stroke-width", `${1 + cc.clique * 2 / this.cliqueComponents.length}`);
                                from.setColorString(colorStr);
                                from.circle.setAttribute("fill-opacity", "0.5");
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
            this.cliqueComponents.length=0;
            /*
            foreach k-clique=>find k+1-clique
            
            foreach x in  k-clique
                foreach vertex in x
                    foreach neighbor of vertex
                        if
                        this vertex connected to all vertices in x && not in x
                        then update this clique to k+1, break;

            */
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
                const kc = new CliqueComponets(2);
                this.cliqueComponents.push(kc);
                for (const e of this.graph.edges) {
                    const cc = KCliqueCC.POOL.get();
                    cc.clique = 2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }
            }
            for (let currentClique = 3, noUpdate = false; noUpdate == false; ++currentClique, noUpdate = true) {
                const kc = new CliqueComponets(currentClique);
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
                            previous[i].vertices.push(left_v);
                            previous[i] = previous[previous.length - 1];
                            previous.pop();
                            kc.connectedComponents.push(first);
                            KCliqueCC.POOL.release(second);
                            if (j <= previous.length - 1) {
                                previous[j] = previous[previous.length - 1];
                                previous.pop();
                            }
                            --i; //prevent the increment of i
                            noUpdate = false;
                            break Label_1;
                        }
                    }
                }
                this.cliqueComponents.push(kc);
            }
            return this;
        }
        createState() {
            return this;
        }
        clearState() {
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
    KCliqueAlgorithm.KClique = KClique;
})(KCliqueAlgorithm || (KCliqueAlgorithm = {}));
