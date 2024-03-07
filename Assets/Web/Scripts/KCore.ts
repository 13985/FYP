/*
hide non k-shell if starting core is more than 1
force directed layoutt -explore alt?
color node as it goes ( start with white)
setting - to show not yet visualized current core nodes
add edge! deature  (bonus during visualzation)

*/

namespace KCoreAlgorithm{
    class KCoreCC extends GraphAlgorithm.ConnectedComponent implements GraphAlgorithm.IClearable{
        public static readonly pool:GraphAlgorithm.ObjectPool<KCoreCC>=new GraphAlgorithm.ObjectPool<KCoreCC>(KCoreCC);

        public shell:number=-1;
        public polygonOpacity:number=0.4;
        public polygon:SVGPolygonElement|null=null;

        constructor(shell:number=1){
            super();
            this.shell=shell;
        }
    }


    class ShellComponet{
        public connectedComponents:Array<KCoreCC>=[];
        public shell:number=-1;
        public color:Color=new Color(0,0,0);
        public step:number=0;
    }


    class ConnectedComponetInfo{
        public shell:number=0;
        public index:number=0;

        constructor(s:number,i:number){
            this.shell=s;
            this.index=i;
        }
    }


    class VertexStateInfo implements GraphAlgorithm.IStep{
        public step:number;
        public degree:number;
        public shell:number;
        public opacity:string;

        public constructor(step?:number,degree?:number,shell?:number,opacity?:string){
            this.degree=degree!=undefined?degree:0;
            this.step=step!=undefined?step:1;
            this.opacity=opacity!=undefined?opacity:KCore.OPACITY;
            this.shell=shell!=undefined?shell:-1;
        }

        public isProcessed():boolean{
            return this.shell>=0;
        }
    }


    class DisplayStateInfo implements GraphAlgorithm.IStep{
        public step:number=0;
    }


    /**
     * @complexity
     * space: O(V+E)
     */
    class State extends GraphAlgorithm.StateManager<VertexStateInfo,GraphAlgorithm.DescriptionStateInfo>{
        constructor(graph:Graph){
            super(graph);
            this.init();
        }


        public init(graph?:Graph):void{
            super.init(graph);
            this.graph.adjacencyList.forEach((vl:VerticeList,v_id:number):void=>{
                const vsi:VertexStateInfo=new VertexStateInfo();
                vsi.degree=vl.others.length;
                vsi.step=0;
                this.vertexStates.set(v_id,[vsi]);
            });
        }
    }


    export class KCore extends GraphAlgorithm.Algorithm{
        protected static readonly CODE_DESCRIPTION:string=
`maintain two set:
set0: storing all vertices wait for processing
set1: storing all unprocessed vertices with degree > expored current_core`;

        protected static readonly PSEUDO_CODES:GraphAlgorithm.DescriptionDisplay.PseudoCode[]=[
            {code:"push all vertices into set1, set current_core = 0;",step:1},
            {code:"while set1 is not empty :{",step:2},
            {code:"   push all vertices with degree <= current_core to set0;",step:3},
            {code:"   for all v in set0 :{",step:4},
            {code:"      check for its all neighbors:{",step:5},
            {code:"         if it is processed: continue;",step:6},
            {code:"         else:{",step:undefined},
            {code:"            decrement its degree;",step:7},
            {code:"            if its degree <= current_core, push it to set0;",step:8},
            {code:"         }",step:undefined},
            {code:"      }",step:undefined},
            {code:"   }",step:undefined},
            {code:"   current_shell++;",step:9},
            {code:"}",step:undefined},
        ];
        
        private static readonly PROCESSED:number=-2;
        public readonly shellComponents:Array<ShellComponet>=[];

        /**************************UI******************************************/
        public maxOption:HTMLSelectElement|null;
        public minOption:HTMLSelectElement|null;

        public static readonly OPACITY:string="0.3";
        private readonly polygonsContainer:SVGGElement;

        /**************************helper data structures**********************/
        private readonly degrees:Map<number,number>=new Map();
        private readonly inSet1:Map<number,number>=new Map();
        private readonly set0:number[]=[];
        private readonly set1:number[]=[];
        private readonly unionFind=new UnionFind();

