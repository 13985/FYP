
window.onload=():void=>{
    GraphWindow.main();

    const themeButton:HTMLInputElement=<HTMLInputElement>document.getElementById("theme-button-set");
    const html:HTMLElement=<HTMLElement>document.body.parentNode;
    
    const graph:Graph=new Graph();
    const resultGraph:Graph=new Graph();

    /***********************************************window 1******************************/
    const gw:GraphWindow=new GraphWindow(graph).setWH(550,600);
    const resultGW:GraphWindow=new GraphWindow(resultGraph).setWH(550,600);
    //gw.display(false);

    const kCore:KCoreAlgorithm.KCore=new KCoreAlgorithm.KCore(graph,gw.innerSVG as SVGSVGElement,gw.allG);
    const resultKCore:KCoreAlgorithm.KCore=new KCoreAlgorithm.KCore(resultGraph,resultGW.innerSVG as SVGSVGElement,resultGW.allG);
    resultGW.setVertexDragStartCallback(resultKCore.refreshPolygons.bind(resultKCore)).algo=resultKCore;
    resultKCore.showDefaultColor=false;

    const scrollbarDarkCSS:string="\
        html::-webkit-scrollbar-button{\
            background-color:var(--background-dark);\
            border-color:var(--background-light);\
        }\
        html::-webkit-scrollbar{\
            background-color: var(--background-light);\
        }\
        html::-webkit-scrollbar-thumb{\
            background-color:var(--background-dark);\
            border-color:var(--background-light);\
        }\
        html::-webkit-scrollbar-thumb:active{\
            background-color: rgb(80, 80, 80);\
        }\
    ";
    const scrollBarDarkSytle:HTMLStyleElement=document.createElement("style") as HTMLStyleElement;
    scrollBarDarkSytle.innerText=scrollbarDarkCSS;

    /**************************************************Vertex pop up****************************************************/
    const vertexPopupInput:HTMLInputElement=<HTMLInputElement>document.getElementById("vertex-popup-input");
    const vertexSetColor:HTMLInputElement=<HTMLInputElement>document.getElementById("vertex-set-color");

    /****************************************************Algo popup **********************************************/
    const fromShell:HTMLSelectElement=<HTMLSelectElement>document.getElementById("from-shell-value");
    const toShell:HTMLSelectElement=<HTMLSelectElement>document.getElementById("to-shell-value");

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

    
    /****************************************************Graph pop up**************************************************/
    const fileInput:HTMLInputElement=<HTMLInputElement>document.getElementById("graphupload");
    const graphUploadButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("graph-upload-button");
    const graphStatusP:HTMLParagraphElement=<HTMLParagraphElement>document.getElementById("graph-VE-status");

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


    gw.setVertexDragStartCallback((v:Vertex):void=>{
        vertexPopupInput.value=v.id.toString();
        vertexSetColor.value=v.getColorHexa();
    });

    function loadGraph(edgeList:string):void{
        graph.clear(true);
        graph.from(edgeList);
        gw.resetContainerTransform().updateSimulation();
        const start:Color=new Color(255,255,0);
        const end:Color=new Color(255,0,0);
        setVENumber();
        kCore.preprocess().setColor(start,end).setSelects(fromShell,toShell).setAllSVGsColor(true);

        graph.copyTo(resultGraph.clear(true));
        resultGW.resetContainerTransform().updateSimulation();
        resultKCore.preprocess().setColor(start,end).setAllSVGsColor(false).displayPolygons(true);
    }


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

    /****************************************************Vertex pop up**************************************************/
    const vertexUpdateSelect:HTMLSelectElement=<HTMLSelectElement>document.getElementById("vertex-update");
    const vertexUpdateButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("vertex-update-button");

    vertexSetColor.style.display=vertexUpdateSelect.value=="color"?"block":"none";
    vertexUpdateSelect.addEventListener("input",()=>{
        vertexSetColor.style.display=vertexUpdateSelect.value=="color"?"block":"none";
    });


    vertexPopupInput.addEventListener("change",()=>{
        if(vertexPopupInput.value.length==0){
            return;
        }
        const theVertex:number=parseInt(vertexPopupInput.value);
        switch(vertexUpdateSelect.value){
            case "color":{
            const vl:VerticeList|undefined=graph.adjacencyList.get(theVertex);
            if(vl==undefined){
                break;
            }
            vertexSetColor.value=vl.main.getColorHexa();
            break;
        }
        case "create":{
            resultKCore.addVertex(theVertex);
            resultGW.updateSimulation();
            break;
        }
        case "remove":{
            resultKCore.removeVertex(theVertex);
            resultGW.updateSimulation();
            break;
        }
        }
    });


    vertexUpdateButton.addEventListener("click",()=>{
        if(vertexPopupInput.value.length==0){
            return;
        }
        const theVertex:number=parseInt(vertexPopupInput.value);
        switch(vertexUpdateSelect.value){
        case "create":{
            const v:Vertex|null=graph.addVertex(theVertex);
            if(v==null){
                break;
            }
            v.setColor(kCore.shellComponents[0].color);
            gw.updateSimulation();
            setVENumber();
            break;
        }
        case "remove":{
            if(graph.removeVertex(theVertex)==null){
                break;
            }
            gw.updateSimulation();
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


    /****************************************************edge popup *****************************************************/
    const edgeUpdateSelect:HTMLSelectElement=<HTMLSelectElement>document.getElementById("edge-update");
    const edgePopupInput:HTMLInputElement=<HTMLInputElement>document.getElementById("edge-popup-input");
    const edgeUpdateButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("edge-update-button");
    const edgeEditMode:HTMLInputElement=<HTMLInputElement>document.getElementById("edge-edit-mode");

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
        if(edgePopupInput.value.length==0){
            return;
        }
        const edgeFormat:RegExp=/(\d+\s?,\s?\d+\s?)/g;
        const edgesString:string[]=edgePopupInput.value.split(edgeFormat);

        switch(edgeUpdateSelect.value){
        case "create":{
            for(const str of edgesString){
                const numbers:string[]=str.split(/(\d+)/g);
                const from:number=parseInt(numbers[0]);
                const to:number=parseInt(numbers[0]);
                resultKCore.addEdge(from,to);
                resultGW.updateSimulation();
            }
            break;
        }
        case "remove":{
            for(const str of edgesString){
                const numbers:string[]=str.split(/(\d+)/g);
                const from:number=parseInt(numbers[0]);
                const to:number=parseInt(numbers[0]);
                kCore.removeEdge(from,to);
                resultGW.updateSimulation();
            }
            break;
        }
        }
    });


    
    /****************************************************Camera pop up****************************************************/
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
    /****************************************************Algo popup **********************************************/
    const visualizationControl:FloatingPanel=new FloatingPanel("#algo-control");
    const showAlgoControl=<HTMLInputElement>document.getElementById("show-algo-control");
    showAlgoControl.addEventListener("input",():void=>{
        if(showAlgoControl.checked){
            visualizationControl.open();
        }else{
            visualizationControl.close();
        }
    });
    visualizationControl.setCloseCallback(():void=>{showAlgoControl.checked=false;});

    const statePanel:FloatingPanel=new FloatingPanel("#state-panel");
    const showStatePanel:HTMLInputElement=<HTMLInputElement>document.getElementById("show-algo-state");
    showStatePanel.addEventListener("input",():void=>{
        if(showStatePanel.checked){
            statePanel.open();
        }else{
            statePanel.close();
        }
    });
    statePanel.setCloseCallback(():void=>{showStatePanel.checked=false;});
    GraphAlgorithm.Algorithm.statePanel=statePanel.contentElement();

    //const runButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("run-algo"),stopButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("stop-algo");

    const partialResultCheckBos:HTMLInputElement=document.getElementById("partial-results-set") as HTMLInputElement;
    partialResultCheckBos.addEventListener("input",():void=>{
        if(kCore.IsAnimationRunning()==false){
            partialResultCheckBos.checked=false;
            return;
        }
        kCore.displayPartialResult(partialResultCheckBos.checked);
    });


    /******************************************************after initialization************************************/
    GraphAlgorithm.Algorithm.setVisualizationVideoControl(visualizationControl.contentDiv);
    GraphAlgorithm.Algorithm.setVisualizationControl(<HTMLButtonElement>document.getElementById("run-algo"),<HTMLButtonElement>document.getElementById("stop-algo"));
    GraphAlgorithm.Algorithm.changeAlgorithm(kCore);
    kCore.createState();
}