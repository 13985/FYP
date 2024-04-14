"use strict";
/**************************************************Flags************************************************************/
let graphHasUpdated = false;
var AlgorithmSelect;
(function (AlgorithmSelect) {
    let kCoreInput;
    let KCliqueInput;
    let previousCheckedInput;
    function main() {
        const nav = document.querySelector("nav.algorithm-select");
        kCoreInput = nav.querySelector("input#select-kcore");
        KCliqueInput = nav.querySelector("input#select-kclique");
        const KKInput = nav.querySelector("input#select-kclique-and-kcore");
        addInputEventListener(kCoreInput);
        addInputEventListener(KCliqueInput);
        addInputEventListener(KKInput);
    }
    AlgorithmSelect.main = main;
    function addInputEventListener(input) {
        if (input.checked) {
            MainApp.instance().tryChangeAlgo(input.value);
            previousCheckedInput = input;
        }
        input.addEventListener("input", () => {
            if (input.checked && MainApp.instance().tryChangeAlgo(input.value)) {
                previousCheckedInput = input;
            }
            else {
                input.checked = false;
                previousCheckedInput.checked = true;
            }
        });
    }
})(AlgorithmSelect || (AlgorithmSelect = {}));
function setThemeToggle() {
    const themeButton = document.getElementById("theme-button-set");
    const html = document.body.parentNode;
    themeButton.addEventListener("change", () => {
        if (themeButton.checked == true) {
            for (let i = 0; i < 5; ++i) {
                html.style.setProperty(`--main-color${i}`, `var(--dark-theme-color${i})`);
                html.style.setProperty(`--reverse-color${i}`, `var(--light-theme-color${i})`);
            }
        }
        else {
            for (let i = 0; i < 5; ++i) {
                html.style.setProperty(`--main-color${i}`, `var(--light-theme-color${i})`);
                html.style.setProperty(`--reverse-color${i}`, `var(--dark-theme-color${i})`);
            }
        }
    });
}
var VertexGradient;
(function (VertexGradient) {
    VertexGradient.start = new Color(255, 255, 0);
    VertexGradient.end = new Color(255, 0, 0);
})(VertexGradient || (VertexGradient = {}));
//class supports readonly so it is class
class MainApp {
    static create() {
        GraphWindow.main(); //must call before new MainApp(), since MainApp use GraphWindow
        MainApp._instance = new MainApp();
        AlgorithmSelect.main();
        return MainApp._instance;
    }
    static instance() {
        return MainApp._instance;
    }
    constructor() {
        /**************************************************Vertex expand****************************************************/
        this.vertexExpandContainer = document.getElementById("vertex-expand-li");
        this.vertexExpandInput = document.getElementById("vertex-expand-input");
        this.vertexSetColor = document.getElementById("vertex-set-color");
        this.vertexUpdateSelect = document.getElementById("vertex-update");
        this.vertexUpdateButton = document.getElementById("vertex-update-button");
        /****************************************************Graph expand**************************************************/
        this.fileInput = document.getElementById("graphupload");
        this.graphUploadButton = document.getElementById("graph-upload-button");
        this.graphStatusP = document.getElementById("graph-VE-status");
        /****************************************************edge expand *****************************************************/
        this.edgeExpandContainer = document.getElementById("edge-expand-li");
        this.edgeUpdateSelect = document.getElementById("edge-update");
        this.edgeexpandInput = document.getElementById("edge-expand-input");
        this.edgeUpdateButton = document.getElementById("edge-update-button");
        this.edgeEditMode = document.getElementById("edge-edit-mode");
        /****************************************************Algo expand **********************************************/
        const visualizationControl = new FloatingPanel("#video-control", document.getElementById("show-video-control"));
        const statePanel = new FloatingPanel("#state-panel", document.getElementById("show-algo-state"));
        VisualizationUtils.Algorithm.setVisualizationVideoControl(visualizationControl);
        VisualizationUtils.Algorithm.setVisualizationControl(document.getElementById("run-algo"), document.getElementById("stop-algo"));
        VisualizationUtils.Algorithm.setStateDisplayPanel(statePanel);
        this.animationExpand = document.querySelector("li.expand.animation");
        this.graph = new Graph();
        this.resultGraph = new Graph();
        this.gw = new GraphWindow(this.graph).setWH(30, 500);
        this.resultGW = new GraphWindow(this.resultGraph).setWH(450, 500);
        this.kCore = new KCoreAlgorithm.KCore(this.graph, this.gw.innerSVG, this.gw);
        this.resultKCore = new KCoreAlgorithm.KCore(this.resultGraph, this.resultGW.innerSVG, this.resultGW);
        this.minShellFilter = document.getElementById("from-shell-value");
        this.maxShellFilter = document.getElementById("to-shell-value");
        this.kCore.setSelects(this.minShellFilter, this.maxShellFilter);
        //gw.display(false);
        this.resultKCore.setVisualElementsColor(false);
        this.kClique = new KCliqueAlgorithm.KClique(this.graph, this.gw.innerSVG, this.gw);
        this.resultKClique = new KCliqueAlgorithm.KClique(this.resultGraph, this.resultGW.innerSVG, this.resultGW);
        /****************************************************Graph expand***************************************************/
        this.graphUploadButton.addEventListener("click", () => {
            if (this.fileInput.files == null || this.fileInput.files.length <= 0) {
                return;
            }
            else if (VisualizationUtils.Algorithm.isVisualizing()) {
                return;
            }
            const f = this.fileInput.files[0];
            f.text().then((value) => {
                this.loadGraph(value);
                this.fileInput.value = "";
            }, null).catch((reason) => {
                console.log(reason);
            });
        });
        /****************************************************Vertex expand**************************************************/
        this.vertexUpdateSelect.addEventListener("input", () => {
            this.vertexSetColor.style.display = this.vertexUpdateSelect.value == "color" ? "block" : "none";
        });
        if (this.vertexUpdateSelect.value != "color") {
            this.vertexSetColor.style.display = "none";
        }
        this.vertexExpandInput.addEventListener("change", () => {
            if (this.vertexExpandInput.value.length == 0) {
                return;
            }
            const theVertex = parseInt(this.vertexExpandInput.value);
            switch (this.vertexUpdateSelect.value) {
                case "color": {
                    const vl = this.graph.adjacencyList.get(theVertex);
                    if (vl == undefined) {
                        break;
                    }
                    this.vertexSetColor.value = vl.main.getColorHexa();
                    break;
                }
                case "create":
                case "remove":
                    break;
            }
        });
        this.vertexUpdateButton.addEventListener("click", () => {
            if (this.vertexExpandInput.value.length == 0) {
                return;
            }
            const theVertex = parseInt(this.vertexExpandInput.value);
            switch (this.vertexUpdateSelect.value) {
                case "create": {
                    graphHasUpdated = VisualizationUtils.Algorithm.addVertex(theVertex) || graphHasUpdated;
                    break;
                }
                case "remove": {
                    graphHasUpdated = VisualizationUtils.Algorithm.removeVertex(theVertex) || graphHasUpdated;
                    break;
                }
                case "color":
                    const vl = this.graph.adjacencyList.get(theVertex);
                    if (vl == undefined) {
                        break;
                    }
                    vl.main.setColorString(this.vertexSetColor.value);
                    this.resultGraph.adjacencyList.get(theVertex).main.setColorString(this.vertexSetColor.value);
                    break;
            }
        });
        /****************************************************edge expand *****************************************************/
        this.edgeEditMode.addEventListener("input", () => {
            this.resultGW.pressToAddEdge(this.edgeEditMode.checked);
            this.setEditAction();
        });
        this.edgeUpdateButton.addEventListener("click", () => {
            this.resultGW.doEdgeAction();
            /*
            if(this.edgeexpandInput.value.length==0){
                return;
            }
            const edgeFormat:RegExp=/(\d+\s?,\s?\d+\s?)/g;
            const edgesString:string[]=this.edgeexpandInput.value.split(edgeFormat);

            switch(this.edgeUpdateSelect.value){
            case "create":{
                for(const str of edgesString){
                    const numbers:string[]=str.split(/(\d+)/g);
                    const from:number=parseInt(numbers[0]);
                    const to:number=parseInt(numbers[0]);
                    graphHasUpdated=graphHasUpdated||VisualizationUtils.Algorithm.addEdge(from,to);
                }
                break;
            }
            case "remove":{
                for(const str of edgesString){
                    const numbers:string[]=str.split(/(\d+)/g);
                    const from:number=parseInt(numbers[0]);
                    const to:number=parseInt(numbers[0]);
                    graphHasUpdated=graphHasUpdated||VisualizationUtils.Algorithm.removeEdge(from,to);
                }
                break;
            }
            }
            */
        });
        this.edgeUpdateSelect.addEventListener("input", () => {
            this.vertexSetColor.style.display = this.vertexUpdateSelect.value == "color" ? "block" : "none";
            this.setEditAction();
        });
    }
    tryChangeAlgo(str) {
        if (VisualizationUtils.Algorithm.isVisualizing()) {
            return false;
        }
        this.resultKCore.displayPolygons(false);
        this.resultGraph.resetVisualElements();
        this.graph.resetVisualElements();
        const helper = (vt, rt) => {
            VisualizationUtils.Algorithm.changeAlgorithm(vt, rt);
            if (graphHasUpdated) {
                this.gw.resetContainerTransform().updateSimulation();
                this.resultGW.resetContainerTransform().updateSimulation();
                rt.createIndexStructure().setColorGradient(VertexGradient.start, VertexGradient.end).setVisualElementsColor(false);
                vt.setIndexStructure(rt).createState().setVisualElementsColor(true);
                graphHasUpdated = false;
            }
            else {
                rt.setVisualElementsColor(false);
                vt.setVisualElementsColor(true);
            }
        };
        this.animationExpand.removeAttribute("style");
        switch (str) {
            case "kcore": {
                this.showModificationExpands(true);
                this.animationExpand.removeAttribute("style");
                helper(this.kCore, this.resultKCore);
                this.resultKCore.displayPolygons(true); //note they may have the same index structure
                this.resultGW.setVertexMovingCallback(this.resultKCore.calculateBound.bind(this.resultKCore));
                this.gw.setVertexMovingCallback(this.kCore.calculateBound.bind(this.kCore));
                break;
            }
            case "kclique": {
                this.showModificationExpands(true);
                this.animationExpand.removeAttribute("style");
                helper(this.kClique, this.resultKClique);
                this.kCore.displayPolygons(false);
                this.resultGW.setVertexMovingCallback(undefined);
                this.gw.setVertexMovingCallback(undefined);
                break;
            }
            case "kclique-and-kcore": {
                this.showModificationExpands(false);
                this.animationExpand.setAttribute("style", "display:none;");
                if (graphHasUpdated) {
                    if (VisualizationUtils.Algorithm.VisualizationTarget() == this.kCore) {
                        this.resultKClique.createIndexStructure().setColorGradient(VertexGradient.start, VertexGradient.end);
                        this.kClique.setIndexStructure(this.resultKClique).createState();
                    }
                    else {
                        this.resultKCore.createIndexStructure().setColorGradient(VertexGradient.start, VertexGradient.end);
                        this.kCore.setIndexStructure(this.resultKCore).createState();
                    }
                    graphHasUpdated = false;
                }
                //the left graph window is associated with this.kCore/this.kClique
                //the right graph window is associated with this.resultkCore/this.resultKClique
                VisualizationUtils.Algorithm.changeAlgorithm(this.kCore, this.resultKClique);
                this.gw.setVertexMovingCallback(this.kCore.calculateBound.bind(this.kCore));
                this.resultGW.setVertexMovingCallback(undefined);
                this.kCore.setVisualElementsColor(false);
                this.resultKClique.setVisualElementsColor(false);
                break;
            }
            default: {
                console.log(`unknown value ${str}`);
                break;
            }
        }
        return true;
    }
    /****************************************************Graph expand**************************************************/
    setVENumber() {
        this.graphStatusP.innerHTML = `|V|: ${this.graph.vertices.length}<br>|E|: ${this.graph.edges.length}`;
    }
    loadGraph(edgeList) {
        this.graph.clear(true);
        this.graph.from(edgeList);
        this.gw.resetContainerTransform().updateSimulation();
        this.setVENumber();
        this.graph.copyTo(this.resultGraph.clear(true));
        this.resultGW.resetContainerTransform().updateSimulation();
        VisualizationUtils.Algorithm.loadUpdatedGraph();
        const rt = VisualizationUtils.Algorithm.ResultTarget();
        if (rt) {
            if (rt instanceof KCoreAlgorithm.KCore) {
                rt.displayPolygons(true);
            }
            else if (rt instanceof KCliqueAlgorithm.KClique) {
            }
        }
        graphHasUpdated = true;
    }
    setEditAction() {
        switch (this.edgeUpdateSelect.value) {
            case "create":
                this.resultGW.isCreateEdge = true;
                break;
            case "remove":
                this.resultGW.isCreateEdge = false;
                break;
        }
    }
    setVertexInput(v) {
        this.vertexExpandInput.value = v.id.toString();
        this.vertexSetColor.value = v.getColorHexa();
    }
    showModificationExpands(show) {
        if (show == false) {
            this.vertexExpandContainer.setAttribute("style", "display:none;");
            this.edgeExpandContainer.setAttribute("style", "display:none;");
            this.graphUploadButton.disabled = true;
        }
        else {
            this.vertexExpandContainer.removeAttribute("style");
            this.edgeExpandContainer.removeAttribute("style");
            this.graphUploadButton.disabled = false;
        }
    }
}
window.onload = () => {
    setThemeToggle();
    MainApp.create().loadGraph("0 1\r\n\
    1 2\r\n\
    1 14\r\n\
    1 15\r\n\
    2 2\r\n\
    3 3\r\n\
    4 3\r\n\
    5 5\r\n\
    6 4\r\n\
    6 7\r\n\
    7 19\r\n\
    8 5\r\n\
    8 3\r\n\
    9 4\r\n\
    9 3\r\n\
    9 13\r\n\
    9 6\r\n\
    9 10\r\n\
    9 12\r\n\
    10 3\r\n\
    11 11\r\n\
    11 12\r\n\
    11 10\r\n\
    12 12\r\n\
    13 15\r\n\
    13 3\r\n\
    13 9\r\n\
    13 4\r\n\
    14 14\r\n\
    15 15\r\n\
    16 16\r\n\
    17 17\r\n\
    18 18\r\n\
    19 19\r\n\
    20 8\r\n\
    21 7\r\n\
    21 22\r\n\
    22 21\r\n\
    23 23\r\n\
    24 24\r\n\
    ");
    MainApp.instance().loadGraph("0 1\r\n\
    0 2\r\n\
    0 3\r\n\
    0 4\r\n\
    1 3\r\n\
    1 2\r\n\
    1 4\r\n\
    3 1\r\n\
    3 4\r\n\
    2 3\r\n\
    ");
};