        private readonly vertexToInfo:Map<number,ConnectedComponetInfo>=new Map();

        /**************************visualization control***********************/
        public readonly IsAnimationRunning:()=>boolean=():boolean=>this.isAnimating;

        private states?:State;


        constructor(g:Graph,svg:SVGSVGElement,polygonsContainer:SVGGElement){
            super(g,svg);
            this.maxOption=null;
            this.minOption=null;
            this.polygonsContainer=polygonsContainer;
        }


        public setGraph(g:Graph):this{
            this.graph=g;
            this.preprocess();
            return this;
        }


        public setColorGradient(start_:Color,end_:Color):this{
            const start:Color=start_.clone();//copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const end:Color=end_.clone();//copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const shellCount:number=this.shellComponents.length;
            const interval:number=shellCount-1;

            for(let i:number=0;i<shellCount;++i){
                Color.lerp(this.shellComponents[i].color,start,end,i/interval);
            }
            return this;
        }


        public createState():this{
            if(this.states){
                this.states.init(this.graph);
            }else{
                this.states=new State(this.graph);
            }
            GraphAlgorithm.DescriptionDisplay.clearPanel();
            GraphAlgorithm.DescriptionDisplay.codeDescription.innerText=KCore.CODE_DESCRIPTION;
            GraphAlgorithm.DescriptionDisplay.setCodes(KCore.PSEUDO_CODES);

            this.clearHelpers();
            let currentShell=0,nextShell=1;
            let step:number=0;
            this.states.addDescriptionState(
                {step:step,codeStep:1,stepDescription:"initization"}
            );

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
                ++step;
                this.shellComponents[currentShell].step=step;
                this.states.addDescriptionState({step:step,codeStep:2,stepDescription:`set1.length:${this.set1.length} current_core:${currentShell}`});

                while(this.set0.length>0){
                    const v_id:number=<number>this.set0.pop();
                    const vl:VerticeList=<VerticeList>this.graph.adjacencyList.get(v_id);
                    (this.vertexToInfo.get(v_id) as ConnectedComponetInfo).shell=currentShell;

                    ++step;
                    this.states.addDataState(v_id,new VertexStateInfo(step,undefined,currentShell,"1"));
                    this.states.addDescriptionState({step:step,codeStep:4,stepDescription:`process vertex ${v_id} in core ${currentShell}`});

                    for(const neighbor of vl.others){
                        let degree:number=(this.degrees.get(neighbor) as number);

                        ++step;
                        this.states.addDescriptionState({step:step,codeStep:5,stepDescription:`check neighbor ${neighbor} of vertex ${v_id} in core ${currentShell}<br>processed:${degree<0}`});

                        if(degree<0){
                            continue;
                        }
                        ++step;
                        this.states.addDataState(neighbor,new VertexStateInfo(step,degree,undefined,"1"));

                        --degree;

                        ++step;
                        this.states.addDataState(neighbor,new VertexStateInfo(step,degree,undefined,KCore.OPACITY));
                        this.states.addDescriptionState({step:step,codeStep:7,stepDescription:`decrement degree of ${neighbor} from ${degree+1} to ${degree}<br>less than or equal to current_core (${currentShell})? ${degree<=currentShell}`});

                        if(degree<=currentShell){
                            this.removeFromSet1(neighbor);
                        }else{
                            nextShell=Math.min(nextShell,degree);
                            this.degrees.set(neighbor,degree);
                        }
                    }
                    ++step;
                    this.states.addDataState(v_id,new VertexStateInfo(step,undefined,currentShell,KCore.OPACITY));
                }
                
                currentShell=nextShell;
                if(this.set1.length<=0){
                    break;
                }
                
                ++step;
                this.states.addDescriptionState({step:step,codeStep:9,stepDescription:`increment current_core ${currentShell}`});
                                
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
            this.states.onInitEnd(step);
            return this;
        }


        public clearState():this{
            this.states?.clear();
            return this;
        }


