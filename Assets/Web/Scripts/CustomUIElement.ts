
class FloatingPanel{
    public readonly toggler:HTMLInputElement;
    public readonly contentDiv:HTMLDivElement;
    public readonly originalParent:HTMLElement;
    private readonly outerDiv:HTMLDivElement;
    private readonly topDiv:HTMLDivElement;
    private readonly closeButton:HTMLButtonElement;

    private previousX:number=0;
    private previousY:number=0;
    private outerOffsetX:number=0;
    private outerOffsetY:number=0;
    private isDragging:boolean=false;
    private isOpened:boolean=false;

    constructor(selector:string,toggler:HTMLInputElement){
        this.toggler=toggler;
        this.outerDiv=<HTMLDivElement>document.querySelector(selector);
        this.originalParent=this.outerDiv.parentElement as HTMLElement;
        this.topDiv=<HTMLDivElement>this.outerDiv.querySelector(".panel-top");
        this.contentDiv=<HTMLDivElement>this.outerDiv.querySelector(".panel-content");
        this.closeButton=<HTMLButtonElement>this.topDiv.querySelector("button[type=button]");
        this.closeButton.addEventListener("click",this.close.bind(this));

        this.topDiv.addEventListener("mousedown",(me:MouseEvent):void=>{
            if(me.button==0){
                this.isDragging=true;
                this.previousX=me.clientX;
                this.previousY=me.clientY;
                document.addEventListener("mousemove",this.onMouseMove);
            }
        });

        this.topDiv.addEventListener("mouseup",():void=>{
            this.isDragging=false;
            document.removeEventListener("mousemove",this.onMouseMove);
        });

        this.toggler.addEventListener("input",():void=>{
            if(this.toggler.checked){
                this.open();
            }else{
                this.close();
            }
        });
    }


    private onMouseMove:MouseEventCallback=(me:MouseEvent):void=>{
        if(this.isDragging==false){return;}
        me.preventDefault();
        this.outerOffsetX+=me.clientX-this.previousX;
        this.outerOffsetY+=me.clientY-this.previousY;
        this.previousX=me.clientX;
        this.previousY=me.clientY;
        this.outerDiv.style.top=`${this.outerOffsetY}px`;
        this.outerDiv.style.left=`${this.outerOffsetX}px`;
    };


    public contentElement():HTMLElement{
        return this.contentDiv;
    }


    private close():void{
        this.toggler.checked=false;
        if(this.isOpened){
            this.isDragging=false;
            this.outerOffsetX=0;
            this.outerOffsetY=0;
            this.outerDiv.style.top="";
            this.outerDiv.style.left="";
            document.body.removeChild(this.outerDiv);
            this.originalParent.appendChild(this.outerDiv);
            this.isOpened=false;
            setTimeout(():void=>{
                this.outerDiv.classList.toggle("floating-panel-open");
            },1);//no idea why it needs to wait some time
        }else{

        }
    }


    public open():void{
        this.toggler.checked=true;
        if(this.isOpened){
        }else{
            const rect:DOMRect=this.outerDiv.getBoundingClientRect();
            this.outerOffsetX=rect.left;
            this.outerOffsetY=rect.top;
            this.outerDiv.style.left=`${this.outerOffsetX}px`;
            this.outerDiv.style.top=`${this.outerOffsetY}px`;
            this.originalParent.removeChild(this.outerDiv);
            document.body.appendChild(this.outerDiv);
            this.isOpened=true;
            setTimeout(():void=>{
                this.outerDiv.classList.toggle("floating-panel-open");
            },1);//no idea why it needs to wait some time
        }
    }
}


type MouseEventCallback=(me:MouseEvent)=>void;


class GraphWindow{
    private static template:DocumentFragment;
    private static ID:number=0;

    public static main():void{
        GraphWindow.template=(document.getElementById("graph-window-template") as HTMLTemplateElement).content;
    }

    public graph:Graph;
    public readonly container:HTMLElement;
    public readonly innerSVG:SVGElement;
    private readonly commandExpand:HTMLElement;
    private readonly commandInput:HTMLInputElement;
    
    private readonly forceToX:d3.ForceX<Vertex>=d3.forceX().strength(0.15);
    private readonly forceToY:d3.ForceY<Vertex>=d3.forceY().strength(0.15);
    private readonly simulation:d3.Simulation<Vertex,Edge>=d3.forceSimulation<Vertex,Edge>()
    .force("charge", d3.forceManyBody<Vertex>().strength(-150))
    .force("x", this.forceToX)
    .force("y",this.forceToY);
    private simulationStable:boolean=false;

