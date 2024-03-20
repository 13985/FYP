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
        constructor(graph, svg) {
            super(graph, svg);
            /**************************UI******************************************/
            /**************************helper data structures**********************/
            this.set = new Set();
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
                        const edgeColorStr = cc_.clique == 2 ? "var(--reverse-color2)" : cc_.color.toString();
                        const vertexColorStr = cc_.color.toString();
                        for (const from of cc.vertices) {
                            for (const to of cc.vertices) {
                                if (from.id == to.id) {
                                    continue;
                                }
                                const e = this.graph.getEdge(from.id, to.id);
                                const line = e.line;
                                line.setAttribute("stroke", edgeColorStr);
                                line.setAttribute("stroke-opacity", "1");
                                line.setAttribute("stroke-width", `${this.getEdgeStorkeWidth(cc.clique)}`);
                                from.setColorString(vertexColorStr);
                                from.circle.setAttribute("fill-opacity", KClique.OPACITY.toString());
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
            for (const kc of this.cliqueComponents) {
                for (const cc of kc.connectedComponents) {
                    const vertices = cc.vertices;
                    for (let idx = 0; idx < vertices.length; ++idx) {
                        const infos = this.vertexToInfo.get(vertices[idx].id);
                        if (infos == undefined) {
                            this.vertexToInfo.set(vertices[idx].id, [new ConnectedComponetInfo(kc.clique, idx)]);
                            continue;
                        }
                        infos.push(new ConnectedComponetInfo(kc.clique, idx));
                    }
                }
            }
            return this;
        }
        onRegisterSelf() {
            VisualizationUtils.DescriptionDisplay.clearPanel();
            VisualizationUtils.DescriptionDisplay.codeDescription.innerText = KClique.CODE_DESCRIPTION;
            VisualizationUtils.DescriptionDisplay.setCodes(KClique.PSEUDO_CODES);
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
                let previous = [];
                let newGenerated = [];
                let remainVertices = [];
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
                for (let noUpdate; true;) {
                    noUpdate = true;
                    newGenerated.length = 0;
                    this.states.localStatePush({ step: step, codeStep: 3, stepDescription: `for ${currentClique + 1}-Clique` });
                    ++step;
                    for (let i = 0; i < previous.length; ++i) {
                        function ccToString(cc) {
                            let ret = "";
                            for (const v of cc.vertices) {
                                ret += `${v.id},`;
                            }
                            return ret.substring(0, ret.length - 1);
                        }
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
                        this.states.localStatePush({ step: step, codeStep: 4, stepDescription: `clique: ${ccToString(first)}` });
                        ++step;
                        /**
                         * @summary note that here is slightly different from the createState()
                         */
                        Label_1: for (let j = i + 1; j < previous.length; ++j) {
                            const second = previous[j];
                            this.set.clear();
                            remainVertices.length = 0;
                            for (const v of first.vertices) {
                                this.set.add(v.id);
                            }
                            for (const v of second.vertices) {
                                if (this.set.has(v.id)) {
                                    this.set.delete(v.id);
                                }
                                else {
                                    remainVertices.push(v);
                                }
                            }
                            const highlightRemainVertices = (clique, opacity, width) => {
                                for (let i = 0; i < remainVertices.length; ++i) {
                                    const v0 = remainVertices[i];
                                    const vertexColor = this.cliqueComponents[clique - 1].color.toString();
                                    let ds = DataState.POOL.get();
                                    ds.step = step;
                                    ds.color = vertexColor;
                                    ds.opacity = opacity;
                                    this.states.dataStatePush(v0.id, ds);
                                    const helper = (vA, vB) => {
                                        const e = this.graph.getEdge(vA.id, vB.id);
                                        if (e == undefined) {
                                            return;
                                        }
                                        const code = this.graph.getEdgeHashCode(vA.id, vB.id);
                                        ds = DataState.POOL.get();
                                        ds.step = step;
                                        ds.color = previousEdgeColor.get(code);
                                        ds.opacity = opacity;
                                        ds.width = width;
                                        this.states.dataStatePush(code, ds);
                                    };
                                    for (const v1 of first.vertices) {
                                        helper(v1, v0);
                                    }
                                    for (let j = i + 1; j < remainVertices.length; ++j) {
                                        helper(remainVertices[j], v0);
                                    }
                                }
                            };
                            highlightRemainVertices(second.clique, 1, this.getEdgeStorkeWidth(second.clique));
                            this.states.localStatePush({ step: step, codeStep: 5, stepDescription: `check with clique: ${ccToString(second)}` });
                            ++step;
                            if (remainVertices.length > 1) { //i hate early continue, make sure the state has poped
                                highlightRemainVertices(second.clique, KClique.OPACITY, 1);
                                this.states.localStatePop(step);
                                ++step;
                                continue;
                            }
                            const left_v = remainVertices[0];
                            let the_v = left_v; //just to prevent use of unassigned local variable error
                            for (const v of this.set) {
                                the_v = this.graph.adjacencyList.get(v).main;
                            }
                            if (this.graph.getEdge(the_v.id, left_v.id) == undefined) {
                                highlightRemainVertices(second.clique, KClique.OPACITY, 1);
                                this.states.localStatePop(step);
                                ++step;
                                continue;
                            }
                            first.vertices.push(left_v);
                            newGenerated.push(first);
                            previous[j] = previous[previous.length - 1];
                            previous.pop();
                            if (i < previous.length - 1) {
                                previous[i] = previous[previous.length - 1];
                                previous.pop();
                                --i; //prevent the increment of i
                            }
                            noUpdate = false;
                            first.clique = currentClique + 1;
                            highlightCC(first, 1, this.getEdgeStorkeWidth(currentClique), true);
                            this.states.localStateTop({ step: step, codeStep: 6, stepDescription: `merge` });
                            ++step;
                            this.states.localStateTop({ step: step, codeStep: 7, stepDescription: `set no_update=false` });
                            ++step;
                            this.states.localStatePop(step);
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
                    { //swap two buffer
                        const temp = previous;
                        previous = newGenerated;
                        newGenerated = temp;
                    }
                    if (noUpdate) {
                        break;
                    }
                    ++currentClique;
                }
                this.states.localStateTop({ step: step, codeStep: 8, stepDescription: `highest clique:${currentClique}` });
                ++step;
            }
            this.states.localStatePop(step);
            this.states.onInitEnd(step);
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
                VisualizationUtils.DescriptionDisplay.highlightCode(descriptionStates[descriptionStates.length - 1].codeStep);
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
            const cc = KCliqueCC.POOL.get();
            cc.clique = 1;
            cc.vertices.push(newV);
            const ccs = this.cliqueComponents[0].connectedComponents;
            this.vertexToInfo.set(a, [new ConnectedComponetInfo(1, ccs.length)]);
            ccs.push(cc);
            return true;
        }
        removeVertex(a) {
            if (this.graph.removeVertex(a) == null) {
                return false;
            }
            const infos = this.vertexToInfo.get(a);
            for (const info of infos) {
                const theIndex = info.index;
                const theClique = info.clique;
                const kc = this.cliqueComponents[theClique - 1];
                const theCC = kc.connectedComponents[theIndex];
                for (let i = 0; i < theCC.vertices.length; ++i) {
                    if (theCC.vertices[i].id == a) {
                        theCC.vertices.splice(i, 1);
                        break;
                    }
                }
                this.removeCC(info);
                if (theClique == 1) {
                    KCliqueCC.POOL.release(theCC);
                }
                else {
                    theCC.clique = theClique - 1;
                    this.moveCC(theCC, info);
                }
            }
            this.vertexToInfo.delete(a);
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
            const fromInfos = this.vertexToInfo.get(from);
            const toInfos = this.vertexToInfo.get(to);
            for (const fromInfo of fromInfos) {
                for (const toInfo of toInfos) {
                    if (fromInfo.clique != toInfo.clique || fromInfo.index != toInfo.index) {
                        continue;
                    }
                    const theCC = this.removeCC(fromInfo);
                    const newCC = KCliqueCC.POOL.get();
                    for (let idx = 0; idx < theCC.vertices.length; ++idx) {
                        const v = theCC.vertices[idx];
                        if (v.id == from) {
                            theCC.vertices.splice(idx, 1); //theCC contains to
                            newCC.vertices.push(v); //newCC contains from
                            --idx;
                        }
                        else if (v.id == to) {
                            //newCC not contains to
                        }
                        else {
                            newCC.vertices.push(v);
                        }
                    }
                    const newClique = fromInfo.clique - 1;
                    newCC.clique = newClique;
                    theCC.clique = newClique;
                    this.moveCC(theCC, fromInfo);
                    this.addCC(newCC);
                }
            }
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
         * @param cc contains the new clique==vertices.length
         * @param originalInfo index and clique before move
         */
        moveCC(cc, originalInfo) {
            const kc = this.cliqueComponents[cc.clique - 1];
            const lastIdx = kc.connectedComponents.length - 1;
            for (const v of cc.vertices) {
                const infos = this.vertexToInfo.get(v.id);
                for (const info of infos) {
                    if (info.clique != originalInfo.clique || info.index != originalInfo.index) {
                        continue;
                    }
                    info.clique = cc.clique;
                    info.index = lastIdx;
                    break;
                }
            }
        }
        /**
         * @param cc contains the new clique==vertices.length
         */
        addCC(cc) {
            const kc = this.cliqueComponents[cc.clique - 1];
            const lastIdx = kc.connectedComponents.length - 1;
            for (const v of cc.vertices) {
                const infos = this.vertexToInfo.get(v.id);
                infos.push(new ConnectedComponetInfo(cc.clique, lastIdx));
            }
        }
        getEdgeStorkeWidth(clique) {
            return 1 + (clique * 3) / (this.cliqueComponents.length + 2);
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
