/*
hide non k-shell if starting core is more than 1
force directed layoutt -explore alt?
color node as it goes ( start with white)
setting - to show not yet visualized current core nodes
add edge! deature  (bonus during visualzation)

*/


class Color implements IClone<Color>{
    public r:number;
    public g:number;
    public b:number;
    public a:number;

    constructor(r:number,g:number,b:number,a:number=255){
        this.r=r;
        this.g=g;
        this.b=b;
        this.a=255;
    }


    public validate():Color{
        this.r=Math.max(0,Math.min(this.r,255));
        this.g=Math.max(0,Math.min(this.g,255));
        this.b=Math.max(0,Math.min(this.b,255));
        this.a=Math.max(0,Math.min(this.a,255));
        return this;
    }


    public toString(a?:number):string{
        return `rgb(${this.r},${this.g},${this.b},${a==undefined?this.a:a})`;
    }


    public toHexa():string{
        return `#${Color.toHexaHelper(this.r)}${Color.toHexaHelper(this.g)}${Color.toHexaHelper(this.b)}`;
    }


    private static toHexaHelper(val:number):string{
        let first:string=Math.floor(val).toString(16);
        if(first.length<=1){
            return `0${first}`;
        }else{
            return first;
        }
    }


    public assignFrom(other:Color):Color{
        this.r=other.r;
        this.g=other.g;
        this.b=other.b;
        this.a=other.a;
        return this;
    }


    public clone(): Color {
        return new Color(this.r,this.g,this.b,this.a);
    }


    public static fromString(val:string):Color{
        let r:number,g:number,b:number,a:number;

        if(val[0].startsWith("#")){
            if(val.length==7){
                r=parseInt(val.substring(1,3),16);
                g=parseInt(val.substring(3,5),16);
                b=parseInt(val.substring(5,7),16);
                a=255;
            }
            else if(val.length==9){
                r=parseInt(val.substring(1,3),16);
                g=parseInt(val.substring(3,5),16);
                b=parseInt(val.substring(5,7),16);
                a=parseInt(val.substring(7,9),16);
            }else{
                return new Color(-1,-1,-1);
            }
        }else if(val.startsWith("rgb(")){
            const numbers:number[]=val.split(/\d+/g).map((val:string):number=>parseFloat(val));
            if(numbers.length==3){
                r=numbers[0];
                g=numbers[1];
                b=numbers[2];
                a=255;
            }else if(numbers.length==4){
                r=numbers[0];
                g=numbers[1];
                b=numbers[2];
                a=numbers[3];
            }else{
                return new Color(-1,-1,-1);
            }
        }else{
            return new Color(-1,-1,-1);
        }

        return new Color(r,g,b,a).validate();
    }


    public static lerp(ret:Color,start:Color,end:Color,t:number):void{
        ret.r=start.r*(1-t)+end.r*t;
        ret.g=start.g*(1-t)+end.g*t;
        ret.b=start.b*(1-t)+end.b*t;
        ret.a=start.a*(1-t)+end.a*t;
    }
}

namespace KCoreAlgorithm{
    export class ConnectedComponent{
        public vertices:Array<Vertex>=[];
        public shell:number=-1;
        public polygonOpacity:number=0.4;
        public polygon:SVGPolygonElement|null=null;

        constructor(shell:number=1){
            this.shell=shell;
        }
    }


    export class ShellComponet{
        public connectedComponents:Array<ConnectedComponent>=[];
        public shell:number=-1;
        public color:Color=new Color(0,0,0);
    }


    class ConnectedComponetInfo{
        public shell:number=0;
        public index:number=0;

        constructor(s:number,i:number){
            this.shell=s;
            this.index=i;
        }
    }
    
    export class KCore{
        private static readonly processed:number=-2;
        public graph:Graph;
        public shellComponents:Array<ShellComponet>=[];

        /******************UI*************************************/
        public maxOption:HTMLSelectElement|null;
        public minOption:HTMLSelectElement|null;