    private readonly linksG:d3.Selection<SVGGElement,unknown,null,undefined>;
    private readonly circlesG:d3.Selection<SVGGElement,unknown,null,undefined>;
    public readonly allG:SVGGElement;

    public moveSpeed:number=1;
    private offsetX:number=0;
    private offsetY:number=0;
    private scaleX:number=0;
    private scaleY:number=0;
    private isDraggingContainer:boolean=false;
    private moveCameraAllowed:boolean=false;
    private mouseX:number=0;
    private mouseY:number=0;
    private magnifier:number=1;
    private width:number=500;
    private height:number=500;
    private _isMouseOverContainer:boolean=false;

    private firstSelectedVertex:number=-1;
    private secondSelectedVertex:number=-1;
    private pressNumber:number=0;
    private pressToSelectVertex:boolean=false;
    public isCreateEdge:boolean=false;

    private onVertexMoved:((v:Vertex)=>void)|undefined=undefined;

    constructor(g:Graph){
        this.graph=g;
        this.container=(GraphWindow.template.querySelector("div.graph-window") as HTMLElement).cloneNode(true) as HTMLElement;
        (document.getElementById("graphs-container") as HTMLElement).appendChild(this.container);
        new ResizeObserver(this.onResizeHorizontally).observe(this.container);
        
        this.innerSVG=this.container.querySelector("svg.graph-svg") as SVGElement;
        this.allG=this.innerSVG.querySelector("g.all") as SVGGElement;

        const svg:d3.Selection<SVGElement,any,null,undefined>=d3.select<SVGElement,any>(this.innerSVG)
        .attr("width",this.width)
        .attr("height",this.height)
        .attr("viewbox",[0,0,this.width,this.height]);

        const innerG:d3.Selection<SVGGElement,any,null,undefined>=svg.select("g.all");

        this.linksG=(innerG.append("g") as d3.Selection<SVGGElement,unknown,null,undefined>)
        .attr("stroke", "#444")
        .attr("stroke-opacity",1);
        this.circlesG=innerG.append("g") as d3.Selection<SVGGElement,unknown,null,undefined>;
        this.setGraph(g);

        this.forceToX.x(this.width/2);
        this.forceToY.y(this.height/2);

        this.container.addEventListener("mouseleave",():void=>{this._isMouseOverContainer=false;});
        this.container.addEventListener("mouseenter",():void=>{this._isMouseOverContainer=true;});

        const control:HTMLDivElement=this.container.querySelector("div.control") as HTMLDivElement;
        {
            const expand=control.querySelector("div.camera") as HTMLElement;
            const idstr:string=`bfquiwcycvyqw-${GraphWindow.ID}`;
            let innerId:number=0;
            expand.querySelector("input.switch")?.setAttribute("id",idstr);
            expand.querySelector(".switch.text>label")?.setAttribute("for",idstr);

            const menu=expand.querySelector(".menu") as HTMLElement;

            const zoomSlider:HTMLInputElement=<HTMLInputElement>menu.querySelector('input[type="range"].zoom');
            const zoomNumberInput:HTMLInputElement=<HTMLInputElement>menu.querySelector('input[type="number"].zoom');
            {
                const zoomMin:number=0,zoomMax:number=5;
                const min:string=zoomMin.toString();
                const max:string=zoomMax.toString();
                zoomSlider.setAttribute("min",min);
                zoomSlider.setAttribute("max",max);
                zoomNumberInput.setAttribute("min",min);
                zoomNumberInput.setAttribute("max",max);
            }

            zoomSlider.addEventListener('input',():void=>{
                zoomNumberInput.value=zoomSlider.value;
                this.scaleGraph(zoomNumberInput.valueAsNumber);
            });

            zoomNumberInput.addEventListener('input',():void=>{
                zoomSlider.value=zoomNumberInput.value;
                this.scaleGraph(zoomNumberInput.valueAsNumber);
            });

            const previousMagnifier:number=1;
            zoomNumberInput.valueAsNumber=previousMagnifier;
            zoomSlider.valueAsNumber=previousMagnifier;

            const moveCameraButton=<HTMLInputElement>menu.querySelector("input.move");
            const moveCameraLabel=menu.querySelector("label.move") as HTMLLabelElement;
            moveCameraButton.setAttribute("id",`${idstr}-${innerId}`);
            moveCameraLabel.setAttribute("for",`${idstr}-${innerId}`);
            moveCameraButton.addEventListener("change",():void=>{
                this.allowMoveGraph();
            });
            ++innerId;

            const moveSpeedControl=menu.querySelector("input.speed") as HTMLInputElement;
            const moveSpeedLabel=menu.querySelector("label.speed") as HTMLLabelElement
            moveSpeedControl.setAttribute("id",`${idstr}-${innerId}`);
            moveSpeedLabel.setAttribute("for",`${idstr}-${innerId}`);
            moveSpeedControl.max=(20).toString();
            moveSpeedControl.min=(0.1).toString();
            moveSpeedControl.valueAsNumber=2;
            this.moveSpeed=2;
            moveSpeedControl.addEventListener("input",():void=>{
                this.moveSpeed=moveSpeedControl.valueAsNumber;
            });

            const teleportButton=<HTMLButtonElement>menu.querySelector("button.teleport");
            const teleportVertexInput=<HTMLInputElement>menu.querySelector("input.teleport");

            teleportButton.addEventListener("click",()=>{
                if(teleportVertexInput.value.length==0){
                    return;
                }
                const val:number=parseInt(teleportVertexInput.value);
                const vl:VerticeList|undefined=this.graph.adjacencyList.get(val);
                if(vl==undefined){
                    return;
                }
                this.setCenter(vl.main.x as number,vl.main.y as number);
            });
        }
        {
            const expand=control.querySelector("div.vertex") as HTMLElement;
            const idstr:string=`enyrdhbae-${GraphWindow.ID}`;
            let innerId:number=0;
            expand.querySelector("input.switch")?.setAttribute("id",idstr);
            expand.querySelector(".switch.text>label")?.setAttribute("for",idstr);

            const menu=expand.querySelector(".menu") as HTMLElement;
            const showIdLabel=menu.querySelector("label.show-id") as HTMLLabelElement;
            const showIdCheckBox=menu.querySelector("input.show-id") as HTMLInputElement;
            showIdLabel.setAttribute("for",`${idstr}-${innerId}`);
            showIdCheckBox.setAttribute("id",`${idstr}-${innerId}`);
            ++innerId;
            showIdCheckBox.checked=true;
            showIdCheckBox.addEventListener("input",():void=>{
                this.displayVertexIds(showIdCheckBox.checked);
            });
        }
        {
            this.commandExpand=control.querySelector(".command.expand") as HTMLElement;
            const idstr:string=`qqewfrwwe-${GraphWindow.ID}`;
            let innerId:number=0;
            this.commandExpand.querySelector("input.switch")?.setAttribute("id",idstr);
            this.commandExpand.querySelector(".switch.text>label")?.setAttribute("for",idstr);

            const menu=this.commandExpand.querySelector(".menu") as HTMLElement;
            this.commandInput=menu.querySelector("input.command") as HTMLInputElement;
            const commandButton:HTMLButtonElement=menu.querySelector("button#command-input-button") as HTMLButtonElement;
            commandButton.addEventListener("click",this.readCommands);
            this.commandInput.addEventListener("keydown",(ke:KeyboardEvent):void=>{
                if(ke.key=="Enter"){
                    this.readCommands();
                }
            });
        }
        ++GraphWindow.ID;
    }


