class FloatingPanel{
    private outerDiv:HTMLDivElement;
    private topDiv:HTMLDivElement;
    private contentDiv:HTMLDivElement;
    private closeButton:HTMLButtonElement;
    private originalParent:HTMLElement;

    private previousX:number=0;
    private previousY:number=0;
    private outerOffsetX:number=0;
    private outerOffsetY:number=0;
    private isDragging:boolean=false;

    constructor(selector:string){
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
            }
        });

        this.topDiv.addEventListener("mouseup",():void=>{
            this.isDragging=false;
        });
        this.topDiv.addEventListener("mouseleave",():void=>{
            this.isDragging=false;
        });


        this.topDiv.addEventListener("mousemove",(me:MouseEvent):void=>{
            if(this.isDragging==false){return;}
            me.preventDefault();
            this.outerOffsetX+=me.clientX-this.previousX;
            this.outerOffsetY+=me.clientY-this.previousY;
            this.previousX=me.clientX;
            this.previousY=me.clientY;
            this.outerDiv.style.top=`${this.outerOffsetY}px`;
            this.outerDiv.style.left=`${this.outerOffsetX}px`;
        });
    }


    public setCloseCallback(callback:()=>void):FloatingPanel{
        this.closeButton.addEventListener("click",():void=>{
            callback();
        });
        return this;
    }


    public close():void{
        this.isDragging=false;
        this.outerOffsetX=0;
        this.outerOffsetY=0;
        this.outerDiv.style.top="";
        this.outerDiv.style.left="";
        document.body.removeChild(this.outerDiv);
        this.originalParent.appendChild(this.outerDiv);
        setTimeout(():void=>{
            this.outerDiv.classList.toggle("floating-panel-open");
        },1);//no idea why it needs to wait some time
    }


    public open():void{
        const rect:DOMRect=this.outerDiv.getBoundingClientRect();
        this.outerOffsetX=rect.left+window.scrollX;
        this.outerOffsetY=rect.top+window.scrollY;
        this.outerDiv.style.left=`${this.outerOffsetX}px`;
        this.outerDiv.style.top=`${this.outerOffsetY}px`;
        this.originalParent.removeChild(this.outerDiv);
        document.body.appendChild(this.outerDiv);
        setTimeout(():void=>{
            this.outerDiv.classList.toggle("floating-panel-open");
        },1);//no idea why it needs to wait some time
        
    }
}


type mouseEventCallback=(me:MouseEvent)=>void;

/**
 * @field 
 * hierarchy:
 * container        (html element)
 * --innerSVG       (svg element)
 *   --circles      (svg g element, created by this class)
 *   --links        (svg g element, created by this class)
 */
class GraphWindow{
    public graph:Graph;
    public readonly container:HTMLElement;
    public readonly innerSVG:SVGElement;
    
    private readonly forceToX:d3.ForceX<Vertex>=d3.forceX().strength(0.15);
    private readonly forceToY:d3.ForceY<Vertex>=d3.forceY().strength(0.15);
    private simulation:d3.Simulation<Vertex,Edge>=d3.forceSimulation<Vertex,Edge>()
    .force("charge", d3.forceManyBody<Vertex>().strength(-150))
    .force("x", this.forceToX)
    .force("y",this.forceToY);

    private readonly linksG:d3.Selection<SVGGElement,unknown,HTMLElement,undefined>;
    private readonly circlesG:d3.Selection<SVGGElement,unknown,HTMLElement,undefined>;
    public moveSpeed:number=1;
    private offsetX:number=0;
    private offsetY:number=0;
    private scaleX:number=0;
    private scaleY:number=0;
    private isDraggingContainer:boolean=false;
    private mouseX:number=0;
    private mouseY:number=0;
    private magnifier:number=1;
    private _isMouseOverContainer:boolean=false;

    private onVertexDragStarted:((v:Vertex)=>void)|undefined=undefined;

    constructor(g:Graph,containerSelector:string,innerSVGSelector:string){
        this.graph=g;
        this.container=document.querySelector(containerSelector) as HTMLElement;
        this.innerSVG=document.querySelector(innerSVGSelector) as SVGElement;
        const svg:d3.Selection<SVGElement,any,HTMLElement,undefined>=d3.select<SVGElement,any>(innerSVGSelector)
        .attr("width",this.container.clientWidth)
        .attr("height",this.container.clientHeight)
        .attr("viewbox",[0,0,this.container.clientWidth,this.container.clientHeight]);

        this.linksG=(svg.append("g") as d3.Selection<SVGGElement,unknown,HTMLElement,undefined>)
        .attr("stroke", "#444")
        .attr("stroke-opacity", 0.6);
        this.circlesG=svg.append("g") as d3.Selection<SVGGElement,unknown,HTMLElement,undefined>;
        this.setGraph(g);

        this.forceToX.x(this.container.clientWidth/2);
        this.forceToY.y(this.container.clientHeight/2);

        this.container.addEventListener("mouseleave",():void=>{this._isMouseOverContainer=false;});
        this.container.addEventListener("mouseenter",():void=>{this._isMouseOverContainer=true;});
    }


    public setGraph(g:Graph):GraphWindow{
        this.graph=g;
        return this.updateSimulation();
    }


    public setVertexDragStartCallback(callback:((v:Vertex)=>void)|undefined=undefined):GraphWindow{
        this.onVertexDragStarted=callback;
        return this;
    }


