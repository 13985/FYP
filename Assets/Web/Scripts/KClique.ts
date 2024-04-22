namespace KCliqueAlgorithm{
    class KCliqueCC extends VisualizationUtils.ConnectedComponent{
        public static readonly POOL:VisualizationUtils.ObjectPool<KCliqueCC>=new VisualizationUtils.ObjectPool(KCliqueCC,256);

        constructor(){
            super();
        }

        public clique():number{
            return this.vertices.length;
        }
    }


    class CliqueComponets{
        public connectedComponents:Array<KCliqueCC>=[];
        public clique:number=-1;
        public color:Color=new Color(0,0,0);

        constructor(clique:number=0){
            this.clique=clique;
        }
    }


    class ConnectedComponetInfo implements VisualizationUtils.IClearable{
        public static POOL:VisualizationUtils.ObjectPool<ConnectedComponetInfo>=new VisualizationUtils.ObjectPool(ConnectedComponetInfo);
        public clique:number=0;
        public index:number=0;

        constructor(){}

        public set(c:number,i:number):this{
            this.clique=c;
            this.index=i;
            return this;
        }


        clear():void{}


        public equal(other:ConnectedComponetInfo):boolean{
            return this.clique==other.clique&&this.index==other.index;
        }
    }


    class TreeNode extends VisualizationUtils.TreeNodeBase<VisualizationUtils.DescriptionState> implements VisualizationUtils.IClearable{
        public static readonly POOL=new VisualizationUtils.ObjectPool<TreeNode>(TreeNode);

        public clear():void{}
    }


    /**
     * @refer resetVisualElements in class Graph
     */
    class DataState implements VisualizationUtils.IStep, VisualizationUtils.IClearable{
        public static readonly POOL=new VisualizationUtils.ObjectPool<DataState>(DataState,2048);
        public step:number=0;
        public color:string="var(--reverse-color-2)";
        public opacity:number=0.4;
        public width:number=1;

        constructor(){}

        public clear(): void {}
    }
 

    class State extends VisualizationUtils.GraphStateManager<DataState,VisualizationUtils.DescriptionState>{
        constructor(graph:Graph){
            super(graph);
            this.init();
        }


        protected setDataKeys():void{
            this.dataKeys.length=this.graph.vertices.length+this.graph.edges.length;
            const verticesCount:number=this.graph.vertices.length;
            for(let i:number=0;i<verticesCount;++i){
                this.dataKeys[i]=this.graph.vertices[i].id;
            }
            for(let i:number=0;i<this.graph.edges.length;++i){
                const e:Edge=this.graph.edges[i];
                this.dataKeys[i+verticesCount]=this.graph.getEdgeHashCode(e.source.id,e.target.id);
            }
        }


        public init():void{
            for(const kvp of this.dataStates){
                for(const ds of kvp[1]){
                    DataState.POOL.release(ds);
                }
            }
            super.clear();
            super.init();
            for(const v of this.graph.vertices){
                const ds:DataState=DataState.POOL.get();
                ds.color="var(--reverse-color1)";
                ds.opacity=0.4;
                ds.step=0;
                this.dataStates.set(v.id,[ds]);
            }
            for(const e of this.graph.edges){
                const ds:DataState=DataState.POOL.get();
                ds.color="var(--reverse-color1)";
                ds.opacity=0.4;
                ds.step=0;
                ds.width=1;
                this.dataStates.set(this.graph.getEdgeHashCode(e.source.id,e.target.id),[ds]);
            }
        }


        protected getTreeNode(): VisualizationUtils.TreeNodeBase<VisualizationUtils.DescriptionState> {
            return TreeNode.POOL.get();
        }
        protected releaseTreeNode(node: VisualizationUtils.TreeNodeBase<VisualizationUtils.DescriptionState>): void {
            TreeNode.POOL.release(node);
        }
    }

    /**
     * @brief
     * note that any subgraph of a fully connected graph is also fully connected
     */
    export class KClique extends VisualizationUtils.Algorithm{
        protected static readonly OPACITY:number=0.4;
        protected static readonly CODE_DESCRIPTION:string=`iteration manner`;

        protected static readonly PSEUDO_CODES:VisualizationUtils.DescriptionDisplay.PseudoCode[]=[
            {code:"all the vertices are belonging to 1-clique",step:1},
            {code:"all the vertices of edges are belonging to 2-clique",step:2},
            {code:"while true :{",step:undefined},
            {code:"   no_update=true;",step:3},
            {code:"   for all cliques in the highest cliques group;",step:4},
            {code:"      check it against other clique :{",step:5},
            {code:"         if they intersect in size vertex count-1 and<br> remaining two vertices are connected :{",step:6},
            {code:"            merge them;",step:7},
            {code:"            no_update=false;",step:8},
            {code:"         }",step:undefined},
            {code:"      }",step:undefined},
            {code:"   }",step:undefined},
            {code:"   if no_update is true,break",step:9},
            {code:"}",step:undefined},
        ];

        /**************************UI******************************************/

        /**************************helper data structures**********************/
        private readonly set0:Set<number>=new Set();
        private subCliqueGenerator?:SubCliqueGenerator;
        private ccBuffer0:KCliqueCC[]=[];
        private ccBuffer1:KCliqueCC[]=[];
        private infoBuffer0?:ConnectedComponetInfo[];

        /**************************index data structures**********************/

        //1-cliques stored at 0, 2-cliques stored at 1, 3-cliques stored at 2....
        private cliqueComponents:Array<CliqueComponets>=[];
        private readonly vertexToInfo:Map<number,ConnectedComponetInfo[]>=new Map();

        /**************************animation state***************************/
        private states?:State;

        public setIndexStructure(other: KClique): this {
            this.cliqueComponents=other.cliqueComponents;
            return this;
        }

        constructor(graph:Graph,svg:SVGSVGElement,gw:GraphWindow){
            super(graph,svg,gw);
        }


        public setColorGradient(start_:Color,end_:Color):this{
            const start:Color=start_.clone();//copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const end:Color=end_.clone();//copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const kCliqueCount:number=this.cliqueComponents.length;
            const interval:number=kCliqueCount-1;

            for(let i:number=0;i<kCliqueCount;++i){
                Color.lerp(this.cliqueComponents[i].color,start,end,i/interval);
            }
            return this;
        }


        public setVisualElementsColor(defaultColor:boolean):this{
            this.notColorful=defaultColor;
            if(defaultColor){
                this.graph.resetVisualElements();
            }else{
                for(const cc_ of this.cliqueComponents){
                    if(cc_.clique<=1){
                        for(const cc of cc_.connectedComponents){
                            for(const v of cc.vertices){
                                const true_v:Vertex=(this.graph.adjacencyList.get(v.id) as VerticeList).main;
                                true_v.setColor(cc_.color);
                                (true_v.circle as SVGCircleElement).setAttribute("fill-opacity","0.5");
                            }
                        }
                        continue;
                    }
                    for(const cc of cc_.connectedComponents){
                        const edgeColorStr:string=cc_.clique==2?"var(--reverse-color2)":cc_.color.toString();
                        const vertexColorStr:string=cc_.color.toString();
                        for(let i:number=0;i<cc.vertices.length;++i){
                            const from:Vertex=cc.vertices[i];
                            (from.circle as SVGCircleElement).setAttribute("fill-opacity",KClique.OPACITY.toString());
                            from.setColorString(vertexColorStr);

                            for(let j:number=i+1;j<cc.vertices.length;++j){
                                const to:Vertex=cc.vertices[j];
                                const e=this.graph.getEdge(from.id,to.id) as Edge;
                                const line=e.line as SVGLineElement;
                                line.setAttribute("stroke",edgeColorStr);
                                line.setAttribute("stroke-opacity","1");
                                line.setAttribute("stroke-width",`${this.getEdgeStorkeWidth(cc.clique())}`);
                            }
                        }
                    }
                }
            }
            return this;
        }


        public createIndexStructure():this{
            this.vertexToInfo.clear();
            for(const kc of this.cliqueComponents){
                for(const cc of kc.connectedComponents){
                    KCliqueCC.POOL.release(cc);
                }
            }
            this.cliqueComponents.length=0;
            
            if(this.subCliqueGenerator==undefined){
                this.subCliqueGenerator=new SubCliqueGenerator();
            }
            if(this.infoBuffer0==undefined){
                this.infoBuffer0=[];
            }

            {//for 1 cliques
                const kc:CliqueComponets=new CliqueComponets(1);
                this.cliqueComponents.push(kc);
    
                this.graph.adjacencyList.forEach((vl:VerticeList,v_id:number):void=>{
                    if(vl.others.length>0){
                        return;
                    }
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.vertices.push(vl.main);
                    kc.connectedComponents.push(cc);
                });
            }
            
            if(this.graph.edges.length<=0){
            }else{
                const kc:CliqueComponets=new CliqueComponets(2);
                this.cliqueComponents.push(kc);

                for(let i:number=0;i<this.graph.edges.length;++i){
                    const e:Edge=this.graph.edges[i];
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }

                const returnEdgeCode:Reference<number>=new Reference<number>();

                for(let currentClique:number=3;true;++currentClique){
                    const next:CliqueComponets=new CliqueComponets(currentClique);
                    const previous:KCliqueCC[]=this.cliqueComponents[currentClique-2].connectedComponents;//currentClique == .length+2
    
                    Label_0:for(let i:number=0;i<previous.length;){
                        const first:KCliqueCC=previous[i];
                        for(let j:number=i+1;j<previous.length;++j){
                            const second:KCliqueCC=previous[j];
                            const left_v:Vertex|null=this.testCombine(first,second,returnEdgeCode);
                            if(left_v==null){
                                continue;
                            }
                            
                            first.vertices.push(left_v);
                            KCliqueCC.POOL.release(second);
                            next.connectedComponents.push(first);
                            
                            ArrayUtils.removeAsSwapBack(previous,j);
                            ArrayUtils.removeAsSwapBack(previous,i);
                            continue Label_0;
                        }
                        ++i;
                    }
                    
                    if(next.connectedComponents.length<=0){
                        break;
                    }
                    //clean up, remove the subcliques of larger clique
                    for(let b:number=0;b<next.connectedComponents.length;++b){
                        for(let a:number=0;a<previous.length;){
                            if(this.isSubClique(previous[a],next.connectedComponents[b])){
                                KCliqueCC.POOL.release(previous[a]);
                                ArrayUtils.removeAsSwapBack(previous,a);
                            }else{
                                ++a;
                            }
                        }
                    }
                    this.cliqueComponents.push(next);
                }
            }

            for(const kc of this.cliqueComponents){
                const ccs:KCliqueCC[]=kc.connectedComponents;
                for(let idx:number=0;idx<ccs.length;++idx){
                    for(const v of ccs[idx].vertices){
                        const infos:ConnectedComponetInfo[]|undefined=this.vertexToInfo.get(v.id);
                        if(infos==undefined){
                            this.vertexToInfo.set(v.id,[ConnectedComponetInfo.POOL.get().set(kc.clique,idx)]);
                            continue;
                        }
                        infos.push(ConnectedComponetInfo.POOL.get().set(kc.clique,idx));
                    }
                }
            }

            for(const kc of this.cliqueComponents){
                const ccs:KCliqueCC[]=kc.connectedComponents;
                for(let idx:number=0;idx<ccs.length;++idx){
                    const cc:KCliqueCC=ccs[idx];
                    if(this.searchLargerClique(cc)){
                        const info:ConnectedComponetInfo=ConnectedComponetInfo.POOL.get().set(kc.clique,idx);
                        this.removeCC(info);
                        ConnectedComponetInfo.POOL.release(info);
                    }
                }
            }

            KCliqueCC.POOL.deallocateSome();
            ConnectedComponetInfo.POOL.deallocateSome();
            return this;
        }


        protected onRegisterSelf(): void {
            VisualizationUtils.DescriptionDisplay.clearPanel();
            VisualizationUtils.DescriptionDisplay.codeDescription.innerText=KClique.CODE_DESCRIPTION;
            VisualizationUtils.DescriptionDisplay.setCodes(KClique.PSEUDO_CODES);
            VisualizationUtils.VideoControl.maxStepSpan.innerText=`${this.states?.maxStep}`;
            VisualizationUtils.Algorithm.setCurrentStep(0);
        }


        public createState():this{
            if(this.states==undefined){
                this.states=new State(this.graph);
            }else{
                this.states.init();
            }

            let step:number=1;

            const highlightFirst=(opacity:number):void=>{
                const color:string=this.cliqueComponents[0].color.toString();
                for(const v of this.graph.vertices){
                    const ds:DataState=DataState.POOL.get();
                    ds.color=color;
                    ds.opacity=opacity;
                    ds.step=step;
                    (this.states as State).dataStatePush(v.id,ds);
                }
            };

            highlightFirst(1);
            this.states.localStatePush({step:step,codeStep:1,stepDescription:"set all vertices"});
            ++step;
            highlightFirst(KClique.OPACITY);
            ++step;

            if(this.graph.edges.length<=0){
                this.states.localStateTop({step:step,codeStep:1,stepDescription:"highest clique:1"});
                ++step;
            }else{
                let previous:KCliqueCC[]=this.ccBuffer0;
                let newGenerated:KCliqueCC[]=this.ccBuffer1;
                previous.length=0;
                newGenerated.length=0;

                const $bufferCC0:KCliqueCC=KCliqueCC.POOL.get();
                const $bufferCC1:KCliqueCC=KCliqueCC.POOL.get();

                const remainVertices:Vertex[]=$bufferCC0.vertices;
                const highlightedVertices:Vertex[]=$bufferCC1.vertices;
                const previousEdgeColor:Map<number,string>=new Map();
                
                for(const e of this.graph.edges){
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    previous.push(cc);
                }

                const highlightSecond=(opacity:number,width:number):void=>{
                    const edgeColor:string="var(--reverse-color2)";
                    const vertexColor:string=this.cliqueComponents[1].color.toString();
                    const set:Set<number>=new Set();
                    const helper=(v:Vertex):void=>{
                        if(set.has(v.id)==true){return;}
                        set.add(v.id);
                        const ds:DataState=DataState.POOL.get();
                        ds.step=step;
                        ds.opacity=opacity;
                        ds.color=vertexColor;
                        (this.states as State).dataStatePush(v.id,ds);
                    }
                    for(const e of this.graph.edges){
                        const ds:DataState=DataState.POOL.get();
                        helper(e.source);
                        helper(e.target);
                        ds.step=step;
                        ds.opacity=opacity;
                        ds.width=width;
                        ds.color=edgeColor;
                        const code:number=this.graph.getEdgeHashCode(e.source.id,e.target.id);
                        previousEdgeColor.set(code,ds.color);
                        (this.states as State).dataStatePush(code,ds);
                    }
                };

                highlightSecond(1,this.getEdgeStorkeWidth(2));
                this.states.localStateTop({step:step,codeStep:2,stepDescription:"set all connected vertices to 2-clique"});
                ++step;
                highlightSecond(KClique.OPACITY,1);
                ++step;

                let currentClique:number=2;
                while(true){
                    newGenerated.length=0;
                    this.states.localStatePush({step:step,codeStep:3,stepDescription:`for ${currentClique+1}-Clique`});
                    ++step;

                    for(let i:number=0;i<previous.length;++i){
                        const highlightCC=(cc:KCliqueCC,opacity:number,edgeWidth:number,updateEdgeColor:boolean=false):void=>{
                            const clique:number=cc.clique();
                            const vertexColor:string=this.cliqueComponents[clique-1].color.toString();
                            for(const v of cc.vertices){
                                const ds:DataState=DataState.POOL.get();
                                ds.opacity=opacity;
                                ds.step=step;
                                ds.color=vertexColor;
                                (this.states as State).dataStatePush(v.id,ds);
                            }
                            const verticesCount:number=cc.vertices.length;
                            for(let i:number=0;i<verticesCount;++i){
                                for(let j:number=i+1;j<verticesCount;++j){
                                    const ds:DataState=DataState.POOL.get();
                                    ds.opacity=opacity;
                                    ds.step=step;
                                    ds.width=edgeWidth;
                                    const code:number=this.graph.getEdgeHashCode(cc.vertices[i].id,cc.vertices[j].id);
                                    if(updateEdgeColor){
                                        ds.color=vertexColor;
                                        previousEdgeColor.set(code,vertexColor);
                                    }else{
                                        ds.color=previousEdgeColor.get(code) as string;
                                    }
                                    (this.states as State).dataStatePush(code,ds);
                                }
                            }
                        };

                        const first:KCliqueCC=previous[i];
                        highlightCC(first,1,1+(first.clique()*3/(this.cliqueComponents.length+2)));
                        this.states.localStatePush({step:step,codeStep:4,stepDescription:`clique: ${first.toString('{')}`});
                        ++step;

                        /**
                         * @summary note that here is slightly different from the createState()
                         */
                        Label_1:for(let j:number=i+1;j<previous.length;++j){
                            const second:KCliqueCC=previous[j];
                            this.set0.clear();
                            remainVertices.length=0;
                            highlightedVertices.length=0;
                            
                            for(const v of first.vertices){
                                this.set0.add(v.id);
                            }
                            
                            for(const v of second.vertices){
                                if(this.set0.has(v.id)){
                                    this.set0.delete(v.id);
                                    highlightedVertices.push(v);
                                }else{
                                    remainVertices.push(v);
                                }
                            }

                            const highlightRemainVE=(clique:number,opacity:number,width:number):void=>{
                                const helper=(vA:Vertex,vB:Vertex):void=>{
                                    const e:Edge|undefined=this.graph.getEdge(vA.id,vB.id);
                                    if(e==undefined){return;}
                                    const code:number=this.graph.getEdgeHashCode(vA.id,vB.id);
                                    const ds:DataState=DataState.POOL.get();
                                    ds.step=step;
                                    ds.color=previousEdgeColor.get(code) as string;
                                    ds.opacity=opacity;
                                    ds.width=width;
                                    (this.states as State).dataStatePush(code,ds);
                                }

                                for(const v0 of highlightedVertices){
                                    for(const v1 of remainVertices){
                                        helper(v0,v1);
                                    }
                                }

                                for(let i:number=0;i<remainVertices.length;++i){
                                    const v0:Vertex=remainVertices[i];
                                    const vertexColor:string=this.cliqueComponents[clique-1].color.toString();
                                    const ds:DataState=DataState.POOL.get();
                                    ds.step=step;
                                    ds.color=vertexColor;
                                    ds.opacity=opacity;
                                    (this.states as State).dataStatePush(v0.id,ds);
                                    for(let j:number=i+1;j<remainVertices.length;++j){
                                        const v1:Vertex=remainVertices[j];
                                        helper(v0,v1);
                                    }
                                }
                            }
                            
                            highlightRemainVE(second.clique(),1,this.getEdgeStorkeWidth(second.clique()));
                            this.states.localStatePush({step:step,codeStep:5,stepDescription:`check with clique: ${second.toString("{")}`});
                            ++step;

                            if(remainVertices.length>1){//i hate early continue, make sure the state has poped
                                highlightRemainVE(second.clique(),KClique.OPACITY,1);
                                this.states.localStatePop(step);
                                ++step;
                                continue;
                            }
                            
                            const left_v:Vertex=remainVertices[0];
                            let the_v:Vertex=left_v;//just to prevent use of unassigned local variable error
                            for(const v of this.set0){
                                the_v=(this.graph.adjacencyList.get(v) as VerticeList).main;
                            }

                            if(this.graph.getEdge(the_v.id,left_v.id)==undefined){
                                highlightRemainVE(second.clique(),KClique.OPACITY,1);
                                this.states.localStatePop(step);
                                ++step;
                                continue;
                            }
                            
                            first.vertices.push(left_v);
                            newGenerated.push(first);
                            
                            ArrayUtils.removeAsSwapBack(previous,j);
                            if(i<previous.length-1){
                                ArrayUtils.removeAsSwapBack(previous,i);
                                --i;//prevent the increment of i
                            }
                            
                            highlightCC(first,1,this.getEdgeStorkeWidth(currentClique),true);
                            this.states.localStatePush({step:step,codeStep:7,stepDescription:`merge`});
                            ++step;
                            this.states.localStateTop({step:step,codeStep:8,stepDescription:`set no_update=false`});
                            ++step;
                            this.states.localStatePop(step);
                            ++step;
                            this.states.localStatePop(step);//pushed twice so pop twice
                            ++step;

                            KCliqueCC.POOL.release(second);
                            break Label_1;
                        }
                        highlightCC(first,KClique.OPACITY,1);//first cc will finally be unhighlightly
                        this.states.localStatePop(step);
                        ++step;
                    }
                    
                    this.states.localStatePop(step);
                    ++step;
                    if(newGenerated.length>0){//swap two buffer
                        const temp=previous;
                        previous=newGenerated;
                        newGenerated=temp;
                    }else{
                        this.states.localStateTop({step:step,codeStep:8,stepDescription:`highest clique:${currentClique}`});
                        ++step;
                        break;
                    }
                    ++currentClique;
                }

                KCliqueCC.POOL.release($bufferCC0);
                KCliqueCC.POOL.release($bufferCC1);
            }
            this.states.localStatePop(step);
            this.states.onInitEnd(step);
            VisualizationUtils.VideoControl.maxStepSpan.innerText=`${this.states.maxStep}`;
            DataState.POOL.deallocateSome();
            TreeNode.POOL.deallocateSome();
            return this;
        }


        protected async animate():Promise<void>{
            VisualizationUtils.VideoControl.progressBar.setAttribute("max",(this.states as State).maxStep.toString());
            this.setVisualElementsColor(true);

            const helper=(opacity:number)=>{
                const opacityStr:string=opacity.toString();
                for(const v of this.graph.vertices){
                    (v.circle as SVGCircleElement).setAttribute("fill-opacity",opacityStr);
                }
                for(const e of this.graph.edges){
                    (e.line as SVGElement).setAttribute("stroke-opacity",opacityStr);
                }
            }

            for(const e of this.graph.edges){
                (e.line as SVGElement).setAttribute("stroke-width","1");
            }
            helper(KClique.OPACITY);

            if(this.states==undefined){return;}
            this.states.resetStep();
            VisualizationUtils.Algorithm.setCurrentStep(0);

            const dataStates:Reference<DataState[]>=new Reference<DataState[]>();
            const localStates:Reference<VisualizationUtils.DescriptionState[]>=new Reference<VisualizationUtils.DescriptionState[]>();
            
            AnimtaionLoop:while(true){
                const vsc:VisualizationUtils.VideoControlStatus=await this.waitfor();
                switch(vsc){
                case VisualizationUtils.VideoControlStatus.stop:
                    break AnimtaionLoop;
                case VisualizationUtils.VideoControlStatus.noAction:
                case VisualizationUtils.VideoControlStatus.nextStep:
                    if(this.states.tryNextStep(dataStates,localStates)==false){
                        break AnimtaionLoop;
                    }
                    break;
                case VisualizationUtils.VideoControlStatus.prevStep:
                    if(this.states.tryPreviousStep(dataStates,localStates)==false){
                        this.currentStep=0;
                        this.states.tryRandomStep(0,dataStates,localStates);
                    }
                    break;
                case VisualizationUtils.VideoControlStatus.randomStep:
                    if(this.states.tryRandomStep(this.currentStep,dataStates,localStates)==false){
                        this.currentStep=0;
                        this.states.tryRandomStep(0,dataStates,localStates);
                    }
                    break;
                }
                
                this.setAnimationDisplay(dataStates.value,localStates.value);
                VisualizationUtils.Algorithm.setCurrentStep(this.states.currentStep);
                VisualizationUtils.VideoControl.progressBar.valueAsNumber=this.states.currentStep;
            }

            helper(1);
        }


        private setAnimationDisplay(dataStates: DataState[]|null, descriptionStates: VisualizationUtils.DescriptionState[]):void{
            if(dataStates==null){return;}
            const vertexCount:number=this.graph.vertices.length;
            for(let i:number=0;i<vertexCount;++i){
                const circle:SVGCircleElement=this.graph.vertices[i].circle as SVGCircleElement;
                const state:DataState=dataStates[i];
                circle.setAttribute("fill",state.color);
                circle.setAttribute("fill-opacity",state.opacity.toString());
            }
            for(let i:number=0;i<this.graph.edges.length;++i){
                const line=this.graph.edges[i].line as SVGLineElement;
                const state:DataState=dataStates[i+vertexCount];
                line.setAttribute("stroke",state.color);
                line.setAttribute("stroke-opacity",state.opacity.toString());
                line.setAttribute("stroke-width",state.width.toString());
            }
            
            if(descriptionStates.length>0){
                const lis:HTMLCollection=VisualizationUtils.DescriptionDisplay.setLocalDescriptionNumber(descriptionStates.length);
                for(let i:number=0;i<descriptionStates.length;++i){
                    lis[i].innerHTML=descriptionStates[i].stepDescription;
                }
                VisualizationUtils.DescriptionDisplay.highlightCode(ArrayUtils.last(descriptionStates).codeStep);
            }else{
                VisualizationUtils.DescriptionDisplay.highlightCode(-1);
            }
        }


        protected addVertex(a:number):boolean{
            const newV:Vertex|null=this.graph.addVertex(a);
            if(newV==null){
                return false;
            }
            this.graphWindow.updateSimulation();
            const cc:KCliqueCC=KCliqueCC.POOL.get();
            cc.vertices.push(newV);
            const ccs:KCliqueCC[]=this.cliqueComponents[0].connectedComponents;
            this.vertexToInfo.set(a,[ConnectedComponetInfo.POOL.get().set(1,ccs.length)]);
            ccs.push(cc);
            this.checkCCs();
            return true;
        }


        protected removeVertex(a:number):boolean{
            if(this.graph.removeVertex(a)==null){
                return false;
            }
            this.graphWindow.updateSimulation();
            const infos=this.vertexToInfo.get(a) as ConnectedComponetInfo[];

            while(infos.length>0){
                const info:ConnectedComponetInfo=infos[0];
                const theCC:KCliqueCC=this.removeCC(info);//take infos of vertex a and remove info (at index 0) from infos

                theCC.removeVertex(a);

                if(this.searchLargerClique(theCC)==false){//no parent clique
                    this.addCC(theCC);
                }else{
                    KCliqueCC.POOL.release(theCC);
                }
                //no need to release info since remove CC will do this
            }

            this.vertexToInfo.delete(a);
            this.checkCCs();
            this.setVisualElementsColor(this.notColorful);
            return true;
        }


        protected addEdge(from:number,to:number):boolean {
            if(this.graph.addEdge(from,to)==false){
                return false;
            }
            this.graphWindow.updateSimulation();
            const generatorFrom=this.subCliqueGenerator as SubCliqueGenerator;
            const fromInfos=this.vertexToInfo.get(from) as ConnectedComponetInfo[];
            const toInfos=this.vertexToInfo.get(to) as ConnectedComponetInfo[];
            const toV:Vertex=(this.graph.adjacencyList.get(to) as VerticeList).main;
            const fromV:Vertex=(this.graph.adjacencyList.get(from) as VerticeList).main;

            const generatedCCs:KCliqueCC[]=this.ccBuffer0;
            const stableCCs:KCliqueCC[]=this.ccBuffer1;
            generatedCCs.length=0;
            stableCCs.length=0;
            console.log(`f:${from} t:${to}`);

            for(let i:number=0;i<fromInfos.length;){
                const fromInfo:ConnectedComponetInfo=fromInfos[i];
                const cc:KCliqueCC=this.getKCliqueCC(fromInfo);//for all cc of from
                console.log(cc.toString("{"));

                if(this.fullyConnected(toV,cc)){//move directly, dont need to generate sub clique anymore
                    cc.vertices.push(toV);
                    if(cc.clique()-1>=this.cliqueComponents.length){
                        this.cliqueComponents.push(new CliqueComponets(cc.clique()));
                        this.setColorGradient(this.cliqueComponents[0].color,this.cliqueComponents[this.cliqueComponents.length-2].color);
                    }
                    this.removeCC(fromInfo);
                    stableCCs.push(cc);
                    //dont add to index structure to prevent it interrupt the fromInfos
                    continue;
                }

                ++i;
                generatorFrom.set(cc);

                Label_0:for(let clique=cc.clique()-1;clique>0;--clique){
                    const results:KCliqueCC[]=generatorFrom.generate(fromV,clique);

                    for(let j:number=0;j<results.length;++j){
                        const cc_:KCliqueCC=results[j];
                        console.log(cc_.toString("{"));
                        if(this.fullyConnected(toV,cc_)==false){continue;}

                        cc_.vertices.push(toV);
                        generatedCCs.push(cc_);
                        ArrayUtils.removeAsSwapBack(results,j);
                        generatorFrom.releaseAll();
                        break Label_0;
                    }
                    
                    generatorFrom.releaseAll();
                }
            }

            generatedCCs.sort((a,b):number=>a.clique()-b.clique());

            label_0:for(let i:number=0;i<generatedCCs.length;++i){
                const cc:KCliqueCC=generatedCCs[i];
                for(let j:number=i+1;j<generatedCCs.length;++j){
                    if(this.isSubClique(cc,generatedCCs[j])){
                        KCliqueCC.POOL.release(cc);
                        continue label_0;
                    }
                }
                for(let j:number=0;j<stableCCs.length;++j){
                    if(stableCCs[j].clique()>cc.clique()&&this.isSubClique(cc,stableCCs[j])){
                        KCliqueCC.POOL.release(cc);
                        continue label_0;
                    }
                }
                stableCCs.push(cc);
            }

            for(let i:number=0;i<toInfos.length;++i){//those clique is only contain "to", no "from" inside
                const toInfo:ConnectedComponetInfo=toInfos[i];
                const cc:KCliqueCC=this.getKCliqueCC(toInfo);

                for(let j:number=0;j<stableCCs.length;++j){
                    if(toInfo.clique<stableCCs[j].clique()&&this.isSubClique(cc,stableCCs[j])){
                        this.removeCC(toInfo);
                        KCliqueCC.POOL.release(cc);
                        --i;
                        break;
                    }
                }
            }

            for(let i:number=0;i<stableCCs.length;++i){
                this.addCC(stableCCs[i]);
            }

            this.checkCCs();
            this.setVisualElementsColor(this.notColorful);
            return true;
        }


        protected removeEdge(from: number, to: number): boolean {
            if(this.graph.removeEdge(from,to)==false){
                return false;
            }
            this.graphWindow.updateSimulation();
            const fromInfos=this.vertexToInfo.get(from) as ConnectedComponetInfo[];
            const toInfos=this.vertexToInfo.get(to) as ConnectedComponetInfo[];

            const newCCs:KCliqueCC[]=this.ccBuffer0;
            newCCs.length=0;

            for(let i:number=0;i<fromInfos.length;){
                const fromInfo:ConnectedComponetInfo=fromInfos[i];
                const toInfo:ConnectedComponetInfo|null=this.searchInfo(toInfos,fromInfo);

                if(toInfo==null){
                    ++i;
                    continue;
                }
                const toCC:KCliqueCC=KCliqueCC.POOL.get();
                const fromCC:KCliqueCC=this.removeCC(fromInfo);//no need to increment i, since removeCC() will get fromInfos and remove fromInfo at the exact i (index)

                Split:for(let idx:number=0;idx<fromCC.vertices.length;){
                    const v:Vertex=fromCC.vertices[idx];
                    if(v.id==to){
                        ArrayUtils.removeAsSwapBack(fromCC.vertices,idx);//theCC contains "from", and remove "to"
                        toCC.vertices.push(v);//newCC contains "to"
                    }else if(v.id==from){
                        ++idx;
                        //toCC not contains "from"
                    }else{
                        ++idx;
                        toCC.vertices.push(v);
                    }
                }

                Check_fromCC:{
                    for(const info of fromInfos){
                        if(info.clique<=fromCC.vertices.length){continue;}
                        else if(this.isSubClique(fromCC,this.getKCliqueCC(info))){
                            KCliqueCC.POOL.release(fromCC);
                            break Check_fromCC;
                        }
                    }
                    newCCs.push(fromCC);//buffer it to prevent its changed fromInfos and toInfos at this moment
                }

                Check_toCC:{
                    for(const info of toInfos){
                        if(info.clique<=toCC.vertices.length){continue;}
                        else if(this.isSubClique(toCC,this.getKCliqueCC(info))){
                            KCliqueCC.POOL.release(toCC);
                            break Check_toCC;
                        }
                    }
                    newCCs.push(toCC);//buffer it to prevent its changed fromInfos and toInfos at this moment
                }
            }

            for(const cc of newCCs){
                this.addCC(cc);
            }
            this.checkCCs();
            this.setVisualElementsColor(this.notColorful);
            return true;
        }


        /**
         * @param info points to the connected component
         * @return the connected component being removed
         */
        private removeCC(info:ConnectedComponetInfo):KCliqueCC{
            const theClique:number=info.clique;
            const theIndex:number=info.index;
            const kc:CliqueComponets=this.cliqueComponents[theClique-1];
            const theCC:KCliqueCC=kc.connectedComponents[theIndex];

            for(const v of theCC.vertices){//for all other vertices
                const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                for(let i:number=0;i<infos.length;++i){
                    const info:ConnectedComponetInfo=infos[i];
                    if(info.clique==theClique&&info.index==theIndex){
                        ConnectedComponetInfo.POOL.release(info);
                        ArrayUtils.removeAsSwapBack(infos,i);
                        break;
                    }
                }
            }

            const lastIdx:number=kc.connectedComponents.length-1;
            if(theIndex<lastIdx){
                const lastCC:KCliqueCC=kc.connectedComponents[lastIdx];
                for(const v of lastCC.vertices){
                    const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                    for(const info of infos){
                        if(info.clique!=theClique||info.index!=lastIdx){continue;}
                        info.index=theIndex;
                        break;
                    }
                }
                kc.connectedComponents[theIndex]=lastCC;
            }
            kc.connectedComponents.pop();

            return theCC;
        }


        /**
         * @param cc contains the new clique==vertices.length
         */
        private addCC(cc:KCliqueCC):void{
            const kc:CliqueComponets=this.cliqueComponents[cc.clique()-1];
            const lastIdx:number=kc.connectedComponents.length;

            for(const v of cc.vertices){
                const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                infos.push(ConnectedComponetInfo.POOL.get().set(cc.clique(),lastIdx));
            }
            kc.connectedComponents.push(cc);
        }


        private getEdgeStorkeWidth(clique:number):number{
            return 1+(clique*3)/(this.cliqueComponents.length+2);
        }


        /**
         * @summary test if a and b intersect in x-1 subclique and the two remain vertices in a and b are connected by edge, if yes then return the remain vertex in b, else null. a and b must have the same clique i.e. the number of vertices
         * @param a x-clique
         * @param b x-clique
         * @returns the vertex in b if they can be combined
         */
        private testCombine(a:KCliqueCC,b:KCliqueCC,outEdgeCode?:Reference<number>):Vertex|null{
            this.set0.clear();
            let left_v:Vertex|null=null;
            for(const v of a.vertices){
                this.set0.add(v.id);
            }
            Label_0:{
                for(const v of b.vertices){
                    if(this.set0.has(v.id)){
                        this.set0.delete(v.id);
                    }else if(left_v!=null){
                        left_v=null;
                        break Label_0;
                    }else{
                        left_v=v;
                    }
                }
                
                for(const v_id of this.set0){//only one v_id
                    if(this.graph.getEdge(v_id,(left_v as Vertex).id)==undefined){
                        left_v=null;
                    }else if(outEdgeCode!=undefined){
                        outEdgeCode.value=this.graph.getEdgeHashCode(v_id,(left_v as Vertex).id);
                    }
                    break;
                }
            }
            return left_v;
        }


        /**
         * @brief test if a is subclique of b
         */
        private isSubClique(a:KCliqueCC,b:KCliqueCC):boolean{
            this.set0.clear();
            for(const v of a.vertices){
                this.set0.add(v.id);
            }

            for(const v of b.vertices){
                this.set0.delete(v.id);
            }
            return this.set0.size<=0;
        }


        private fullyConnected(v:Vertex,cc:KCliqueCC):boolean{
            this.set0.clear();
            for(const v of cc.vertices){
                this.set0.add(v.id);
            }
            const vl=this.graph.adjacencyList.get(v.id) as VerticeList;
            for(const other of vl.others){
                this.set0.delete(other);
            }
            return this.set0.size<=0;
        }


        private searchInfo(others:ConnectedComponetInfo[],target:ConnectedComponetInfo):ConnectedComponetInfo|null{
            for(const info of others){
                if(info.equal(target)){
                    return info;
                }
            }
            return null;
        }


        /**
         * @param theCC
         * check if there is any clique that contains the chole theCC
         */
        private searchLargerClique(theCC:KCliqueCC):boolean{
            const infos:ConnectedComponetInfo[]=this.infoBuffer0 as ConnectedComponetInfo[];
            infos.length=0;

            const firstInfos:ConnectedComponetInfo[]=this.vertexToInfo.get(theCC.vertices[0].id) as ConnectedComponetInfo[];
            for(const info of firstInfos){
                if(info.clique<=theCC.clique()){continue;}
                infos.push(info);
            }

            Label_1:for(let j:number=0;j<infos.length;++j){//for every clique pointing to
                for(let i:number=1;i<theCC.vertices.length;++i){//for other vertex in same CC
                    const otherInfos=this.vertexToInfo.get(theCC.vertices[i].id) as ConnectedComponetInfo[];

                    const other:ConnectedComponetInfo|null=this.searchInfo(otherInfos,infos[j]);
                    if(other==null){
                        continue Label_1;
                    }
                }
                return true;
            }
            return false;
        }


        private changeColor(cc:KCliqueCC):void{
            if(this.notColorful){
                return;
            }
            const verticesCount:number=cc.vertices.length;

            /**
             * @summary a and b must be ordered
             * @param a 
             * @param b 
             */
            function getMaxCommonInfo(a:ConnectedComponetInfo[],b:ConnectedComponetInfo[]):ConnectedComponetInfo{
                let info:ConnectedComponetInfo|null=null;

                for(let i:number=0,j:number=0;i<a.length&&j<b.length;){
                    if(a[i].clique<b[j].clique){
                        ++i;
                    }else if(a[i].clique>b[j].clique){
                        ++j;
                    }else{
                        if(a[i].index<b[j].index){
                            ++i;
                        }else if(a[i].index>b[j].index){
                            ++j;
                        }else{
                            info=a[i];
                            ++i;
                            ++j;
                        }
                    }
                }

                return info as ConnectedComponetInfo;
            }

            for(let i:number=0;i<verticesCount;++i){
                const a:Vertex=cc.vertices[i];
                const aInfos:ConnectedComponetInfo[]=this.vertexToInfo.get(a.id) as ConnectedComponetInfo[];
                aInfos.sort((a,b):number=>{
                    if(a.clique==b.clique){
                        return a.index-b.index;
                    }
                    return a.clique-b.clique;
                });

                a.setColor(this.cliqueComponents[ArrayUtils.last(aInfos).clique-1].color);
                for(let j:number=0;j<verticesCount;++j){
                    const b:Vertex=cc.vertices[j];
                    const bInfos:ConnectedComponetInfo[]=this.vertexToInfo.get(b.id) as ConnectedComponetInfo[];
                    bInfos.sort((a,b):number=>{
                        if(a.clique==b.clique){
                            return a.index-b.index;
                        }
                        return a.clique-b.clique;
                    });
                    b.setColor(this.cliqueComponents[ArrayUtils.last(bInfos).clique-1].color);
                    const info:ConnectedComponetInfo=getMaxCommonInfo(aInfos,bInfos);

                    const e=this.graph.getEdge(a.id,b.id) as Edge;
                    const line=e.line as SVGElement;
                    line.setAttribute("stroke",this.getEdgeStorkeWidth(info.clique).toString());
                    line.setAttribute("stroke-color",info.clique<=2?"var(--reverse-color2)":this.cliqueComponents[info.clique-1].color.toString());
                }
            }
        }


        private checkCCs():void{
            for(const kvp of this.vertexToInfo){
                for(const info of kvp[1]){
                    let find:boolean=false;
                    const cc:KCliqueCC=this.getKCliqueCC(info);
                    for(const v of cc.vertices){
                        if(v.id==kvp[0]){
                            find=true;
                            break;
                        }
                    }
                    if(find==false){
                        throw new Error(`cant find vertex: ${kvp[0]} in clique:${cc.toString("{")} (clique:${info.clique}, idx:${info.index})`);
                    }
                }
            }

            for(const kc of this.cliqueComponents){
                let idx:number=0;
                for(const cc of kc.connectedComponents){
                    if(cc.vertices.length!=kc.clique){
                        console.log(`at clique ${kc.clique} index ${idx}`);
                        throw new Error(`vertice number unexpected ${cc.toString("{")}`);
                    }
                    for(const v of cc.vertices){
                        const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                        let find:boolean=false;
                        for(const info of infos){
                            if(info.clique==kc.clique&&info.index==idx){
                                find=true;
                                break;
                            }
                        }
                        if(find==false){
                            throw new Error(`info of ${v.id} in clique:${cc.toString("{")} (clique:${kc.clique},idx: ${idx}) missing`);
                        }
                    }

                    if(this.searchLargerClique(cc)){
                        throw new Error(`cc ${cc.toString("{")} is subclique`);
                    }

                    ++idx;
                }
            }
        }


        private getKCliqueCC(info:ConnectedComponetInfo):KCliqueCC{
            return this.cliqueComponents[info.clique-1].connectedComponents[info.index];
        }
    }


    class SubCliqueGenerator{
        private results:KCliqueCC[]=[];
        private verticesBuffer:Vertex[]=[];
        private currentCC:KCliqueCC;

        constructor(){
            this.currentCC=KCliqueCC.POOL.get();
            KCliqueCC.POOL.release(this.currentCC);
        }


        public set(cc:KCliqueCC):void{
            this.currentCC=cc;
        }


        public generate(mustHave:Vertex,clique:number):KCliqueCC[]{
            this.verticesBuffer.length=clique;
            
            let idx:number=0;
            for(;idx<this.currentCC.vertices.length;++idx){
                if(this.currentCC.vertices[idx].id==mustHave.id){
                    break;
                }
            }
            this.swap(0,idx);

            this.verticesBuffer[0]=mustHave;
            this.generateClique(1,clique-1);

            this.swap(0,idx);
            return this.results;
        }


        private swap(idx0:number,idx1:number):void{
            const v:Vertex=this.currentCC.vertices[idx0];
            this.currentCC.vertices[idx0]=this.currentCC.vertices[idx1];
            this.currentCC.vertices[idx1]=v;
        }


        public releaseAll():void{
            for(const cc of this.results){
                KCliqueCC.POOL.release(cc);
            }
            this.results.length=0;
        }


        private generateClique(idx:number,left:number):void{
            if(left<=0){
                const cc:KCliqueCC=KCliqueCC.POOL.get();
                cc.vertices.length=this.verticesBuffer.length;
                for(let i:number=0;i<this.verticesBuffer.length;++i){
                    cc.vertices[i]=this.verticesBuffer[i];
                }
                this.results.push(cc);
                return;
            }
            for(let i:number=idx;i<this.currentCC.vertices.length-left+1;++i){
                this.verticesBuffer[left]=this.currentCC.vertices[i];
                this.generateClique(i+1,left-1);
            }
        }

    }
}