        private opacity:string="0.3";

        /******************helper data structures*****************/
        private readonly degrees:Map<number,number>=new Map();
        private readonly inSet1:Map<number,number>=new Map();
        private readonly set0:number[]=[];
        private readonly set1:number[]=[];
        private readonly unionFind=new UnionFind();

        private readonly vertexToInfo:Map<number,ConnectedComponetInfo>=new Map();
        private readonly svgContainer:SVGSVGElement;

        /******************visualization control******************/
        private isAnimationRunning:boolean=false;
        public readonly IsAnimationRunning:()=>boolean=():boolean=>this.isAnimationRunning;
        private isPause:boolean=false;
        private nextStep:boolean=false;
        private stopRunning:boolean=false;
        private speedControl:HTMLInputElement|null;
        private pauseButton:HTMLButtonElement|null=null;
        private nextStepButton:HTMLButtonElement|null=null;

        private static readonly defaultColor:Color=new Color(1,1,1);
        private state_currentShell:number;

        constructor(g:Graph,svg:SVGSVGElement){
            this.graph=g;
            this.maxOption=null;
            this.minOption=null;
            this.speedControl=null;
            this.state_currentShell=0;
            this.svgContainer=svg;
        }


        public setGraph(g:Graph):KCore{
            this.graph=g;
            this.fastIteration();
            return this;
        }


        public setColor(start:string,end:string):KCore{
            const color0:Color=Color.fromString(start);
            const color1:Color=Color.fromString(end);
            const shellCount:number=this.shellComponents.length;
            const interval:number=shellCount-1;

            for(let i:number=0;i<shellCount;++i){
                Color.lerp(this.shellComponents[i].color,color0,color1,i/interval);
            }
            return this;
        }


        public fastIteration():KCore{
            this.unionFind.set(this.graph.vertices.length);
            for(const sc of this.shellComponents){
                for(const cc of sc.connectedComponents){
                    cc.polygon?.remove();
                }
            }
            this.shellComponents.length=0;
            this.vertexToInfo.clear();
            this.clearHelpers();
            let currentShell=0,nextShell=1;

            this.graph.adjacencyList.forEach((vl:VerticeList,k:number):void=>{
                if(vl.others.length<=0){
                    this.set0.push(k);
                    this.degrees.set(k,-1);
                }else{
                    this.inSet1.set(k,this.set1.length);
                    this.set1.push(k);
                    this.degrees.set(k,vl.others.length);
                    nextShell=Math.min(nextShell,vl.others.length);
                }
                this.vertexToInfo.set(vl.main.id,new ConnectedComponetInfo(0,0));
            });
            
            while(true){
                while(this.set0.length>0){
                    const v_id:number=<number>this.set0.pop();
                    const vl:VerticeList=<VerticeList>this.graph.adjacencyList.get(v_id);
                    (this.vertexToInfo.get(v_id) as ConnectedComponetInfo).shell=currentShell;

                    for(const neighbor of vl.others){
                        let degree:number=(this.degrees.get(neighbor) as number);
                        if(degree<0){
                            if((this.vertexToInfo.get(neighbor) as ConnectedComponetInfo).shell==currentShell){
                                this.unionFind.union(neighbor,v_id);
                            }
                            continue;
                        }
                        --degree;
                        if(degree<=currentShell){
                            this.removeFromSet1(neighbor);
                        }else{
                            nextShell=Math.min(nextShell,degree);
                            this.degrees.set(neighbor,degree);
                        }
                    }
                }
                
                currentShell=nextShell;
                if(this.set1.length<=0){
                    break;
                }
                nextShell=currentShell+1;
                for(let i:number=0;i<this.set1.length;){
                    const d:number=this.degrees.get(this.set1[i]) as number;
                    if(d<=currentShell){
                        this.removeFromSet1(this.set1[i]);
                    }else{
                        ++i;
                    }
                }
            }

            for(let i:number=0;i<currentShell;++i){
                this.shellComponents.push(new ShellComponet());
                this.shellComponents[i].shell=i;
            }
            this.degrees.clear();

            this.unionFind.flatten();
            for(let node:number=0;node<this.unionFind.parents.length;++node){
                if(node!=this.unionFind.parents[node])continue;
                const info:ConnectedComponetInfo=this.vertexToInfo.get(node) as ConnectedComponetInfo;
                const sc:ConnectedComponent[]=this.shellComponents[info.shell].connectedComponents;
                const cc:ConnectedComponent=new ConnectedComponent(info.shell);
                info.index=sc.length;
                cc.vertices.push((this.graph.adjacencyList.get(node) as VerticeList).main);
                sc.push(cc);
            }

            for(let node:number=0;node<this.unionFind.parents.length;++node){
                if(node==this.unionFind.parents[node])continue;
                const parentInfo:ConnectedComponetInfo=this.vertexToInfo.get(this.unionFind.parents[node]) as ConnectedComponetInfo;
                this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push((this.graph.adjacencyList.get(node) as VerticeList).main);
                (this.vertexToInfo.get(node) as ConnectedComponetInfo).index=parentInfo.index;
            }

            /*
            for(const sc of this.shellComponents){
                for(const cc of sc.connectedComponents){
                    const polygon:SVGPolygonElement=document.createElementNS("http://www.w3.org/2000/svg","polygon");
                    cc.polygon=polygon;
                    cc.polygon.setAttribute("visibility","hidden");
                }
            }
            */

            this.setAllVerticesColor(true);
            return this;
        }