    private readonly readCommands=():void=>{
        const text:string=this.commandInput.value.trim();
        if(text.length<2){
            console.log(`unknown command: ${text}`);
        }
        const command:string=text.substring(0,2);
        const left:string=text.substring(2);

        function getVertices():number[]{
            const arr:RegExpMatchArray | null=left.match(/(\d+)/g);
            if(arr==null){
                return [];
            }else{
                return arr.map<number>((str:string):number=>parseInt(str));
            }
        }

        function getEdges():number[]{
            const arr:RegExpMatchArray | null=left.match(/(\d+,\d+)/g);
            const edges:number[]=[];
            if(arr==null){
            }else{
                for(const s of arr){
                    const numbers:string[]=s.split(",");
                    edges.push(parseInt(numbers[0]));
                    edges.push(parseInt(numbers[1]));
                }
            }
            return edges;
        }

        switch(command){
        case "rv":{
            const vs:number[]=getVertices();
            for(const v of vs){
                graphHasUpdated=VisualizationUtils.Algorithm.removeVertex(v)||graphHasUpdated;
            }
            break;
        }
        case "av":{
            const vs:number[]=getVertices();
            for(const v of vs){
                graphHasUpdated=VisualizationUtils.Algorithm.addVertex(v)||graphHasUpdated;
            }
            break;
        }
        case "ae":{
            const edges:number[]=getEdges();
            for(let i:number=0;i<edges.length;i+=2){
                graphHasUpdated=VisualizationUtils.Algorithm.addEdge(edges[i],edges[i+1])||graphHasUpdated;
            }
            break;
        }
        case "re":{
            const edges:number[]=getEdges();
            for(let i:number=0;i<edges.length;i+=2){
                graphHasUpdated=VisualizationUtils.Algorithm.removeEdge(edges[i],edges[i+1])||graphHasUpdated;
            }
            break;
        }
        default:{
            console.log(`unknown command: ${command}`);
        }
        }
        this.commandInput.value="";
    }


