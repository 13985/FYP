
window.onload=function(){
    const themeButton:HTMLInputElement=<HTMLInputElement>document.getElementById("theme-button-set");
    const html:HTMLElement=<HTMLElement>document.body.parentNode;
    const graphContainer:HTMLElement=<HTMLElement>document.getElementById("graph-container");
    const graphSVG_:SVGElement=<SVGElement><HTMLOrSVGElement>document.getElementById ("graph-container");

    /* d3-svg declarations */
    const graphSVG:d3.Selection<SVGElement,unknown,HTMLElement,any>=d3.select<SVGElement,any>("#graph-container>svg")
    .attr("width",graphSVG_.clientWidth)
    .attr("height",graphSVG_.clientHeight)
    .attr("viewbox",[0,0,graphSVG_.clientWidth,graphSVG_.clientHeight]);
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

    var SVGGOffsetX:number=0,SVGGOffsetY:number=0;
    const graph:Graph=new Graph();

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
        const width:number=graphSVG_.clientWidth;
        const height:number=graphSVG_.clientHeight;
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
            return n.getColor();
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
        (graphSVG.selectAll("g") as d3.Selection<SVGGElement,unknown,SVGElement,unknown>).attr("transform",`translate(${SVGGOffsetX} ${SVGGOffsetY})`);
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
    const vertexSetColor:HTMLInputElement=<HTMLInputElement>document.getElementById("vertex-set-color");
    const vertexPopupInput:HTMLInputElement=<HTMLInputElement>document.getElementById("vertex-popup-input");
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
            vertexSetColor.value=vl.main.getColor();
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
            if(graph.adjacencyList.get(theVertex)!=undefined){
                break;
            }
            const v:Vertex=new Vertex(theVertex);
            const vl:VerticeList=new VerticeList(v);
            graph.adjacencyList.set(theVertex,vl);
            graph.vertices.push(v);
            updateSimulation();
            setVENumber();
            break;
        }
        case "remove":{
            const vl:VerticeList|undefined=graph.adjacencyList.get(theVertex);
            if(vl==undefined){
                break;
            }

            for(const v_id of vl.others){
                const other_vl:VerticeList=<VerticeList>graph.adjacencyList.get(v_id);
                for(let i:number=0;i<other_vl.others.length;++i){
                    if(other_vl.others[i]!=theVertex){continue;}
                    other_vl.others=other_vl.others.splice(i,1);
                    break;
                }
            }
            graph.adjacencyList.delete(theVertex);
            for(let i:number=0;i<graph.vertices.length;++i){
                if(graph.vertices[i].id!=vl.main.id){continue;}
                //(graph.vertices[i].circle as SVGCircleElement).remove();
                graph.vertices.splice(i,1);
                break;
            }

            let lengthLeft:number=graph.edges.length;
            for(let i:number=0;i<lengthLeft;){
                const e:Edge=graph.edges[i];
                if(e.source.id!=theVertex&&e.target.id!=theVertex){
                    ++i;
                }else{
                    //(e.line as SVGLineElement).remove();
                    graph.edges[i]=graph.edges[lengthLeft-1];
                    --lengthLeft;
                }
            }
            graph.edges.length=lengthLeft;
            updateSimulation();
            setVENumber();
            break;
        }
        case "color":
            const vl:VerticeList|undefined=graph.adjacencyList.get(theVertex);
            if(vl==undefined){
                break;
            }
            vl.main.setColor(vertexSetColor.value);
            break;
        }
    });

    
    /****************************************************Camera pop up****************************************************/
    const zoomSlider:HTMLInputElement=<HTMLInputElement>document.getElementById("zoom-slider");
    const zoomNumberInput:HTMLInputElement=<HTMLInputElement>document.getElementById("zoom-typing");
    function setZoomBound():void{
        const min:string=(0.1).toString();
        const max:string=(20).toString();
        zoomSlider.setAttribute("min",min);
        zoomSlider.setAttribute("max",max);
        zoomNumberInput.setAttribute("min",min);
        zoomNumberInput.setAttribute("max",max);
    }
    setZoomBound();

    zoomSlider.addEventListener('change',():void=>{
        zoomNumberInput.value=zoomSlider.value;
    });

    zoomNumberInput.addEventListener('change',():void=>{
        zoomSlider.value=zoomNumberInput.value;
    });



    const moveCameraButton:HTMLInputElement=<HTMLInputElement>document.getElementById("camera-move-set");
    const moveSpeedControl:HTMLInputElement=document.getElementById("move-speed-control") as HTMLInputElement;
    moveSpeedControl.max=(20).toString();
    moveSpeedControl.min=(0.1).toString();
    moveSpeedControl.valueAsNumber=2;
    var moveCameraAllowed:boolean=false,isDragging:boolean=false;
    var previousX:number,previousY:number;
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
        (graphSVG.selectAll("g") as d3.Selection<SVGGElement,unknown,SVGElement,unknown>).attr("transform",`translate(${SVGGOffsetX} ${SVGGOffsetY})`);
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
        const centerX:number=graphSVG_.clientWidth/2;
        const centerY:number=graphSVG_.clientHeight/2;
        SVGGOffsetX=centerX-(vl.main.x as number);
        SVGGOffsetY=centerY-(vl.main.y as number);
        (graphSVG.selectAll("g") as d3.Selection<SVGGElement,unknown,SVGElement,unknown>).attr("transform",`translate(${SVGGOffsetX} ${SVGGOffsetY})`);
    });


    /****************************************************Algo popup **********************************************/
    const fromShell:HTMLSelectElement=<HTMLSelectElement>document.getElementById("from-shell-value");
    const toShell:HTMLSelectElement=<HTMLSelectElement>document.getElementById("to-shell-value");

    
}