        public async start(onEnd?:()=>void):Promise<void>{
            if(this.isAnimationRunning){
                return;
            }
            this.isAnimationRunning=true;
            this.isPause=this.stopRunning=this.nextStep=false;
            for(const v of this.graph.vertices){
                (v.circle as SVGCircleElement).setAttribute("opacity",this.opacity);
            }
            this.setAllVerticesColor(true);
            this.hideVerticesOutsideShells();

            await this.slowIteration();

            for(const v of this.graph.vertices){
                (v.circle as SVGCircleElement).setAttribute("opacity","1");
            };
            this.isPause=this.isAnimationRunning=this.stopRunning=this.nextStep=false;
            this.displayVerticesInRange(0,this.shellComponents.length,true);
            onEnd?.call(null);
        }


        public stop():void{
            this.stopRunning=true;
        }


        private async slowIteration():Promise<void>{
            this.clearHelpers();
            let currentShell=0,nextShell=1;

            this.graph.adjacencyList.forEach((vl:VerticeList,k:number):void=>{
                if(vl.others.length<=0){
                    this.set0.push(k);
                    this.degrees.set(k,-1);
                }else{
                    this.inSet1.set(k,this.set1.length);
                    this.set1.push(k);
                    this.degrees.set(k,vl.others.length);
                    nextShell=Math.min(nextShell,vl.others.length);
                }
            });
            
            while(true){
                while(this.set0.length>0){
                    const v_id:number=<number>this.set0.pop();
                    const vl:VerticeList=<VerticeList>this.graph.adjacencyList.get(v_id);
                    this.degrees.set(v_id,KCore.processed);
                    (vl.main.circle as SVGCircleElement).setAttribute("opacity","1");
                    vl.main.setColor(this.shellComponents[currentShell].color);
                    await this.wait(currentShell);
                    if(this.stopRunning){
                        return;
                    }

                    for(const neighbor of vl.others){
                        let degree:number=(this.degrees.get(neighbor) as number);
                        if(degree<0){
                            continue;
                        }
                        const neighbor_v:Vertex=(this.graph.adjacencyList.get(neighbor) as VerticeList).main;
                        
                        (neighbor_v.circle as SVGCircleElement).setAttribute("opacity","1");
                        if(this.stopRunning){
                            return;
                        }
                        await this.wait(currentShell);
                        if(this.stopRunning){
                            return;
                        }
                        --degree;
                        if(degree<=currentShell){
                            this.removeFromSet1(neighbor);
                        }else{
                            nextShell=Math.min(nextShell,degree);
                            this.degrees.set(neighbor,degree);
                        }
                        (neighbor_v.circle as SVGCircleElement).setAttribute("opacity",this.opacity);
                        await this.wait(currentShell);
                        if(this.stopRunning){
                            return;
                        }
                    }
                    (vl.main.circle as SVGCircleElement).setAttribute("opacity",this.opacity);

                }
                if(this.stopRunning){
                    return;
                }
                
                currentShell=nextShell;
                if(this.set1.length<=0){
                    break;
                }
                nextShell=currentShell+1;
                for(let i:number=0;i<this.set1.length;){
                    const d:number=this.degrees.get(this.set1[i]) as number;
                    if(d<=currentShell){
                        this.removeFromSet1(this.set1[i]);
                    }else{
                        ++i;
                    }
                }
            }
        }