    public hideCommandModule(hide=true):this{
        this.commandExpand.classList.toggle("hide",hide);
        return this;
    }


    public setGraph(g:Graph):this{
        this.graph=g;
        return this.updateSimulation();
    }


    public setVertexMovingCallback(callback:((v:Vertex)=>void)|undefined=undefined):this{
        this.onVertexMoved=callback;
        return this;
    }


    public display(show:boolean):this{
        this.container.classList.toggle("hide",!show);
        return this;
    }


    public setWH(width:number,height:number):this{
        this.width=width;
        this.height=height;
        this.forceToX.x(this.width/2);this.forceToY.y(this.height/2);
        this.innerSVG.setAttribute("width",`${this.width}`);
        this.innerSVG.setAttribute("height",`${this.height}`);
        this.innerSVG.setAttribute("viewbox",`[0,0,${this.width},${this.height}]`);
        return this;
    }


    /**
     * @reference https://gist.github.com/mbostock/1095795
     * @reference https://observablehq.com/@d3/force-directed-graph/2?intent=fork
     */
    public updateSimulation():this{
        const nodes:Array<Vertex>=this.graph.vertices;
        const links:Edge[]=this.graph.edges;
        this.simulation.stop();
        this.simulationStable=false;

        const ticked:()=>void=():void=>{
            link.attr("x1",(e:Edge):number=><number>e.source.x)
            .attr("y1",(e:Edge):number=><number>e.source.y)
            .attr("x2",(e:Edge):number=><number>e.target.x)
            .attr("y2",(e:Edge):number=><number>e.target.y);
            node.attr("cx",(v:Vertex):number=>(<number>v.x))
            .attr("cy",(v:Vertex):number=>(<number>v.y));
            if(this.simulationStable==false){
                if(this.onVertexMoved!=undefined){
                    for(const v of this.graph.vertices){
                        this.onVertexMoved(v);
                    }
                }
                for(const v of this.graph.vertices){
                    v.updateTextPosition();
                }
            }
        }

        this.simulation.nodes(nodes)
        .force("link",d3.forceLink<Vertex,d3.SimulationLinkDatum<Vertex>>(links))
        .on("tick", ticked)
        .on("end",():void=>{
            this.simulationStable=true;
        });

        let link:d3.Selection<SVGLineElement, Edge, SVGGElement, unknown>=this.linksG.selectAll<SVGLineElement,Edge>("line")
        .data<Edge>(links,function(datum:Edge|undefined):number{
            //return `${(<Edge>datum).source.id}-${(<Edge>datum).target.id}`;
            return (<Edge>datum).source.id*16384+(<Edge>datum).target.id;
        });
        link.exit().remove();
        link=link.enter().append("line")
        .attr("stroke-width",1)
        .attr("data-edge",(e:Edge):string=>{
            return `${e.source.id}-${e.target.id}`;
        })
        .each(function(e:Edge,_idx:number,_lines:SVGLineElement[]|ArrayLike<SVGLineElement>):void{
            e.line=this;
            e.line.setAttribute("stroke","var(--reverse-color4)");
        }).merge(link);

        let node:d3.Selection<SVGCircleElement,Vertex, SVGGElement, unknown>=this.circlesG.selectAll<SVGCircleElement,Vertex>("circle")
        .data<Vertex>(nodes,function(data:Vertex):number{return data.id;})
        node.exit().remove();
        node=node.enter().append("circle")
        .attr("fill","var(--reverse-color2)")
        .attr("r",function(n:Vertex,_i:number):number{
            return n.radius;
        })
        .attr("data-vertex",function(n:Vertex,_i:number):string{
            return n.id.toString();
        })
        .call(
            d3.drag<SVGCircleElement,Vertex>()
            .on("start", this.vertexDragstarted.bind(this))
            .on("drag", this.VertexDragged.bind(this))
            .on("end", this.vertexDragended.bind(this))
        )
        .each((v:Vertex,idx:number,circles:SVGCircleElement[]|ArrayLike<SVGCircleElement>):void=>{
            v.circle=circles[idx];
            const text:SVGTextElement=document.createElementNS("http://www.w3.org/2000/svg","text");
            v.text=text;
            (this.circlesG.node() as SVGGElement).append(text);
            v.updateTextPosition();
            text.innerHTML=v.id.toString();
            text.classList.add("text");
            text.classList.add("vertex");
        }).merge(node);
    
        this.simulation.alpha(1).restart();
        return this;
    }


