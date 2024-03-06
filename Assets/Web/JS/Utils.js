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
var GraphAlgorithm;
(function (GraphAlgorithm) {
    //only one video control i believe....
    let VideoControl;
    (function (VideoControl) {
    })(VideoControl = GraphAlgorithm.VideoControl || (GraphAlgorithm.VideoControl = {}));
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
            DescriptionDisplay.stepDescription = DescriptionDisplay.panel.contentDiv.querySelector("p.step.description");
        }
        DescriptionDisplay.main = main;
        function reset() {
            for (const pc of pseudoCodes) {
                pc.li.classList.toggle("current-code", false);
            }
            DescriptionDisplay.stepDescription.innerText = "";
        }
        DescriptionDisplay.reset = reset;
        function clearPanel() {
            DescriptionDisplay.codeDescription.innerHTML = "";
            DescriptionDisplay.stepDescription.innerHTML = "";
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
    })(DescriptionDisplay = GraphAlgorithm.DescriptionDisplay || (GraphAlgorithm.DescriptionDisplay = {}));
    class Algorithm {
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
        static changeAlgorithm(algo) {
            if (Algorithm.visualizationTarget) {
                Algorithm.visualizationTarget.unregisterSelf();
            }
            Algorithm.visualizationTarget = algo;
            Algorithm.visualizationTarget.registerSelf();
        }
        static start(onEnd) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.start(onEnd);
            });
        }
        static preprocess() {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.preprocess();
        }
        static createState() {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.createState();
        }
        static addVertex(a) {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.addVertex(a);
        }
        static removeVertex(a) {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.removeVertex(a);
        }
        static addEdge(from, to) {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.addEdge(from, to);
        }
        static removeEdge(from, to) {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.removeEdge(from, to);
        }
        static setAllVerticesColor(defaultColor) {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.setVisualElementsColor(defaultColor);
        }
        static setAllEdgesColor(defaultColor) {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.setAllEdgesColor(defaultColor);
        }
        constructor(g, svg) {
            this.showDefaultColor = true;
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
        registerSelf() {
            VideoControl.pauseButton.addEventListener("click", this.onPauseButtonPressed);
            VideoControl.nextStepButton.addEventListener("click", this.onNextStepPressed);
            VideoControl.prevStepButton.addEventListener("click", this.onPrevStepPressed);
            VideoControl.progressBar.addEventListener("input", this.onProgressChanged);
        }
        unregisterSelf() {
            VideoControl.pauseButton.removeEventListener("click", this.onPauseButtonPressed);
            VideoControl.nextStepButton.removeEventListener("click", this.onNextStepPressed);
            VideoControl.prevStepButton.removeEventListener("click", this.onPrevStepPressed);
            VideoControl.progressBar.removeEventListener("input", this.onProgressChanged);
            DescriptionDisplay.clearPanel();
        }
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
        addVertex(a) { }
        removeVertex(a) { }
        addEdge(from, to) { }
        removeEdge(from, to) { }
        setAllEdgesColor(defaultColor) { }
    }
    GraphAlgorithm.Algorithm = Algorithm;
    /**
     * @brief
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
     */
    class DescriptionStateInfo {
        constructor() {
            this.step = 0;
            this.stepDescription = "";
            this.codeStep = 0;
        }
    }
    GraphAlgorithm.DescriptionStateInfo = DescriptionStateInfo;
    class StateManager {
        constructor(graph) {
            this.maxStep = 0;
            this.currentStep = 0;
            this.vertexStates = new Map(); //for O(vertices.length * log(maxStep)) random step
            this.vertexStatesIndices = []; //for O(vertices.length) prev step/next step
            this.descriptionStates = [];
            this.descriptionStatesIndex = 0;
            this.returnbuffer = [];
            this.graph = graph;
        }
        init(graph) {
            if (graph != undefined) {
                this.graph = graph;
            }
            this.returnbuffer.length = this.graph.vertices.length;
            this.vertexStatesIndices.length = this.graph.vertices.length;
            this.descriptionStates.length = 0;
            this.resetStep();
        }
        onInitEnd(step) {
            this.maxStep = step;
        }
        clear() {
            this.maxStep = 0;
            this.vertexStates.clear();
        }
        resetStep() {
            this.currentStep = 0;
            for (let i = 0; i < this.vertexStatesIndices.length; ++i) {
                this.vertexStatesIndices[i] = 0;
            }
            this.descriptionStatesIndex = 0;
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
            for (let v_idx = 0; v_idx < this.graph.vertices.length; ++v_idx) {
                const idx = this.vertexStatesIndices[v_idx];
                const stateInfos = this.vertexStates.get(this.graph.vertices[v_idx].id);
                const nextIdx = idx + 1;
                if (nextIdx < stateInfos.length && stateInfos[nextIdx].step <= this.currentStep) {
                    this.vertexStatesIndices[v_idx] = nextIdx;
                    this.returnbuffer[v_idx] = stateInfos[nextIdx];
                }
                else {
                    this.returnbuffer[v_idx] = stateInfos[idx];
                }
            }
            {
                const nextIdx = this.descriptionStatesIndex + 1;
                if (nextIdx < this.descriptionStates.length && this.descriptionStates[nextIdx].step <= this.currentStep) {
                    this.descriptionStatesIndex = nextIdx;
                }
            }
            return this.returnbuffer;
        }
        previousStep() {
            if (this.currentStep <= 0) {
                return null;
            }
            --this.currentStep;
            for (let v_idx = 0; v_idx < this.graph.vertices.length; ++v_idx) {
                const idx = this.vertexStatesIndices[v_idx];
                const stateInfos = this.vertexStates.get(this.graph.vertices[v_idx].id);
                const nextIdx = idx - 1;
                if (stateInfos[idx].step > this.currentStep) {
                    this.vertexStatesIndices[v_idx] = nextIdx;
                    this.returnbuffer[v_idx] = stateInfos[nextIdx];
                }
                else {
                    this.returnbuffer[v_idx] = stateInfos[idx];
                }
            }
            {
                if (this.descriptionStates[this.descriptionStatesIndex].step > this.currentStep) {
                    --this.descriptionStatesIndex;
                }
            }
            return this.returnbuffer;
        }
        randomStep(targetStep) {
            if (targetStep < 0 || targetStep >= this.maxStep) {
                return null;
            }
            this.currentStep = targetStep;
            for (let v_idx = 0; v_idx < this.graph.vertices.length; ++v_idx) {
                const stateInfos = this.vertexStates.get(this.graph.vertices[v_idx].id);
                this.returnbuffer[v_idx] = stateInfos[0];
                this.vertexStatesIndices[v_idx] = 0;
                for (let le = 0, ri = stateInfos.length; le < ri;) {
                    const mid = Math.floor((le + ri) / 2);
                    const theStep = stateInfos[mid].step;
                    if (theStep == this.currentStep) {
                        this.returnbuffer[v_idx] = stateInfos[mid];
                        this.vertexStatesIndices[v_idx] = mid;
                        break;
                    }
                    else if (theStep < this.currentStep) {
                        this.returnbuffer[v_idx] = stateInfos[mid];
                        this.vertexStatesIndices[v_idx] = mid;
                        le = mid + 1;
                    }
                    else {
                        ri = mid;
                    }
                }
            }
            for (let le = 0, ri = this.descriptionStates.length; le < ri;) {
                const mid = Math.floor((le + ri) / 2);
                const theStep = this.descriptionStates[mid].step;
                if (theStep == this.currentStep) {
                    this.descriptionStatesIndex = mid;
                    break;
                }
                else if (theStep < this.currentStep) {
                    this.descriptionStatesIndex = mid;
                    le = mid + 1;
                }
                else {
                    ri = mid;
                }
            }
            return this.returnbuffer;
        }
        addDataState(vertexId, info) {
            this.vertexStates.get(vertexId).push(info);
        }
        addDescriptionState(info) {
            this.descriptionStates.push(info);
        }
        currentDescriptionState() {
            return this.descriptionStates[this.descriptionStatesIndex];
        }
    }
    GraphAlgorithm.StateManager = StateManager;
})(GraphAlgorithm || (GraphAlgorithm = {}));
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