        private async wait(currentShell:number):Promise<void>{
            if(currentShell>=parseInt((this.minOption as HTMLSelectElement).value)&&currentShell<=parseInt((this.maxOption as HTMLSelectElement).value)){
                for(let timePassed:number=0;this.nextStep==false&&this.stopRunning==false&&(this.isPause||timePassed<((this.speedControl as HTMLInputElement).valueAsNumber)*1000);){
                    const before:number=Date.now();
                    await new Promise((r)=>{setTimeout(r,10);});
                    const after:number=Date.now();
                    timePassed+=(after-before);
                }
            }
            this.nextStep=false;
        }


        private removeFromSet1(target:number):void{
            this.set0.push(target);
            this.degrees.set(target,-1);
            const last:number=this.set1[this.set1.length-1];
            const idx:number=this.inSet1.get(target) as number;
            this.inSet1.delete(target);
            this.set1[idx]=last;
            this.inSet1.set(last,idx);
            this.set1.pop();
        }


        private clearHelpers():void{
            this.degrees.clear();
            this.inSet1.clear();
            this.set0.length=0;
            this.set1.length=0;
        }


        public setSpeedInput(speed:HTMLInputElement):KCore{
            this.speedControl=speed;
            this.speedControl.min="0.05";
            this.speedControl.max="5";
            this.speedControl.step="0.001";
            return this;
        }


        public setButtons(pause:HTMLButtonElement,nextStep:HTMLButtonElement):KCore{
            this.pauseButton=pause;
            this.nextStepButton=nextStep;
            this.pauseButton.addEventListener("click",():void=>{
                if(this.isPause){
                    this.isPause=false;
                    (this.pauseButton as HTMLButtonElement).innerText=">";
                    //displayPartialResult(false);
                }else{
                    this.isPause=true;
                    (this.pauseButton as HTMLButtonElement).innerText="||";
                }
            });
            this.nextStepButton.addEventListener("click",():void=>{
                this.nextStep=true;
            });
            return this;
        }


        public setSelects(min:HTMLSelectElement,max:HTMLSelectElement):KCore{
            this.minOption=min;
            this.maxOption=max;
            this.createOptions(0,this.shellComponents.length,this.minOption);
            this.createOptions(0,this.shellComponents.length,this.maxOption);

            this.minOption.addEventListener("input",()=>{
                this.createOptions(parseInt((this.minOption as HTMLSelectElement).value),this.shellComponents.length,this.maxOption as HTMLSelectElement);
            });
            this.maxOption.addEventListener("input",()=>{
                this.createOptions(0,parseInt((this.maxOption as HTMLSelectElement).value)+1,this.minOption as HTMLSelectElement);
            });
            this.minOption.value="0";
            this.maxOption.value=(this.shellComponents.length-1).toString();
            return this;
        }


