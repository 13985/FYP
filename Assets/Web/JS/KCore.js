"use strict";
/*
hide non k-shell if starting core is more than 1
force directed layoutt -explore alt?
color node as it goes ( start with white)
setting - to show not yet visualized current core nodes
add edge! deature  (bonus during visualzation)

*/
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
    class KCoreCC extends VisualizationUtils.ConnectedComponent {
        constructor(shell = 1) {
            super();
            this.shell = -1;
            this.shell = shell;
        }
        clone() {
            const cc = KCoreCC.POOL.get();
            cc.shell = this.shell;
            return cc;
        }
    }
    KCoreCC.POOL = new VisualizationUtils.ObjectPool(KCoreCC);
    class ShellComponet {
        constructor() {
            this.connectedComponents = [];
            this.shell = -1;
            this.color = new Color(0, 0, 0);
            this.step = -1;
        }
        clone() {
            const sc = new ShellComponet();
            sc.shell = this.shell;
            sc.color = this.color.clone();
            return sc;
        }
    }
    class CorePolygon {
        constructor(p, key = 0) {
            this.bound = [];
            this.show = false;
            this.polygon = p;
            this.dataKey = key;
        }
        display(show) {
            this.show = show;
            if (show) {
                this.polygon.setAttribute("visibility", "visible");
            }
            else {
                this.polygon.setAttribute("visibility", "hidden");
            }
            return this;
        }
        isShowing() {
            return this.show;
        }
    }
    class ConnectedComponetInfo {
        constructor(s, i) {
            this.shell = 0;
            this.index = 0;
            this.shell = s;
            this.index = i;
        }
        clone() {
            const info = new ConnectedComponetInfo(this.shell, this.index);
            return info;
        }
    }
    class DataState {
        constructor() {
            this.step = 0;
            this.degree = -1;
            this.shell = -1;
            this.opacity = "0.3";
            this.text = "";
        }
        set(step, degree, shell, opacity, text) {
            this.degree = degree != undefined ? degree : 0;
            this.step = step != undefined ? step : 1;
            this.opacity = opacity != undefined ? opacity : "0.3";
            this.shell = shell != undefined ? shell : -1;
            this.text = text != undefined ? text : "";
            return this;
        }
        isProcessed() {
            return this.shell >= 0;
        }
        clear() {
            this.shell = -1;
            this.degree = 0;
            this.opacity = "0.3";
        }
        canPolygonShow() {
            return this.shell >= 0;
        }
        setPolygonHide() {
            this.shell = -1;
            return this;
        }
        setPolygonShow() {
            this.shell = -1;
            return this;
        }
    }
    DataState.POOL = new VisualizationUtils.ObjectPool(DataState, 1024);
    class TreeNode extends VisualizationUtils.TreeNodeBase {
    }
    TreeNode.POOL = new VisualizationUtils.ObjectPool(TreeNode, 1024);
    /**
     * @complexity
     * space: O(V+E)
     */
    class State extends VisualizationUtils.GraphStateManager {
        constructor(graph) {
            super(graph);
            this.init();
        }
        /**
         * @summary order of dataKey is the same as order of vertex in graph.vertices
         */
        setDataKeys() {
            this.dataKeys.length = this.graph.vertices.length;
            for (let i = 0; i < this.graph.vertices.length; ++i) {
                this.dataKeys[i] = this.graph.vertices[i].id;
            }
        }
        addPolygonKeys(corePolygons) {
            const base = this.dataKeys.length;
            this.dataKeys.length = base + corePolygons.length;
            for (let i = 0; i < corePolygons.length; ++i) {
                const theKey = corePolygons[i].dataKey;
                if (this.dataStates.has(theKey)) {
                    throw new Error("polygon key same as vertice id");
                }
                else {
                    this.dataStates.set(theKey, [DataState.POOL.get().set(0).setPolygonHide()]);
                }
                this.dataKeys[base + i] = theKey;
            }
            return this;
        }
        init() {
            for (const kvp of this.dataStates) {
                for (const state of kvp[1]) {
                    DataState.POOL.release(state);
                }
            }
            super.clear();
            super.init();
            this.graph.adjacencyList.forEach((vl, v_id) => {
                const dv = DataState.POOL.get();
                dv.degree = vl.others.length;
                dv.step = 0;
                this.dataStates.set(v_id, [dv]);
            });
            return this;
        }
        getTreeNode() {
            return TreeNode.POOL.get();
        }
        releaseTreeNode(node) {
            TreeNode.POOL.release(node);
        }
    }
    class KCore extends VisualizationUtils.Algorithm {
        constructor(g, svg, gw) {
            super(g, svg, gw);
            this.corePolygons = [];
            /**************************helper data structures**********************/
            this.degrees = new Map();
            this.inSet1 = new Map();
            this.set0 = [];
            this.set1 = [];
            this.unionFind = new UnionFind();
            /**************************index data structures**********************/
            this.shellComponents = [];
            this.vertexToInfo = new Map();
            this.maxOption = null;
            this.minOption = null;
            this.polygonsContainer = gw.allG;
        }
        setIndexStructure(other) {
            this.shellComponents = other.shellComponents;
            return this;
        }
        setColorGradient(start_, end_) {
            const start = start_.clone(); //copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const end = end_.clone(); //copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const shellCount = this.shellComponents.length;
            const interval = shellCount - 1;
            for (let i = 0; i < shellCount; ++i) {
                Color.lerp(this.shellComponents[i].color, start, end, i / interval);
            }
            return this;
        }
        onRegisterSelf() {
            VisualizationUtils.DescriptionDisplay.clearPanel();
            VisualizationUtils.DescriptionDisplay.codeDescription.innerText = KCore.CODE_DESCRIPTION;
            VisualizationUtils.DescriptionDisplay.setCodes(KCore.PSEUDO_CODES);
        }
        createState() {
            this.ensurePolygons().clearHelpers();
            for (let i = 0; i < this.shellComponents.length; ++i) {
                this.corePolygons[i].dataKey = Graph.MAXIMUM_VERTICES + i;
            }
            if (this.states) {
                this.states.init().addPolygonKeys(this.corePolygons);
            }
            else {
                this.states = new State(this.graph).addPolygonKeys(this.corePolygons);
            }
            let currentShell = 0, nextShell = 1;
            let step = 0;
            this.states.localStatePush({ step: step, codeStep: 1, stepDescription: "initization" });
            this.graph.adjacencyList.forEach((vl, k) => {
                var _a;
                if (vl.others.length <= 0) {
                    this.set0.push(k);
                    this.degrees.set(k, -1);
                }
                else {
                    this.inSet1.set(k, this.set1.length);
                    this.set1.push(k);
                    this.degrees.set(k, vl.others.length);
                    nextShell = Math.min(nextShell, vl.others.length);
                }
                (_a = this.states) === null || _a === void 0 ? void 0 : _a.dataStatePush(vl.main.id, DataState.POOL.get().set(step, vl.others.length, undefined, KCore.OPACITY, `${vl.main.id}:deg(${vl.others.length})`));
            });
            ++step;
            while (true) {
                this.states.localStateTop({ step: step, codeStep: 2, stepDescription: `set1.length:${this.set1.length} current_core:${currentShell}` });
                this.states.dataStatePush(this.corePolygons[currentShell].dataKey, DataState.POOL.get().set(step).setPolygonShow());
                ++step;
                this.states.localStateTop({ step: step, codeStep: 3, stepDescription: `push vertices with degree < ${currentShell} to set0` });
                ++step;
                this.states.localStateTop({ step: step, codeStep: 3, stepDescription: `current_core: ${currentShell} ` });
                ++step;
                while (this.set0.length > 0) {
                    const v_id = this.set0.pop();
                    const vl = this.graph.adjacencyList.get(v_id);
                    this.states.dataStatePush(v_id, DataState.POOL.get().set(step, undefined, currentShell, "1", `${v_id}:deg(/)`));
                    this.states.localStatePush({ step: step, codeStep: 4, stepDescription: `process vertex ${v_id}` });
                    ++step;
                    for (const neighbor of vl.others) {
                        let degree = this.degrees.get(neighbor);
                        this.states.localStatePush({ step: step, codeStep: 5, stepDescription: `check neighbor ${neighbor}` });
                        ++step;
                        if (degree < 0) {
                            this.states.localStateTop({ step: step, codeStep: 6, stepDescription: `neighbor ${neighbor} is not in set1` });
                            ++step;
                        }
                        else {
                            --degree;
                            this.states.dataStatePush(neighbor, DataState.POOL.get().set(step, degree, undefined, "1", `${neighbor}:deg(${degree})`));
                            this.states.localStateTop({ step: step, codeStep: 7, stepDescription: `decrement degree of ${neighbor} from ${degree + 1} to ${degree}` });
                            ++step;
                            if (degree <= currentShell) {
                                this.states.localStateTop({ step: step, codeStep: 8, stepDescription: `degree (${degree}) of neighbor ${neighbor} is <= current_core (${currentShell})` });
                                ++step;
                                this.removeFromSet1(neighbor);
                            }
                            else {
                                nextShell = Math.min(nextShell, degree);
                                this.degrees.set(neighbor, degree);
                            }
                            this.states.dataStatePush(neighbor, DataState.POOL.get().set(step, degree, undefined, KCore.OPACITY, `${neighbor}:deg(${degree})`));
                            ++step;
                        }
                        this.states.localStatePop(step);
                    }
                    this.states.dataStatePush(v_id, DataState.POOL.get().set(step, undefined, currentShell, KCore.OPACITY, `${v_id}:deg(/)`));
                    this.states.localStatePop(step);
                    ++step;
                }
                if (this.set1.length <= 0) {
                    break;
                }
                currentShell = nextShell;
                nextShell = currentShell + 1;
                this.states.localStateTop({ step: step, codeStep: 9, stepDescription: `increment current_core to ${currentShell}` });
                ++step;
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
            this.states.localStatePop(step);
            this.states.onInitEnd(step);
            this.refreshSelect();
            return this;
        }
        createIndexStructure() {
            this.unionFind.set(this.graph.vertices.length);
            this.releaseCCs().clearHelpers().vertexToInfo.clear();
            let currentShell = 0, nextShell = 1;
            this.graph.adjacencyList.forEach((vl, k) => {
                if (vl.others.length <= 0) {
                    this.set0.push(k);
                    this.degrees.set(k, -1);
                }
                else {
                    this.inSet1.set(k, this.set1.length);
                    this.set1.push(k);
                    this.degrees.set(k, vl.others.length);
                    nextShell = Math.min(nextShell, vl.others.length);
                }
                this.vertexToInfo.set(vl.main.id, new ConnectedComponetInfo(0, 0));
            });
            while (true) {
                while (this.set0.length > 0) {
                    const v_id = this.set0.pop();
                    const vl = this.graph.adjacencyList.get(v_id);
                    this.vertexToInfo.get(v_id).shell = currentShell;
                    for (const neighbor of vl.others) {
                        let degree = this.degrees.get(neighbor);
                        if (degree < 0) {
                            if (this.vertexToInfo.get(neighbor).shell == currentShell) {
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
                if (this.set1.length <= 0) {
                    break;
                }
                currentShell = nextShell;
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
            this.shellComponents.length = currentShell + 1;
            for (let i = currentShell; i >= 0; --i) {
                const sc = new ShellComponet();
                this.shellComponents[i] = sc;
                sc.shell = i;
            }
            this.degrees.clear();
            this.unionFind.flatten();
            for (let node = 0; node < this.unionFind.parents.length; ++node) {
                if (node != this.unionFind.parents[node])
                    continue;
                const info = this.vertexToInfo.get(node);
                const sc = this.shellComponents[info.shell].connectedComponents;
                const cc = KCoreCC.POOL.get();
                cc.shell = info.shell;
                info.index = sc.length;
                cc.vertices.push(this.graph.adjacencyList.get(node).main);
                sc.push(cc);
            }
            for (let node = 0; node < this.unionFind.parents.length; ++node) {
                if (node == this.unionFind.parents[node])
                    continue;
                const parentInfo = this.vertexToInfo.get(this.unionFind.parents[node]);
                this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push(this.graph.adjacencyList.get(node).main);
                this.vertexToInfo.get(node).index = parentInfo.index;
            }
            this.ensurePolygons().calculateBound();
            return this;
        }
        animate() {
            return __awaiter(this, void 0, void 0, function* () {
                VisualizationUtils.VideoControl.progressBar.setAttribute("max", this.states.maxStep.toString());
                for (const v of this.graph.vertices) {
                    v.circle.setAttribute("opacity", KCore.OPACITY);
                }
                this.setVisualElementsColor(true);
                this.hideVerticesOutsideShells();
                if (this.states == undefined) {
                    return;
                }
                let dataStates;
                this.states.resetStep();
                const minShell = parseInt(this.minOption.value);
                const maxShell = parseInt(this.maxOption.value);
                const maxStep = maxShell + 1 >= this.shellComponents.length ? Number.MAX_SAFE_INTEGER : this.shellComponents[maxShell + 1].step;
                if (minShell > 0) {
                    const minStep = this.shellComponents[minShell].step;
                    dataStates = this.states.randomStep(minStep);
                    VisualizationUtils.VideoControl.progressBar.valueAsNumber = minStep;
                    this.setAnimationDisplay(dataStates, this.states.getCurrentLocalStates());
                }
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
                    if (this.states.currentStep > maxStep) {
                        break AnimtaionLoop;
                    }
                }
                for (const v of this.graph.vertices) {
                    const circle = v.circle;
                    circle.setAttribute("opacity", "1");
                    circle.setAttribute("visibility", "visible");
                    v.text.innerHTML = v.id.toString();
                }
                ;
                this.displayPolygons(true);
            });
        }
        removeFromSet1(target) {
            this.set0.push(target);
            this.degrees.set(target, KCore.PROCESSED);
            const idx = this.inSet1.get(target);
            const last = arrayLast(this.set1);
            this.set1[idx] = last;
            this.inSet1.set(last, idx);
            this.inSet1.delete(target);
            this.set1.pop();
        }
        clearHelpers() {
            this.degrees.clear();
            this.inSet1.clear();
            this.set0.length = 0;
            this.set1.length = 0;
            return this;
        }
        setSelects(min, max) {
            this.minOption = min;
            this.maxOption = max;
            this.refreshSelect();
            this.minOption.addEventListener("input", () => {
                this.createOptions(parseInt(this.minOption.value), this.shellComponents.length, this.maxOption);
            });
            this.maxOption.addEventListener("input", () => {
                this.createOptions(0, parseInt(this.maxOption.value) + 1, this.minOption);
            });
            return this;
        }
        refreshSelect() {
            if (this.minOption == null || this.maxOption == null) {
                return this;
            }
            this.createOptions(0, this.shellComponents.length, this.minOption);
            this.createOptions(0, this.shellComponents.length, this.maxOption);
            this.minOption.value = "0";
            this.maxOption.value = (this.shellComponents.length - 1).toString();
            return this;
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
        setAnimationDisplay(vertexStates, descriptionStates) {
            var _a, _b, _c;
            if (vertexStates == null) {
                return;
            }
            for (let i = 0; i < this.graph.vertices.length; ++i) {
                const vertex = this.graph.vertices[i];
                const ds = vertexStates[i];
                (_a = vertex.circle) === null || _a === void 0 ? void 0 : _a.setAttribute("opacity", ds.opacity);
                if (ds.isProcessed()) {
                    (_b = vertex.circle) === null || _b === void 0 ? void 0 : _b.setAttribute("fill", this.shellComponents[ds.shell].color.toString());
                }
                else {
                    (_c = vertex.circle) === null || _c === void 0 ? void 0 : _c.setAttribute("fill", "var(--reverse-color2)");
                }
                vertex.text.innerHTML = ds.text;
            }
            for (let i = 0; i < this.corePolygons.length; ++i) {
                this.corePolygons[i].display(vertexStates[i + this.graph.vertices.length].canPolygonShow());
            }
            if (descriptionStates.length > 0) {
                const lis = VisualizationUtils.DescriptionDisplay.setLocalDescriptionNumber(descriptionStates.length);
                for (let i = 0; i < descriptionStates.length; ++i) {
                    lis[i].innerHTML = descriptionStates[i].stepDescription;
                }
                VisualizationUtils.DescriptionDisplay.highlightCode(arrayLast(descriptionStates).codeStep);
            }
            else {
                VisualizationUtils.DescriptionDisplay.highlightCode(-1);
            }
        }
        setVisualElementsColor(defaultColor) {
            this.showDefaultColor = defaultColor;
            if (defaultColor) {
                for (const v of this.graph.vertices) {
                    v.circle.setAttribute("fill", "var(--reverse-color2)");
                }
                for (const cp of this.corePolygons) {
                    cp.display(false);
                }
            }
            else {
                for (const cp of this.corePolygons) {
                    cp.display(true);
                }
                for (const sc of this.shellComponents) {
                    for (const cc of sc.connectedComponents) {
                        for (const v of cc.vertices) {
                            v.setColor(sc.color);
                        }
                    }
                }
            }
            return this;
        }
        hideVerticesOutsideShells() {
            const displayVerticesInRange = (minShell, maxShell, visibile) => {
                for (let i = minShell; i < maxShell; ++i) {
                    const sc = this.shellComponents[i];
                    for (const cc of sc.connectedComponents) {
                        for (const v of cc.vertices) {
                            this.graph.displayVertex(v.id, visibile);
                        }
                    }
                }
            };
            const min = parseInt(this.minOption.value), max = parseInt(this.maxOption.value);
            displayVerticesInRange(min, max + 1, true); //set the edges visible first (some edge may connected to outside shell)
            displayVerticesInRange(0, min, false); //then for the edge connected to outside shell, hide them
            displayVerticesInRange(max + 1, this.shellComponents.length, false);
        }
        displayPolygons(show) {
            const value = show ? "visible" : "hidden";
            for (const cp of this.corePolygons) {
                cp.polygon.setAttribute("visibility", value);
            }
            return this;
        }
        calculateBound() {
            let i = this.corePolygons.length - 1;
            {
                const cp = this.corePolygons[i];
                cp.bound.length = 0;
                if (cp.isShowing()) {
                    ConvesHull.Solve(cp, this.shellComponents[i], this.svgContainer);
                }
            }
            for (--i; i >= 0; --i) {
                const cp = this.corePolygons[i];
                cp.bound.length = 0;
                if (cp.isShowing()) {
                    ConvesHull.Solve(cp, this.shellComponents[i], this.svgContainer, this.corePolygons[i + 1].bound);
                }
            }
            return this;
        }
        addEdge(a, b) {
            if (this.graph.addEdge(a, b) == false) {
                return false;
            }
            this.graphWindow.updateSimulation();
            const a_idx = this.vertexToInfo.get(a);
            const b_idx = this.vertexToInfo.get(b);
            let theInfo;
            if (a_idx.shell != b_idx.shell) {
                if (a_idx.shell > b_idx.shell) {
                    theInfo = b_idx;
                }
                else {
                    theInfo = a_idx;
                }
            }
            else {
                if (a_idx.index != b_idx.index) {
                    this.mergeComponent(this.shellComponents[a_idx.shell], a_idx.index, b_idx.index);
                }
                theInfo = a_idx;
            }
            this.KCore_ConnectedComponent(theInfo);
            return true;
        }
        removeEdge(a, b) {
            if (this.graph.removeEdge(a, b) == false) {
                return false;
            }
            this.graphWindow.updateSimulation();
            const a_idx = this.vertexToInfo.get(a);
            const b_idx = this.vertexToInfo.get(b);
            let theInfo;
            if (a_idx.shell != b_idx.shell) {
                if (a_idx.shell > b_idx.shell) { //higher shell not affacted by lower shell vertex
                    theInfo = b_idx;
                }
                else {
                    theInfo = a_idx;
                }
            }
            else { //they must be in the same connected component
                theInfo = a_idx;
            }
            this.KCore_ConnectedComponent(theInfo);
            return true;
        }
        addVertex(a) {
            const v = this.graph.addVertex(a);
            if (v == null) {
                return false;
            }
            this.graphWindow.updateSimulation();
            const sc = this.shellComponents[0];
            const info = new ConnectedComponetInfo(0, sc.connectedComponents.length);
            const cc = KCoreCC.POOL.get();
            sc.connectedComponents.push(cc);
            cc.shell = 0;
            cc.vertices.push(v);
            v.setColor(sc.color);
            this.vertexToInfo.set(a, info);
            this.calculateBound();
            return true;
        }
        removeVertex(a) {
            if (this.graph.removeVertex(a) == null) {
                return false;
            }
            this.graphWindow.updateSimulation();
            const info = this.vertexToInfo.get(a);
            const cc = this.shellComponents[info.shell].connectedComponents[info.index];
            cc.removeVertex(a);
            this.KCore_ConnectedComponent(info);
            this.vertexToInfo.delete(a);
            return true;
        }
        removeComponent(shellComponent, idx, setIndex = false) {
            const ret = shellComponent.connectedComponents[idx];
            const lastIdx = shellComponent.connectedComponents.length - 1;
            if (setIndex && idx < lastIdx) {
                const last = shellComponent.connectedComponents[lastIdx];
                for (const v of last.vertices) {
                    const ccIdx = this.vertexToInfo.get(v.id);
                    ccIdx.index = idx;
                }
                shellComponent.connectedComponents[idx] = last;
            }
            shellComponent.connectedComponents.pop();
            return ret;
        }
        mergeComponent(shellComponent, idx0, idx1) {
            if (idx0 > idx1) {
                const temp = idx0;
                idx0 = idx1;
                idx1 = temp;
            }
            const a = shellComponent.connectedComponents[idx0];
            const b = this.removeComponent(shellComponent, idx1, true);
            for (const v of b.vertices) {
                a.vertices.push(v);
                const ccIdx = this.vertexToInfo.get(v.id);
                ccIdx.index = idx0;
            }
            KCoreCC.POOL.release(b);
        }
        KCore_ConnectedComponent(theInfo) {
            var _a;
            const theCC = this.shellComponents[theInfo.shell].connectedComponents[theInfo.index];
            this.unionFind.set(this.graph.vertices.length);
            this.clearHelpers();
            const MAX_DEGREE = 1000000;
            let minDegree = MAX_DEGREE;
            const orginalShell = theInfo.shell; //copy the shell, since info will be change while iteration
            for (const v of theCC.vertices) { //find the minimum degree of vertex
                let d = 0;
                for (const other of v.list.others) {
                    if (this.vertexToInfo.get(other).shell >= theCC.shell) {
                        ++d;
                    }
                }
                this.degrees.set(v.id, d);
                minDegree = Math.min(minDegree, d);
            }
            for (const v of theCC.vertices) { //group the vertices
                if (this.degrees.get(v.id) <= minDegree) {
                    this.set0.push(v.id);
                    this.degrees.set(v.id, -1);
                }
                else {
                    this.inSet1.set(v.id, this.set1.length); //i have no idea why sometime this method work without this line
                    this.set1.push(v.id);
                }
            }
            let currentShell = minDegree;
            let nextShell = minDegree + 1;
            //atmost 2 iteration after added an edge (degree+1) or remove an egde (degree-1)
            while (true) { //run kcore
                while (this.set0.length > 0) {
                    const v_id = this.set0.pop();
                    const vl = this.graph.adjacencyList.get(v_id);
                    this.vertexToInfo.get(v_id).shell = currentShell;
                    for (const neighbor of vl.others) {
                        let degree = this.degrees.get(neighbor);
                        if (degree == undefined) {
                            continue;
                        }
                        else if (degree < 0) {
                            if (this.vertexToInfo.get(neighbor).shell == currentShell) {
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
                if (this.set1.length <= 0) {
                    break;
                }
                currentShell = nextShell;
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
            this.degrees.clear();
            this.unionFind.flatten();
            this.removeComponent(this.shellComponents[orginalShell], theInfo.index, true); //the index of info did got changed, actually remove theCC
            //for storing the vertices
            const oldShell = this.set0;
            const newShell = this.set1;
            oldShell.length = 0;
            newShell.length = 0;
            if (currentShell >= this.shellComponents.length && currentShell < MAX_DEGREE) { //if vertex in 0 kcore got deleted, then the currentShell wont change.... (i.e. it will still == MAX_DEGREE since no kcore is ran)
                const sc = new ShellComponet();
                sc.shell = currentShell;
                this.shellComponents.push(sc);
                this.setColorGradient(this.shellComponents[0].color, this.shellComponents[this.shellComponents.length - 2].color).refreshSelect().ensurePolygons();
            }
            //parents create the connected component
            for (const v of theCC.vertices) { //separate the vertex into two group depend on if their shell change
                const info = this.vertexToInfo.get(v.id);
                if (info.shell != theCC.shell) {
                    newShell.push(v.id);
                    if (v.id != this.unionFind.parents[v.id])
                        continue;
                }
                else {
                    oldShell.push(v.id);
                    if (v.id != this.unionFind.parents[v.id])
                        continue;
                }
                const sc = this.shellComponents[info.shell].connectedComponents;
                const cc = KCoreCC.POOL.get();
                cc.shell = info.shell;
                info.index = sc.length;
                cc.vertices.push(v);
                sc.push(cc);
            }
            for (const v of oldShell) { //load the vertex that shell doesnt got changed
                if (v == this.unionFind.parents[v])
                    continue;
                const info = this.vertexToInfo.get(v);
                const parentInfo = this.vertexToInfo.get(this.unionFind.parents[v]);
                this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push(this.graph.adjacencyList.get(v).main);
                info.index = parentInfo.index;
            }
            //console.log(`new ${newShell}`);
            //console.log(`old ${oldShell}`);
            if (newShell.length > 0) {
                const otherCCIndices = oldShell;
                const inNewShell = this.degrees;
                inNewShell.clear();
                if (this.showDefaultColor == false) {
                    const info = this.vertexToInfo.get(newShell[0]);
                    const color = this.shellComponents[info.shell].color.toString();
                    for (const v of newShell) {
                        const vl = this.graph.adjacencyList.get(v);
                        (_a = vl.main.circle) === null || _a === void 0 ? void 0 : _a.setAttribute("fill", color);
                    }
                }
                for (const v of newShell) { //load the vertices of new shell
                    inNewShell.set(v, 0);
                    if (v == this.unionFind.parents[v])
                        continue;
                    const info = this.vertexToInfo.get(v);
                    const parentInfo = this.vertexToInfo.get(this.unionFind.parents[v]);
                    this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push(this.graph.adjacencyList.get(v).main);
                    info.index = parentInfo.index;
                }
                for (const v of newShell) { //find all other connected components that can be merged
                    if (v != this.unionFind.parents[v]) {
                        continue;
                    }
                    const parentInfo = this.vertexToInfo.get(v);
                    const sc = this.shellComponents[parentInfo.shell];
                    const cc = sc.connectedComponents[parentInfo.index]; //search the component
                    otherCCIndices.length = 0;
                    otherCCIndices.push(parentInfo.index);
                    for (const v_ of cc.vertices) { //for all vertices in this component
                        const vl = v_.list;
                        for (const other of vl.others) { //find all connected component on same shell that can merge
                            if (inNewShell.get(other) != undefined) {
                                continue;
                            }
                            const otherInfo = this.vertexToInfo.get(other);
                            if (otherInfo.shell == parentInfo.shell) {
                                otherCCIndices.push(otherInfo.index);
                            }
                        }
                    }
                    if (otherCCIndices.length > 1) {
                        otherCCIndices.sort((a, b) => { return a - b; });
                        let len = 0;
                        for (let i = 0, j; i < otherCCIndices.length; i = j) {
                            for (j = i + 1; j < otherCCIndices.length && otherCCIndices[i] == otherCCIndices[j]; ++j) { }
                            otherCCIndices[len++] = otherCCIndices[j - 1];
                        }
                        otherCCIndices.length = len;
                    }
                    const minIndex = otherCCIndices[0];
                    const minCC = this.shellComponents[parentInfo.shell].connectedComponents[minIndex];
                    for (let i = otherCCIndices.length - 1; i > 0; --i) {
                        const otherCC = this.removeComponent(sc, otherCCIndices[i], true);
                        for (const v of otherCC.vertices) {
                            const info = this.vertexToInfo.get(v.id);
                            info.index = minIndex;
                            minCC.vertices.push(v);
                        }
                        KCoreCC.POOL.release(otherCC);
                    }
                }
            }
            this.calculateBound();
            KCoreCC.POOL.release(theCC);
            this.checkCCs();
        }
        ensurePolygons() {
            //const visible:string=this.showDefaultColor?"visible":"hidden";
            const min = Math.min(this.shellComponents.length, this.corePolygons.length);
            for (let i = 0; i < min; ++i) {
                this.corePolygons[i].display(this.showDefaultColor).polygon.setAttribute("fill", `color-mix(in srgb, ${this.shellComponents[i].color.toString()} 30%, var(--main-color1) 70%)`);
            }
            if (min == this.shellComponents.length) {
                for (let i = this.shellComponents.length; i < this.corePolygons.length; ++i) {
                    this.corePolygons[i].display(false);
                }
            }
            else {
                for (let i = this.corePolygons.length; i < this.shellComponents.length; ++i) {
                    const p = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    p.setAttribute("fill", `color-mix(in srgb, ${this.shellComponents[i].color.toString()} 30%, var(--main-color1) 70%)`);
                    /**
                     * @summary
                     * GraphWindow will append two g to its allG and its allG is the polygonsContainer of this,
                     * so query the first g and insert before it
                     */
                    this.polygonsContainer.insertBefore(this.polygonsContainer.querySelector("g"), p);
                    const coreP = new CorePolygon(p).display(this.showDefaultColor);
                    this.corePolygons.push(coreP);
                }
            }
            return this;
        }
        checkCCs() {
            for (let shell = 0; shell < this.shellComponents.length; ++shell) {
                const sc = this.shellComponents[shell];
                for (let i = 0; i < sc.connectedComponents.length; ++i) {
                    const cc = sc.connectedComponents[i];
                    for (const v of cc.vertices) {
                        const info = this.vertexToInfo.get(v.id);
                        if (info.shell != shell || info.index != i) {
                            console.log(`fail at (stored in) shell:${shell} cc idx:${i} of v:${v.id} (incorrect values: shell:${info.shell} idx:${info.index})`);
                            throw new Error();
                        }
                    }
                }
            }
            for (const v of this.graph.vertices) {
                const info = this.vertexToInfo.get(v.id);
                const cc = this.shellComponents[info.shell].connectedComponents[info.index];
                let have = false;
                for (const _v of cc.vertices) {
                    if (v.id == _v.id) {
                        have = true;
                        break;
                    }
                }
                if (have == false) {
                    console.log(`fail at ${v.id} (incorrect values: shell:${info.shell} idx:${info.index})`);
                    throw new Error();
                }
            }
        }
        releaseCCs() {
            for (const sc of this.shellComponents) {
                for (const cc of sc.connectedComponents) {
                    KCoreCC.POOL.release(cc);
                }
            }
            this.shellComponents.length = 0;
            return this;
        }
    }
    KCore.CODE_DESCRIPTION = `maintain two set:
set0: storing all vertices wait for processing
set1: storing all unprocessed vertices with degree > expored current_core`;
    KCore.PSEUDO_CODES = [
        { code: "push all vertices into set1, set current_core = 0;", step: 1 },
        { code: "while set1 is not empty :{", step: 2 },
        { code: "   push all vertices with degree <= current_core to set0;", step: 3 },
        { code: "   for all v in set0 :{", step: 4 },
        { code: "      check for its all neighbors:{", step: 5 },
        { code: "         if it is not in set1: continue;", step: 6 },
        { code: "         else:{", step: undefined },
        { code: "            decrement its degree;", step: 7 },
        { code: "            if its degree <= current_core, push it to set0;", step: 8 },
        { code: "         }", step: undefined },
        { code: "      }", step: undefined },
        { code: "   }", step: undefined },
        { code: "   current_shell++;", step: 9 },
        { code: "}", step: undefined },
    ];
    KCore.PROCESSED = -2;
    KCore.OPACITY = "0.3";
    KCoreAlgorithm.KCore = KCore;
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }
    class ConvesHull {
        static cross(o, a, b) {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        }
        /**
         * @returns number of vertices in bound
         */
        static Solve(cp, sc, svg, otherBound) {
            const verticesBuffer = ConvesHull.verticesBuffer;
            verticesBuffer.length = 0;
            if (otherBound != undefined) {
                Array.prototype.push.apply(verticesBuffer, otherBound);
            }
            for (const cc of sc.connectedComponents) {
                Array.prototype.push.apply(verticesBuffer, cc.vertices);
            }
            const polygon = cp.polygon;
            polygon.points.clear();
            if (verticesBuffer.length < 3) {
                return verticesBuffer.length;
            }
            else if (verticesBuffer.length < 4) {
                for (const vertex of verticesBuffer) {
                    const p = svg.createSVGPoint();
                    p.x = vertex.x;
                    p.y = vertex.y;
                    polygon.points.appendItem(p);
                }
                return verticesBuffer.length;
            }
            function approximately(a, b) {
                return Math.abs(a - b) < 0.0001;
            }
            verticesBuffer.sort((a, b) => {
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
            cp.bound.length = 0;
            for (const vertex of verticesBuffer) {
                const p = new Point(vertex.x, vertex.y);
                while (ConvesHull.points.length > 1 && ConvesHull.cross(ConvesHull.points[ConvesHull.points.length - 2], ConvesHull.points[ConvesHull.points.length - 1], p) <= 0) {
                    --ConvesHull.points.length;
                    --cp.bound.length;
                }
                ConvesHull.points.push(p);
                cp.bound.push(vertex);
            }
            const base = ConvesHull.points.length;
            for (let i = verticesBuffer.length - 2; i >= 0; --i) {
                const vertex = verticesBuffer[i];
                const p = new Point(vertex.x, vertex.y);
                while (ConvesHull.points.length > base && ConvesHull.cross(ConvesHull.points[ConvesHull.points.length - 2], ConvesHull.points[ConvesHull.points.length - 1], p) <= 0) {
                    --ConvesHull.points.length;
                    --cp.bound.length;
                }
                ConvesHull.points.push(p);
                cp.bound.push(vertex);
            }
            if (arrayLast(cp.bound).id == cp.bound[0].id) {
                ConvesHull.points.pop();
                cp.bound.pop();
            }
            for (const p of ConvesHull.points) {
                const realPoint = svg.createSVGPoint();
                realPoint.x = p.x;
                realPoint.y = p.y;
                polygon.points.appendItem(realPoint);
            }
            cp.polygon = polygon;
            return polygon.points.length;
        }
    }
    ConvesHull.points = [];
    ConvesHull.verticesBuffer = [];
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
            return this;
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
})(KCoreAlgorithm || (KCoreAlgorithm = {}));
