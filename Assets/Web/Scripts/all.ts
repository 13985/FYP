
namespace AlgorithmSelect{
    let kCoreInput:HTMLInputElement;
    let KCliqueInput:HTMLInputElement;

    let callback:(str:string)=>void;

    export function main(callback_:(str:string)=>void):void{
        callback=callback_;

        const nav=document.querySelector("nav.algorithm-select") as HTMLElement;
        kCoreInput=nav.querySelector("input#kcore-select") as HTMLInputElement;
        KCliqueInput=nav.querySelector("input#kclique-select") as HTMLInputElement;

        addInputEventListener(kCoreInput);
        addInputEventListener(KCliqueInput);
    }

    function addInputEventListener(input:HTMLInputElement){
        if(input.checked){
            callback(input.value);
        }

        input.addEventListener("input",():void=>{
            if(input.checked){
                callback(input.value);
            }
        });
    }
}


function setThemeToggle():void{
    const themeButton:HTMLInputElement=<HTMLInputElement>document.getElementById("theme-button-set");
    const html:HTMLElement=<HTMLElement>document.body.parentNode;
    themeButton.addEventListener("change",():void=>{
        if(themeButton.checked==true){
            for(let i:number=0;i<5;++i){
                html.style.setProperty(`--main-color${i}`,`var(--dark-theme-color${i})`);
                html.style.setProperty(`--reverse-color${i}`,`var(--light-theme-color${i})`);
            }
        }else{
            for(let i:number=0;i<5;++i){
                html.style.setProperty(`--main-color${i}`,`var(--light-theme-color${i})`);
                html.style.setProperty(`--reverse-color${i}`,`var(--dark-theme-color${i})`);
            }
        }
    });
}


namespace VertexGradient{
    export const start:Color=new Color(255,255,0);
    export const end:Color=new Color(255,0,0);
}