        private createOptions(start:number,end:number,select:HTMLSelectElement):void{
            const val:number=parseInt(select.value);
            select.innerHTML="";
            for(let i=start;i<end;++i){
                select.innerHTML+=`
                <option value="${i}">${i}</option>
                `;
            }
            select.value=Math.max(start,Math.min(end-1,val)).toString();
        }


        public setAllVerticesColor(defaultColor:boolean):KCore{
            if(defaultColor){
                for(const v of this.graph.vertices){
                    (v.circle as SVGCircleElement).setAttribute("fill","var(--reverse-color2)");
                }
                for(const sc of this.shellComponents){
                    for(const cc of sc.connectedComponents){
                        cc.polygon?.setAttribute("visibility","hidden");
                    }
                }
            }else{
                for(const sc of this.shellComponents){
                    for(const cc of sc.connectedComponents){
                        cc.polygon?.setAttribute("fill",sc.color.toString(cc.polygonOpacity));
                        for(const v of cc.vertices){
                            v.setColor(sc.color);
                        }
                    }
                }
            }
            return this;
        }


        private displayVerticesInRange(minShell:number,maxShell:number,visibile:boolean):KCore{
            for(let i:number=minShell;i<maxShell;++i){
                const sc:ShellComponet=this.shellComponents[i];
                for(const cc of sc.connectedComponents){
                    for(const v of cc.vertices){
                        this.graph.displayVertex(v.id,visibile);
                    }
                }
            }
            return this;
        }


        public displayPartialResult(show:boolean):KCore{
            const min:number=parseInt((this.minOption as HTMLSelectElement).value),max:number=parseInt((this.maxOption as HTMLSelectElement).value);
            if(show){
                for(let shell:number=min;shell<=max;++shell){
                    const sc:ShellComponet=this.shellComponents[shell];
                    for(const cc of sc.connectedComponents){
                        for(const v of cc.vertices){
                            v.setColor(sc.color);
                        }
                    }
                }
            }else{
                for(const v of this.graph.vertices){
                    if(this.degrees.get(v.id) as number!=KCore.processed){
                        (v.circle as SVGCircleElement).setAttribute("fill","var(--reverse-color2)");
                    }
                }
            }
            return this;
        }


        private hideVerticesOutsideShells():void{
            const min:number=parseInt((this.minOption as HTMLSelectElement).value),max:number=parseInt((this.maxOption as HTMLSelectElement).value);
            this.displayVerticesInRange(min,max+1,true);//set the edges visible first (some edge may connected to outside shell)
            this.displayVerticesInRange(0,min,false);//then for the edge connected to outside shell, hide them
            this.displayVerticesInRange(max+1,this.shellComponents.length,false);
        }


        public displayPolygons(show:boolean):KCore{
            const value:string=show?"visible":"hidden";
            for(const sc of this.shellComponents){
                for(const cc of sc.connectedComponents){
                    if(cc.vertices.length<3){continue;}
                    else if(cc.polygon==undefined){
                        cc.polygon=document.createElementNS("http://www.w3.org/2000/svg","polygon");
                        ConvesHull.Solve(cc);
                        this.svgContainer.insertBefore(cc.polygon,this.svgContainer.firstChild);
                    }
                    (cc.polygon as SVGElement).setAttribute("visibility",value);
                    (cc.polygon as SVGElement).setAttribute("opacity","0.2");
                    (cc.polygon as SVGElement).setAttribute("fill",sc.color.toString());
                }
            }
            return this;
        }


        public refreshPolygons(vertex:Vertex):void{
            const info:ConnectedComponetInfo=this.vertexToInfo.get(vertex.id) as ConnectedComponetInfo;
            const cc:ConnectedComponent=this.shellComponents[info.shell].connectedComponents[info.index];
            ConvesHull.Solve(cc);
        }


