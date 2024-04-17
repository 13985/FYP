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
            this.clique = clique;
        }
    }
    KCliqueCC.POOL = new VisualizationUtils.ObjectPool(KCliqueCC, 256);
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
        clear() { }
    }
    DataState.POOL = new VisualizationUtils.ObjectPool(DataState, 2048);
    class State extends VisualizationUtils.GraphStateManager {
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
                ds.color = "var(--reverse-color1)";
                ds.opacity = 0.4;
                ds.step = 0;
                this.dataStates.set(v.id, [ds]);
            }
            for (const e of this.graph.edges) {
                const ds = DataState.POOL.get();
                ds.color = "var(--reverse-color1)";
                ds.opacity = 0.4;
                ds.step = 0;
                ds.width = 1;
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
        constructor(graph, svg, gw) {
            super(graph, svg, gw);
            /**************************UI******************************************/
            /**************************helper data structures**********************/
            this.set0 = new Set();
            this.ccBuffer0 = [];
            this.ccBuffer1 = [];
            /**************************index data structures**********************/
            //1-cliques stored at 0, 2-cliques stored at 1, 3-cliques stored at 2....
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
            this.notColorful = defaultColor;
            if (defaultColor) {
                this.graph.resetVisualElements();
            }
            else {
                for (const cc_ of this.cliqueComponents) {
                    if (cc_.clique <= 1) {
                        for (const cc of cc_.connectedComponents) {
                            for (const v of cc.vertices) {
                                const true_v = this.graph.adjacencyList.get(v.id).main;
                                true_v.setColor(cc_.color);
                                true_v.circle.setAttribute("fill-opacity", "0.5");
                            }
                        }
                        continue;
                    }
                    for (const cc of cc_.connectedComponents) {
                        const edgeColorStr = cc_.clique == 2 ? "var(--reverse-color2)" : cc_.color.toString();
                        const vertexColorStr = cc_.color.toString();
                        for (let i = 0; i < cc.vertices.length; ++i) {
                            const from = cc.vertices[i];
                            from.circle.setAttribute("fill-opacity", KClique.OPACITY.toString());
                            from.setColorString(vertexColorStr);
                            for (let j = i + 1; j < cc.vertices.length; ++j) {
                                const to = cc.vertices[j];
                                const e = this.graph.getEdge(from.id, to.id);
                                const line = e.line;
                                line.setAttribute("stroke", edgeColorStr);
                                line.setAttribute("stroke-opacity", "1");
                                line.setAttribute("stroke-width", `${this.getEdgeStorkeWidth(cc.clique)}`);
                            }
                        }
                    }
                }
            }
            return this;
        }
        createIndexStructure() {
            this.vertexToInfo.clear();
            for (const kc of this.cliqueComponents) {
                for (const cc of kc.connectedComponents) {
                    KCliqueCC.POOL.release(cc);
                }
            }
            this.cliqueComponents.length = 0;
            if (this.subCliqueGenerator == undefined) {
                this.subCliqueGenerator = new SubCliqueGenerator();
            }
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
                for (let i = 0; i < this.graph.edges.length; ++i) {
                    const e = this.graph.edges[i];
                    const cc = KCliqueCC.POOL.get();
                    cc.clique = 2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }
                const returnEdgeCode = { value: 0 };
                for (let currentClique = 3; true; ++currentClique) {
                    const next = new CliqueComponets(currentClique);
                    const previous = this.cliqueComponents[currentClique - 2].connectedComponents; //currentClique == .length+2
                    for (let i = 0; i < previous.length;) {
                        const first = previous[i];
                        Label_0: {
                            for (let j = i + 1; j < previous.length; ++j) {
                                const second = previous[j];
                                const left_v = this.testCombine(first, second, returnEdgeCode);
                                if (left_v == null) {
                                    continue;
                                }
                                first.vertices.push(left_v);
                                KCliqueCC.POOL.release(second);
                                first.clique = currentClique;
                                next.connectedComponents.push(first);
                                ArrayUtils.removeAsSwapBack(previous, j);
                                ArrayUtils.removeAsSwapBack(previous, i);
                                break Label_0;
                            }
                            ++i;
                        }
                    }
                    if (next.connectedComponents.length <= 0) {
                        break;
                    }
                    //clean up, remove the subcliques of larger clique
                    for (let b = 0; b < next.connectedComponents.length; ++b) {
                        for (let a = 0; a < previous.length;) {
                            if (this.isSubClique(previous[a], next.connectedComponents[b])) {
                                KCliqueCC.POOL.release(previous[a]);
                                ArrayUtils.removeAsSwapBack(previous, a);
                            }
                            else {
                                ++a;
                            }
                        }
                    }
                    this.cliqueComponents.push(next);
                }
            }
            for (const kc of this.cliqueComponents) {
                const ccs = kc.connectedComponents;
                for (let idx = 0; idx < ccs.length; ++idx) {
                    for (const v of ccs[idx].vertices) {
                        const infos = this.vertexToInfo.get(v.id);
                        if (infos == undefined) {
                            this.vertexToInfo.set(v.id, [new ConnectedComponetInfo(kc.clique, idx)]);
                            continue;
                        }
                        infos.push(new ConnectedComponetInfo(kc.clique, idx));
                    }
                }
            }
            KCliqueCC.POOL.deallocateSome();
            return this;
        }
        onRegisterSelf() {
            var _a;
            VisualizationUtils.DescriptionDisplay.clearPanel();
            VisualizationUtils.DescriptionDisplay.codeDescription.innerText = KClique.CODE_DESCRIPTION;
            VisualizationUtils.DescriptionDisplay.setCodes(KClique.PSEUDO_CODES);
            VisualizationUtils.VideoControl.maxStepSpan.innerText = `${(_a = this.states) === null || _a === void 0 ? void 0 : _a.maxStep}`;
            VisualizationUtils.Algorithm.setCurrentStep(0);
        }
        createState() {
            if (this.states == undefined) {
                this.states = new State(this.graph);
            }
            else {
                this.states.init();
            }
            let step = 1;
            const highlightFirst = (opacity) => {
                const color = this.cliqueComponents[0].color.toString();
                for (const v of this.graph.vertices) {
                    const ds = DataState.POOL.get();
                    ds.color = color;
                    ds.opacity = opacity;
                    ds.step = step;
                    this.states.dataStatePush(v.id, ds);
                }
            };
            highlightFirst(1);
            this.states.localStatePush({ step: step, codeStep: 1, stepDescription: "set all vertices" });
            ++step;
            highlightFirst(KClique.OPACITY);
            ++step;
            if (this.graph.edges.length <= 0) {
                this.states.localStateTop({ step: step, codeStep: 1, stepDescription: "highest clique:1" });
                ++step;
            }
            else {
                let previous = this.ccBuffer0;
                let newGenerated = this.ccBuffer1;
                previous.length = 0;
                newGenerated.length = 0;
                const $bufferCC0 = KCliqueCC.POOL.get();
                const $bufferCC1 = KCliqueCC.POOL.get();
                const remainVertices = $bufferCC0.vertices;
                const highlightedVertices = $bufferCC1.vertices;
                const previousEdgeColor = new Map();
                for (const e of this.graph.edges) {
                    const cc = KCliqueCC.POOL.get();
                    cc.clique = 2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    previous.push(cc);
                }
                const highlightSecond = (opacity, width) => {
                    const edgeColor = "var(--reverse-color2)";
                    const vertexColor = this.cliqueComponents[1].color.toString();
                    const set = new Set();
                    const helper = (v) => {
                        if (set.has(v.id) == true) {
                            return;
                        }
                        set.add(v.id);
                        const ds = DataState.POOL.get();
                        ds.step = step;
                        ds.opacity = opacity;
                        ds.color = vertexColor;
                        this.states.dataStatePush(v.id, ds);
                    };
                    for (const e of this.graph.edges) {
                        const ds = DataState.POOL.get();
                        helper(e.source);
                        helper(e.target);
                        ds.step = step;
                        ds.opacity = opacity;
                        ds.width = width;
                        ds.color = edgeColor;
                        const code = this.graph.getEdgeHashCode(e.source.id, e.target.id);
                        previousEdgeColor.set(code, ds.color);
                        this.states.dataStatePush(code, ds);
                    }
                };
                highlightSecond(1, this.getEdgeStorkeWidth(2));
                this.states.localStateTop({ step: step, codeStep: 2, stepDescription: "set all connected vertices to 2-clique" });
                ++step;
                highlightSecond(KClique.OPACITY, 1);
                ++step;
                let currentClique = 2;
                while (true) {
                    newGenerated.length = 0;
                    this.states.localStatePush({ step: step, codeStep: 3, stepDescription: `for ${currentClique + 1}-Clique` });
                    ++step;
                    for (let i = 0; i < previous.length; ++i) {
                        const highlightCC = (cc, opacity, edgeWidth, updateEdgeColor = false) => {
                            const clique = cc.clique;
                            const vertexColor = this.cliqueComponents[clique - 1].color.toString();
                            for (const v of cc.vertices) {
                                const ds = DataState.POOL.get();
                                ds.opacity = opacity;
                                ds.step = step;
                                ds.color = vertexColor;
                                this.states.dataStatePush(v.id, ds);
                            }
                            const verticesCount = cc.vertices.length;
                            for (let i = 0; i < verticesCount; ++i) {
                                for (let j = i + 1; j < verticesCount; ++j) {
                                    const ds = DataState.POOL.get();
                                    ds.opacity = opacity;
                                    ds.step = step;
                                    ds.width = edgeWidth;
                                    const code = this.graph.getEdgeHashCode(cc.vertices[i].id, cc.vertices[j].id);
                                    if (updateEdgeColor) {
                                        ds.color = vertexColor;
                                        previousEdgeColor.set(code, vertexColor);
                                    }
                                    else {
                                        ds.color = previousEdgeColor.get(code);
                                    }
                                    this.states.dataStatePush(code, ds);
                                }
                            }
                        };
                        const first = previous[i];
                        highlightCC(first, 1, 1 + (first.clique * 3 / (this.cliqueComponents.length + 2)));
                        this.states.localStatePush({ step: step, codeStep: 4, stepDescription: `clique: ${first.toString('{')}` });
                        ++step;
                        /**
                         * @summary note that here is slightly different from the createState()
                         */
                        Label_1: for (let j = i + 1; j < previous.length; ++j) {
                            const second = previous[j];
                            this.set0.clear();
                            remainVertices.length = 0;
                            highlightedVertices.length = 0;
                            for (const v of first.vertices) {
                                this.set0.add(v.id);
                            }
                            for (const v of second.vertices) {
                                if (this.set0.has(v.id)) {
                                    this.set0.delete(v.id);
                                    highlightedVertices.push(v);
                                }
                                else {
                                    remainVertices.push(v);
                                }
                            }
                            const highlightRemainVE = (clique, opacity, width) => {
                                const helper = (vA, vB) => {
                                    const e = this.graph.getEdge(vA.id, vB.id);
                                    if (e == undefined) {
                                        return;
                                    }
                                    const code = this.graph.getEdgeHashCode(vA.id, vB.id);
                                    const ds = DataState.POOL.get();
                                    ds.step = step;
                                    ds.color = previousEdgeColor.get(code);
                                    ds.opacity = opacity;
                                    ds.width = width;
                                    this.states.dataStatePush(code, ds);
                                };
                                for (const v0 of highlightedVertices) {
                                    for (const v1 of remainVertices) {
                                        helper(v0, v1);
                                    }
                                }
                                for (let i = 0; i < remainVertices.length; ++i) {
                                    const v0 = remainVertices[i];
                                    const vertexColor = this.cliqueComponents[clique - 1].color.toString();
                                    const ds = DataState.POOL.get();
                                    ds.step = step;
                                    ds.color = vertexColor;
                                    ds.opacity = opacity;
                                    this.states.dataStatePush(v0.id, ds);
                                    for (let j = i + 1; j < remainVertices.length; ++j) {
                                        const v1 = remainVertices[j];
                                        helper(v0, v1);
                                    }
                                }
                            };
                            highlightRemainVE(second.clique, 1, this.getEdgeStorkeWidth(second.clique));
                            this.states.localStatePush({ step: step, codeStep: 5, stepDescription: `check with clique: ${second.toString("{")}` });
                            ++step;
                            if (remainVertices.length > 1) { //i hate early continue, make sure the state has poped
                                highlightRemainVE(second.clique, KClique.OPACITY, 1);
                                this.states.localStatePop(step);
                                ++step;
                                continue;
                            }
                            const left_v = remainVertices[0];
                            let the_v = left_v; //just to prevent use of unassigned local variable error
                            for (const v of this.set0) {
                                the_v = this.graph.adjacencyList.get(v).main;
                            }
                            if (this.graph.getEdge(the_v.id, left_v.id) == undefined) {
                                highlightRemainVE(second.clique, KClique.OPACITY, 1);
                                this.states.localStatePop(step);
                                ++step;
                                continue;
                            }
                            first.vertices.push(left_v);
                            newGenerated.push(first);
                            ArrayUtils.removeAsSwapBack(previous, j);
                            if (i < previous.length - 1) {
                                ArrayUtils.removeAsSwapBack(previous, i);
                                --i; //prevent the increment of i
                            }
                            first.clique = currentClique + 1;
                            highlightCC(first, 1, this.getEdgeStorkeWidth(currentClique), true);
                            this.states.localStatePush({ step: step, codeStep: 7, stepDescription: `merge` });
                            ++step;
                            this.states.localStateTop({ step: step, codeStep: 8, stepDescription: `set no_update=false` });
                            ++step;
                            this.states.localStatePop(step);
                            ++step;
                            this.states.localStatePop(step); //pushed twice so pop twice
                            ++step;
                            KCliqueCC.POOL.release(second);
                            break Label_1;
                        }
                        highlightCC(first, KClique.OPACITY, 1); //first cc will finally be unhighlightly
                        this.states.localStatePop(step);
                        ++step;
                    }
                    this.states.localStatePop(step);
                    ++step;
                    if (newGenerated.length > 0) { //swap two buffer
                        const temp = previous;
                        previous = newGenerated;
                        newGenerated = temp;
                    }
                    else {
                        this.states.localStateTop({ step: step, codeStep: 8, stepDescription: `highest clique:${currentClique}` });
                        ++step;
                        break;
                    }
                    ++currentClique;
                }
                KCliqueCC.POOL.release($bufferCC0);
                KCliqueCC.POOL.release($bufferCC1);
            }
            this.states.localStatePop(step);
            this.states.onInitEnd(step);
            VisualizationUtils.VideoControl.maxStepSpan.innerText = `${this.states.maxStep}`;
            DataState.POOL.deallocateSome();
            TreeNode.POOL.deallocateSome();
            return this;
        }
        animate() {
            return __awaiter(this, void 0, void 0, function* () {
                VisualizationUtils.VideoControl.progressBar.setAttribute("max", this.states.maxStep.toString());
                this.setVisualElementsColor(true);
                const helper = (opacity) => {
                    const opacityStr = opacity.toString();
                    for (const v of this.graph.vertices) {
                        v.circle.setAttribute("fill-opacity", opacityStr);
                    }
                    for (const e of this.graph.edges) {
                        e.line.setAttribute("stroke-opacity", opacityStr);
                    }
                };
                for (const e of this.graph.edges) {
                    e.line.setAttribute("stroke-width", "1");
                }
                helper(KClique.OPACITY);
                if (this.states == undefined) {
                    return;
                }
                let dataStates;
                this.states.resetStep();
                VisualizationUtils.Algorithm.setCurrentStep(0);
                AnimtaionLoop: while (true) {
                    const vsc = yield this.waitfor();
                    switch (vsc) {
                        case 4 /* VisualizationUtils.VideoControlStatus.stop */:
                            break AnimtaionLoop;
                        case 0 /* VisualizationUtils.VideoControlStatus.noAction */:
                        case 1 /* VisualizationUtils.VideoControlStatus.nextStep */:
                            if ((dataStates = this.states.nextStep()) == null) {
                                break AnimtaionLoop;
                            }
                            this.setAnimationDisplay(dataStates, this.states.getCurrentLocalStates());
                            break;
                        case 2 /* VisualizationUtils.VideoControlStatus.prevStep */:
                            if ((dataStates = this.states.previousStep()) == null) {
                                this.currentStep = 0;
                                dataStates = this.states.randomStep(0);
                            }
                            this.setAnimationDisplay(dataStates, this.states.getCurrentLocalStates());
                            break;
                        case 3 /* VisualizationUtils.VideoControlStatus.randomStep */:
                            if ((dataStates = this.states.randomStep(this.currentStep)) == null) {
                                dataStates = this.states.randomStep(0);
                                this.currentStep = 0;
                            }
                            this.setAnimationDisplay(dataStates, this.states.getCurrentLocalStates());
                            break;
                    }
                    VisualizationUtils.Algorithm.setCurrentStep(this.states.currentStep);
                    VisualizationUtils.VideoControl.progressBar.valueAsNumber = this.states.currentStep;
                }
                helper(1);
            });
        }
        setAnimationDisplay(dataStates, descriptionStates) {
            if (dataStates == null) {
                return;
            }
            const vertexCount = this.graph.vertices.length;
            for (let i = 0; i < vertexCount; ++i) {
                const circle = this.graph.vertices[i].circle;
                const state = dataStates[i];
                circle.setAttribute("fill", state.color);
                circle.setAttribute("fill-opacity", state.opacity.toString());
            }
            for (let i = 0; i < this.graph.edges.length; ++i) {
                const line = this.graph.edges[i].line;
                const state = dataStates[i + vertexCount];
                line.setAttribute("stroke", state.color);
                line.setAttribute("stroke-opacity", state.opacity.toString());
                line.setAttribute("stroke-width", state.width.toString());
            }
            if (descriptionStates.length > 0) {
                const lis = VisualizationUtils.DescriptionDisplay.setLocalDescriptionNumber(descriptionStates.length);
                for (let i = 0; i < descriptionStates.length; ++i) {
                    lis[i].innerHTML = descriptionStates[i].stepDescription;
                }
                VisualizationUtils.DescriptionDisplay.highlightCode(ArrayUtils.last(descriptionStates).codeStep);
            }
            else {
                VisualizationUtils.DescriptionDisplay.highlightCode(-1);
            }
        }
        addVertex(a) {
            const newV = this.graph.addVertex(a);
            if (newV == null) {
                return false;
            }
            this.graphWindow.updateSimulation();
            const cc = KCliqueCC.POOL.get();
            cc.clique = 1;
            cc.vertices.push(newV);
            const ccs = this.cliqueComponents[0].connectedComponents;
            this.vertexToInfo.set(a, [new ConnectedComponetInfo(1, ccs.length)]);
            ccs.push(cc);
            this.checkCCs();
            return true;
        }
        removeVertex(a) {
            if (this.graph.removeVertex(a) == null) {
                return false;
            }
            this.graphWindow.updateSimulation();
            const infos = this.vertexToInfo.get(a);
            for (const info of infos) {
                const theIndex = info.index;
                let theClique = info.clique;
                const kc = this.cliqueComponents[theClique - 1];
                const theCC = kc.connectedComponents[theIndex];
                --theClique;
                if (theClique <= 0) {
                    this.removeCC(info);
                    KCliqueCC.POOL.release(theCC);
                }
                else {
                    for (let i = 0; i < theCC.vertices.length; ++i) {
                        if (theCC.vertices[i].id == a) {
                            ArrayUtils.removeAsSwapBack(theCC.vertices, i);
                            break;
                        }
                    }
                    if (this.tryMoveCC(theCC, info) == false) {
                        this.removeCC(info);
                        KCliqueCC.POOL.release(theCC);
                    }
                }
            }
            this.vertexToInfo.delete(a);
            this.setVisualElementsColor(this.notColorful);
            this.checkCCs();
            return true;
        }
        addEdge(from, to) {
            if (this.graph.addEdge(from, to) == false) {
                return false;
            }
            this.graphWindow.updateSimulation();
            const generatorFrom = this.subCliqueGenerator;
            const fromInfos = this.vertexToInfo.get(from);
            const toInfos = this.vertexToInfo.get(to);
            const toV = this.graph.adjacencyList.get(to).main;
            const generatedCCs = this.ccBuffer0;
            const stableCCs = this.ccBuffer1;
            generatedCCs.length = 0;
            stableCCs.length = 0;
            for (const fromInfo of fromInfos) {
                const cc = this.getKCliqueCC(fromInfo); //for all cc of from
                if (this.fullyConnected(toV, cc)) { //move directly, dont need to generate sub clique anymore
                    cc.vertices.push(toV);
                    ++cc.clique;
                    if (cc.clique - 1 >= this.cliqueComponents.length) {
                        this.cliqueComponents.push(new CliqueComponets(cc.clique));
                    }
                    this.moveCC(cc.clique, fromInfo);
                    stableCCs.push(cc);
                    continue;
                }
                generatorFrom.set(cc);
                Label_0: for (let clique = cc.clique - 1; clique > 0; --clique) {
                    const results = generatorFrom.generate(toV, clique);
                    for (let i = 0; i < results.length; ++i) {
                        const cc_ = results[i];
                        if (this.fullyConnected(toV, cc_) == false) {
                            continue;
                        }
                        cc_.vertices.push(toV);
                        ++cc_.clique;
                        generatedCCs.push(cc_);
                        ArrayUtils.removeAsSwapBack(results, i);
                        generatorFrom.releaseAll();
                        break Label_0;
                    }
                    generatorFrom.releaseAll();
                }
            }
            generatedCCs.sort((a, b) => a.clique - b.clique);
            for (let i = 0; i < generatedCCs.length; ++i) {
                label_0: {
                    const cc = generatedCCs[i];
                    for (let j = i + 1; j < generatedCCs.length; ++j) {
                        if (this.isSubClique(cc, generatedCCs[j])) {
                            KCliqueCC.POOL.release(cc);
                            break label_0;
                        }
                    }
                    for (let j = 0; j < stableCCs.length; ++j) {
                        if (stableCCs[j].clique > cc.clique && this.isSubClique(cc, stableCCs[j])) {
                            KCliqueCC.POOL.release(cc);
                            break label_0;
                        }
                    }
                    stableCCs.push(cc);
                }
            }
            for (let i = 0; i < toInfos.length; ++i) { //those clique is only contain "to", no "from" inside
                const toInfo = toInfos[i];
                const cc = this.getKCliqueCC(toInfo);
                for (let j = 0; j < stableCCs.length; ++j) {
                    if (toInfo.clique < stableCCs[j].clique && this.isSubClique(cc, stableCCs[j])) {
                        this.removeCC(toInfo);
                        KCliqueCC.POOL.release(cc);
                        --i;
                        break;
                    }
                }
            }
            for (const cc of stableCCs) {
                this.addCC(cc);
            }
            this.setVisualElementsColor(this.notColorful);
            this.checkCCs();
            return true;
        }
        removeEdge(from, to) {
            if (this.graph.removeEdge(from, to) == false) {
                return false;
            }
            this.graphWindow.updateSimulation();
            const fromInfos = this.vertexToInfo.get(from);
            const toInfos = this.vertexToInfo.get(to);
            for (let i = 0; i < fromInfos.length; ++i) {
                const fromInfo = fromInfos[i];
                for (let j = 0; j < toInfos.length;) {
                    const toInfo = toInfos[j];
                    if (fromInfo.clique != toInfo.clique || fromInfo.index != toInfo.index) {
                        ++j;
                        continue;
                    } //find the common clique contains from and to
                    const newClique = fromInfo.clique - 1;
                    const toCC = KCliqueCC.POOL.get();
                    const fromCC = this.cliqueComponents[newClique].connectedComponents[fromInfo.index];
                    toCC.clique = newClique;
                    ArrayUtils.removeAsSwapBack(toInfos, j); //remove toInfo since fromCC not storing "to" anymore (toInfo and fromInfo both pointing to fromCC)
                    Split: for (let idx = 0; idx < fromCC.vertices.length;) {
                        const v = fromCC.vertices[idx];
                        if (v.id == to) {
                            ArrayUtils.removeAsSwapBack(fromCC.vertices, idx); //theCC contains "from", and remove "to"
                            toCC.vertices.push(v); //newCC contains "to"
                        }
                        else if (v.id == from) {
                            ++idx;
                            //toCC not contains "from"
                        }
                        else {
                            ++idx;
                            toCC.vertices.push(v);
                        }
                    }
                    Check_fromCC: {
                        for (const info of fromInfos) {
                            if (info.clique <= fromCC.vertices.length || info == fromInfo) {
                                continue;
                            }
                            else if (this.isSubClique(fromCC, this.getKCliqueCC(info)) == false) {
                                continue;
                            }
                            this.removeCC(fromInfo);
                            KCliqueCC.POOL.release(fromCC);
                            if (i < fromInfos.length) {
                                --i;
                            }
                            break Check_fromCC;
                        }
                        this.moveCC(newClique, fromInfo);
                    }
                    Check_toCC: {
                        for (const info of toInfos) {
                            if (info.clique <= fromCC.vertices.length || info == toInfo) {
                                continue;
                            }
                            else if (this.isSubClique(toCC, this.getKCliqueCC(info))) {
                                KCliqueCC.POOL.release(toCC);
                                break Check_toCC;
                            }
                        }
                        this.addCC(toCC);
                    }
                    break;
                }
            }
            this.setVisualElementsColor(this.notColorful);
            this.checkCCs();
            return true;
        }
        /**
         * @summary remove the CC pointed by info from this.cliqueComponents[infro.clique-1] and return the CC back
         */
        removeCC(info) {
            const theClique = info.clique;
            const theIndex = info.index;
            const kc = this.cliqueComponents[theClique - 1];
            const theCC = kc.connectedComponents[theIndex];
            for (const v of theCC.vertices) { //for all other vertices
                const infos = this.vertexToInfo.get(v.id);
                for (let i = 0; i < infos.length; ++i) { //find the info that pointing to this CC, remove it
                    const info = infos[i];
                    if (info.clique != theClique || info.index != theIndex) {
                        continue;
                    }
                    ArrayUtils.removeAsSwapBack(infos, i);
                    break;
                }
            }
            const lastIdx = kc.connectedComponents.length - 1;
            if (theIndex < lastIdx) {
                const lastCC = kc.connectedComponents[lastIdx];
                for (const v of lastCC.vertices) {
                    const infos = this.vertexToInfo.get(v.id);
                    for (const info of infos) {
                        if (info.clique != theClique || info.index != lastIdx) {
                            continue;
                        }
                        info.index = theIndex;
                        break;
                    }
                }
                kc.connectedComponents[theIndex] = lastCC;
            }
            kc.connectedComponents.pop();
            return theCC;
        }
        /**
         * @summary move the ConnectedComponet pointed by originalInfo to CliqueComponets that stores newClique-clique
         * @param newClique
         * @param originalInfo index and clique before move
         */
        moveCC(newClique, originalInfo) {
            const oldClique = originalInfo.clique;
            const oldIndex = originalInfo.index;
            const destination = this.cliqueComponents[newClique - 1];
            const source = this.cliqueComponents[oldClique - 1];
            const cc = source.connectedComponents[oldIndex];
            function helper(infos, oldClique_, oldIndex_, newClique_, newIndex_) {
                for (const info of infos) {
                    if (info.clique != oldClique_ || info.index != oldIndex_) {
                        continue;
                    }
                    info.clique = newClique_;
                    info.index = newIndex_;
                    return;
                }
            }
            let lastIdx = destination.connectedComponents.length;
            cc.clique = newClique;
            for (const v of cc.vertices) { //move the cc from source to destination and change the info of vertices of that cc
                const infos = this.vertexToInfo.get(v.id);
                helper(infos, oldClique, oldIndex, newClique, lastIdx);
            }
            destination.connectedComponents.push(cc);
            lastIdx = source.connectedComponents.length - 1;
            if (oldIndex < lastIdx) { //move the last cc in source to originalInfo.Index and change ithe info
                const lastCC = source.connectedComponents[lastIdx];
                for (const v of lastCC.vertices) {
                    const infos = this.vertexToInfo.get(v.id);
                    helper(infos, oldClique, lastIdx, oldClique, oldIndex);
                }
                source.connectedComponents[oldIndex] = lastCC;
            }
            source.connectedComponents.pop();
        }
        /**
         * @param cc contains the new clique==vertices.length
         */
        addCC(cc) {
            const kc = this.cliqueComponents[cc.clique - 1];
            const lastIdx = kc.connectedComponents.length;
            for (const v of cc.vertices) {
                const infos = this.vertexToInfo.get(v.id);
                infos.push(new ConnectedComponetInfo(cc.clique, lastIdx));
            }
            kc.connectedComponents.push(cc);
        }
        /**
         * @summary index structure only store highest unique clique as possible
         * test if this is one clique, and if the vertex is isolated
         */
        tryMoveCC(cc, info) {
            if (cc.vertices.length <= 1) {
                if (this.graph.adjacencyList.get(cc.vertices[0].id).others.length <= 0) {
                    this.moveCC(1, info);
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                this.moveCC(cc.vertices.length, info);
                return true;
            }
        }
        getEdgeStorkeWidth(clique) {
            return 1 + (clique * 3) / (this.cliqueComponents.length + 2);
        }
        /**
         * @summary test if a and b intersect in x-1 subclique and the two remain vertices in a and b are connected by edge, if yes then return the remain vertex in b, else null. a and b must have the same clique i.e. the number of vertices
         * @param a x-clique
         * @param b x-clique
         * @returns the vertex in b if they can be combined
         */
        testCombine(a, b, outEdgeCode) {
            this.set0.clear();
            let left_v = null;
            for (const v of a.vertices) {
                this.set0.add(v.id);
            }
            Label_0: {
                for (const v of b.vertices) {
                    if (this.set0.has(v.id)) {
                        this.set0.delete(v.id);
                    }
                    else if (left_v != null) {
                        left_v = null;
                        break Label_0;
                    }
                    else {
                        left_v = v;
                    }
                }
                for (const v_id of this.set0) { //only one v_id
                    if (this.graph.getEdge(v_id, left_v.id) == undefined) {
                        left_v = null;
                    }
                    else if (outEdgeCode != undefined) {
                        outEdgeCode.value = this.graph.getEdgeHashCode(v_id, left_v.id);
                    }
                    break;
                }
            }
            return left_v;
        }
        /**
         * @brief test if a is subclique of b
         */
        isSubClique(a, b) {
            this.set0.clear();
            for (const v of a.vertices) {
                this.set0.add(v.id);
            }
            for (const v of b.vertices) {
                this.set0.delete(v.id);
            }
            return this.set0.size <= 0;
        }
        fullyConnected(v, cc) {
            this.set0.clear();
            for (const v of cc.vertices) {
                this.set0.add(v.id);
            }
            const vl = this.graph.adjacencyList.get(v.id);
            for (const other of vl.others) {
                this.set0.delete(other);
            }
            return this.set0.size <= 0;
        }
        changeColor(cc) {
            if (this.notColorful) {
                return;
            }
            const verticesCount = cc.vertices.length;
            /**
             * @summary a and b must be ordered
             * @param a
             * @param b
             */
            function getMaxCommonInfo(a, b) {
                let info = null;
                for (let i = 0, j = 0; i < a.length && j < b.length;) {
                    if (a[i].clique < b[j].clique) {
                        ++i;
                    }
                    else if (a[i].clique > b[j].clique) {
                        ++j;
                    }
                    else {
                        if (a[i].index < b[j].index) {
                            ++i;
                        }
                        else if (a[i].index > b[j].index) {
                            ++j;
                        }
                        else {
                            info = a[i];
                            ++i;
                            ++j;
                        }
                    }
                }
                return info;
            }
            for (let i = 0; i < verticesCount; ++i) {
                const a = cc.vertices[i];
                const aInfos = this.vertexToInfo.get(a.id);
                aInfos.sort((a, b) => {
                    if (a.clique == b.clique) {
                        return a.index - b.index;
                    }
                    return a.clique - b.clique;
                });
                a.setColor(this.cliqueComponents[ArrayUtils.last(aInfos).clique - 1].color);
                for (let j = 0; j < verticesCount; ++j) {
                    const b = cc.vertices[j];
                    const bInfos = this.vertexToInfo.get(b.id);
                    bInfos.sort((a, b) => {
                        if (a.clique == b.clique) {
                            return a.index - b.index;
                        }
                        return a.clique - b.clique;
                    });
                    b.setColor(this.cliqueComponents[ArrayUtils.last(bInfos).clique - 1].color);
                    const info = getMaxCommonInfo(aInfos, bInfos);
                    const e = this.graph.getEdge(a.id, b.id);
                    const line = e.line;
                    line.setAttribute("stroke", this.getEdgeStorkeWidth(info.clique).toString());
                    line.setAttribute("stroke-color", info.clique <= 2 ? "var(--reverse-color2)" : this.cliqueComponents[info.clique - 1].color.toString());
                }
            }
        }
        checkCCs() {
            for (const kvp of this.vertexToInfo) {
                for (const info of kvp[1]) {
                    let find = false;
                    const cc = this.getKCliqueCC(info);
                    for (const v of cc.vertices) {
                        if (v.id == kvp[0]) {
                            find = true;
                            break;
                        }
                    }
                    if (find == false) {
                        throw new Error(`cant find vertex: ${kvp[0]} in clique:${cc.toString("{")} (clique:${info.clique}, idx:${info.index})`);
                    }
                }
            }
            for (const kc of this.cliqueComponents) {
                let idx = 0;
                for (const cc of kc.connectedComponents) {
                    if (cc.vertices.length != kc.clique) {
                        throw new Error(`vertice number unexpected ${cc.vertices} vs (real:) ${kc.clique}`);
                    }
                    for (const v of cc.vertices) {
                        const infos = this.vertexToInfo.get(v.id);
                        let find = false;
                        for (const info of infos) {
                            if (info.clique == kc.clique && info.index == idx) {
                                find = true;
                                break;
                            }
                        }
                        if (find == false) {
                            throw new Error(`info of ${v.id} in clique:${cc.toString("{")} (clique:${kc.clique},idx: ${idx}) missing`);
                        }
                    }
                    ++idx;
                }
            }
        }
        getKCliqueCC(info) {
            return this.cliqueComponents[info.clique - 1].connectedComponents[info.index];
        }
    }
    KClique.OPACITY = 0.4;
    KClique.CODE_DESCRIPTION = `iteration manner`;
    KClique.PSEUDO_CODES = [
        { code: "all the vertices are belonging to 1-clique", step: 1 },
        { code: "all the vertices of edges are belonging to 2-clique", step: 2 },
        { code: "while true :{", step: undefined },
        { code: "   no_update=true;", step: 3 },
        { code: "   for all cliques in the highest cliques group;", step: 4 },
        { code: "      check it against other clique :{", step: 5 },
        { code: "         if they intersect in size vertex count-1 and<br> remaining two vertices are connected :{", step: 6 },
        { code: "            merge them;", step: 7 },
        { code: "            no_update=false;", step: 8 },
        { code: "         }", step: undefined },
        { code: "      }", step: undefined },
        { code: "   }", step: undefined },
        { code: "   if no_update is true,break", step: 9 },
        { code: "}", step: undefined },
    ];
    KCliqueAlgorithm.KClique = KClique;
    class SubCliqueGenerator {
        constructor() {
            this.results = [];
            this.verticesBuffer = [];
            this.currentCC = KCliqueCC.POOL.get();
            KCliqueCC.POOL.release(this.currentCC);
        }
        set(cc) {
            this.currentCC = cc;
        }
        generate(mustHave, clique) {
            this.verticesBuffer.length = clique;
            let idx = 0;
            for (; idx < this.currentCC.vertices.length; ++idx) {
                if (this.currentCC.vertices[idx].id == mustHave.id) {
                    break;
                }
            }
            this.swap(0, idx);
            this.verticesBuffer[0] = mustHave;
            this.generateClique(1, clique - 1);
            this.swap(0, idx);
            return this.results;
        }
        swap(idx0, idx1) {
            const v = this.currentCC.vertices[idx0];
            this.currentCC.vertices[idx0] = this.currentCC.vertices[idx1];
            this.currentCC.vertices[idx1] = v;
        }
        releaseAll() {
            for (const cc of this.results) {
                KCliqueCC.POOL.release(cc);
            }
            this.results.length = 0;
        }
        generateClique(idx, left) {
            if (left <= 0) {
                const cc = KCliqueCC.POOL.get();
                cc.vertices.length = this.verticesBuffer.length;
                for (let i = 0; i < this.verticesBuffer.length; ++i) {
                    cc.vertices[i] = this.verticesBuffer[i];
                }
                this.results.push(cc);
                return;
            }
            --left;
            for (let i = idx; i < this.currentCC.vertices.length - left; ++i) {
                this.verticesBuffer[left] = this.currentCC.vertices[i];
                this.generateClique(i + 1, left);
            }
        }
    }
})(KCliqueAlgorithm || (KCliqueAlgorithm = {}));