        public preprocess():this{
            this.unionFind.set(this.graph.vertices.length);
            for(const sc of this.shellComponents){
                for(const cc of sc.connectedComponents){
                    cc.polygon?.remove();
                }
            }
            
            for(const sc of this.shellComponents){
                for(const cc of sc.connectedComponents){
                    KCoreCC.pool.release(cc);
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
                const sc:KCoreCC[]=this.shellComponents[info.shell].connectedComponents;
                const cc:KCoreCC=KCoreCC.pool.get();
                cc.shell=info.shell;
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

            return this;
        }
        
        
        protected async animate():Promise<void>{
            GraphAlgorithm.VideoControl.progressBar.setAttribute("max",(this.states as State).maxStep.toString());
            for(const v of this.graph.vertices){
                (v.circle as SVGCircleElement).setAttribute("opacity",KCore.OPACITY);
            }
            this.setVisualElementsColor(true);
            this.hideVerticesOutsideShells();

            if(this.states==undefined){return;}
            let vertexInfos:VertexStateInfo[]|null;
            this.states.resetStep();

            const minShell:number=parseInt((this.minOption as HTMLSelectElement).value);
            const maxShell:number=parseInt((this.maxOption as HTMLSelectElement).value);
            const maxStep:number=maxShell>=this.shellComponents.length?Number.MAX_SAFE_INTEGER:this.shellComponents[maxShell+1].step;
            const minStep:number=this.shellComponents[maxShell].step;

            AnimtaionLoop:while(true){
                const vsc:GraphAlgorithm.VideoControlStatus=await this.waitfor();
                switch(vsc){
                case GraphAlgorithm.VideoControlStatus.stop:
                    break AnimtaionLoop;
                case GraphAlgorithm.VideoControlStatus.noAction:
                case GraphAlgorithm.VideoControlStatus.nextStep:
                    if((vertexInfos=this.states.nextStep())==null){
                        break AnimtaionLoop;
                    }
                    this.setAnimationDisplay(vertexInfos,this.states.currentDescriptionState());
                    break;
                case GraphAlgorithm.VideoControlStatus.prevStep:
                    if((vertexInfos=this.states.previousStep())==null){
                        this.currentStep=0;
                        break;
                    }
                    this.setAnimationDisplay(vertexInfos,this.states.currentDescriptionState());
                    break;
                case GraphAlgorithm.VideoControlStatus.randomStep:
                    if((vertexInfos=this.states.randomStep(this.currentStep))==null){
                        vertexInfos=this.states.randomStep(0);
                        this.currentStep=0;
                    }
                    this.setAnimationDisplay(vertexInfos,this.states.currentDescriptionState());
                    break;
                }
                GraphAlgorithm.VideoControl.progressBar.valueAsNumber=this.states.currentStep;
            }

            for(const v of this.graph.vertices){
                (v.circle as SVGCircleElement).setAttribute("opacity","1");
            };
            this.displayVerticesInRange(0,this.shellComponents.length,true);
        }


        private removeFromSet1(target:number):void{
            this.set0.push(target);
            this.degrees.set(target,KCore.PROCESSED);
            const last:number=this.set1[this.set1.length-1];
            const idx:number=this.inSet1.get(target) as number;
            this.set1[idx]=last;
            this.inSet1.set(last,idx);
            this.inSet1.delete(target);
            this.set1.pop();
        }


        private clearHelpers():void{
            this.degrees.clear();
            this.inSet1.clear();
            this.set0.length=0;
            this.set1.length=0;
        }


        public setSelects(min:HTMLSelectElement,max:HTMLSelectElement):KCore{
            this.minOption=min;
            this.maxOption=max;
            this.refreshSelect();

            this.minOption.addEventListener("input",()=>{
                this.createOptions(parseInt((this.minOption as HTMLSelectElement).value),this.shellComponents.length,this.maxOption as HTMLSelectElement);
            });
            this.maxOption.addEventListener("input",()=>{
                this.createOptions(0,parseInt((this.maxOption as HTMLSelectElement).value)+1,this.minOption as HTMLSelectElement);
            });
            return this;
        }


        private refreshSelect():void{
            if(this.minOption==null||this.maxOption==null){return;}
            this.createOptions(0,this.shellComponents.length,this.minOption);
            this.createOptions(0,this.shellComponents.length,this.maxOption);
            this.minOption.value="0";
            this.maxOption.value=(this.shellComponents.length-1).toString();
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


        private setAnimationDisplay(vertexInfos:VertexStateInfo[]|null,descriptionInfo:GraphAlgorithm.DescriptionStateInfo):void{
            if(vertexInfos==null){return;}
            for(let i:number=0;i<this.graph.vertices.length;++i){
                const vertex:Vertex=this.graph.vertices[i];
                const info:VertexStateInfo=vertexInfos[i];
                vertex.circle?.setAttribute("opacity",info.opacity);
                if(info.isProcessed()){
                    vertex.circle?.setAttribute("fill",this.shellComponents[info.shell].color.toString());
                }else{
                    vertex.circle?.setAttribute("fill","var(--reverse-color2)");
                }
            }

            GraphAlgorithm.DescriptionDisplay.highlightCode(descriptionInfo.codeStep);
            GraphAlgorithm.DescriptionDisplay.stepDescription.innerHTML=descriptionInfo.stepDescription;
        }


        public setVisualElementsColor(defaultColor:boolean):this{
            this.showDefaultColor=defaultColor;
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
                        cc.polygon?.setAttribute("fill",sc.color.toString());
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
                    if(this.degrees.get(v.id) as number!=KCore.PROCESSED){
                        (v.circle as SVGCircleElement).setAttribute("fill","var(--reverse-color2)");
                    }
                }
            }
            return this;
        }


        private hideVerticesOutsideShells():void{
            const min:number=parseInt((this.minOption as HTMLSelectElement).value),max:number=parseInt((this.maxOption as HTMLSelectElement).value);
            this.displayVerticesInRange(0,min,false);//then for the edge connected to outside shell, hide them
            this.displayVerticesInRange(min,max+1,true);//set the edges visible first (some edge may connected to outside shell)
            this.displayVerticesInRange(max+1,this.shellComponents.length,false);
        }


        public displayPolygons(show:boolean):KCore{
            const value:string=show?"visible":"hidden";
            for(const sc of this.shellComponents){
                for(const cc of sc.connectedComponents){
                    if(cc.vertices.length<3){continue;}
                    else{
                        this.setPolygon(cc,sc);
                        (cc.polygon as SVGElement).setAttribute("visibility",value);
                    }
                }
            }
            return this;
        }


        public refreshPolygons(vertex:Vertex):void{
            const info:ConnectedComponetInfo=this.vertexToInfo.get(vertex.id) as ConnectedComponetInfo;
            const cc:KCoreCC=this.shellComponents[info.shell].connectedComponents[info.index];
            ConvesHull.Solve(cc,this.svgContainer);
        }


        public addEdge(a:number,b:number):KCore{
            if(this.graph.addEdge(a,b)==false){
                return this;
            }
            const a_idx:ConnectedComponetInfo=this.vertexToInfo.get(a) as ConnectedComponetInfo;
            const b_idx:ConnectedComponetInfo=this.vertexToInfo.get(b) as ConnectedComponetInfo;
            let theInfo:ConnectedComponetInfo;

            if(a_idx.shell!=b_idx.shell){
                if(a_idx.shell>b_idx.shell){
                    theInfo=b_idx;
                }else{
                    theInfo=a_idx;
                }
            }else{
                if(a_idx.index!=b_idx.index){
                    this.mergeComponent(this.shellComponents[a_idx.shell],a_idx.index,b_idx.index);
                }
                theInfo=a_idx;
            }

            this.KCore_ConnectedComponent(theInfo);
            return this;
        }


        public removeEdge(a:number,b:number):KCore{
            if(this.graph.removeEdge(a,b)==false){
                return this;
            }
            const a_idx:ConnectedComponetInfo=this.vertexToInfo.get(a) as ConnectedComponetInfo;
            const b_idx:ConnectedComponetInfo=this.vertexToInfo.get(b) as ConnectedComponetInfo;
            let theInfo:ConnectedComponetInfo;

            if(a_idx.shell!=b_idx.shell){
                if(a_idx.shell>b_idx.shell){//higher shell not affacted by lower shell vertex
                    theInfo=b_idx;
                }else{
                    theInfo=a_idx;
                }
            }else{//they must be in the same connected component
                theInfo=a_idx;
            }

            this.KCore_ConnectedComponent(theInfo);
            return this;
        }


        public addVertex(a:number):void{
            const v:Vertex|null=this.graph.addVertex(a);
            if(v==null){return;}

            const sc:ShellComponet=this.shellComponents[0];
            const info:ConnectedComponetInfo=new ConnectedComponetInfo(0,sc.connectedComponents.length);
            const cc:KCoreCC=KCoreCC.pool.get();
            sc.connectedComponents.push(cc);
            cc.shell=0;
            this.setPolygon(cc,sc);
            cc.vertices.push(v);
            v.setColor(sc.color);
        }


        public removeVertex(a:number):void{
            if(this.graph.removeVertex(a)==null){
                return;
            }
            const info:ConnectedComponetInfo=this.vertexToInfo.get(a) as ConnectedComponetInfo;
            const cc:KCoreCC=this.shellComponents[info.shell].connectedComponents[info.index];
            cc.removeVertex(a);
            this.KCore_ConnectedComponent(info);
            this.vertexToInfo.delete(a);
        }


        private removeComponent(shellComponent:ShellComponet,idx:number,setIndex:boolean=false):KCoreCC{
            const ret:KCoreCC=shellComponent.connectedComponents[idx];
            const lastIdx:number=shellComponent.connectedComponents.length-1;
            if(setIndex&&idx<lastIdx){
                const last:KCoreCC=shellComponent.connectedComponents[lastIdx];
                for(const v of last.vertices){
                    const ccIdx:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                    ccIdx.index=idx;
                }
                shellComponent.connectedComponents[idx]=last;
            }
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
            const a:KCoreCC=shellComponent.connectedComponents[idx0];
            const b:KCoreCC=this.removeComponent(shellComponent,idx1,true);
            
            for(const v of b.vertices){
                a.vertices.push(v);
                const ccIdx:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                ccIdx.index=idx0;
            }
            b.polygon?.remove();
            KCoreCC.pool.release(b);
        }


        private KCore_ConnectedComponent(theInfo:ConnectedComponetInfo):void{
            const theCC:KCoreCC=this.shellComponents[theInfo.shell].connectedComponents[theInfo.index];
            this.unionFind.set(this.graph.vertices.length);
            this.clearHelpers();
            let minDegree:number=Number.MAX_SAFE_INTEGER;
            const orginalShell:number=theInfo.shell;//copy the shell, since info will be change while iteration

            for(const v of theCC.vertices){//find the minimum degree of vertex
                let d:number=0;
                for(const other of (v.list as VerticeList).others){
                    if((this.vertexToInfo.get(other) as ConnectedComponetInfo).shell>=theCC.shell){
                        ++d;
                    }
                }
                this.degrees.set(v.id,d);
                minDegree=Math.min(minDegree,d);
            }
            for(const v of theCC.vertices){//group the vertices
                if((this.degrees.get(v.id) as number)<=minDegree){
                    this.set0.push(v.id);
                    this.degrees.set(v.id,-1);
                }else{
                    this.inSet1.set(v.id,this.set1.length);//i have no idea why sometime this method work without this line
                    this.set1.push(v.id);
                }
            }

            let currentShell:number=minDegree;
            let nextShell:number=minDegree+1;
            //atmost 2 iteration after added an edge (degree+1) or remove an egde (degree-1)

            while(true){//run kcore
                while(this.set0.length>0){
                    const v_id:number=<number>this.set0.pop();
                    const vl:VerticeList=<VerticeList>this.graph.adjacencyList.get(v_id);
                    (this.vertexToInfo.get(v_id) as ConnectedComponetInfo).shell=currentShell;

                    for(const neighbor of vl.others){
                        let degree:number|undefined=this.degrees.get(neighbor);
                        if(degree==undefined){
                            continue;
                        }else if(degree<0){
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
                
                if(this.set1.length<=0){
                    break;
                }
                currentShell=nextShell;
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
            this.unionFind.flatten();
            this.removeComponent(this.shellComponents[orginalShell],theInfo.index,true);//the index of info did got changed, actually remove theCC

            //for storing the vertices
            const oldShell:number[]=this.set0;
            const newShell:number[]=this.set1;
            oldShell.length=0;
            newShell.length=0;

            if(currentShell>=this.shellComponents.length){
                const sc=new ShellComponet();
                sc.shell=currentShell;
                this.shellComponents.push(sc);
                this.setColorGradient(this.shellComponents[0].color,this.shellComponents[this.shellComponents.length-2].color);
                this.refreshSelect();
            }
            
            //parents create the connected component
            for(const v of theCC.vertices){//separate the vertex into two group depend on if their shell change
                const info:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                if(info.shell!=theCC.shell){
                    newShell.push(v.id);
                    if(v.id!=this.unionFind.parents[v.id])continue;
                }else{
                    oldShell.push(v.id);
                    if(v.id!=this.unionFind.parents[v.id])continue;
                }
                const sc:KCoreCC[]=this.shellComponents[info.shell].connectedComponents;
                const cc:KCoreCC=KCoreCC.pool.get();
                cc.shell=info.shell;
                info.index=sc.length;
                cc.vertices.push(v);
                sc.push(cc);
            }

            for(const v of oldShell){//load the vertex that shell doesnt got changed
                if(v==this.unionFind.parents[v])continue;
                const info:ConnectedComponetInfo=this.vertexToInfo.get(v) as ConnectedComponetInfo;
                const parentInfo:ConnectedComponetInfo=this.vertexToInfo.get(this.unionFind.parents[v]) as ConnectedComponetInfo;
                this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push((this.graph.adjacencyList.get(v) as VerticeList).main);
                info.index=parentInfo.index;
            }

            for(const v of oldShell){//construct the convex hull
                if(v!=this.unionFind.parents[v])continue;
                const info:ConnectedComponetInfo=this.vertexToInfo.get(v) as ConnectedComponetInfo;
                const sc:ShellComponet=this.shellComponents[info.shell];
                const cc:KCoreCC=sc.connectedComponents[info.index];
                this.setPolygon(cc,sc);
                ConvesHull.Solve(cc,this.svgContainer);
            }

            //console.log(`new ${newShell}`);
            //console.log(`old ${oldShell}`);
            if(newShell.length>0){
                const otherCCIndices:number[]=oldShell;
                const inNewShell:Map<number,number>=this.degrees;
                inNewShell.clear();
    
                if(this.showDefaultColor==false){
                    const info=this.vertexToInfo.get(newShell[0]) as ConnectedComponetInfo;
                    const color:string=this.shellComponents[info.shell].color.toString();
                    for(const v of newShell){
                        const vl=this.graph.adjacencyList.get(v) as VerticeList;
                        vl.main.circle?.setAttribute("fill",color);
                    }
                }
    
                for(const v of newShell){//load the vertices of new shell
                    inNewShell.set(v,0);
                    if(v==this.unionFind.parents[v])continue;
                    const info:ConnectedComponetInfo=this.vertexToInfo.get(v) as ConnectedComponetInfo;
                    const parentInfo:ConnectedComponetInfo=this.vertexToInfo.get(this.unionFind.parents[v]) as ConnectedComponetInfo;
                    this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push((this.graph.adjacencyList.get(v) as VerticeList).main);
                    info.index=parentInfo.index;
                }
    
                for(const v of newShell){//find all other connected components that can be merged
                    if(v!=this.unionFind.parents[v]){continue;}
                    const parentInfo:ConnectedComponetInfo=this.vertexToInfo.get(v) as ConnectedComponetInfo;
                    const sc:ShellComponet=this.shellComponents[parentInfo.shell];
                    const cc:KCoreCC=sc.connectedComponents[parentInfo.index];//search the component
    
                    otherCCIndices.length=0;
                    otherCCIndices.push(parentInfo.index);
                    for(const v_ of cc.vertices){//for all vertices in this component
                        const vl:VerticeList=v_.list as VerticeList;
                        for(const other of vl.others){//find all connected component on same shell that can merge
                            if(inNewShell.get(other)!=undefined){continue}
                            const otherInfo:ConnectedComponetInfo=this.vertexToInfo.get(other) as ConnectedComponetInfo;
                            if(otherInfo.shell==parentInfo.shell){
                                otherCCIndices.push(otherInfo.index);
                            }
                        }
                    }
    
                    if(otherCCIndices.length>1){
                        otherCCIndices.sort((a:number,b:number):number=>{return a-b;});
                        let len=0;
                        for(let i:number=0,j:number;i<otherCCIndices.length;i=j){
                            for(j=i+1;j<otherCCIndices.length&&otherCCIndices[i]==otherCCIndices[j];++j){}
                            otherCCIndices[len++]=otherCCIndices[j-1];
                        }
                        otherCCIndices.length=len;
                    }

                    const minIndex:number=otherCCIndices[0];
                    const minCC:KCoreCC=this.shellComponents[parentInfo.shell].connectedComponents[minIndex];
                    for(let i:number=otherCCIndices.length-1;i>0;--i){
                        const otherCC:KCoreCC=this.removeComponent(sc,otherCCIndices[i],true);
                        for(const v of otherCC.vertices){
                            const info:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                            info.index=minIndex;
                            minCC.vertices.push(v);
                        }
                        KCoreCC.pool.release(otherCC);
                    }
                    this.setPolygon(minCC,sc);
                    ConvesHull.Solve(minCC,this.svgContainer);
                }
            }
            KCoreCC.pool.release(theCC);
            this.checkCCs();
        }


        private setPolygon(cc:KCoreCC,sc:ShellComponet):void{
            if(cc.vertices.length<3){
                return;
            }
            if(cc.polygon==undefined||cc.polygon==null){
                cc.polygon=document.createElementNS("http://www.w3.org/2000/svg","polygon");
                ConvesHull.Solve(cc,this.svgContainer);
                this.polygonsContainer.insertAdjacentElement("afterbegin",cc.polygon);
            }
            (cc.polygon as SVGElement).setAttribute("opacity",cc.polygonOpacity.toString());
            (cc.polygon as SVGElement).setAttribute("fill",sc.color.toString());
            if(this.showDefaultColor){
                (cc.polygon as SVGElement).setAttribute("visibility","hidden");
            }
        }


        private checkCCs():void{
            for(let shell=0;shell<this.shellComponents.length;++shell){
                const sc:ShellComponet=this.shellComponents[shell];
                for(let i=0;i<sc.connectedComponents.length;++i){
                    const cc:KCoreCC=sc.connectedComponents[i];
                    for(const v of cc.vertices){
                        const info:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                        if(info.shell!=shell||info.index!=i){
                            console.log(`fail at (stored in) shell:${shell} cc idx:${i} of v:${v.id} (incorrect values: shell:${info.shell} idx:${info.index})`);
                            throw  new Error();
                        }
                    }
                }
            }

            for(const v of this.graph.vertices){
                const info:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                const cc:KCoreCC=this.shellComponents[info.shell].connectedComponents[info.index];
                let have:boolean=false;
                for(const _v of cc.vertices){
                    if(v.id==_v.id){
                        have=true;
                        break;
                    }
                }
                if(have==false){
                    console.log(`fail at ${v.id} (incorrect values: shell:${info.shell} idx:${info.index})`);
                    throw new Error();
                }
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

        private static cross(o:Point,a:Point,b:Point):number{
            return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
        }


        public static Solve(cc:KCoreCC,svg:SVGSVGElement):void{
            if(cc.vertices.length<3){
                return;
            }
            const polygon:SVGPolygonElement=cc.polygon as SVGPolygonElement;
            polygon.points.clear();
            if(cc.vertices.length<4){
                for(const vertex of cc.vertices){
                    const p:SVGPoint=svg.createSVGPoint();
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
                const realPoint:SVGPoint=svg.createSVGPoint();
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