window.onload=():void=>{
    
    /**************************************************Flags************************************************************/

    let graphHasUpdated:boolean=false;

    /**************************************************Vertex expand****************************************************/
    const vertexExpandInput:HTMLInputElement=<HTMLInputElement>document.getElementById("vertex-expand-input");
    const vertexSetColor:HTMLInputElement=<HTMLInputElement>document.getElementById("vertex-set-color");
    const vertexUpdateSelect:HTMLSelectElement=<HTMLSelectElement>document.getElementById("vertex-update");
    const vertexUpdateButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("vertex-update-button");
    
    /****************************************************Graph expand**************************************************/
    const fileInput:HTMLInputElement=<HTMLInputElement>document.getElementById("graphupload");
    const graphUploadButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("graph-upload-button");
    const graphStatusP:HTMLParagraphElement=<HTMLParagraphElement>document.getElementById("graph-VE-status");
    
    /****************************************************edge expand *****************************************************/
    const edgeUpdateSelect:HTMLSelectElement=<HTMLSelectElement>document.getElementById("edge-update");
    const edgeexpandInput:HTMLInputElement=<HTMLInputElement>document.getElementById("edge-expand-input");
    const edgeUpdateButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("edge-update-button");
    const edgeEditMode:HTMLInputElement=<HTMLInputElement>document.getElementById("edge-edit-mode");

    /****************************************************Algo expand **********************************************/
    {
        const visualizationControl:FloatingPanel=new FloatingPanel("#video-control",<HTMLInputElement>document.getElementById("show-video-control"));
        const statePanel:FloatingPanel=new FloatingPanel("#state-panel",<HTMLInputElement>document.getElementById("show-algo-state"));
        //const runButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("run-algo"),stopButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("stop-algo");
        VisualizationUtils.Algorithm.setVisualizationVideoControl(visualizationControl);
        VisualizationUtils.Algorithm.setVisualizationControl(<HTMLButtonElement>document.getElementById("run-algo"),<HTMLButtonElement>document.getElementById("stop-algo"));
        VisualizationUtils.Algorithm.setStateDisplayPanel(statePanel);
    }
    
    const graph:Graph=new Graph();
    const resultGraph:Graph=new Graph();
    
    const gw:GraphWindow=new GraphWindow(graph).setWH(350,350);
    const resultGW:GraphWindow=new GraphWindow(resultGraph).setWH(350,350);
    
    const kCore:KCoreAlgorithm.KCore=new KCoreAlgorithm.KCore(graph,gw.innerSVG as SVGSVGElement,gw.allG);
    const resultKCore:KCoreAlgorithm.KCore=new KCoreAlgorithm.KCore(resultGraph,resultGW.innerSVG as SVGSVGElement,resultGW.allG);
    {
        const fromShell:HTMLSelectElement=<HTMLSelectElement>document.getElementById("from-shell-value");
        const toShell:HTMLSelectElement=<HTMLSelectElement>document.getElementById("to-shell-value");
        kCore.setSelects(fromShell,toShell);
    }

    const kClique:KCliqueAlgorithm.KClique=new KCliqueAlgorithm.KClique(graph,gw.innerSVG as SVGSVGElement);
    const resultKClique:KCliqueAlgorithm.KClique=new KCliqueAlgorithm.KClique(graph,gw.innerSVG as SVGSVGElement);

    function changeAlgo(str:string):void{
        if(VisualizationUtils.Algorithm.isVisualizing()){
            return;
        }

        function helper(vt:VisualizationUtils.Algorithm,rt:VisualizationUtils.Algorithm):void{
            VisualizationUtils.Algorithm.changeAlgorithm(vt,rt);
            gw.resetContainerTransform().updateSimulation();
            resultGW.resetContainerTransform().updateSimulation();

            if(graphHasUpdated){
                vt.setColorGradient(VertexGradient.start,VertexGradient.end).setVisualElementsColor(true).createState();
                rt.createIndexStructure().setColorGradient(VertexGradient.start,VertexGradient.end).setVisualElementsColor(false);
            }
            graphHasUpdated=false;
        }

        switch(str){
        case "kcore":{
            helper(kCore,resultKCore);
            kCore.displayPolygons(false);
            resultKCore.displayPolygons(true);
            resultGW.setVertexDragStartCallback(resultKCore.refreshPolygons.bind(resultKCore));
            break;
        }
        case "kclique":{
            helper(kClique,resultKClique);
            break;
        }
        default:{
            console.log(`unknown value ${str}`);
            break;
        }
        }
    }

    gw.setVertexDragStartCallback((v:Vertex):void=>{
        vertexExpandInput.value=v.id.toString();
        vertexSetColor.value=v.getColorHexa();
    });
    gw.display(false);
    resultKCore.showDefaultColor=false;

    GraphWindow.main();
    AlgorithmSelect.main(changeAlgo);
    setThemeToggle();

    /****************************************************Graph expand**************************************************/

    graphUploadButton.addEventListener("click",():void=>{
        if(fileInput.files==null||fileInput.files.length<=0){
            return;
        }
        const f:File=fileInput.files[0];
        (f as Blob).text().then((value:string):void=>{
            loadGraph(value);
            fileInput.value="";
        },null).catch((reason:any):void=>{
            console.log(reason);
        });
    });
    
    
    function setVENumber():void{
        graphStatusP.innerHTML=`|V|: ${graph.vertices.length}<br>|E|: ${graph.edges.length}`;
    }


    function loadGraph(edgeList:string):void{
        graph.clear(true);
        graph.from(edgeList);
        gw.resetContainerTransform().updateSimulation();
        setVENumber();
        VisualizationUtils.Algorithm.VisualizationTarget().setColorGradient(VertexGradient.start,VertexGradient.end).setVisualElementsColor(true).createState();

        graph.copyTo(resultGraph.clear(true));
        resultGW.resetContainerTransform().updateSimulation();
        const algo:VisualizationUtils.Algorithm|undefined=VisualizationUtils.Algorithm.ResultTarget();
        if(algo){
            algo.createIndexStructure().setColorGradient(VertexGradient.start,VertexGradient.end).setVisualElementsColor(false);
            if(algo instanceof KCoreAlgorithm.KCore){
                algo.displayPolygons(true);
            }else if(algo instanceof KCliqueAlgorithm.KClique){

            }
        }
        graphHasUpdated=true;
    }

    /****************************************************Vertex expand**************************************************/

    vertexUpdateSelect.addEventListener("input",()=>{
        vertexSetColor.style.display=vertexUpdateSelect.value=="color"?"block":"none";
    });


    vertexExpandInput.addEventListener("change",()=>{
        if(vertexExpandInput.value.length==0){
            return;
        }
        const theVertex:number=parseInt(vertexExpandInput.value);
        switch(vertexUpdateSelect.value){
            case "color":{
            const vl:VerticeList|undefined=graph.adjacencyList.get(theVertex);
            if(vl==undefined){
                break;
            }
            vertexSetColor.value=vl.main.getColorHexa();
            break;
        }
        case "create":
        case "remove":
            break;
        }
    });


    vertexUpdateButton.addEventListener("click",()=>{
        if(vertexExpandInput.value.length==0){
            return;
        }
        const theVertex:number=parseInt(vertexExpandInput.value);
        switch(vertexUpdateSelect.value){
        case "create":{
            VisualizationUtils.Algorithm.addVertex(theVertex);
            gw.updateSimulation();
            resultGW.updateSimulation();
            setVENumber();
            break;
        }
        case "remove":{
            VisualizationUtils.Algorithm.removeVertex(theVertex);
            gw.updateSimulation();
            resultGW.updateSimulation();
            setVENumber();
            break;
        }
        case "color":
            const vl:VerticeList|undefined=graph.adjacencyList.get(theVertex);
            if(vl==undefined){
                break;
            }
            vl.main.setColorString(vertexSetColor.value);
            break;
        }
    });

    /****************************************************edge expand *****************************************************/

    function setEditAction():void{
        switch(edgeUpdateSelect.value){
        case "create":
            resultGW.isCreateEdge=true;
            break;
        case "remove":
            resultGW.isCreateEdge=false;
            break;
        }
    }

    edgeUpdateSelect.addEventListener("input",()=>{
        vertexSetColor.style.display=vertexUpdateSelect.value=="color"?"block":"none";
        setEditAction();
    });
    

    edgeEditMode.addEventListener("input",():void=>{
        resultGW.pressToAddEdge(edgeEditMode.checked);
        setEditAction();
    });


    edgeUpdateButton.addEventListener("click",()=>{
        if(edgeexpandInput.value.length==0){
            return;
        }
        const edgeFormat:RegExp=/(\d+\s?,\s?\d+\s?)/g;
        const edgesString:string[]=edgeexpandInput.value.split(edgeFormat);

        switch(edgeUpdateSelect.value){
        case "create":{
            for(const str of edgesString){
                const numbers:string[]=str.split(/(\d+)/g);
                const from:number=parseInt(numbers[0]);
                const to:number=parseInt(numbers[0]);
                VisualizationUtils.Algorithm.addEdge(from,to);
            }
            resultGW.updateSimulation();
            gw.updateSimulation();
            break;
        }
        case "remove":{
            for(const str of edgesString){
                const numbers:string[]=str.split(/(\d+)/g);
                const from:number=parseInt(numbers[0]);
                const to:number=parseInt(numbers[0]);
                VisualizationUtils.Algorithm.removeEdge(from,to);
            }
            resultGW.updateSimulation();
            gw.updateSimulation();
            break;
        }
        }
    });

    /****************************************************Camera expand****************************************************/
    /*
    const zoomSlider:HTMLInputElement=<HTMLInputElement>document.getElementById("zoom-slider");
    const zoomNumberInput:HTMLInputElement=<HTMLInputElement>document.getElementById("zoom-typing");
    const zoomMin:number=0,zoomMax:number=5;

    function setZoomBound():void{
        const min:string=zoomMin.toString();
        const max:string=zoomMax.toString();
        zoomSlider.setAttribute("min",min);
        zoomSlider.setAttribute("max",max);
        zoomNumberInput.setAttribute("min",min);
        zoomNumberInput.setAttribute("max",max);
    }
    setZoomBound();

    zoomSlider.addEventListener('input',():void=>{
        zoomNumberInput.value=zoomSlider.value;
        gw.scaleGraph(zoomNumberInput.valueAsNumber);
    });

    zoomNumberInput.addEventListener('input',():void=>{
        zoomSlider.value=zoomNumberInput.value;
        gw.scaleGraph(zoomNumberInput.valueAsNumber);
    });

    var previousMagnifier:number=1;
    zoomNumberInput.valueAsNumber=previousMagnifier;
    zoomSlider.valueAsNumber=previousMagnifier;


    const moveCameraButton:HTMLInputElement=<HTMLInputElement>document.getElementById("camera-move-set");
    var moveCameraAllowed:boolean=false;
    moveCameraButton.addEventListener("change",():void=>{
        moveCameraAllowed=!moveCameraAllowed;
        gw.allowMoveGraph(moveCameraAllowed);
    });

    const moveSpeedControl:HTMLInputElement=document.getElementById("move-speed-control") as HTMLInputElement;
    moveSpeedControl.max=(20).toString();
    moveSpeedControl.min=(0.1).toString();
    moveSpeedControl.valueAsNumber=2;
    gw.moveSpeed=2;
    moveSpeedControl.addEventListener("input",():void=>{
        gw.moveSpeed=moveSpeedControl.valueAsNumber;
    });

    const teleportButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("camera-teleport-button");
    const teleportVertexInput:HTMLInputElement=<HTMLInputElement>document.getElementById("camera-teleport-input");

    teleportButton.addEventListener("click",()=>{
        if(teleportVertexInput.value.length==0){
            return;
        }
        const val:number=parseInt(teleportVertexInput.value);
        const vl:VerticeList|undefined=graph.adjacencyList.get(val);
        if(vl==undefined){
            return;
        }
        gw.setCenter(vl.main.x as number,vl.main.y as number);
    });
    */
    /****************************************************Algo expand **********************************************/


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
}