    private vertexDragstarted(event:any,v:Vertex):void{
        if(!event.active){this.simulation.alphaTarget(0.3).restart();}
        event.subject.fx=event.subject.x;
        event.subject.fy=event.subject.y;
        this.simulationStable=false;

        if(this.pressToSelectVertex&&this.secondSelectedVertex!=event.subject.id&&this.firstSelectedVertex!=event.subject.id){
            event.subject.circle.classList.toggle("highlight-vertex",true);
            if(this.pressNumber==1){
                this.removeVerticesHighlight(this.secondSelectedVertex);
                this.secondSelectedVertex=event.subject.id;
                this.pressNumber=0;
            }else{
                this.removeVerticesHighlight(this.firstSelectedVertex);
                this.firstSelectedVertex=event.subject.id;
                this.pressNumber=1;
            }
        }
        MainApp.instance().setVertexInput((this.graph.adjacencyList.get(event.subject.id) as VerticeList).main);
    }


    private VertexDragged(event:any,v:Vertex):void{
        event.subject.fx=event.x;
        event.subject.fy=event.y;
        this.simulationStable=false;
    }


    private vertexDragended(event:any,_v:Vertex):void{
        if(!event.active){this.simulation.alphaTarget(0);}
        event.subject.fx=null;
        event.subject.fy=null;
        this.simulationStable=false;
    }


    public isMouseOverContainer():boolean{
        return this._isMouseOverContainer;
    }


    public allowMoveGraph():this{
        this.moveCameraAllowed=!this.moveCameraAllowed;
        if(this.moveCameraAllowed){
            this.innerSVG.addEventListener("mousedown",this.containerDragStarted);
            this.innerSVG.addEventListener("mousemove",this.containerDragged);
            this.innerSVG.addEventListener("mouseup",this.containerDragEnded);
            this.innerSVG.addEventListener("keypress",this.moveGraphByKey);
            this.innerSVG.setAttribute("oncontextmenu","return false;");
        }else{
            this.innerSVG.removeEventListener("mousedown",this.containerDragStarted);
            this.innerSVG.removeEventListener("mousemove",this.containerDragged);
            this.innerSVG.removeEventListener("mouseup",this.containerDragEnded);
            this.innerSVG.removeEventListener("keypress",this.moveGraphByKey);
            this.innerSVG.removeAttribute("oncontextmenu");
        }
        return this;
    }


    private readonly containerDragStarted:(me:MouseEvent)=>void=(me)=>{
        if(me.button==2){
            this.isDraggingContainer=true;
            this.mouseX=me.offsetX;
            this.mouseY=me.offsetY;
        }else{
            this.isDraggingContainer=false;
        }
    }


    private readonly containerDragged:(me:MouseEvent)=>void=(me)=>{
        if(this.isDraggingContainer==false){return;}
        const dx:number=me.offsetX-this.mouseX;
        const dy:number=me.offsetY-this.mouseY;
        this.mouseX=me.offsetX;
        this.mouseY=me.offsetY;
        this.moveGraph(dx,dy);
    }


    private readonly containerDragEnded:(me:MouseEvent)=>void=(_me)=>{
        this.isDraggingContainer=false;
    }
    

    private readonly onResizeHorizontally:()=>void=()=>{
        const dx:number=this.container.clientWidth-this.width;
        this.width=this.container.clientWidth;
        //this.offsetX+=dx/2;
        this.setWH(this.width,this.height);
        this.simulation.restart();
    };


