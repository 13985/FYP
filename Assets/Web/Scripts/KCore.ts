/*
hide non k-shell if starting core is more than 1
force directed layoutt -explore alt?
color node as it goes ( start with white)
setting - to show not yet visualized current core nodes
add edge! deature  (bonus during visualzation)

*/

namespace KCoreAlgorithm{
    class KCoreCC extends VisualizationUtils.ConnectedComponent implements VisualizationUtils.IClearable{
        public static readonly POOL:VisualizationUtils.ObjectPool<KCoreCC>=new VisualizationUtils.ObjectPool<KCoreCC>(KCoreCC);

        public shell:number=-1;

        constructor(shell:number=1){
            super();
            this.shell=shell;
        }

        public clone(){
            const cc=KCoreCC.POOL.get();
            cc.shell=this.shell;
            return cc;
        }
    }


    class ShellComponet{
        public connectedComponents:Array<KCoreCC>=[];
        public shell:number=-1;
        public color:Color=new Color(0,0,0);
        public step:number=-1;

        public clone():ShellComponet{
            const sc:ShellComponet=new ShellComponet();
            sc.shell=this.shell;
            sc.color=this.color.clone();
            return sc;
        }
    }


    class CorePolygon{
        public bound:Vertex[]=[];
        public polygon:SVGPolygonElement;
        private show:boolean=false;
        public dataKey:number;

        constructor(p:SVGPolygonElement,key:number=0){
            this.polygon=p;
            this.dataKey=key;
        }

        public display(show:boolean):this{
            this.show=show;
            if(show){
                this.polygon.setAttribute("visibility","visible");
            }else{
                this.polygon.setAttribute("visibility","hidden");
            }
            return this;
        }


        public isShowing():boolean{
            return this.show;
        }
    }


    class ConnectedComponetInfo{
        public shell:number=0;
        public index:number=0;

        constructor(s:number,i:number){
            this.shell=s;
            this.index=i;
        }

        public clone():ConnectedComponetInfo{
            const info=new ConnectedComponetInfo(this.shell,this.index);
            return info;
        }
    }


    class DataState implements VisualizationUtils.IStep, VisualizationUtils.IClearable{
        public static readonly POOL=new VisualizationUtils.ObjectPool<DataState>(DataState,1024);
        public step:number=0;
        public degree:number=-1;
        public shell:number=-1;
        public opacity:string="0.3";
        public text:string="";

        public constructor(){}
        

        public set(step?:number,degree?:number,shell?:number,opacity?:string,text?:string):this{
            this.degree=degree!=undefined?degree:0;
            this.step=step!=undefined?step:1;
            this.opacity=opacity!=undefined?opacity:"0.3";
            this.shell=shell!=undefined?shell:-1;
            this.text=text!=undefined?text:"";
            return this;
        }

        public isProcessed():boolean{
            return this.shell>=0;
        }

        public clear():void{
            this.shell=-1;
            this.degree=0;
            this.opacity="0.3";
        }


        public canPolygonShow():boolean{
            return this.shell>=0;
        }
        public setPolygonHide():this{
            this.shell=-1;
            return this;
        }
        public setPolygonShow():this{
            this.shell=1;
            return this;
        }
    }


    class TreeNode extends VisualizationUtils.TreeNodeBase<VisualizationUtils.DescriptionState>{
        public static readonly POOL=new VisualizationUtils.ObjectPool<TreeNode>(TreeNode,1024);
    }

    /**
     * @complexity
     * space: O(V+E)
     */
    class State extends VisualizationUtils.GraphStateManager<DataState,VisualizationUtils.DescriptionState>{
        constructor(graph:Graph){
            super(graph);
            this.init();
        }
        
        /**
         * @summary order of dataKey is the same as order of vertex in graph.vertices
         */
        protected setDataKeys():void{
            this.dataKeys.length=this.graph.vertices.length;
            for(let i:number=0;i<this.graph.vertices.length;++i){
                this.dataKeys[i]=this.graph.vertices[i].id;
            }
        }


        public addPolygonKeys(corePolygons:CorePolygon[],trueLength:number):this{
            const base:number=this.dataKeys.length;
            this.addAdditionalDataKets(trueLength);
            for(let i:number=0;i<trueLength;++i){
                const theKey:number=corePolygons[i].dataKey;
                if(this.dataStates.has(theKey)){
                    throw new Error("polygon key same as vertice id");
                }else{
                    this.dataStates.set(theKey,[DataState.POOL.get().set(0).setPolygonHide()]);
                }
                this.dataKeys[base+i]=theKey;
            }
            return this;
        }