    /**
     * @reference https://gist.github.com/mbostock/1095795
     * @reference https://observablehq.com/@d3/force-directed-graph/2?intent=fork
     */
    public updateSimulation():GraphWindow{
        const nodes:Array<Vertex>=this.graph.vertices;
        const links:Edge[]=this.graph.edges;
        /*
        const width:number=this.container.clientWidth;
        const height:number=this.container.clientHeight;
        this.forceToX.x(width/2);this.forceToY.y(height/2);
        */

        this.simulation.nodes(nodes)
        .force("link",d3.forceLink<Vertex,d3.SimulationLinkDatum<Vertex>>(links))
        .on("tick", ticked);

        let link:d3.Selection<SVGLineElement, Edge, SVGGElement, unknown>=this.linksG.selectAll<SVGLineElement,Edge>("line")
        .data<Edge>(links,function(datum:Edge|undefined):number{
            //return `${(<Edge>datum).source.id}-${(<Edge>datum).target.id}`;
            return (<Edge>datum).source.id*16384+(<Edge>datum).target.id;
        });
        link.exit().remove();
        link=link.enter().append("line")
        .attr("stroke-width",1)
        .each(function(e:Edge,_idx:number,_lines:SVGLineElement[]|ArrayLike<SVGLineElement>):void{
            e.line=this;
            e.line.setAttribute("stroke","var(--reverse-color4)");
        }).merge(link);

        let node:d3.Selection<SVGCircleElement,Vertex, SVGGElement, unknown>=this.circlesG.selectAll<SVGCircleElement,Vertex>("circle")
        .data<Vertex>(nodes,function(data:Vertex):number{return data.id;})
        node.exit().remove();
        node=node.enter().append("circle")
        .attr("r",function(n:Vertex,_i:number):number{
            return n.radius;
        })
        .call(
            d3.drag<SVGCircleElement,Vertex>()
            .on("start", this.vertexDragstarted.bind(this))
            .on("drag", this.VertexDragged.bind(this))
            .on("end", this.vertexDragended.bind(this))
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

        this.simulation.alpha(1).restart();
        return this;
    }


    private vertexDragstarted(event:any,v:Vertex):void{
        if(!event.active){this.simulation.alphaTarget(0.3).restart();}
        event.subject.fx=event.subject.x;
        event.subject.fy=event.subject.y;
        if(this.onVertexDragStarted){this.onVertexDragStarted(v);}
    }


    private VertexDragged(event:any,_v:Vertex):void{
        event.subject.fx=event.x;
        event.subject.fy=event.y;
    }


    private vertexDragended(event:any,_v:Vertex):void{
        if(!event.active){this.simulation.alphaTarget(0);}
        event.subject.fx=null;
        event.subject.fy=null;
    }


    public isMouseOverContainer():boolean{
        return this._isMouseOverContainer;
    }


    public allowMoveGraph(allow:boolean):GraphWindow{
        if(allow){
            this.container.addEventListener("mousedown",this.containerDragStarted);
            this.container.addEventListener("mousemove",this.containerDragged);
            this.container.addEventListener("mouseup",this.containerDragEnded);
            this.container.addEventListener("keypress",this.moveGraphByKey);
            this.container.setAttribute("oncontextmenu","return false;");
        }else{
            this.container.removeEventListener("mousedown",this.containerDragStarted);
            this.container.removeEventListener("mousemove",this.containerDragged);
            this.container.removeEventListener("mouseup",this.containerDragEnded);
            this.container.removeEventListener("keypress",this.moveGraphByKey);
            this.container.removeAttribute("oncontextmenu");
        }
        return this;
    }


    private containerDragStarted:(me:MouseEvent)=>void=(me)=>{
        if(me.button==2){
            this.isDraggingContainer=true;
            this.mouseX=me.offsetX;
            this.mouseY=me.offsetY;
        }else{
            this.isDraggingContainer=false;
        }
    }


    private containerDragged:(me:MouseEvent)=>void=(me)=>{
        if(this.isDraggingContainer==false){return;}
        const dx:number=me.offsetX-this.mouseX;
        const dy:number=me.offsetY-this.mouseY;
        this.mouseX=me.offsetX;
        this.mouseY=me.offsetY;
        this.moveGraph(dx,dy);
    }


    private containerDragEnded:(me:MouseEvent)=>void=(_me)=>{
        this.isDraggingContainer=false;
    }


    private moveGraphByKey:(ke:KeyboardEvent)=>void=(ke)=>{
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


    public scaleGraph(magnifier:number):GraphWindow{
        this.offsetX-=(magnifier-this.magnifier)*this.container.clientWidth/2;
        this.offsetY-=(magnifier-this.magnifier)*this.container.clientHeight/2;//move the graph the top left by the size/2 and the different between current and previous magnifier
        this.magnifier=magnifier;
        this.scaleX=magnifier;
        this.scaleY=magnifier;
        return this.setGTransforms();
    }


    public setCenter(x:number,y:number):GraphWindow{
        const centerX:number=this.container.clientWidth/2;
        const centerY:number=this.container.clientHeight/2;
        this.offsetX=centerX-(x as number);
        this.offsetY=centerY-(y as number);
        return this.setGTransforms();
    }


    public resetContainerTransform():GraphWindow{
        this.offsetX=this.offsetY=0;
        this.scaleX=this.scaleY=1;
        return this.setGTransforms();
    }


    private setGTransforms():GraphWindow{
        this.linksG.attr("transform",`translate(${this.offsetX} ${this.offsetY}) scale(${this.scaleX} ${this.scaleY})`);
        this.circlesG.attr("transform",`translate(${this.offsetX} ${this.offsetY}) scale(${this.scaleX} ${this.scaleY})`);
        return this;
    }
}