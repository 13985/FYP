
window.onload=function(){
    const themeButton:HTMLInputElement=<HTMLInputElement>document.getElementById("theme-button-set");
    const html:HTMLElement=<HTMLElement>document.body.parentNode;
    const graphContainer:SVGElement=<SVGElement><HTMLOrSVGElement>document.getElementById("graph-container");

    /* d3-svg declarations */
    const graphSVG:d3.Selection<SVGElement,unknown,HTMLElement,any>=d3.select<SVGElement,any>("#graph-container>svg")
    .attr("width",graphContainer.clientWidth)
    .attr("height",graphContainer.clientHeight)
    .attr("viewbox",[0,0,graphContainer.clientWidth,graphContainer.clientHeight]);
    const svgLinksG:d3.Selection<SVGGElement,unknown,HTMLElement,any>=graphSVG.append("g")
    .attr("stroke", "#444")
    .attr("stroke-opacity", 0.6);
    const svgLinks:d3.Selection<SVGLineElement,undefined,SVGGElement,any>=svgLinksG
    .selectAll("link");
    const svgCirclesG:d3.Selection<SVGGElement,unknown,HTMLElement,any>=graphSVG.append("g");
    /*.attr("stroke", "#000")
    .attr("stroke-width",1.5);*/
    const svgCircles:d3.Selection<SVGCircleElement,Vertex,SVGGElement,any>=svgCirclesG
    .selectAll("circle");

    var SVGGOffsetX:number=0,SVGGOffsetY:number=0,SVGGScaleX:number=1,SVGGScaleY:number=1;
    const graph:Graph=new Graph();
    const kCore:KCoreAlgorithm.KCore=new KCoreAlgorithm.KCore(graph);

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


    const forceToX:d3.ForceX<Vertex>=d3.forceX().strength(0.15);
    const forceToY:d3.ForceY<Vertex>=d3.forceY().strength(0.15);
    var simulation:d3.Simulation<Vertex,Edge>=d3.forceSimulation<Vertex,Edge>()
    .force("charge", d3.forceManyBody<Vertex>().strength(-150))
    .force("x", forceToX)
    .force("y",forceToY);


    /**
     * @reference https://gist.github.com/mbostock/1095795
     * @reference https://observablehq.com/@d3/force-directed-graph/2?intent=fork
     */
    function updateSimulation():void{
        const nodes:Array<Vertex>=graph.vertices;
        const links:Edge[]=graph.edges;
        const width:number=graphContainer.clientWidth;
        const height:number=graphContainer.clientHeight;
        forceToX.x(width/2);forceToY.y(height/2);

        simulation.nodes(nodes)
        .force("link",d3.forceLink<Vertex,d3.SimulationLinkDatum<Vertex>>(links))
        .on("tick", ticked);

        let link:d3.Selection<SVGLineElement, Edge, SVGGElement, unknown>=svgLinksG.selectAll<SVGLineElement,Edge>("line")
        .data<Edge>(links,function(datum:Edge|undefined):number{
            //return `${(<Edge>datum).source.id}-${(<Edge>datum).target.id}`;
            return (<Edge>datum).source.id*16384+(<Edge>datum).target.id;
        });
        link.exit().remove();
        link=link.enter().append("line")
        .attr("stroke-width",1)
        .each(function(e:Edge,_idx:number,_lines:SVGLineElement[]|ArrayLike<SVGLineElement>):void{
            e.line=this;
        }).merge(link);

        let node:d3.Selection<SVGCircleElement,Vertex, SVGGElement, unknown>=svgCirclesG.selectAll<SVGCircleElement,Vertex>("circle")
        .data<Vertex>(nodes,function(data:Vertex):number{return data.id;})
        node.exit().remove();
        node=node.enter().append("circle")
        .attr("r",function(n:Vertex,_i:number):number{
            return n.radius;
        })
        .attr("fill",function(n:Vertex):string{
            return n.getColorString();
        })
        .call(
            d3.drag<SVGCircleElement,Vertex>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        )
        .each(function(v:Vertex,_idx:number,_circles:SVGCircleElement[]|ArrayLike<SVGCircleElement>):void{
            v.circle=this;
        }).merge(node);
        
        node.append("title").
        text(function(n:Vertex,_i:number):string{
            return n.id.toString();
        });

        function ticked() {
            link.attr("x1",(e:Edge):number=><number>e.source.x)
            .attr("y1",(e:Edge):number=><number>e.source.y)
            .attr("x2",(e:Edge):number=><number>e.target.x)
            .attr("y2",(e:Edge):number=><number>e.target.y);
            node.attr("cx",(v:Vertex):number=>(<number>v.x))
            .attr("cy",(v:Vertex):number=>(<number>v.y));
        }
        function dragstarted(event:any,_vertex:Vertex):void{
            if(!event.active)simulation.alphaTarget(0.3).restart();
            vertexPopupInput.value=(event.subject as Vertex).id.toString();
            vertexSetColor.value=(event.subject as Vertex).getColorHexa();
            event.subject.fx=event.subject.x;
            event.subject.fy=event.subject.y;
        }
        
        function dragged(event:any,_vertex:Vertex):void{
            event.subject.fx=event.x;
            event.subject.fy=event.y;
        }
        
        function dragended(event:any,_vertex:Vertex):void{
            if(!event.active)simulation.alphaTarget(0);
            event.subject.fx=null;
            event.subject.fy=null;
        }

        simulation.alpha(1).restart();
    }


    function loadGraph(edgeList:string):void{
        graph.clear(true);
        graph.from(edgeList);
        updateSimulation();
        setVENumber();
        SVGGOffsetX=0;
        SVGGOffsetY=0;
        (graphSVG.selectAll("g") as d3.Selection<SVGGElement,unknown,SVGElement,unknown>).attr("transform",`translate(0 0)`);
        kCore.fastIteration().setColor("#FFFF00","#FF0000").setSelects(fromShell,toShell);
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
        case "create":
        case "remove":
            break;
        }
    });


    vertexUpdateButton.addEventListener("click",()=>{
        if(vertexPopupInput.value.length==0){
            return;
        }
        const theVertex:number=parseInt(vertexPopupInput.value);
        switch(vertexUpdateSelect.value){
        case "create":{
            const v:Vertex|null=graph.tryAddVertex(theVertex);
            if(v==null){
                break;
            }
            v.setColor(kCore.shellComponents[0].color);
            updateSimulation();
            setVENumber();
            break;
        }
        case "remove":{
            if(graph.tryRemoveVertex(theVertex)==null){
                break;
            }
            updateSimulation();
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

    
    /****************************************************Camera pop up****************************************************/
    const zoomSlider:HTMLInputElement=<HTMLInputElement>document.getElementById("zoom-slider");
    const zoomNumberInput:HTMLInputElement=<HTMLInputElement>document.getElementById("zoom-typing");
    const zoomMin:number=0,zoomMax:number=5;
    var previousX:number=0,previousY:number=0;

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
        changeGraphContainerViewBox(zoomSlider.valueAsNumber);
    });

    zoomNumberInput.addEventListener('input',():void=>{
        zoomSlider.value=zoomNumberInput.value;
        changeGraphContainerViewBox(zoomNumberInput.valueAsNumber);
    });

    var previousMagnifier:number=1;
    zoomNumberInput.valueAsNumber=previousMagnifier;
    zoomSlider.valueAsNumber=previousMagnifier;

    function changeGraphContainerViewBox(magnifier:number):void{
        SVGGOffsetX-=(magnifier-previousMagnifier)*graphContainer.clientWidth/2;
        SVGGOffsetY-=(magnifier-previousMagnifier)*graphContainer.clientHeight/2;//move the graph the top left by the size/2 and the different between current and previous magnifier
        previousMagnifier=magnifier;
        SVGGScaleX=magnifier;
        SVGGScaleY=magnifier;
        (graphSVG.selectAll("g") as d3.Selection<SVGGElement,unknown,SVGElement,unknown>).attr("transform",`translate(${SVGGOffsetX} ${SVGGOffsetY}) scale(${SVGGScaleX} ${SVGGScaleY})`);
        //grow the graph to bottom right by delta magnifier * width and height, so translate back by half of it
    }


    const moveCameraButton:HTMLInputElement=<HTMLInputElement>document.getElementById("camera-move-set");
    const moveSpeedControl:HTMLInputElement=document.getElementById("move-speed-control") as HTMLInputElement;
    moveSpeedControl.max=(20).toString();
    moveSpeedControl.min=(0.1).toString();
    moveSpeedControl.valueAsNumber=2;
    var moveCameraAllowed:boolean=false,isDragging:boolean=false;
    moveCameraButton.addEventListener("change",():void=>{
        moveCameraAllowed=!moveCameraAllowed;
        if(moveCameraAllowed){
            graphContainer.setAttribute("oncontextmenu","return false;");//disable right click call context menu
        }else{
            graphContainer.removeAttribute("oncontextmenu");
        }
    });
    
    
    function moveGraph(dx:number,dy:number):void{
        SVGGOffsetX+=dx*moveSpeedControl.valueAsNumber;
        SVGGOffsetY+=dy*moveSpeedControl.valueAsNumber;
        (graphSVG.selectAll("g") as d3.Selection<SVGGElement,unknown,SVGElement,unknown>).attr("transform",`translate(${SVGGOffsetX} ${SVGGOffsetY}) scale(${SVGGScaleX} ${SVGGScaleY})`);
    }
    
    window.addEventListener("keydown",function(ke:KeyboardEvent):void{
        if(moveCameraAllowed==false)return;
        switch(ke.code){
        case "ArrowLeft":
        case "KeyA":
            moveGraph(-1,0);
            break;
        case "ArrowRight":
        case "KeyD":
            moveGraph(1,0);
            break;
        case "ArrowUp":
        case "KeyW":
            moveGraph(0,-1);
            break;
        case "ArrowDown":
        case "KeyS":
            moveGraph(0,1);
            break;
        }
    });


    graphContainer.addEventListener("mousedown",(me:MouseEvent):void=>{
        isDragging=me.button==2&&moveCameraAllowed;//right button
        if(isDragging){
            previousX=me.offsetX;
            previousY=me.offsetY;
        }
    });
    
    graphContainer.addEventListener("mouseup",(_me:MouseEvent):void=>{
        isDragging=false;//right button
    });

    graphContainer.addEventListener("mousemove",(me:MouseEvent):void=>{
        if(isDragging==false)return;
        const dx:number=me.offsetX-previousX;
        const dy:number=me.offsetY-previousY;
        previousX=me.offsetX;
        previousY=me.offsetY;
        moveGraph(dx,dy);
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
        const centerX:number=graphContainer.clientWidth/2;
        const centerY:number=graphContainer.clientHeight/2;
        SVGGOffsetX=centerX-(vl.main.x as number);
        SVGGOffsetY=centerY-(vl.main.y as number);
        (graphSVG.selectAll("g") as d3.Selection<SVGGElement,unknown,SVGElement,unknown>).attr("transform",`translate(${SVGGOffsetX} ${SVGGOffsetY})`);
    });


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

    kCore.setSpeedInput(document.getElementById("algo-speed-control") as HTMLInputElement).setButtons(document.getElementById("algo-pause") as HTMLButtonElement,document.getElementById("algo-nextStep") as HTMLButtonElement);

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

    const runButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("run-algo");
    const stopButton:HTMLButtonElement=<HTMLButtonElement>document.getElementById("stop-algo");
    runButton.addEventListener("click",()=>{
        kCore.start(():void=>{
            stopButton.disabled=true;
            runButton.disabled=false;
        });
        stopButton.disabled=false;
        runButton.disabled=true;
    });
    stopButton.addEventListener("click",()=>{
        stopButton.disabled=true;
        runButton.disabled=false;
        kCore.stop();
    });
}