        public addEdge(a:number,b:number):KCore{
            if(this.graph.addEdge(a,b)==false){
                return this;
            }
            const a_idx:ConnectedComponetInfo=this.vertexToInfo.get(a) as ConnectedComponetInfo;
            const b_idx:ConnectedComponetInfo=this.vertexToInfo.get(b) as ConnectedComponetInfo;
            let subgraph:ConnectedComponent;
            let theInfo:ConnectedComponetInfo;
            if(a_idx.shell!=b_idx.shell){
                if(a_idx.shell>b_idx.shell){
                    subgraph=this.shellComponents[b_idx.shell].connectedComponents[b_idx.index];
                    theInfo=b_idx;
                }else{
                    subgraph=this.shellComponents[a_idx.shell].connectedComponents[a_idx.index];
                    theInfo=a_idx;
                }
            }else{
                if(a_idx.index!=b_idx.index){
                    this.mergeComponent(this.shellComponents[a_idx.shell],a_idx.index,b_idx.index);
                }
                subgraph=this.shellComponents[a_idx.shell].connectedComponents[a_idx.index];
                theInfo=a_idx;
            }
            
            this.unionFind.set(this.graph.vertices.length);
            this.clearHelpers();
            let currentShell=subgraph.shell,nextShell=subgraph.shell+1;

            for(const v of subgraph.vertices){
                const vl:VerticeList=v.list as VerticeList;
                let d:number=0;
                for(const other of vl.others){
                    if((this.vertexToInfo.get(other) as ConnectedComponetInfo).shell>=currentShell){++d;}
                }
                if(d<=currentShell){
                    this.set0.push(v.id);
                }else{
                    this.set1.push(v.id);
                }
                this.degrees.set(v.id,d);
            }
            
            let differentShell:number=0;
            //atmost 2 iteration after added an edge (degree+1)
            while(true){
                ++differentShell;
                while(this.set0.length>0){
                    const v_id:number=<number>this.set0.pop();
                    const vl:VerticeList=<VerticeList>this.graph.adjacencyList.get(v_id);
                    (this.vertexToInfo.get(v_id) as ConnectedComponetInfo).shell=currentShell;

                    for(const neighbor of vl.others){
                        let degree:number|undefined=this.degrees.get(neighbor);
                        if(degree==undefined){
                            continue;
                        }
                        else if(degree<0){
                            if((this.vertexToInfo.get(neighbor) as ConnectedComponetInfo).shell==currentShell){
                                this.unionFind.union(neighbor,v_id);
                            }
                            continue;
                        }
                        --degree;
                        if(degree<=currentShell){
                            this.removeFromSet1(neighbor);
                        }else{
                            nextShell=Math.min(nextShell,degree);
                            this.degrees.set(neighbor,degree);
                        }
                    }
                }
                
                currentShell=nextShell;
                if(this.set1.length<=0){
                    break;
                }
                nextShell=currentShell+1;
                for(let i:number=0;i<this.set1.length;){
                    const d:number=this.degrees.get(this.set1[i]) as number;
                    if(d<=currentShell){
                        this.removeFromSet1(this.set1[i]);
                    }else{
                        ++i;
                    }
                }
            }
            this.degrees.clear();

            if(differentShell<=1){
                return this;//no new shell is generated in this connected component
            }
            this.unionFind.flatten();
            this.removeComponent(this.shellComponents[theInfo.shell],theInfo.index);

            //for storing the vertices
            const oldShell:number[]=this.set0;
            const newShell:number[]=this.set1;
            oldShell.length=0;
            newShell.length=0;

            for(const v of subgraph.vertices){
                if(v.id!=this.unionFind.parents[v.id])continue;
                const info:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                if(info.shell>subgraph.shell){
                    newShell.push(v.id);
                    continue;
                }else{
                    oldShell.push(v.id);
                }
                const sc:ConnectedComponent[]=this.shellComponents[info.shell].connectedComponents;
                const cc:ConnectedComponent=new ConnectedComponent(info.shell);
                info.index=sc.length;
                cc.vertices.push(v);
                sc.push(cc);
            }


            for(const v of oldShell){
                if(v==this.unionFind.parents[v])continue;
                const info:ConnectedComponetInfo=this.vertexToInfo.get(v) as ConnectedComponetInfo;
                const parentInfo:ConnectedComponetInfo=this.vertexToInfo.get(this.unionFind.parents[v]) as ConnectedComponetInfo;
                this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push((this.graph.adjacencyList.get(v) as VerticeList).main);
                info.index=parentInfo.index;
            }

            const otherCCIndices:number[]=oldShell;
            let newShellNumber:number=0;
            otherCCIndices.length=0;

            for(const v of newShell){
                const info:ConnectedComponetInfo=this.vertexToInfo.get(v) as ConnectedComponetInfo;
                newShellNumber=info.shell;
                const vl:VerticeList=this.graph.adjacencyList.get(v) as VerticeList;
                for(const other of vl.others){
                    const otherInfo:ConnectedComponetInfo=this.vertexToInfo.get(other) as ConnectedComponetInfo;
                    if(otherInfo.shell==info.shell){
                        otherCCIndices.push(otherInfo.index);
                    }
                }
            }

            
            if(otherCCIndices.length<=1){//isolated new core
                const cc=new ConnectedComponent(newShellNumber);

                if(newShellNumber>this.shellComponents.length){
                    const sc=new ShellComponet();
                    sc.shell=newShellNumber;
                    sc.connectedComponents.push(cc);
                    const oldLength:number=this.shellComponents.length-1;
                    ++this.shellComponents.length;
                    this.shellComponents[newShellNumber]=sc;
                    this.setColor(this.shellComponents[0].color.toString(),this.shellComponents[oldLength].color.toString());
                }

                for(const v of newShell){
                    cc.vertices.push((this.graph.adjacencyList.get(v) as VerticeList).main);
                }
            }else{
                otherCCIndices.sort((a:number,b:number):number=>{
                    return a-b;
                });
                {
                    let len=0;
                    for(let i:number=0,j:number;i<otherCCIndices.length;i=j){
                        for(j=i+1;j<otherCCIndices.length&&otherCCIndices[i]==otherCCIndices[j];++j){}
                        otherCCIndices[len++]=otherCCIndices[j-1];
                    }
                    otherCCIndices.length=len;
                }

                const theIndex:number=otherCCIndices[0];
                const sc:ShellComponet=this.shellComponents[newShellNumber];
                const cc:ConnectedComponent=sc.connectedComponents[theIndex];

                //since the remove component will change the order of connectedComponents, so must iterate backward to prevent cc at larger index swap to the front (since remove larger index wrong affect the cc at smaller indices)
                for(let i:number=otherCCIndices.length-1;i>0;--i){
                    const otherCC=this.removeComponent(sc,otherCCIndices[i]);
                    for(const v of otherCC.vertices){
                        const info:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                        info.index=theIndex;
                        cc.vertices.push(v);
                    }
                }
            }

            return this;
        }


