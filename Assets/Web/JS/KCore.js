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
    class KCoreCC extends GraphAlgorithm.ConnectedComponent {
        constructor(shell = 1) {
            super();
            this.shell = -1;
            this.polygonOpacity = 0.4;
            this.polygon = null;
            this.shell = shell;
        }
    }
    KCoreCC.pool = new GraphAlgorithm.ObjectPool(KCoreCC);
    KCoreAlgorithm.KCoreCC=KCoreCC;
    class ShellComponet {
        constructor() {
            this.connectedComponents = [];
            this.shell = -1;
            this.color = new Color(0, 0, 0);
            this.step = 0;
        }
    }
    class ConnectedComponetInfo {
        constructor(s, i) {
            this.shell = 0;
            this.index = 0;
            this.shell = s;
            this.index = i;
        }
    }
    class VertexStateInfo {
        constructor(step, degree, shell, opacity) {
            this.degree = degree != undefined ? degree : 0;
            this.step = step != undefined ? step : 1;
            this.opacity = opacity != undefined ? opacity : KCore.OPACITY;
            this.shell = shell != undefined ? shell : -1;
        }
        isProcessed() {
            return this.shell >= 0;
        }
    }
    class DisplayStateInfo {
        constructor() {
            this.step = 0;
        }
    }
    /**
     * @complexity
     * space: O(V+E)
     */
    class State extends GraphAlgorithm.StateManager {
        constructor(graph) {
            super(graph);
            this.init();
        }
        init(graph) {
            super.init(graph);
            this.graph.adjacencyList.forEach((vl, v_id) => {
                const vsi = new VertexStateInfo();
                vsi.degree = vl.others.length;
                vsi.step = 0;
                this.vertexStates.set(v_id, [vsi]);
            });
        }
    }
    class KCore extends GraphAlgorithm.Algorithm {
        constructor(g, svg, polygonsContainer) {
            super(g, svg);
            this.shellComponents = [];
            /**************************helper data structures**********************/
            this.degrees = new Map();
            this.inSet1 = new Map();
            this.set0 = [];
            this.set1 = [];
            this.unionFind = new UnionFind();
            this.vertexToInfo = new Map();
            /**************************visualization control***********************/
            this.IsAnimationRunning = () => this.isAnimating;
            this.maxOption = null;
            this.minOption = null;
            this.polygonsContainer = polygonsContainer;
        }
        setGraph(g) {
            this.graph = g;
            this.preprocess();
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
        createState() {
            if (this.states) {
                this.states.init(this.graph);
            }
            else {
                this.states = new State(this.graph);
            }
            GraphAlgorithm.DescriptionDisplay.clearPanel();
            GraphAlgorithm.DescriptionDisplay.codeDescription.innerText = KCore.CODE_DESCRIPTION;
            GraphAlgorithm.DescriptionDisplay.setCodes(KCore.PSEUDO_CODES);
            this.clearHelpers();
            let currentShell = 0, nextShell = 1;
            let step = 0;
            this.states.addDescriptionState({ step: step, codeStep: 1, stepDescription: "initization" });
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
                ++step;
                this.shellComponents[currentShell].step = step;
                this.states.addDescriptionState({ step: step, codeStep: 2, stepDescription: `set1.length:${this.set1.length} current_core:${currentShell}` });
                while (this.set0.length > 0) {
                    const v_id = this.set0.pop();
                    const vl = this.graph.adjacencyList.get(v_id);
                    this.vertexToInfo.get(v_id).shell = currentShell;
                    ++step;
                    this.states.addDataState(v_id, new VertexStateInfo(step, undefined, currentShell, "1"));
                    this.states.addDescriptionState({ step: step, codeStep: 4, stepDescription: `process vertex ${v_id} in core ${currentShell}` });
                    for (const neighbor of vl.others) {
                        let degree = this.degrees.get(neighbor);
                        ++step;
                        this.states.addDescriptionState({ step: step, codeStep: 5, stepDescription: `check neighbor ${neighbor} of vertex ${v_id} in core ${currentShell}<br>processed:${degree < 0}` });
                        if (degree < 0) {
                            continue;
                        }
                        ++step;
                        this.states.addDataState(neighbor, new VertexStateInfo(step, degree, undefined, "1"));
                        --degree;
                        ++step;
                        this.states.addDataState(neighbor, new VertexStateInfo(step, degree, undefined, KCore.OPACITY));
                        this.states.addDescriptionState({ step: step, codeStep: 7, stepDescription: `decrement degree of ${neighbor} from ${degree + 1} to ${degree}<br>less than or equal to current_core (${currentShell})? ${degree <= currentShell}` });
                        if (degree <= currentShell) {
                            this.removeFromSet1(neighbor);
                        }
                        else {
                            nextShell = Math.min(nextShell, degree);
                            this.degrees.set(neighbor, degree);
                        }
                    }
                    ++step;
                    this.states.addDataState(v_id, new VertexStateInfo(step, undefined, currentShell, KCore.OPACITY));
                }
                currentShell = nextShell;
                if (this.set1.length <= 0) {
                    break;
                }
                ++step;
                this.states.addDescriptionState({ step: step, codeStep: 9, stepDescription: `increment current_core ${currentShell}` });
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
            this.states.onInitEnd(step);
            return this;
        }
        clearState() {
            var _a;
            (_a = this.states) === null || _a === void 0 ? void 0 : _a.clear();
            return this;
        }
        preprocess() {
            var _a;
            this.unionFind.set(this.graph.vertices.length);
            for (const sc of this.shellComponents) {
                for (const cc of sc.connectedComponents) {
                    (_a = cc.polygon) === null || _a === void 0 ? void 0 : _a.remove();
                }
            }
            for (const sc of this.shellComponents) {
                for (const cc of sc.connectedComponents) {
                    KCoreCC.pool.release(cc);
                }
            }
            this.shellComponents.length = 0;
            this.vertexToInfo.clear();
            this.clearHelpers();
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
                this.shellComponents.push(new ShellComponet());
                this.shellComponents[i].shell = i;
            }
            this.degrees.clear();
            this.unionFind.flatten();
            for (let node = 0; node < this.unionFind.parents.length; ++node) {
                if (node != this.unionFind.parents[node])
                    continue;
                const info = this.vertexToInfo.get(node);
                const sc = this.shellComponents[info.shell].connectedComponents;
                const cc = KCoreCC.pool.get();
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
            return this;
        }
        animate() {
            return __awaiter(this, void 0, void 0, function* () {
                GraphAlgorithm.VideoControl.progressBar.setAttribute("max", this.states.maxStep.toString());
                for (const v of this.graph.vertices) {
                    v.circle.setAttribute("opacity", KCore.OPACITY);
                }
                this.setVisualElementsColor(true);
                this.hideVerticesOutsideShells();
                if (this.states == undefined) {
                    return;
                }
                let vertexInfos;
                this.states.resetStep();
                const minShell = parseInt(this.minOption.value);
                const maxShell = parseInt(this.maxOption.value);
                const maxStep = maxShell >= this.shellComponents.length ? Number.MAX_SAFE_INTEGER : this.shellComponents[maxShell + 1].step;
                const minStep = this.shellComponents[maxShell].step;
                AnimtaionLoop: while (true) {
                    const vsc = yield this.waitfor();
                    switch (vsc) {
                        case 4 /* GraphAlgorithm.VideoControlStatus.stop */:
                            break AnimtaionLoop;
                        case 0 /* GraphAlgorithm.VideoControlStatus.noAction */:
                        case 1 /* GraphAlgorithm.VideoControlStatus.nextStep */:
                            if ((vertexInfos = this.states.nextStep()) == null) {
                                break AnimtaionLoop;
                            }
                            this.setAnimationDisplay(vertexInfos, this.states.currentDescriptionState());
                            break;
                        case 2 /* GraphAlgorithm.VideoControlStatus.prevStep */:
                            if ((vertexInfos = this.states.previousStep()) == null) {
                                this.currentStep = 0;
                                break;
                            }
                            this.setAnimationDisplay(vertexInfos, this.states.currentDescriptionState());
                            break;
                        case 3 /* GraphAlgorithm.VideoControlStatus.randomStep */:
                            if ((vertexInfos = this.states.randomStep(this.currentStep)) == null) {
                                vertexInfos = this.states.randomStep(0);
                                this.currentStep = 0;
                            }
                            this.setAnimationDisplay(vertexInfos, this.states.currentDescriptionState());
                            break;
                    }
                    GraphAlgorithm.VideoControl.progressBar.valueAsNumber = this.states.currentStep;
                }
                for (const v of this.graph.vertices) {
                    v.circle.setAttribute("opacity", "1");
                }
                ;
                this.displayVerticesInRange(0, this.shellComponents.length, true);
            });
        }
        removeFromSet1(target) {
            this.set0.push(target);
            this.degrees.set(target, KCore.PROCESSED);
            const last = this.set1[this.set1.length - 1];
            const idx = this.inSet1.get(target);
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
                return;
            }
            this.createOptions(0, this.shellComponents.length, this.minOption);
            this.createOptions(0, this.shellComponents.length, this.maxOption);
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
        setAnimationDisplay(vertexInfos, descriptionInfo) {
            var _a, _b, _c;
            if (vertexInfos == null) {
                return;
            }
            for (let i = 0; i < this.graph.vertices.length; ++i) {
                const vertex = this.graph.vertices[i];
                const info = vertexInfos[i];
                (_a = vertex.circle) === null || _a === void 0 ? void 0 : _a.setAttribute("opacity", info.opacity);
                if (info.isProcessed()) {
                    (_b = vertex.circle) === null || _b === void 0 ? void 0 : _b.setAttribute("fill", this.shellComponents[info.shell].color.toString());
                }
                else {
                    (_c = vertex.circle) === null || _c === void 0 ? void 0 : _c.setAttribute("fill", "var(--reverse-color2)");
                }
            }
            GraphAlgorithm.DescriptionDisplay.highlightCode(descriptionInfo.codeStep);
            GraphAlgorithm.DescriptionDisplay.stepDescription.innerHTML = descriptionInfo.stepDescription;
        }
        setVisualElementsColor(defaultColor) {
            var _a, _b;
            this.showDefaultColor = defaultColor;
            if (defaultColor) {
                for (const v of this.graph.vertices) {
                    v.circle.setAttribute("fill", "var(--reverse-color2)");
                }
                for (const sc of this.shellComponents) {
                    for (const cc of sc.connectedComponents) {
                        (_a = cc.polygon) === null || _a === void 0 ? void 0 : _a.setAttribute("visibility", "hidden");
                    }
                }
            }
            else {
                for (const sc of this.shellComponents) {
                    for (const cc of sc.connectedComponents) {
                        (_b = cc.polygon) === null || _b === void 0 ? void 0 : _b.setAttribute("fill", sc.color.toString());
                        for (const v of cc.vertices) {
                            v.setColor(sc.color);
                        }
                    }
                }
            }
            return this;
        }
        displayVerticesInRange(minShell, maxShell, visibile) {
            for (let i = minShell; i < maxShell; ++i) {
                const sc = this.shellComponents[i];
                for (const cc of sc.connectedComponents) {
                    for (const v of cc.vertices) {
                        this.graph.displayVertex(v.id, visibile);
                    }
                }
            }
            return this;
        }
        displayPartialResult(show) {
            const min = parseInt(this.minOption.value), max = parseInt(this.maxOption.value);
            if (show) {
                for (let shell = min; shell <= max; ++shell) {
                    const sc = this.shellComponents[shell];
                    for (const cc of sc.connectedComponents) {
                        for (const v of cc.vertices) {
                            v.setColor(sc.color);
                        }
                    }
                }
            }
            else {
                for (const v of this.graph.vertices) {
                    if (this.degrees.get(v.id) != KCore.PROCESSED) {
                        v.circle.setAttribute("fill", "var(--reverse-color2)");
                    }
                }
            }
            return this;
        }
        hideVerticesOutsideShells() {
            const min = parseInt(this.minOption.value), max = parseInt(this.maxOption.value);
            this.displayVerticesInRange(0, min, false); //then for the edge connected to outside shell, hide them
            this.displayVerticesInRange(min, max + 1, true); //set the edges visible first (some edge may connected to outside shell)
            this.displayVerticesInRange(max + 1, this.shellComponents.length, false);
        }
        displayPolygons(show) {
            const value = show ? "visible" : "hidden";
            for (const sc of this.shellComponents) {
                for (const cc of sc.connectedComponents) {
                    if (cc.vertices.length < 3) {
                        continue;
                    }
                    else {
                        this.setPolygon(cc, sc);
                        cc.polygon.setAttribute("visibility", value);
                    }
                }
            }
            return this;
        }
        refreshPolygons(vertex) {
            const info = this.vertexToInfo.get(vertex.id);
            const cc = this.shellComponents[info.shell].connectedComponents[info.index];
            ConvesHull.Solve(cc, this.svgContainer);
        }
        addEdge(a, b) {
            if (this.graph.addEdge(a, b) == false) {
                return this;
            }
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
            return this;
        }
        removeEdge(a, b) {
            if (this.graph.removeEdge(a, b) == false) {
                return this;
            }
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
            return this;
        }
        addVertex(a) {
            const v = this.graph.addVertex(a);
            if (v == null) {
                return;
            }
            const sc = this.shellComponents[0];
            const info = new ConnectedComponetInfo(0, sc.connectedComponents.length);
            const cc = KCoreCC.pool.get();
            sc.connectedComponents.push(cc);
            cc.shell = 0;
            this.setPolygon(cc, sc);
            cc.vertices.push(v);
            v.setColor(sc.color);
        }
        removeVertex(a) {
            if (this.graph.removeVertex(a) == null) {
                return;
            }
            const info = this.vertexToInfo.get(a);
            const cc = this.shellComponents[info.shell].connectedComponents[info.index];
            cc.removeVertex(a);
            this.KCore_ConnectedComponent(info);
            this.vertexToInfo.delete(a);
        }
        removeComponent(shellComponent, idx, setIndex = false) {
            var _a;
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
            (_a = ret.polygon) === null || _a === void 0 ? void 0 : _a.remove();
            return ret;
        }
        mergeComponent(shellComponent, idx0, idx1) {
            var _a;
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
            (_a = b.polygon) === null || _a === void 0 ? void 0 : _a.remove();
            KCoreCC.pool.release(b);
        }
        KCore_ConnectedComponent(theInfo) {
            var _a;
            const theCC = this.shellComponents[theInfo.shell].connectedComponents[theInfo.index];
            this.unionFind.set(this.graph.vertices.length);
            this.clearHelpers();
            let minDegree = Number.MAX_SAFE_INTEGER;
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
            if (currentShell >= this.shellComponents.length) {
                const sc = new ShellComponet();
                sc.shell = currentShell;
                this.shellComponents.push(sc);
                this.setColorGradient(this.shellComponents[0].color, this.shellComponents[this.shellComponents.length - 2].color);
                this.refreshSelect();
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
                const cc = KCoreCC.pool.get();
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
            for (const v of oldShell) { //construct the convex hull
                if (v != this.unionFind.parents[v])
                    continue;
                const info = this.vertexToInfo.get(v);
                const sc = this.shellComponents[info.shell];
                const cc = sc.connectedComponents[info.index];
                this.setPolygon(cc, sc);
                ConvesHull.Solve(cc, this.svgContainer);
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
                        KCoreCC.pool.release(otherCC);
                    }
                    this.setPolygon(minCC, sc);
                    ConvesHull.Solve(minCC, this.svgContainer);
                }
            }
            KCoreCC.pool.release(theCC);
            this.checkCCs();
        }
        setPolygon(cc, sc) {
            if (cc.vertices.length < 3) {
                return;
            }
            if (cc.polygon == undefined || cc.polygon == null) {
                cc.polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                ConvesHull.Solve(cc, this.svgContainer);
                this.polygonsContainer.insertAdjacentElement("afterbegin", cc.polygon);
            }
            cc.polygon.setAttribute("opacity", cc.polygonOpacity.toString());
            cc.polygon.setAttribute("fill", sc.color.toString());
            if (this.showDefaultColor) {
                cc.polygon.setAttribute("visibility", "hidden");
            }
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
        { code: "         if it is processed: continue;", step: 6 },
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
    KCoreAlgorithm.Point = Point;
    class ConvesHull {
        static cross(o, a, b) {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        }
        static Solve(cc, svg) {
            if (cc.vertices.length < 3) {
                return;
            }
            const polygon = cc.polygon;
            polygon.points.clear();
            if (cc.vertices.length < 4) {
                for (const vertex of cc.vertices) {
                    const p = svg.createSVGPoint();
                    p.x = vertex.x;
                    p.y = vertex.y;
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
                const realPoint = svg.createSVGPoint();
                realPoint.x = p.x;
                realPoint.y = p.y;
                polygon.points.appendItem(realPoint);
            }
        }
    }
    ConvesHull.points = [];
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
