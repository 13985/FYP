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
        constructor(g, svg) {
            this.waitTime = 0;
            this.showDefaultColor = true;
            this.isAnimating = false;
            this.isPause = false;
            this.nextStep = false;
            this.stopAnimating = false;
            this.pauseButton = undefined;
            this.nextStepButton = undefined;
            this.stopButton = undefined;
            this.speedControl = undefined;
            this.graph = g;
            this.svgContainer = svg;
        }
        beforeAnimate() {
            this.isAnimating = true;
            this.isPause = this.nextStep = this.stopAnimating = false;
        }
        afterAnimate() {
            this.isAnimating = true;
            this.isPause = this.nextStep = this.stopAnimating = false;
        }
        setSpeedInput(speed) {
            this.speedControl = speed;
            this.speedControl.min = "0.05";
            this.speedControl.max = "5";
            this.speedControl.step = "0.001";
            return this;
        }
        setButtons(pause, nextStep) {
            this.pauseButton = pause;
            this.nextStepButton = nextStep;
            this.pauseButton.addEventListener("click", () => {
                if (this.isPause) {
                    this.isPause = false;
                    this.pauseButton.innerText = ">";
                    //displayPartialResult(false);
                }
                else {
                    this.isPause = true;
                    this.pauseButton.innerText = "||";
                }
            });
            this.nextStepButton.addEventListener("click", () => {
                this.nextStep = true;
            });
            return this;
        }
        waitfor() {
            return __awaiter(this, void 0, void 0, function* () {
                for (let timePassed = 0; this.nextStep == false && this.stopAnimating == false && (this.isPause || timePassed < (this.speedControl.valueAsNumber) * 1000);) {
                    const before = Date.now();
                    yield new Promise((r) => { setTimeout(r, 10); });
                    const after = Date.now();
                    timePassed += (after - before);
                }
                this.nextStep = false;
            });
        }
        addVertex(a) { }
        removeVertex(a) { }
        addEdge(from, to) { }
        removeEdge(from, to) { }
        setAllVerticesColor(defaultColor) { }
        setAllEdgesColor(defaultColor) { }
    }
    GraphAlgorithm.Algorithm = Algorithm;
})(GraphAlgorithm || (GraphAlgorithm = {}));