    private readonly moveGraphByKey:(ke:KeyboardEvent)=>void=(ke)=>{
        if(this.isDraggingContainer==false){return;}
        switch(ke.code){
        case "ArrowLeft":
        case "KeyA":
            this.moveGraph(-1,0);
            break;
        case "ArrowRight":
        case "KeyD":
            this.moveGraph(1,0);
            break;
        case "ArrowUp":
        case "KeyW":
            this.moveGraph(0,-1);
            break;
        case "ArrowDown":
        case "KeyS":
            this.moveGraph(0,1);
            break;
        }
    }


    private moveGraph(dx:number,dy:number):void{
        this.offsetX+=dx*this.moveSpeed;
        this.offsetY+=dy*this.moveSpeed;
        this.setGTransforms();
    }


    public scaleGraph(magnifier:number):this{
        this.offsetX-=(magnifier-this.magnifier)*this.width/2;
        this.offsetY-=(magnifier-this.magnifier)*this.height/2;//move the graph the top left by the size/2 and the different between current and previous magnifier
        this.magnifier=magnifier;
        this.scaleX=magnifier;
        this.scaleY=magnifier;
        return this.setGTransforms();
    }


    public setCenter(x:number,y:number):this{
        const centerX:number=this.width/2;
        const centerY:number=this.height/2;
        this.offsetX=centerX-x*this.scaleX;
        this.offsetY=centerY-y*this.scaleY;
        return this.setGTransforms();
    }


    public resetContainerTransform():this{
        this.offsetX=this.offsetY=0;
        this.scaleX=this.scaleY=1;
        return this.setGTransforms();
    }


    public pressToAddEdge(allow:boolean):void{
        if(allow){
            this.firstSelectedVertex=-1;
            this.secondSelectedVertex=-1;
            this.pressNumber=0;
            this.pressToSelectVertex=true;
            window.addEventListener("keypress",this.edgeEditMode);
        }else{
            this.pressToSelectVertex=false;
            this.removeVerticesHighlight(this.firstSelectedVertex);
            this.removeVerticesHighlight(this.secondSelectedVertex);
            this.firstSelectedVertex=-1;
            this.secondSelectedVertex=-1;
            window.removeEventListener("keypress",this.edgeEditMode);
        }
    }


    private edgeEditMode:(ke:KeyboardEvent)=>void=(ke):void=>{
        switch(ke.key){
        case "c":{
            this.removeVerticesHighlight(this.firstSelectedVertex);
            this.removeVerticesHighlight(this.secondSelectedVertex);
            this.firstSelectedVertex=-1;
            this.secondSelectedVertex=-1;
            this.pressNumber=0;
            break;
        }
        case "Enter":{
            this.doEdgeAction();
            /*
            this.removeVerticesHighlight(this.firstSelectedVertex);
            this.removeVerticesHighlight(this.secondSelectedVertex);
            this.firstSelectedVertex=-1;
            this.secondSelectedVertex=-1;
            this.pressNumber=0;
            */
            break;
        }
        }
    };


    public doEdgeAction():void{
        if(this.firstSelectedVertex==-1||this.secondSelectedVertex==-1){
            return;
        }

        if(this.isCreateEdge){
            //dont change the order to prevent short circuit evaluation
            graphHasUpdated=VisualizationUtils.Algorithm.addEdge(this.firstSelectedVertex,this.secondSelectedVertex)||graphHasUpdated;
        }else{
            graphHasUpdated=VisualizationUtils.Algorithm.removeEdge(this.firstSelectedVertex,this.secondSelectedVertex)||graphHasUpdated;
        }
        this.updateSimulation();
    }


    private removeVerticesHighlight(v:number):void{
        if(v>=0){
            const vl:VerticeList|undefined=this.graph.adjacencyList.get(v);
            if(vl==undefined){//previous selected vertex maybe removed so check it
                return;
            }
            (vl.main.circle as SVGCircleElement).classList.toggle("highlight-vertex",false);
        }
    }


    private setGTransforms():this{
        this.allG.setAttribute("transform",`translate(${this.offsetX} ${this.offsetY}) scale(${this.scaleX} ${this.scaleY})`);
        return this;
    }


    private displayVertexIds(show:boolean):void{
        const value:string=show?"visible":"hidden";
        for(const v of this.graph.vertices){
            v.text?.setAttribute("visibility",value);
        }
    }
}