        public init():this{
            for(const kvp of this.dataStates){
                for(const state of kvp[1]){
                    DataState.POOL.release(state);
                }
            }
            super.clear();
            super.init();
            this.graph.adjacencyList.forEach((vl:VerticeList,v_id:number):void=>{
                const dv:DataState=DataState.POOL.get();
                dv.degree=vl.others.length;
                dv.step=0;
                this.dataStates.set(v_id,[dv]);
            });
            return this;
        }

        protected getTreeNode(): VisualizationUtils.TreeNodeBase<VisualizationUtils.DescriptionState> {
            return TreeNode.POOL.get();
        }
        protected releaseTreeNode(node: VisualizationUtils.TreeNodeBase<VisualizationUtils.DescriptionState>): void {
            TreeNode.POOL.release(node);
        }
    }


    export class KCore extends VisualizationUtils.Algorithm{
        protected static readonly CODE_DESCRIPTION:string=
`maintain two set:
set0: storing all vertices wait for processing
set1: storing all unprocessed vertices with degree > expored current_core`;

        protected static readonly PSEUDO_CODES:VisualizationUtils.DescriptionDisplay.PseudoCode[]=[
            {code:"push all vertices into set1, set current_core = 0;",step:1},
            {code:"while set1 is not empty :{",step:2},
            {code:"   push all vertices with degree <= current_core to set0;",step:3},
            {code:"   for all v in set0 :{",step:4},
            {code:"      check for its all neighbors:{",step:5},
            {code:"         if it is not in set1: continue;",step:6},
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
        
        /**************************UI******************************************/
        private maxOption:HTMLSelectElement|null;
        private minOption:HTMLSelectElement|null;

        public static readonly OPACITY:string="0.3";
        private readonly polygonsContainer:SVGGElement;

        private readonly corePolygons:CorePolygon[]=[];

        /**************************helper data structures**********************/
        private readonly degrees:Map<number,number>=new Map();
        private readonly inSet1:Map<number,number>=new Map();
        private readonly set0:number[]=[];
        private readonly set1:number[]=[];
        private readonly unionFind=new UnionFind();

        /**************************index data structures**********************/
        private shellComponents:Array<ShellComponet>=[];
        private readonly vertexToInfo:Map<number,ConnectedComponetInfo>=new Map();

        /**************************animation state***************************/
        private states?:State;

        constructor(g:Graph,svg:SVGSVGElement,gw:GraphWindow){
            super(g,svg,gw);
            this.maxOption=null;
            this.minOption=null;
            this.polygonsContainer=gw.allG;
        }


        public setIndexStructure(other:KCoreAlgorithm.KCore):this{
            this.shellComponents=other.shellComponents;
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


        protected onRegisterSelf(): void {
            VisualizationUtils.DescriptionDisplay.clearPanel();
            VisualizationUtils.DescriptionDisplay.codeDescription.innerText=KCore.CODE_DESCRIPTION;
            VisualizationUtils.DescriptionDisplay.setCodes(KCore.PSEUDO_CODES);
            this.minOption?.classList.toggle("hide",false);
            this.maxOption?.classList.toggle("hide",false);
            VisualizationUtils.VideoControl.maxStepSpan.innerText=`${this.states?.maxStep}`;
            VisualizationUtils.Algorithm.setCurrentStep(0);
        }

        
        protected onUnregisterSelf(): void {
            super.onRegisterSelf();
            this.minOption?.classList.toggle("hide",true);
            this.maxOption?.classList.toggle("hide",true);
        }


        public createState():this{
            this.ensurePolygons().clearHelpers();
            for(let i:number=0;i<this.shellComponents.length;++i){
                this.corePolygons[i].dataKey=Graph.MAXIMUM_VERTICES+i;
            }

            if(this.states){
                this.states.init();
            }else{
                this.states=new State(this.graph);
            }
            this.states.addPolygonKeys(this.corePolygons,this.shellComponents.length);
            let currentShell=0,nextShell=1;
            let step:number=0;

            this.states.localStatePush({step:step,codeStep:1,stepDescription:"initization"});
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
                this.states?.dataStatePush(vl.main.id,DataState.POOL.get().set(step,vl.others.length,undefined,KCore.OPACITY,`${vl.main.id}:deg(${vl.others.length})`));
            });
            ++step;
            
            while(true){
                this.states.localStateTop({step:step,codeStep:2,stepDescription:`set1.length:${this.set1.length} current_core:${currentShell}`});
                this.states.dataStatePush(this.corePolygons[currentShell].dataKey,DataState.POOL.get().set(step).setPolygonShow());
                ++step;
                this.states.localStateTop({step:step,codeStep:3,stepDescription:`push vertices with degree < ${currentShell} to set0`});
                ++step;
                this.states.localStateTop({step:step,codeStep:3,stepDescription:`current_core: ${currentShell} `});
                ++step;

                while(this.set0.length>0){
                    const v_id:number=<number>this.set0.pop();
                    const vl:VerticeList=<VerticeList>this.graph.adjacencyList.get(v_id);

                    this.states.dataStatePush(v_id,DataState.POOL.get().set(step,undefined,currentShell,"1",`${v_id}:deg(/)`));
                    this.states.localStatePush({step:step,codeStep:4,stepDescription:`process vertex ${v_id}`});
                    ++step;

                    for(const neighbor of vl.others){
                        let degree:number=(this.degrees.get(neighbor) as number);

                        this.states.localStatePush({step:step,codeStep:5,stepDescription:`check neighbor ${neighbor}`});
                        ++step;
                        
                        if(degree<0){
                            this.states.localStateTop({step:step,codeStep:6,stepDescription:`neighbor ${neighbor} is not in set1`});
                            ++step;
                        }else{
                            --degree;
                            
                            this.states.dataStatePush(neighbor,DataState.POOL.get().set(step,degree,undefined,"1",`${neighbor}:deg(${degree})`));
                            this.states.localStateTop({step:step,codeStep:7,stepDescription:`decrement degree of ${neighbor} from ${degree+1} to ${degree}`});
                            ++step;
                            if(degree<=currentShell){
                                this.states.localStateTop({step:step,codeStep:8,stepDescription:`degree (${degree}) of neighbor ${neighbor} is <= current_core (${currentShell})`});
                                ++step;
                                this.removeFromSet1(neighbor);
                            }else{
                                nextShell=Math.min(nextShell,degree);
                                this.degrees.set(neighbor,degree);
                            }
                            this.states.dataStatePush(neighbor,DataState.POOL.get().set(step,degree,undefined,KCore.OPACITY,`${neighbor}:deg(${degree})`));
                            ++step;
                        }
                        this.states.localStatePop(step);
                    }
                    this.states.dataStatePush(v_id,DataState.POOL.get().set(step,undefined,currentShell,KCore.OPACITY,`${v_id}:deg(/)`));
                    this.states.localStatePop(step);
                    ++step;
                }
                
                if(this.set1.length<=0){
                    break;
                }
                currentShell=nextShell;
                nextShell=currentShell+1;

                this.states.localStateTop({step:step,codeStep:9,stepDescription:`increment current_core to ${currentShell}`});
                ++step;
                
                for(let i:number=0;i<this.set1.length;){
                    const d:number=this.degrees.get(this.set1[i]) as number;
                    if(d<=currentShell){
                        this.removeFromSet1(this.set1[i]);
                    }else{
                        ++i;
                    }
                }
            }
            this.states.localStatePop(step);
            this.states.onInitEnd(step);
            this.refreshSelect();
            VisualizationUtils.VideoControl.maxStepSpan.innerText=`${this.states.maxStep}`;
            return this;
        }


