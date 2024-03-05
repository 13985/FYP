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
    class Algorithm {
        static setVisualizationVideoControl(videoControl) {
            Algorithm.prevStepButton = videoControl.querySelector("button.previousStep");
            Algorithm.nextStepButton = videoControl.querySelector("button.pause");
            Algorithm.pauseButton = videoControl.querySelector("button.nextStep");
            Algorithm.progressBar = videoControl.querySelector("input.progress-bar");
            Algorithm.speedControl = videoControl.querySelector("input.speed-control");
            Algorithm.speedControl.min = "0.05";
            Algorithm.speedControl.max = "5";
            Algorithm.speedControl.step = "0.001";
        }
        static setVisualizationControl(run, stop) {
            Algorithm.runButton = run;
            Algorithm.stopButton = stop;
            Algorithm.stopButton.disabled = false;
            Algorithm.runButton.disabled = true;
            Algorithm.runButton.addEventListener("click", () => {
                if (Algorithm.visualizationTarget) {
                    Algorithm.visualizationTarget.start();
                }
            });
            Algorithm.stopButton.addEventListener("click", () => {
                if (Algorithm.visualizationTarget) {
                    Algorithm.visualizationTarget.stopAnimating = true;
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
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.setAllSVGsColor(defaultColor);
        }
        static setAllEdgesColor(defaultColor) {
            var _a;
            (_a = Algorithm.visualizationTarget) === null || _a === void 0 ? void 0 : _a.setAllEdgesColor(defaultColor);
        }
        constructor(g, svg) {
            this.waitTime = 0;
            this.showDefaultColor = true;
            this.videoControlStatus = 0 /* VideoControlStatus.noAction */;
            this.isAnimating = false;
            this.isPause = false;
            this.stopAnimating = false;
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
                    Algorithm.pauseButton.innerText = ">";
                }
                else {
                    this.isPause = true;
                    Algorithm.pauseButton.innerText = "||";
                }
            };
            this.onProgressChanged = () => {
                this.currentStep = Algorithm.progressBar.valueAsNumber;
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
                this.isPause = this.stopAnimating = false;
                this.videoControlStatus = 0 /* VideoControlStatus.noAction */;
                Algorithm.stopButton.disabled = true;
                Algorithm.runButton.disabled = false;
                this.beforeAnimate();
                yield this.animate();
                this.afterAnimate();
                this.isAnimating = true;
                this.isPause = this.stopAnimating = false;
                this.videoControlStatus = 0 /* VideoControlStatus.noAction */;
                Algorithm.statePanel.innerHTML = "";
                Algorithm.stopButton.disabled = false;
                Algorithm.runButton.disabled = true;
                if (onEnd) {
                    onEnd();
                }
            });
        }
        registerSelf() {
            Algorithm.pauseButton.addEventListener("click", this.onPauseButtonPressed);
            Algorithm.nextStepButton.addEventListener("click", this.onNextStepPressed);
            Algorithm.prevStepButton.addEventListener("click", this.onPrevStepPressed);
            Algorithm.progressBar.addEventListener("input", this.onProgressChanged);
        }
        unregisterSelf() {
            Algorithm.pauseButton.removeEventListener("click", this.onPauseButtonPressed);
            Algorithm.nextStepButton.removeEventListener("click", this.onNextStepPressed);
            Algorithm.prevStepButton.removeEventListener("click", this.onPrevStepPressed);
            Algorithm.progressBar.removeEventListener("input", this.onProgressChanged);
        }
        waitfor() {
            return __awaiter(this, void 0, void 0, function* () {
                for (let timePassed = 0; this.videoControlStatus == 0 /* VideoControlStatus.noAction */ && this.stopAnimating == false && (this.isPause || timePassed < (Algorithm.speedControl.valueAsNumber) * 1000);) {
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
        setAllSVGsColor(defaultColor) { }
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
    class StateManager {
        constructor(graph) {
            this.maxStep = 0;
            this.currentStep = 0;
            this.vertexStates = new Map(); //for O(vertices.length * log(maxStep)) random step
            this.displayStates = [];
            this.returnbuffer = [];
            this.indices = []; //for O(vertices.length) prev step/next step
            this.graph = graph;
        }
        init(graph) {
            if (graph != undefined) {
                this.graph = graph;
            }
            this.returnbuffer.length = this.graph.vertices.length;
            this.indices.length = this.graph.vertices.length;
            this.displayStates.length = 0;
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
            for (let i = 0; i < this.indices.length; ++i) {
                this.indices[i] = 0;
            }
            if (this.vertexStates.size <= 0) {
                return this.returnbuffer;
            }
            for (let v_idx = 0; v_idx < this.graph.vertices.length; ++v_idx) {
                const stateInfos = this.vertexStates.get(this.graph.vertices[v_idx].id);
                this.returnbuffer[v_idx] = stateInfos[0];
            }
            return this.returnbuffer;
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
                const idx = this.indices[v_idx];
                const stateInfos = this.vertexStates.get(this.graph.vertices[v_idx].id);
                const nextIdx = idx + 1;
                if (nextIdx < stateInfos.length && stateInfos[nextIdx].step <= this.currentStep) {
                    this.indices[v_idx] = nextIdx;
                    this.returnbuffer[v_idx] = stateInfos[nextIdx];
                }
                else {
                    this.returnbuffer[v_idx] = stateInfos[idx];
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
                const idx = this.indices[v_idx];
                const stateInfos = this.vertexStates.get(this.graph.vertices[v_idx].id);
                const nextIdx = idx - 1;
                if (stateInfos[idx].step > this.currentStep) {
                    this.indices[v_idx] = nextIdx;
                    this.returnbuffer[v_idx] = stateInfos[nextIdx];
                }
                else {
                    this.returnbuffer[v_idx] = stateInfos[idx];
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
                this.indices[v_idx] = 0;
                for (let le = 0, ri = stateInfos.length; le < ri;) {
                    const mid = (le + ri) / 2;
                    const theStep = stateInfos[mid].step;
                    if (theStep == this.currentStep) {
                        this.returnbuffer[v_idx] = stateInfos[mid];
                        this.indices[v_idx] = mid;
                        break;
                    }
                    else if (theStep < this.currentStep) {
                        this.returnbuffer[v_idx] = stateInfos[mid];
                        this.indices[v_idx] = mid;
                        le = mid + 1;
                    }
                    else {
                        ri = mid;
                    }
                }
            }
            return this.returnbuffer;
        }
        addState(vertexId, info) {
            this.vertexStates.get(vertexId).push(info);
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
