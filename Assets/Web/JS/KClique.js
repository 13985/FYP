"use strict";
var KCliqueAlgorithm;
(function (KCliqueAlgorithm) {
    class KCliqueCC extends GraphAlgorithm.ConnectedComponent {
        constructor(clique = 1) {
            super();
            this.clique = -1;
            this.polygonOpacity = 0.4;
            this.polygon = null;
            this.clique = clique;
        }
    }
    KCliqueCC.pool = new GraphAlgorithm.ObjectPool(KCliqueCC);
    class KCliqueComponets {
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
    /**
     * @brief
     * note that any subgraph of a fully connected graph is also fully connected
     */
    class KClique extends GraphAlgorithm.Algorithm {
        constructor(graph, svg) {
            super(graph, svg);
            this.kCliqueComponents = [];
            this.set = new Set();
            if (graph.vertices.length > 0) {
                this.preprocess();
            }
        }
        setColorGradient(start_, end_) {
            const start = start_.clone(); //copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const end = end_.clone(); //copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const kCliqueCount = this.kCliqueComponents.length;
            const interval = kCliqueCount - 1;
            for (let i = 0; i < kCliqueCount; ++i) {
                Color.lerp(this.kCliqueComponents[i].color, start, end, i / interval);
            }
            return this;
        }
        setVisualElementsColor(defaultColor) {
            if (defaultColor) {
            }
            else {
            }
            return this;
        }
        setGraph(g) {
            this.graph = g;
            this.preprocess();
            return this;
        }
        preprocess() {
            for (const kc of this.kCliqueComponents) {
                for (const cc of kc.connectedComponents) {
                    KCliqueCC.pool.release(cc);
                }
            }
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
                const kc = new KCliqueComponets(1);
                this.kCliqueComponents.push(kc);
                this.graph.adjacencyList.forEach((vl, v_id) => {
                    if (vl.others.length > 0) {
                        return;
                    }
                    const cc = KCliqueCC.pool.get();
                    cc.clique = 1;
                    cc.vertices.push(vl.main);
                    kc.connectedComponents.push(cc);
                });
            }
            if (this.graph.edges.length <= 0) {
            }
            else {
                const kc = new KCliqueComponets(2);
                this.kCliqueComponents.push(kc);
                for (const e of this.graph.edges) {
                    const cc = KCliqueCC.pool.get();
                    cc.clique = 2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }
            }
            for (let currentClique = 3, noUpdate = false; noUpdate == false; ++currentClique, noUpdate = true) {
                const kc = new KCliqueComponets(currentClique);
                const previous = this.kCliqueComponents[currentClique - 2].connectedComponents; //currentClique == .length+2
                for (let i = 0; i < previous.length; ++i) {
                    Label_1: for (let j = i + 1; j < previous.length; ++j) {
                        for (const v of previous[i].vertices) {
                            this.set.add(v.id);
                        }
                        let nonIntersectSize = 0;
                        Label_2: {
                            let left_v;
                            for (const v of previous[j].vertices) {
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
                            kc.connectedComponents.push(previous[i]);
                            KCliqueCC.pool.release(previous[j]);
                            previous[j] = previous[previous.length - 1];
                            previous.pop();
                            --i; //prevent the increment of i
                            noUpdate = false;
                            break Label_1;
                        }
                    }
                }
                this.kCliqueComponents.push(kc);
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
        }
    }
    KCliqueAlgorithm.KClique = KClique;
})(KCliqueAlgorithm || (KCliqueAlgorithm = {}));
