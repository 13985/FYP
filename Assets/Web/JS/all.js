"use strict";
/**************************************************Flags************************************************************/
let graphHasUpdated = false;
var AlgorithmSelect;
(function (AlgorithmSelect) {
    let kCoreInput;
    let KCliqueInput;
    let previousCheckedInput;
    let callback;
    function main(callback_) {
        callback = callback_;
        const nav = document.querySelector("nav.algorithm-select");
        kCoreInput = nav.querySelector("input#kcore-select");
        KCliqueInput = nav.querySelector("input#kclique-select");
        addInputEventListener(kCoreInput);
        addInputEventListener(KCliqueInput);
    }
    AlgorithmSelect.main = main;
    function addInputEventListener(input) {
        if (input.checked) {
            callback(input.value);
            previousCheckedInput = input;
        }
        input.addEventListener("input", () => {
            if (input.checked && callback(input.value)) {
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
window.onload = () => {
    GraphWindow.main();
    /**************************************************Vertex expand****************************************************/
    const vertexExpandInput = document.getElementById("vertex-expand-input");
    const vertexSetColor = document.getElementById("vertex-set-color");
    const vertexUpdateSelect = document.getElementById("vertex-update");
    const vertexUpdateButton = document.getElementById("vertex-update-button");
    /****************************************************Graph expand**************************************************/
    const fileInput = document.getElementById("graphupload");
    const graphUploadButton = document.getElementById("graph-upload-button");
    const graphStatusP = document.getElementById("graph-VE-status");
    /****************************************************edge expand *****************************************************/
    const edgeUpdateSelect = document.getElementById("edge-update");
    const edgeexpandInput = document.getElementById("edge-expand-input");
    const edgeUpdateButton = document.getElementById("edge-update-button");
    const edgeEditMode = document.getElementById("edge-edit-mode");
    /****************************************************Algo expand **********************************************/
    {
        const visualizationControl = new FloatingPanel("#video-control", document.getElementById("show-video-control"));
        const statePanel = new FloatingPanel("#state-panel", document.getElementById("show-algo-state"));
        VisualizationUtils.Algorithm.setVisualizationVideoControl(visualizationControl);
        VisualizationUtils.Algorithm.setVisualizationControl(document.getElementById("run-algo"), document.getElementById("stop-algo"));
        VisualizationUtils.Algorithm.setStateDisplayPanel(statePanel);
    }
    const graph = new Graph();
    const resultGraph = new Graph();
    const gw = new GraphWindow(graph).setWH(30, 500);
    const resultGW = new GraphWindow(resultGraph).setWH(450, 500);
    const kCore = new KCoreAlgorithm.KCore(graph, gw.innerSVG, gw);
    const resultKCore = new KCoreAlgorithm.KCore(resultGraph, resultGW.innerSVG, resultGW);
    {
        const fromShell = document.getElementById("from-shell-value");
        const toShell = document.getElementById("to-shell-value");
        kCore.setSelects(fromShell, toShell);
    }
    const kClique = new KCliqueAlgorithm.KClique(graph, gw.innerSVG, gw);
    const resultKClique = new KCliqueAlgorithm.KClique(resultGraph, resultGW.innerSVG, resultGW);
    function tryChangeAlgo(str) {
        if (VisualizationUtils.Algorithm.isVisualizing()) {
            return false;
        }
        resultKCore.displayPolygons(false);
        resultGraph.resetVisualElements();
        graph.resetVisualElements();
        function helper(vt, rt) {
            VisualizationUtils.Algorithm.changeAlgorithm(vt, rt);
            if (graphHasUpdated) {
                gw.resetContainerTransform().updateSimulation();
                resultGW.resetContainerTransform().updateSimulation();
                rt.createIndexStructure().setColorGradient(VertexGradient.start, VertexGradient.end).setVisualElementsColor(false);
                vt.setIndexStructure(rt).createState().setVisualElementsColor(true);
                graphHasUpdated = false;
            }
            else {
                rt.setVisualElementsColor(false);
                vt.setVisualElementsColor(true);
            }
        }
        switch (str) {
            case "kcore": {
                helper(kCore, resultKCore);
                resultKCore.displayPolygons(true); //note they may have the same index structure
                resultGW.setVertexDragStartCallback(resultKCore.calculateBound.bind(resultKCore));
                break;
            }
            case "kclique": {
                helper(kClique, resultKClique);
                resultGW.setVertexDragStartCallback(undefined);
                break;
            }
            default: {
                console.log(`unknown value ${str}`);
                break;
            }
        }
        return true;
    }
    gw.setVertexDragStartCallback((v) => {
        vertexExpandInput.value = v.id.toString();
        vertexSetColor.value = v.getColorHexa();
    });
    //gw.display(false);
    resultKCore.showDefaultColor = false;
    AlgorithmSelect.main(tryChangeAlgo);
    setThemeToggle();
    //set the callback when add/remove vertex/edge successfully
    VisualizationUtils.Algorithm.onGraphChange = () => {
        setVENumber();
    };
    /****************************************************Graph expand**************************************************/
    graphUploadButton.addEventListener("click", () => {
        if (fileInput.files == null || fileInput.files.length <= 0) {
            return;
        }
        else if (VisualizationUtils.Algorithm.isVisualizing()) {
            return;
        }
        const f = fileInput.files[0];
        f.text().then((value) => {
            loadGraph(value);
            fileInput.value = "";
        }, null).catch((reason) => {
            console.log(reason);
        });
    });
    function setVENumber() {
        graphStatusP.innerHTML = `|V|: ${graph.vertices.length}<br>|E|: ${graph.edges.length}`;
    }
    function loadGraph(edgeList) {
        graph.clear(true);
        graph.from(edgeList);
        gw.resetContainerTransform().updateSimulation();
        setVENumber();
        graph.copyTo(resultGraph.clear(true));
        resultGW.resetContainerTransform().updateSimulation();
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
    /****************************************************Vertex expand**************************************************/
    vertexUpdateSelect.addEventListener("input", () => {
        vertexSetColor.style.display = vertexUpdateSelect.value == "color" ? "block" : "none";
    });
    vertexExpandInput.addEventListener("change", () => {
        if (vertexExpandInput.value.length == 0) {
            return;
        }
        const theVertex = parseInt(vertexExpandInput.value);
        switch (vertexUpdateSelect.value) {
            case "color": {
                const vl = graph.adjacencyList.get(theVertex);
                if (vl == undefined) {
                    break;
                }
                vertexSetColor.value = vl.main.getColorHexa();
                break;
            }
            case "create":
            case "remove":
                break;
        }
    });
    vertexUpdateButton.addEventListener("click", () => {
        if (vertexExpandInput.value.length == 0) {
            return;
        }
        const theVertex = parseInt(vertexExpandInput.value);
        switch (vertexUpdateSelect.value) {
            case "create": {
                graphHasUpdated = VisualizationUtils.Algorithm.addVertex(theVertex);
                break;
            }
            case "remove": {
                graphHasUpdated = VisualizationUtils.Algorithm.removeVertex(theVertex);
                break;
            }
            case "color":
                const vl = graph.adjacencyList.get(theVertex);
                if (vl == undefined) {
                    break;
                }
                vl.main.setColorString(vertexSetColor.value);
                break;
        }
    });
    /****************************************************edge expand *****************************************************/
    function setEditAction() {
        switch (edgeUpdateSelect.value) {
            case "create":
                resultGW.isCreateEdge = true;
                break;
            case "remove":
                resultGW.isCreateEdge = false;
                break;
        }
    }
    edgeUpdateSelect.addEventListener("input", () => {
        vertexSetColor.style.display = vertexUpdateSelect.value == "color" ? "block" : "none";
        setEditAction();
    });
    edgeEditMode.addEventListener("input", () => {
        resultGW.pressToAddEdge(edgeEditMode.checked);
        setEditAction();
    });
    edgeUpdateButton.addEventListener("click", () => {
        if (edgeexpandInput.value.length == 0) {
            return;
        }
        const edgeFormat = /(\d+\s?,\s?\d+\s?)/g;
        const edgesString = edgeexpandInput.value.split(edgeFormat);
        switch (edgeUpdateSelect.value) {
            case "create": {
                for (const str of edgesString) {
                    const numbers = str.split(/(\d+)/g);
                    const from = parseInt(numbers[0]);
                    const to = parseInt(numbers[0]);
                    graphHasUpdated = graphHasUpdated || VisualizationUtils.Algorithm.addEdge(from, to);
                }
                break;
            }
            case "remove": {
                for (const str of edgesString) {
                    const numbers = str.split(/(\d+)/g);
                    const from = parseInt(numbers[0]);
                    const to = parseInt(numbers[0]);
                    graphHasUpdated = graphHasUpdated || VisualizationUtils.Algorithm.removeEdge(from, to);
                }
                break;
            }
        }
    });
    /******************************************************after initialization************************************/
    loadGraph("0 1\r\n\
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
};
