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
var VisualizationUtils;
(function (VisualizationUtils) {
    //only one video control i believe....
    let VideoControl;
    (function (VideoControl) {
    })(VideoControl = VisualizationUtils.VideoControl || (VisualizationUtils.VideoControl = {}));
    //one panel for code description and pseudo code
    let DescriptionDisplay;
    (function (DescriptionDisplay) {
        class PseudoCode {
            constructor(code, step) {
                this.code = code;
                this.step = step;
            }
        }
        DescriptionDisplay.PseudoCode = PseudoCode;
        let codesUl;
        let pseudoCodes;
        function main(panel_) {
            DescriptionDisplay.panel = panel_;
            codesUl = DescriptionDisplay.panel.contentDiv.querySelector("ul.pseudo-codes");
            DescriptionDisplay.codeDescription = DescriptionDisplay.panel.contentDiv.querySelector("p.code.description");
            DescriptionDisplay.stepDescription = DescriptionDisplay.panel.contentDiv.querySelector("ul.steps.description");
        }
        DescriptionDisplay.main = main;
        function setLocalDescriptionNumber(num) {
            let diff = num - DescriptionDisplay.stepDescription.children.length;
            if (diff <= 0) {
                for (let i = 0; i < DescriptionDisplay.stepDescription.children.length; ++i) {
                    DescriptionDisplay.stepDescription.children[i].classList.toggle("hide", i >= num); //hide all li with index >= num
                }
            }
            else if (diff > 0) {
                for (let i = 0; i < DescriptionDisplay.stepDescription.children.length; ++i) {
                    DescriptionDisplay.stepDescription.children[i].classList.toggle("hide", false);
                }
                for (let i = DescriptionDisplay.stepDescription.children.length; i < num; ++i) {
                    DescriptionDisplay.stepDescription.insertAdjacentHTML("beforeend", '<li class="step"></li>');
                }
            }
            return DescriptionDisplay.stepDescription.children;
        }
        DescriptionDisplay.setLocalDescriptionNumber = setLocalDescriptionNumber;
        function reset() {
            for (const pc of pseudoCodes) {
                pc.li.classList.toggle("current-code", false);
            }
            DescriptionDisplay.stepDescription.innerText = "";
        }
        DescriptionDisplay.reset = reset;
        function clearPanel() {
            DescriptionDisplay.codeDescription.innerHTML = "";
            for (let i = 0; i < DescriptionDisplay.stepDescription.children.length; ++i) {
                DescriptionDisplay.stepDescription.children[i].classList.toggle("hidden", true); //hide all li with index >= num
            }
            codesUl.innerHTML = "";
            pseudoCodes = null;
        }
        DescriptionDisplay.clearPanel = clearPanel;
        function setCodes(theCodes) {
            pseudoCodes = theCodes;
            for (const code of theCodes) {
                const liStr = `
                <li class="pseudo-code">
                    <i class="step-number">${code.step != undefined ? code.step : ""}</i>
                    <code>${code.code}</code>
                </li>
                `;
                codesUl.insertAdjacentHTML("beforeend", liStr);
                code.li = codesUl.lastElementChild;
            }
        }
        DescriptionDisplay.setCodes = setCodes;
        function highlightCode(step) {
            for (const pc of pseudoCodes) {
                pc.li.classList.toggle("current-code", pc.step != undefined && pc.step == step);
            }
        }
        DescriptionDisplay.highlightCode = highlightCode;
    })(DescriptionDisplay = VisualizationUtils.DescriptionDisplay || (VisualizationUtils.DescriptionDisplay = {}));
    /**
     * @summary
     * note that visualizationTarget and resultTarget share the same index structure
     * if resultTarget is defined then it creates index structure and visualizationTarget uses it,
     * to prevent running the same algorithm three time:
     * resultTarget:1 (createIndexStructure()) + visualizationTarget:2 (createIndexStructure()+createState())
     * createIndexStructure maybe slower then createState
     *
     * since visualizationTarget must rerun the algorithm and use the information of preprocessed index structure
     * resultTarget will try to do the curd first then visualizationTarget uses it results
     */
    class Algorithm {
        static VisualizationTarget() {
            return Algorithm.visualizationTarget;
        }
        static ResultTarget() {
            return Algorithm.resultTarget;
        }
        static isVisualizing() {
            if (Algorithm.visualizationTarget) {
                return Algorithm.visualizationTarget.isAnimating;
            }
            else {
                return false;
            }
        }
        static setVisualizationVideoControl(videoControl) {
            VideoControl.videoControl = videoControl;
            VideoControl.prevStepButton = videoControl.contentDiv.querySelector("button.previousStep");
            VideoControl.nextStepButton = videoControl.contentDiv.querySelector("button.nextStep");
            VideoControl.pauseButton = videoControl.contentDiv.querySelector("button.pause");
            VideoControl.progressBar = videoControl.contentDiv.querySelector("input.progress-bar");
            VideoControl.speedControl = videoControl.contentDiv.querySelector("input.speed-control");
            VideoControl.speedControl.min = "0.05";
            VideoControl.speedControl.max = "5";
            VideoControl.speedControl.step = "0.001";
            VideoControl.currentStepSpan = videoControl.contentDiv.querySelector("span.current-step");
            VideoControl.maxStepSpan = videoControl.contentDiv.querySelector("span.max-step");
        }
        static setStateDisplayPanel(panel) {
            DescriptionDisplay.main(panel);
        }
        static setVisualizationControl(run, stop) {
            VideoControl.runButton = run;
            VideoControl.stopButton = stop;
            VideoControl.stopButton.disabled = true;
            VideoControl.runButton.disabled = false;
            VideoControl.runButton.addEventListener("click", () => {
                if (Algorithm.visualizationTarget) {
                    Algorithm.visualizationTarget.start();
                    if (Algorithm.visualizationTarget instanceof KCoreAlgorithm.KCore) {
                        /**
                         * @summary
                         * since start animation will hide all visual element color
                         * in case if kcore, since visualizationTarget and resultTarget share same index structure (which contains the polygon)
                         * starting animation will hide the polygon in another graph window of resultTarget, so setVisualElementsColor(false)
                         * needed to be called again
                         */
                        Algorithm.resultTarget.displayPolygons(true);
                    }
                    VideoControl.videoControl.open();
                    DescriptionDisplay.panel.open();
                }
            });
            VideoControl.stopButton.addEventListener("click", () => {
                if (Algorithm.visualizationTarget) {
                    Algorithm.visualizationTarget.videoControlStatus = 4 /* VideoControlStatus.stop */;
                }
            });
        }
        static changeAlgorithm(algo, other) {
            if (Algorithm.visualizationTarget) {
                VideoControl.pauseButton.removeEventListener("click", Algorithm.visualizationTarget.onPauseButtonPressed);
                VideoControl.nextStepButton.removeEventListener("click", Algorithm.visualizationTarget.onNextStepPressed);
                VideoControl.prevStepButton.removeEventListener("click", Algorithm.visualizationTarget.onPrevStepPressed);
                VideoControl.progressBar.removeEventListener("input", Algorithm.visualizationTarget.onProgressChanged);
                DescriptionDisplay.clearPanel();
                Algorithm.visualizationTarget.onUnregisterSelf();
            }
            if (Algorithm.resultTarget) {
                Algorithm.resultTarget.onUnregisterSelf();
            }
            Algorithm.visualizationTarget = algo;
            Algorithm.resultTarget = other;
            VideoControl.pauseButton.addEventListener("click", algo.onPauseButtonPressed);
            VideoControl.nextStepButton.addEventListener("click", algo.onNextStepPressed);
            VideoControl.prevStepButton.addEventListener("click", algo.onPrevStepPressed);
            VideoControl.progressBar.addEventListener("input", algo.onProgressChanged);
            Algorithm.visualizationTarget.onRegisterSelf();
        }
        static loadUpdatedGraph() {
            var _a, _b;
            if (Algorithm.resultTarget != undefined) {
                Algorithm.resultTarget.createIndexStructure().setColorGradient(VertexGradient.start, VertexGradient.end).setVisualElementsColor(false);
                (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.setIndexStructure(Algorithm.resultTarget).createState().setVisualElementsColor(true);
            }
            else {
                (_b = Algorithm.visualizationTarget) === null || _b === void 0 ? void 0 : _b.createIndexStructure().setColorGradient(VertexGradient.start, VertexGradient.end).createState().setVisualElementsColor(true);
            }
        }
        static createState() {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.createState();
        }
        static addVertex(v) {
            var _a, _b, _c;
            if (Algorithm.resultTarget != undefined) {
                if (Algorithm.resultTarget.addVertex(v)) {
                    Algorithm.onGraphChanged();
                    (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.graph.addVertex(v); //change the graph directly
                    (_b = Algorithm.visualizationTarget) === null || _b === void 0 ? void 0 : _b.graphWindow.updateSimulation();
                    (_c = Algorithm.visualizationTarget) === null || _c === void 0 ? void 0 : _c.createState();
                    return true;
                }
            }
            else if (Algorithm.visualizationTarget != undefined) {
                if (Algorithm.visualizationTarget.addVertex(v)) {
                    Algorithm.onGraphChanged();
                    Algorithm.visualizationTarget.createState();
                    return true;
                }
            }
            return false;
        }
        static removeVertex(v) {
            var _a, _b, _c;
            if (Algorithm.resultTarget != undefined) {
                if (Algorithm.resultTarget.removeVertex(v)) {
                    Algorithm.onGraphChanged();
                    (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.graph.removeVertex(v); //change the graph directly
                    (_b = Algorithm.visualizationTarget) === null || _b === void 0 ? void 0 : _b.graphWindow.updateSimulation();
                    (_c = Algorithm.visualizationTarget) === null || _c === void 0 ? void 0 : _c.createState();
                    return true;
                }
            }
            else if (Algorithm.visualizationTarget != undefined) {
                if (Algorithm.visualizationTarget.removeVertex(v)) {
                    Algorithm.onGraphChanged();
                    Algorithm.visualizationTarget.createState();
                    return true;
                }
            }
            return false;
        }
        static addEdge(from, to) {
            var _a, _b, _c;
            if (Algorithm.resultTarget != undefined) {
                if (Algorithm.resultTarget.addEdge(from, to)) {
                    Algorithm.onGraphChanged();
                    (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.graph.addEdge(from, to); //change the graph directly
                    (_b = Algorithm.visualizationTarget) === null || _b === void 0 ? void 0 : _b.graphWindow.updateSimulation();
                    (_c = Algorithm.visualizationTarget) === null || _c === void 0 ? void 0 : _c.createState();
                    return true;
                }
            }
            else if (Algorithm.visualizationTarget != undefined) {
                if (Algorithm.visualizationTarget.addEdge(from, to)) {
                    Algorithm.onGraphChanged();
                    Algorithm.visualizationTarget.createState();
                    return true;
                }
            }
            return false;
        }
        static removeEdge(from, to) {
            var _a, _b, _c;
            if (Algorithm.resultTarget != undefined) {
                if (Algorithm.resultTarget.removeEdge(from, to)) {
                    Algorithm.onGraphChanged();
                    (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.graph.removeEdge(from, to); //change the graph directly
                    (_b = Algorithm.visualizationTarget) === null || _b === void 0 ? void 0 : _b.graphWindow.updateSimulation();
                    (_c = Algorithm.visualizationTarget) === null || _c === void 0 ? void 0 : _c.createState();
                    return true;
                }
            }
            else if (Algorithm.visualizationTarget != undefined) {
                if (Algorithm.visualizationTarget.removeEdge(from, to)) {
                    Algorithm.onGraphChanged();
                    Algorithm.visualizationTarget.createState();
                    return true;
                }
            }
            return false;
        }
        static onGraphChanged() {
            MainApp.instance().setVENumber();
        }
        static setColorGradient(start, end) {
            var _a;
            if (Algorithm.resultTarget) {
                Algorithm.resultTarget.setColorGradient(start, end);
            }
            else {
                (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.setColorGradient(start, end);
            }
        }
        static setAllVerticesColor(defaultColor) {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.setVisualElementsColor(defaultColor);
        }
        constructor(g, svg, gw) {
            this.notColorful = true;
            this.videoControlStatus = 0 /* VideoControlStatus.noAction */; //if the user is fast enough he can cancel the "stop animation" action by replace it to be another action (pressing other button/input)
            this.isAnimating = false;
            this.isPause = false;
            this.currentStep = 0;
            this.onPrevStepPressed = () => {
                this.videoControlStatus = 2 /* VideoControlStatus.prevStep */;
            };
            this.onNextStepPressed = () => {
                this.videoControlStatus = 1 /* VideoControlStatus.nextStep */;
            };
            this.onPauseButtonPressed = () => {
                if (this.isPause) {
                    this.isPause = false;
                    VideoControl.pauseButton.innerText = ">";
                }
                else {
                    this.isPause = true;
                    VideoControl.pauseButton.innerText = "||";
                }
            };
            this.onProgressChanged = () => {
                this.currentStep = VideoControl.progressBar.valueAsNumber;
                this.videoControlStatus = 3 /* VideoControlStatus.randomStep */;
            };
            this.graph = g;
            this.svgContainer = svg;
            this.graphWindow = gw;
        }
        start(onEnd) {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.isAnimating) {
                    return;
                }
                this.isAnimating = true;
                this.isPause = false;
                this.videoControlStatus = 0 /* VideoControlStatus.noAction */;
                DescriptionDisplay.reset();
                VideoControl.stopButton.disabled = false;
                VideoControl.runButton.disabled = true;
                VideoControl.progressBar.valueAsNumber = 0;
                yield this.animate();
                this.isAnimating = false;
                this.isPause = false;
                this.videoControlStatus = 0 /* VideoControlStatus.noAction */;
                VideoControl.stopButton.disabled = true;
                VideoControl.runButton.disabled = false;
                if (onEnd) {
                    onEnd();
                }
            });
        }
        static setCurrentStep(step) {
            VideoControl.currentStepSpan.innerText = `${step}`;
        }
        /**
         * @brief clean up
         */
        onUnregisterSelf() {
            this.isAnimating = false;
            this.currentStep = 0;
            this.videoControlStatus = 4 /* VideoControlStatus.stop */;
            this.isPause = false;
        }
        /**
         * @summary used to set some visualization realted stuff eg description/pseudo code
         */
        onRegisterSelf() { }
        waitfor() {
            return __awaiter(this, void 0, void 0, function* () {
                for (let timePassed = 0; this.videoControlStatus == 0 /* VideoControlStatus.noAction */ && (this.isPause || timePassed < (VideoControl.speedControl.valueAsNumber) * 1000);) {
                    const before = Date.now();
                    yield new Promise((r) => { setTimeout(r, 5); });
                    const after = Date.now();
                    timePassed += (after - before);
                }
                const vcs = this.videoControlStatus;
                this.videoControlStatus = 0 /* VideoControlStatus.noAction */;
                return vcs;
            });
        }
        copyIndexStructure(other) { }
    }
    VisualizationUtils.Algorithm = Algorithm;
    class ObjectPool {
        constructor(iNew, poolCapacity = 128) {
            this.pool = [];
            this.iNew = iNew;
            for (let i = 0; i < poolCapacity; ++i) {
                this.pool.push(new iNew());
            }
        }
        get() {
            if (this.pool.length > 0) {
                return this.pool.pop();
            }
            else {
                return new this.iNew();
            }
        }
        release(t) {
            t.clear();
            this.pool.push(t);
        }
    }
    VisualizationUtils.ObjectPool = ObjectPool;
    class ConnectedComponent {
        constructor() {
            this.vertices = [];
        }
        removeVertex(v_id) {
            for (let i = 0; i < this.vertices.length; ++i) {
                if (this.vertices[i].id == v_id) {
                    this.vertices.splice(i, 1);
                    return;
                }
            }
        }
        clear() {
            this.vertices.length = 0;
        }
    }
    VisualizationUtils.ConnectedComponent = ConnectedComponent;
    class DescriptionState {
        constructor() {
            this.step = 0;
            this.stepDescription = "";
            this.codeStep = 0;
        }
    }
    VisualizationUtils.DescriptionState = DescriptionState;
    /**
     * @summary
     * query the display of stack
     * eg
     * [            ][                           ][                                ][              ] base   descripton...
     * [  ][][][    ][         ][       ][  ][   ][      ][       ][ ][      ][][  ][ ][   ][ ][   ]  |     descripton...
     * [][]    [][  ][     ][][][   ][  ][][][ ][][   ][ ][       ][] [   ][ ]   [ ] [] [  ][] [   ]  |     descripton...
     *           [][][][   ]    [][ ][][]    []   [] [] [][   ][  ]   [] []      []     [][]   [  ]   V     descripton...
     *                 [][ ]       []                     [  ]  []                              [ ]  top
     */
    class TreeNodeBase {
        constructor() {
            this.children = [];
            this.left = 0;
            this.right = 0;
        }
        set(le, ri, parent, state) {
            this.state = state;
            this.parent = parent;
            this.left = le;
            this.right = ri;
            return this;
        }
        getChild(step) {
            for (let le = 0, ri = this.children.length; le < ri;) {
                const mid = Math.floor((le + ri) / 2);
                const node = this.children[mid];
                const status = node.compareToBound(step);
                switch (status) {
                    case -1:
                        le = mid + 1;
                        break;
                    case 0:
                        return node;
                    case 1:
                        ri = mid;
                        break;
                }
            }
            return null;
        }
        /**
         * @return
         * [....le)[le,ri)[ri....)
         *     -1     0       1
         */
        compareToBound(step) {
            if (step < this.left) {
                return 1;
            }
            else if (step >= this.right) {
                return -1;
            }
            else {
                return 0;
            }
        }
        clear() { }
    }
    VisualizationUtils.TreeNodeBase = TreeNodeBase;
    /**
    * @summary
    * maintain a data structure as (5 vertex, step=20):
    * v id: info at step X
    * 0:1 3 5 9 10 15
    * 1:6 7 8 9 10 11 15 16 17 19
    * 2:0 1 2 3 7 9 15 16 18
    * 3:0 3 4 7 8 9
    * 4:0 8 16 17 18 19
    *
    * query state of vertex at target_step: lower bound search (search the state with step<=target_step)
    * eg
    * query states of vertex 1 at
    * step 10-->return state at step 9
    * step 3--->return state at step 3
    *
    * query all states at
    * step 15--->return
    * 0:15
    * 1:15
    * 2:15
    * 3:9
    * 4:8
    * step 19--->return
    * 0:15
    * 1:19
    * 2:18
    * 3:9
    * 4:19
    *
    * @complexity
    * same as time complexity of the target algorithm (since the step is linerally related to the time complexity)
    *
    * @note
    * doesnt support "global values" only support local value changes
    * each push must be followed by pop as stack, otherwise the right bound wont be updated correctly
    */
    class StateManager {
        getCurrentDataStates() {
            return this.dataStatesCurrent;
        }
        getCurrentLocalStates() {
            return this.localStatesCurrent;
        }
        constructor() {
            this.maxStep = 0;
            this.currentStep = 0;
            this.dataKeys = [];
            this.dataStates = new Map(); //for O(vertices.length * log(maxStep)) random step
            this.dataStatesIndices = []; //for O(vertices.length) prev step/next step
            this.dataStatesCurrent = [];
            this.localStatesCurrent = [];
            this.localStates = this.getTreeNode();
            this.localStatesIndex = this.localStates;
        }
        addAdditionalDataKets(len) {
            const base = this.dataKeys.length;
            this.dataKeys.length = base + len;
            this.dataStatesCurrent.length = base + len;
            this.dataStatesIndices.length = base + len;
        }
        init() {
            this.setDataKeys();
            this.dataStatesCurrent.length = this.dataKeys.length;
            this.dataStatesIndices.length = this.dataKeys.length;
            this.resetStep();
        }
        onInitEnd(step) {
            this.maxStep = step;
            this.localStates.right = step;
            this.localStatesIndex = this.localStates;
        }
        clear() {
            this.maxStep = 0;
            this.dataStates.clear();
            this.clearTreeChild(this.localStates);
            this.localStatesIndex = this.localStates;
        }
        clearTreeChild(root) {
            for (const node of root.children) {
                this.clearTreeChild(node);
                this.releaseTreeNode(node);
            }
            root.children.length = 0;
        }
        resetStep() {
            this.currentStep = 0;
            for (let i = 0; i < this.dataStatesIndices.length; ++i) {
                this.dataStatesIndices[i] = 0;
            }
            this.localStatesIndex = this.localStates;
            this.localStatesCurrent.length = 0;
            /*
            for(let v_idx:number=0;v_idx<this.graph.vertices.length;++v_idx){
                const stateInfos:DataState[]=this.vertexStates.get(this.graph.vertices[v_idx].id) as DataState[];
                this.returnbuffer[v_idx]=stateInfos[0];
            }
            */
        }
        /**
         * @returns order is same as graph.vertices
         * ie
         * vertex at idx 0<=>info at idx 0
         * vertex at idx 1<=>info at idx 1
         * vertex at idx 2<=>info at idx 2
         * ...
         */
        nextStep() {
            if (this.currentStep >= this.maxStep) {
                return null;
            }
            ++this.currentStep;
            for (let i = 0; i < this.dataKeys.length; ++i) {
                const dataKey = this.dataKeys[i];
                const idx = this.dataStatesIndices[i];
                const dataStates = this.dataStates.get(dataKey);
                const nextIdx = idx + 1;
                if (nextIdx < dataStates.length && dataStates[nextIdx].step <= this.currentStep) {
                    this.dataStatesIndices[i] = nextIdx;
                    this.dataStatesCurrent[i] = dataStates[nextIdx];
                }
                else {
                    this.dataStatesCurrent[i] = dataStates[idx];
                }
            }
            while (this.localStatesIndex.right <= this.currentStep) {
                this.localStatesCurrent.pop();
                if (this.localStatesIndex.parent) {
                    this.localStatesIndex = this.localStatesIndex.parent;
                }
                else {
                    break;
                }
            }
            while (true) {
                const child = this.localStatesIndex.getChild(this.currentStep);
                if (child == null) {
                    break;
                }
                this.localStatesCurrent.push(child.state);
                this.localStatesIndex = child;
            }
            return this.dataStatesCurrent;
        }
        previousStep() {
            if (this.currentStep <= 0) {
                return null;
            }
            --this.currentStep;
            for (let i = 0; i < this.dataKeys.length; ++i) {
                const dataKey = this.dataKeys[i];
                const idx = this.dataStatesIndices[i];
                const dataStates = this.dataStates.get(dataKey);
                const nextIdx = idx - 1;
                if (dataStates[idx].step > this.currentStep) {
                    this.dataStatesIndices[i] = nextIdx;
                    this.dataStatesCurrent[i] = dataStates[nextIdx];
                }
                else {
                    this.dataStatesCurrent[i] = dataStates[idx];
                }
            }
            while (this.localStatesIndex.left > this.currentStep) {
                this.localStatesCurrent.pop();
                if (this.localStatesIndex.parent) {
                    this.localStatesIndex = this.localStatesIndex.parent;
                }
                else {
                    break;
                }
            }
            while (true) {
                const child = this.localStatesIndex.getChild(this.currentStep);
                if (child == null) {
                    break;
                }
                this.localStatesCurrent.push(child.state);
                this.localStatesIndex = child;
            }
            return this.dataStatesCurrent;
        }
        randomStep(targetStep) {
            if (targetStep < 0 || targetStep >= this.maxStep) {
                return null;
            }
            this.currentStep = targetStep;
            for (let i = 0; i < this.dataKeys.length; ++i) {
                const dataKey = this.dataKeys[i];
                const stateInfos = this.dataStates.get(dataKey);
                this.dataStatesCurrent[i] = stateInfos[0];
                this.dataStatesIndices[i] = 0;
                for (let le = 0, ri = stateInfos.length; le < ri;) {
                    const mid = Math.floor((le + ri) / 2);
                    const theStep = stateInfos[mid].step;
                    if (theStep == this.currentStep) {
                        this.dataStatesCurrent[i] = stateInfos[mid];
                        this.dataStatesIndices[i] = mid;
                        break;
                    }
                    else if (theStep < this.currentStep) {
                        this.dataStatesCurrent[i] = stateInfos[mid];
                        this.dataStatesIndices[i] = mid;
                        le = mid + 1;
                    }
                    else {
                        ri = mid;
                    }
                }
            }
            {
                this.localStatesCurrent.length = 0;
                this.localStatesIndex = this.localStates;
                while (true) {
                    const child = this.localStatesIndex.getChild(targetStep);
                    if (child == null) {
                        break;
                    }
                    this.localStatesCurrent.push(child.state);
                    this.localStatesIndex = child;
                }
            }
            return this.dataStatesCurrent;
        }
        dataStatePush(dataKey, info) {
            this.dataStates.get(dataKey).push(info);
        }
        localStatePush(state) {
            const newNode = this.getTreeNode().set(state.step, state.step, this.localStatesIndex, state);
            this.localStatesIndex.children.push(newNode);
            this.localStatesIndex = newNode;
        }
        localStatePop(step) {
            this.localStatesIndex.right = step;
            this.localStatesIndex = this.localStatesIndex.parent;
        }
        localStateTop(state) {
            this.localStatePop(state.step);
            this.localStatePush(state);
        }
    }
    VisualizationUtils.StateManager = StateManager;
    class GraphStateManager extends StateManager {
        constructor(g) {
            super();
            this.graph = g;
        }
    }
    VisualizationUtils.GraphStateManager = GraphStateManager;
})(VisualizationUtils || (VisualizationUtils = {}));
class Color {
    constructor(r, g, b, a = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
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
    toHexa() {
        return `#${Color.toHexaHelper(this.r)}${Color.toHexaHelper(this.g)}${Color.toHexaHelper(this.b)}`;
    }
    static toHexaHelper(val) {
        let first = Math.floor(val).toString(16);
        if (first.length <= 1) {
            return `0${first}`;
        }
        else {
            return first;
        }
    }
    assignFrom(other) {
        this.r = other.r;
        this.g = other.g;
        this.b = other.b;
        this.a = other.a;
        return this;
    }
    clone() {
        return new Color(this.r, this.g, this.b, this.a);
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
function arrayLast(arr) {
    return arr[arr.length - 1];
}
function removeAsSwapBack(arr, idx) {
    arr[idx] = arr[arr.length - 1];
    arr.pop();
}