        public removeEdge(a:number,b:number):KCore{
            if(this.graph.removeEdge(a,b)==false){
                return this;
            }
            return this;
        }


        private removeComponent(shellComponent:ShellComponet,idx:number,setIndex:boolean=false):ConnectedComponent{
            const last:ConnectedComponent=shellComponent.connectedComponents[shellComponent.connectedComponents.length-1];
            const ret:ConnectedComponent=shellComponent.connectedComponents[idx];
            if(setIndex){
                for(const v of last.vertices){
                    const ccIdx:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                    ccIdx.index=idx;
                }//set the last first, just in case last==idx1, all indices of vertices will still be correctly setted after this
            }
            shellComponent.connectedComponents[idx]=last;
            shellComponent.connectedComponents.pop();
            ret.polygon?.remove();
            return ret;
        }


        private mergeComponent(shellComponent:ShellComponet,idx0:number,idx1:number):void{
            if(idx0>idx1){
                const temp:number=idx0;
                idx0=idx1;
                idx1=temp;
            }
            const a:ConnectedComponent=shellComponent.connectedComponents[idx0];
            const b:ConnectedComponent=this.removeComponent(shellComponent,idx1,true);
            
            for(const v of b.vertices){
                a.vertices.push(v);
                const ccIdx:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                ccIdx.index=idx0;
            }
        }
    }
    