        public createIndexStructure():this{
            this.unionFind.set(this.graph.vertices.length);
            this.releaseCCs().clearHelpers().vertexToInfo.clear();

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
                if(this.set1.length<=0&&this.set0.length<=0){
                    break;
                }
                const sc=new ShellComponet();
                sc.connectedComponents.push(KCoreCC.POOL.get());
                sc.shell=currentShell;
                this.shellComponents.push(sc);

                while(this.set0.length>0){
                    const v_id:number=<number>this.set0.pop();
                    const vl:VerticeList=<VerticeList>this.graph.adjacencyList.get(v_id);
                    (this.vertexToInfo.get(v_id) as ConnectedComponetInfo).shell=currentShell;
                    sc.connectedComponents[0].vertices.push(vl.main);

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

            for(const sc of this.shellComponents){
                const theCC:KCoreCC=sc.connectedComponents[0];
                sc.connectedComponents.length=0;

                for(const v of theCC.vertices){
                    if(this.degrees.has(v.id)){continue;}

                    const newCC:KCoreCC=KCoreCC.POOL.get();
                    newCC.shell=sc.shell;
                    this.findConnected(v,newCC,sc.connectedComponents.length);
                    sc.connectedComponents.push(newCC);
                }

                KCoreCC.POOL.release(theCC);
            }

            this.ensurePolygons().calculateBound();
            return this;
        }
        
        
        protected async animate():Promise<void>{
            VisualizationUtils.VideoControl.progressBar.setAttribute("max",(this.states as State).maxStep.toString());
            for(const v of this.graph.vertices){
                (v.circle as SVGCircleElement).setAttribute("opacity",KCore.OPACITY);
            }
            this.setVisualElementsColor(true);
            this.hideVerticesOutsideShells();

            if(this.states==undefined){return;}
            let dataStates:DataState[]|null;
            this.states.resetStep();

            const minShell:number=parseInt((this.minOption as HTMLSelectElement).value);
            const maxShell:number=parseInt((this.maxOption as HTMLSelectElement).value);
            const maxStep:number=maxShell+1>=this.shellComponents.length?Number.MAX_SAFE_INTEGER:this.shellComponents[maxShell+1].step;
            
            if(minShell>0){
                const minStep:number=this.shellComponents[minShell].step;
                dataStates=this.states.randomStep(minStep);
                VisualizationUtils.VideoControl.progressBar.valueAsNumber=minStep;
                this.setAnimationDisplay(dataStates,this.states.getCurrentLocalStates());
                VisualizationUtils.VideoControl.currentStepSpan.innerText=`${minStep}`;
            }else{
                VisualizationUtils.VideoControl.currentStepSpan.innerText=`0`;
            }

            AnimtaionLoop:while(this.states.currentStep<=maxStep){
                const vsc:VisualizationUtils.VideoControlStatus=await this.waitfor();
                switch(vsc){
                case VisualizationUtils.VideoControlStatus.stop:
                    break AnimtaionLoop;
                case VisualizationUtils.VideoControlStatus.noAction:
                case VisualizationUtils.VideoControlStatus.nextStep:
                    if((dataStates=this.states.nextStep())==null){
                        break AnimtaionLoop;
                    }
                    this.setAnimationDisplay(dataStates,this.states.getCurrentLocalStates());
                    break;
                case VisualizationUtils.VideoControlStatus.prevStep:
                    if((dataStates=this.states.previousStep())==null){
                        this.currentStep=0;
                        dataStates=this.states.randomStep(0);
                    }
                    this.setAnimationDisplay(dataStates,this.states.getCurrentLocalStates());
                    break;
                case VisualizationUtils.VideoControlStatus.randomStep:
                    if((dataStates=this.states.randomStep(this.currentStep))==null){
                        dataStates=this.states.randomStep(0);
                        this.currentStep=0;
                    }
                    this.setAnimationDisplay(dataStates,this.states.getCurrentLocalStates());
                    break;
                }

                VisualizationUtils.Algorithm.setCurrentStep(this.states.currentStep);
                VisualizationUtils.VideoControl.progressBar.valueAsNumber=this.states.currentStep;
            }

            for(const v of this.graph.vertices){
                const circle=v.circle as SVGCircleElement;
                circle.setAttribute("opacity","1");
                circle.setAttribute("visibility","visible");
                (v.text as SVGTextElement).innerHTML=v.id.toString();
            };
            this.displayPolygons(true);
        }


        private removeFromSet1(target:number):void{
            this.set0.push(target);
            this.degrees.set(target,KCore.PROCESSED);
            const idx:number=this.inSet1.get(target) as number;
            const last:number=arrayLast(this.set1);
            this.set1[idx]=last;
            this.inSet1.set(last,idx);
            this.inSet1.delete(target);
            this.set1.pop();
        }


        private clearHelpers():this{
            this.degrees.clear();
            this.inSet1.clear();
            this.set0.length=0;
            this.set1.length=0;
            return this;
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


        private refreshSelect():this{
            if(this.minOption==null||this.maxOption==null){return this;}
            this.createOptions(0,this.shellComponents.length,this.minOption);
            this.createOptions(0,this.shellComponents.length,this.maxOption);
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


        private setAnimationDisplay(vertexStates:DataState[]|null,descriptionStates:VisualizationUtils.DescriptionState[]):void{
            if(vertexStates==null){return;}
            for(let i:number=0;i<this.graph.vertices.length;++i){
                const vertex:Vertex=this.graph.vertices[i];
                const ds:DataState=vertexStates[i];
                vertex.circle?.setAttribute("opacity",ds.opacity);
                if(ds.isProcessed()){
                    vertex.circle?.setAttribute("fill",this.shellComponents[ds.shell].color.toString());
                }else{
                    vertex.circle?.setAttribute("fill","var(--reverse-color2)");
                }
                (vertex.text as SVGTextElement).innerHTML=ds.text;
            }

            for(let i:number=0;i<this.shellComponents.length;++i){
                this.corePolygons[i].display(vertexStates[i+this.graph.vertices.length].canPolygonShow());
            }

            if(descriptionStates.length>0){
                const lis:HTMLCollection=VisualizationUtils.DescriptionDisplay.setLocalDescriptionNumber(descriptionStates.length);
                for(let i:number=0;i<descriptionStates.length;++i){
                    lis[i].innerHTML=descriptionStates[i].stepDescription;
                }
                VisualizationUtils.DescriptionDisplay.highlightCode(arrayLast(descriptionStates).codeStep);
            }else{
                VisualizationUtils.DescriptionDisplay.highlightCode(-1);
            }
        }


        public setVisualElementsColor(defaultColor:boolean):this{
            this.showDefaultColor=defaultColor;
            if(defaultColor){
                for(const v of this.graph.vertices){
                    (v.circle as SVGCircleElement).setAttribute("fill","var(--reverse-color2)");
                }
                for(let i:number=0;i<this.shellComponents.length;++i){
                    this.corePolygons[i].display(false);
                }
            }else{
                for(let i:number=0;i<this.shellComponents.length;++i){
                    this.corePolygons[i].display(true).polygon.setAttribute("fill",`color-mix(in srgb, ${this.shellComponents[i].color.toString()} 30%, var(--main-color1) 70%)`);
                }
                //the vertices in cc in this.shell component may belong to other graph
                for(const sc of this.shellComponents){
                    for(const cc of sc.connectedComponents){
                        for(const v of cc.vertices){
                            (this.graph.adjacencyList.get(v.id) as VerticeList).main.setColor(sc.color);
                        }
                    }
                }
            }
            return this;
        }


        private hideVerticesOutsideShells():void{
            const displayVerticesInRange=(minShell:number,maxShell:number,visibile:boolean):void=>{
                for(let i:number=minShell;i<maxShell;++i){
                    const sc:ShellComponet=this.shellComponents[i];
                    for(const cc of sc.connectedComponents){
                        for(const v of cc.vertices){
                            this.graph.displayVertex(v.id,visibile);
                        }
                    }
                }
            }

            const min:number=parseInt((this.minOption as HTMLSelectElement).value),max:number=parseInt((this.maxOption as HTMLSelectElement).value);
            displayVerticesInRange(min,max+1,true);//set the edges visible first (some edge may connected to outside shell)
            displayVerticesInRange(0,min,false);//then for the edge connected to outside shell, hide them
            displayVerticesInRange(max+1,this.shellComponents.length,false);
        }


        public displayPolygons(show:boolean):KCore{
            for(let i:number=0;i<this.shellComponents.length;i++){
                this.corePolygons[i].display(show);
            }
            return this;
        }


        public calculateBound():this{
            let i:number=this.shellComponents.length-1;
            //the vertices in shell component may point to the other graph not this.graph
            {
                const cp:CorePolygon=this.corePolygons[i];
                cp.bound.length=0;
                ConvesHull.Solve(cp,this.shellComponents[i],this.graph,this.svgContainer);
            }
            for(--i;i>=0;--i){
                const cp:CorePolygon=this.corePolygons[i];
                cp.bound.length=0;
                ConvesHull.Solve(cp,this.shellComponents[i],this.graph,this.svgContainer,this.corePolygons[i+1].bound)
            }
            return this;
        }


        protected addEdge(a:number,b:number):boolean{
            if(this.graph.addEdge(a,b)==false){
                return false;
            }
            this.graphWindow.updateSimulation();
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
            return true;
        }


        protected removeEdge(a:number,b:number):boolean{
            if(this.graph.removeEdge(a,b)==false){
                return false;
            }
            this.graphWindow.updateSimulation();
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
            return true;
        }


        protected addVertex(a:number):boolean{
            const v:Vertex|null=this.graph.addVertex(a);
            if(v==null){return false;}
            this.graphWindow.updateSimulation();

            const sc:ShellComponet=this.shellComponents[0];
            const info:ConnectedComponetInfo=new ConnectedComponetInfo(0,sc.connectedComponents.length);
            const cc:KCoreCC=KCoreCC.POOL.get();
            sc.connectedComponents.push(cc);
            cc.shell=0;
            cc.vertices.push(v);
            v.setColor(sc.color);
            this.vertexToInfo.set(a,info);
            this.calculateBound();
            return true;
        }


        protected removeVertex(a:number):boolean{
            if(this.graph.removeVertex(a)==null){
                return false;
            }
            this.graphWindow.updateSimulation();
            const info:ConnectedComponetInfo=this.vertexToInfo.get(a) as ConnectedComponetInfo;
            const cc:KCoreCC=this.shellComponents[info.shell].connectedComponents[info.index];
            cc.removeVertex(a);
            this.KCore_ConnectedComponent(info);
            this.vertexToInfo.delete(a);
            return true;
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
            KCoreCC.POOL.release(b);
        }


        private KCore_ConnectedComponent(theInfo:ConnectedComponetInfo):void{
            const theCC:KCoreCC=this.shellComponents[theInfo.shell].connectedComponents[theInfo.index];
            this.unionFind.set(this.graph.vertices.length);
            this.clearHelpers();
            const MAX_DEGREE:number=1000000;
            let minDegree:number=MAX_DEGREE;
            const orginalShell:number=theCC.shell;//copy the shell, since info will be change while iteration

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
            const buffers:KCoreCC[]=[];
            //atmost 2 iteration after added an edge (degree+1) or remove an egde (degree-1)

            while(true){//run kcore
                if(this.set0.length<=0&&this.set1.length<=0){break;}
                const bufferCC:KCoreCC=KCoreCC.POOL.get();
                bufferCC.shell=currentShell;
                buffers.push(bufferCC);

                while(this.set0.length>0){
                    const v_id:number=<number>this.set0.pop();
                    const vl:VerticeList=<VerticeList>this.graph.adjacencyList.get(v_id);
                    (this.vertexToInfo.get(v_id) as ConnectedComponetInfo).shell=currentShell;
                    bufferCC.vertices.push(vl.main);

                    for(const neighbor of vl.others){
                        let degree:number|undefined=this.degrees.get(neighbor);
                        if(degree==undefined){
                            continue;
                        }else if(degree<0){
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
            this.removeComponent(this.shellComponents[orginalShell],theInfo.index,true);//the index of info did got changed, actually remove theCC

            //for storing the vertices
            const oldBuffer:KCoreCC|undefined=buffers.find((cc):boolean=>cc.shell==orginalShell);
            const newBuffer:KCoreCC|undefined=buffers.find((cc):boolean=>cc.shell!=orginalShell);
            this.degrees.clear();
            const oldShell:number[]=this.set0;
            const newShell:number[]=this.set1;
            oldShell.length=0;
            newShell.length=0;

            if(currentShell>=this.shellComponents.length&&currentShell<MAX_DEGREE){//if vertex in 0 kcore got deleted, then the currentShell wont change.... (i.e. it will still == MAX_DEGREE since no kcore is ran)
                const sc=new ShellComponet();
                sc.shell=currentShell;
                this.shellComponents.push(sc);
                this.setColorGradient(this.shellComponents[0].color,this.shellComponents[this.shellComponents.length-2].color).refreshSelect().ensurePolygons();
            }

            if(oldBuffer!=undefined){
                for(const v of oldBuffer.vertices){
                    if(this.degrees.has(v.id)){continue;}
                    const newCC=KCoreCC.POOL.get();
                    this.findConnected(v,newCC,this.shellComponents[oldBuffer.shell].connectedComponents.length);
                    this.shellComponents[oldBuffer.shell].connectedComponents.push(newCC);
                }
                KCoreCC.POOL.release(oldBuffer);
            }

            if(newBuffer!=undefined){
                const otherCCIndices:number[]=this.set0;
                const inNewShell:Map<number,number>=this.degrees;
                inNewShell.clear();
                otherCCIndices.length=0;

                for(const v of newBuffer.vertices){
                    const vl:VerticeList=v.list as VerticeList;
                    for(const other of vl.others){//find all connected component on same shell that can merge
                        const otherInfo:ConnectedComponetInfo=this.vertexToInfo.get(other) as ConnectedComponetInfo;
                        if(otherInfo.shell==newBuffer.shell){
                            otherCCIndices.push(otherInfo.index);
                        }
                    }
                }
                
                if(otherCCIndices.length>0){//can merge to other existing connected component
                    otherCCIndices.sort((a:number,b:number):number=>{return a-b;});
                    let len=0;
                    for(let i:number=0,j:number;i<otherCCIndices.length;i=j){
                        for(j=i+1;j<otherCCIndices.length&&otherCCIndices[i]==otherCCIndices[j];++j){}
                        otherCCIndices[len++]=otherCCIndices[j-1];
                    }
                    otherCCIndices.length=len;
                    KCoreCC.POOL.release(newBuffer);

                }else{//an isolated cc formed
                    const sc:ShellComponet=this.shellComponents[newBuffer.shell];
                    for(const v of newBuffer.vertices){
                        (this.vertexToInfo.get(v.id) as ConnectedComponetInfo).index=sc.connectedComponents.length;
                    }
                    sc.connectedComponents.push(newBuffer);
                }
            }
            
            //parents create the connected component
            for(const v of theCC.vertices){//separate the vertex into two group depend on if their shell change
                const info:ConnectedComponetInfo=this.vertexToInfo.get(v.id) as ConnectedComponetInfo;
                if(info.shell!=orginalShell){
                    newShell.push(v.id);
                    if(v.id!=this.unionFind.parents[v.id])continue;
                }else{
                    oldShell.push(v.id);
                    if(v.id!=this.unionFind.parents[v.id])continue;
                }
                const sc:KCoreCC[]=this.shellComponents[info.shell].connectedComponents;
                const cc:KCoreCC=KCoreCC.POOL.get();
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
                        KCoreCC.POOL.release(otherCC);
                    }
                }
            }
            this.calculateBound();
            KCoreCC.POOL.release(theCC);
            this.checkCCs();
        }


        private findConnected(v:Vertex,CC:KCoreCC,index:number):void{
            CC.vertices.push(v);
            this.degrees.set(v.id,0);
            (this.vertexToInfo.get(v.id) as ConnectedComponetInfo).index=index;
            const vl=v.list as VerticeList;

            for(const neighbor of vl.others){
                const neighborInfo=this.vertexToInfo.get(neighbor) as ConnectedComponetInfo;
                if(neighborInfo.shell!=CC.shell||this.degrees.has(v.id)){continue;}
                this.findConnected((this.graph.adjacencyList.get(neighbor) as VerticeList).main,CC,index);
            }
        }


        private ensurePolygons():this{
            //const visible:string=this.showDefaultColor?"visible":"hidden";
            const min:number=Math.min(this.shellComponents.length,this.corePolygons.length);
            
            for(let i:number=0;i<min;++i){
                this.corePolygons[i].display(this.showDefaultColor).polygon.setAttribute("fill",`color-mix(in srgb, ${this.shellComponents[i].color.toString()} 30%, var(--main-color1) 70%)`);
            }

            if(min==this.shellComponents.length){
                for(let i:number=this.shellComponents.length;i<this.corePolygons.length;++i){
                    this.corePolygons[i].display(false).bound.length=0;
                    this.corePolygons[i].polygon.points.clear();
                }
            }else{
                for(let i:number=this.corePolygons.length;i<this.shellComponents.length;++i){
                    const p:SVGPolygonElement=document.createElementNS("http://www.w3.org/2000/svg","polygon");
                    p.setAttribute("fill",`color-mix(in srgb, ${this.shellComponents[i].color.toString()} 30%, var(--main-color1) 70%)`);
                    /**
                     * @summary
                     * GraphWindow will append two g to its allG and its allG is the polygonsContainer of this,
                     * so query the first g and insert before it
                     */
                    this.polygonsContainer.insertBefore(p,this.polygonsContainer.querySelector("g") as SVGGElement);
                    const coreP:CorePolygon=new CorePolygon(p).display(this.showDefaultColor);
                    this.corePolygons.push(coreP);
                }
            }
            return this;
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


        private releaseCCs():this{
            for(const sc of this.shellComponents){
                for(const cc of sc.connectedComponents){
                    KCoreCC.POOL.release(cc);
                }
            }
            this.shellComponents.length=0;
            return this;
        }


        /*
        public copyIndexStructure(other: KCoreAlgorithm.KCore): void {
            other.releaseCCs();
            other.shellComponents.length=0;
            other.vertexToInfo.clear();

            for(const sc of this.shellComponents){
                const newSC:ShellComponet=sc.clone();
                other.shellComponents.push(newSC);

                for(const cc of sc.connectedComponents){
                    const newCC:KCoreCC=cc.clone();
                    for(const v of cc.vertices){
                        newCC.vertices.push((other.graph.adjacencyList.get(v.id) as VerticeList).main);
                    }

                    newSC.connectedComponents.push(newCC);
                }
            }

            for(const kvp of this.vertexToInfo){
                other.vertexToInfo.set(kvp[0],kvp[1].clone());
            }
        }
        */
    }
    

    class Point{
        public x:number;
        public y:number;

        constructor(x:number,y:number){
            this.x=x;
            this.y=y;
        }
    }


    abstract class ConvesHull{
        private static points:Point[]=[];
        private static verticesBuffer:Vertex[]=[];

        private static cross(o:Point,a:Point,b:Point):number{
            return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
        }


        /**
         * @returns number of vertices in bound
         */
        public static Solve(cp:CorePolygon,sc:ShellComponet,graph:Graph,svg:SVGSVGElement,otherBound?:Vertex[]):number{
            const verticesBuffer:Vertex[]=ConvesHull.verticesBuffer;
            verticesBuffer.length=0;
            if(otherBound!=undefined){
                Array.prototype.push.apply(verticesBuffer,otherBound);
            }
            for(const cc of sc.connectedComponents){
                for(const v of cc.vertices){
                    verticesBuffer.push((graph.adjacencyList.get(v.id) as VerticeList).main);
                }
            }
            const polygon:SVGPolygonElement=cp.polygon;
            polygon.points.clear();

            if(verticesBuffer.length<3){
                return verticesBuffer.length;
            }else if(verticesBuffer.length<4){
                for(const vertex of verticesBuffer){
                    const p:SVGPoint=svg.createSVGPoint();
                    p.x=vertex.x as number;
                    p.y=vertex.y as number;
                    polygon.points.appendItem(p);
                }
                return verticesBuffer.length;
            }
    
            function approximately(a:number,b:number):boolean{
                return Math.abs(a-b)<0.0001;
            }
            verticesBuffer.sort((a:Vertex,b:Vertex):number=>{
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
            cp.bound.length=0;
            for(const vertex of verticesBuffer){
                const p:Point=new Point(vertex.x as number,vertex.y as number);
                while(ConvesHull.points.length>1&&ConvesHull.cross(ConvesHull.points[ConvesHull.points.length-2],ConvesHull.points[ConvesHull.points.length-1],p)<=0){
                    --ConvesHull.points.length;
                    --cp.bound.length;
                }
                ConvesHull.points.push(p);
                cp.bound.push(vertex);
            }
            
            const base:number=ConvesHull.points.length;
            for(let i:number=verticesBuffer.length-2;i>=0;--i){
                const vertex:Vertex=verticesBuffer[i];
                const p:Point=new Point(vertex.x as number,vertex.y as number);
                while(ConvesHull.points.length>base&&ConvesHull.cross(ConvesHull.points[ConvesHull.points.length-2],ConvesHull.points[ConvesHull.points.length-1],p)<=0){
                    --ConvesHull.points.length;
                    --cp.bound.length;
                }
                ConvesHull.points.push(p);
                cp.bound.push(vertex);
            }

            if(arrayLast(cp.bound).id==cp.bound[0].id){
                ConvesHull.points.pop();
                cp.bound.pop();
            }

            for(const p of ConvesHull.points){
                const realPoint:SVGPoint=svg.createSVGPoint();
                realPoint.x=p.x;
                realPoint.y=p.y;
                polygon.points.appendItem(realPoint);
            }
            cp.polygon=polygon;
            return polygon.points.length;
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
}