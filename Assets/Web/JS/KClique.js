"use strict";
var KCliqueAlgorithm;
(function (KCliqueAlgorithm) {
    class KCliqueCC extends GraphAlgorithm.ConnectedComponent {
        static getPool() {
            return KCliqueCC.pool;
        }
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
            /*
            foreach k-clique=>find k+1-clique
            
            foreach x in  k-clique
                foreach vertex in x
                    foreach neighbor of vertex
                        if
                        this vertex connected to all vertices in x && not in x
                        then update this clique to k+1, break;

            */
            const kc = new KCliqueComponets(0);
            this.kCliqueComponents.push(kc);
            this.graph.adjacencyList.forEach((vl, v_id) => {
                if (vl.others.length <= 0) {
                }
            });
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