    export class Point{
        public x:number;
        public y:number;

        constructor(x:number,y:number){
            this.x=x;
            this.y=y;
        }
    }


    export abstract class ConvesHull{
        private static points:Point[]=[];
        public static svg:SVGSVGElement;


        private static cross(o:Point,a:Point,b:Point):number{
            return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
        }


        public static Solve(cc:ConnectedComponent):void{
            if(cc.vertices.length<2){
                return;
            }
            const polygon:SVGPolygonElement=cc.polygon as SVGPolygonElement;
            polygon.points.clear();
            if(cc.vertices.length<4){
                for(const vertex of cc.vertices){
                    const p:SVGPoint=ConvesHull.svg.createSVGPoint();
                    p.x=vertex.x as number;
                    p.y=vertex.y as number;
                    polygon.points.appendItem(p);
                }
                return;
            }
    
            function approximately(a:number,b:number):boolean{
                return Math.abs(a-b)<0.0001;
            }
            cc.vertices.sort((a:Vertex,b:Vertex):number=>{
                if(approximately(a.x as number,b.x as number)){
                    if(approximately(a.y as number,b.y as number)){
                        return 0;
                    }else{
                        return (a.y as number)-(b.y as number);
                    }
                }else{
                    return (a.x as number)-(b.x as number);
                }
            });
    
            ConvesHull.points.length=0;
            for(const vertex of cc.vertices){
                const p:Point=new Point(vertex.x as number,vertex.y as number);
                while(ConvesHull.points.length>1&&ConvesHull.cross(ConvesHull.points[ConvesHull.points.length-2],ConvesHull.points[ConvesHull.points.length-1],p)<=0){
                    --ConvesHull.points.length;
                }
                ConvesHull.points.push(p);
            }
            
            const base:number=ConvesHull.points.length;
            for(let i:number=cc.vertices.length-2;i>=0;--i){
                const vertex:Vertex=cc.vertices[i];
                const p:Point=new Point(vertex.x as number,vertex.y as number);
                while(ConvesHull.points.length>base&&ConvesHull.cross(ConvesHull.points[ConvesHull.points.length-2],ConvesHull.points[ConvesHull.points.length-1],p)<=0){
                    --ConvesHull.points.length;
                }
                ConvesHull.points.push(p);
            }

            for(const p of ConvesHull.points){
                const realPoint:SVGPoint=ConvesHull.svg.createSVGPoint();
                realPoint.x=p.x;
                realPoint.y=p.y;
                polygon.points.appendItem(realPoint);
            }
        }
    }
}


class UnionFind{
    public readonly parents:number[]=[];
    public readonly stack:number[]=[];

    constructor(){}
    
    
    public set(size:number):UnionFind{
        this.parents.length=size;
        for(let i=0;i<size;++i){
            this.parents[i]=i;
        }
        return this;
    }

    public union(a:number,b:number):boolean{
        const p_a=this.find(a),p_b=this.find(b);

        if(p_a==p_b){
            return true;
        }else{
            this.parents[p_a]=p_b;
            return false;
        }
    }

    public find(a:number):number{
        let p:number=a;
        while(this.parents[p]!=p){
            this.stack.push(p);
            p=this.parents[p];
        }
        while(this.stack.length>0){
            const node:number=this.stack.pop() as number;
            this.parents[node]=p;
        }
        return p;
    }


    public flatten():void{
        for(let i:number=0;i<this.parents.length;++i){
            this.parents[i]=this.find(i);
        }
    }
}


async function delay(ms:number):Promise<void>{
    return new Promise((resolve:(value:void|Promise<void>)=>void,_reject:(reason?:any)=>void):void=>{
        setTimeout(resolve,ms);
    });
}