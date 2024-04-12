namespace KCliqueAlgorithm{

    class KCliqueCC extends VisualizationUtils.ConnectedComponent{
        public static readonly POOL:VisualizationUtils.ObjectPool<KCliqueCC>=new VisualizationUtils.ObjectPool(KCliqueCC,256);

        public clique:number=-1;

        constructor(clique:number=1){
            super();
            this.clique=clique;
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


    class ConnectedComponetInfo{
        public clique:number=0;
        public index:number=0;

        constructor(c:number,i:number){
            this.clique=c;
            this.index=i;
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


    interface NumberReference{
        value:number;
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
            {code:"         if they intersect in size vertex count-1 and<br> remaining two vertices are connected :{",step:7},
            {code:"            merge them;",step:6},
            {code:"            no_update=false;",step:7},
            {code:"         }",step:undefined},
            {code:"      }",step:undefined},
            {code:"   }",step:undefined},
            {code:"   if no_update is true,break",step:8},
            {code:"}",step:undefined},
        ];

        /**************************UI******************************************/

        /**************************helper data structures**********************/
        private readonly set:Set<number>=new Set();

        private subCliqueGeneratorA?:SubCliqueGenerator;
        private subCliqueGeneratorB?:SubCliqueGenerator;

        /**************************index data structures**********************/

        //1-cliques stored at 0, 2-cliques stored at 1, 3-cliques stored at 2....
        private cliqueComponents:Array<CliqueComponets>=[];
        private readonly edgeToIndex:Map<number,number>=new Map();
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
                        for(const from of cc.vertices){
                            for(const to of cc.vertices){
                                if(from.id==to.id){continue;}
                                const e=this.graph.getEdge(from.id,to.id) as Edge;
                                const line=e.line as SVGLineElement;
                                line.setAttribute("stroke",edgeColorStr);
                                line.setAttribute("stroke-opacity","1");
                                line.setAttribute("stroke-width",`${this.getEdgeStorkeWidth(cc.clique)}`);
                                from.setColorString(vertexColorStr);
                                (from.circle as SVGCircleElement).setAttribute("fill-opacity",KClique.OPACITY.toString());
                            }
                        }
                    }
                }
            }
            return this;
        }


        public createIndexStructure():this{
            for(const kc of this.cliqueComponents){
                for(const cc of kc.connectedComponents){
                    KCliqueCC.POOL.release(cc);
                }
            }
            this.cliqueComponents.length=0;

            {//for 1 cliques
                const kc:CliqueComponets=new CliqueComponets(1);
                this.cliqueComponents.push(kc);
    
                this.graph.adjacencyList.forEach((vl:VerticeList,v_id:number):void=>{
                    if(vl.others.length>0){
                        return;
                    }
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.clique=1;
                    cc.vertices.push(vl.main);
                    kc.connectedComponents.push(cc);
                });
            }
            
            if(this.graph.edges.length<=0){
            }else{
                const kc:CliqueComponets=new CliqueComponets(2);
                this.cliqueComponents.push(kc);
                this.edgeToIndex.clear();

                for(let i:number=0;i<this.graph.edges.length;++i){
                    const e:Edge=this.graph.edges[i];
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.clique=2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    this.edgeToIndex.set(this.graph.getEdgeHashCode(e.source.id,e.target.id),i);
                    kc.connectedComponents.push(cc);
                }

                const returnEdgeCode:NumberReference={value:0};

                for(let currentClique:number=3;true;++currentClique){
                    const next:CliqueComponets=new CliqueComponets(currentClique);
                    const previous:KCliqueCC[]=this.cliqueComponents[currentClique-2].connectedComponents;//currentClique == .length+2
    
                    for(let i:number=0;i<previous.length;){
                        const first:KCliqueCC=previous[i];
                        Label_0:{
                            for(let j:number=i+1;j<previous.length;++j){
                                const second:KCliqueCC=previous[j];
                                const left_v:Vertex|null=this.testCombine(first,second,returnEdgeCode);
                                if(left_v==null){
                                    continue;
                                }
                                
                                first.vertices.push(left_v);
                                KCliqueCC.POOL.release(second);
                                first.clique=currentClique;
                                next.connectedComponents.push(first);
                                
                                removeAsSwapBack(previous,j);
                                removeAsSwapBack(previous,i);

                                /*
                                const idx:number=this.edgeToIndex.get(returnEdgeCode.value) as number;
                                removeAsSwapBack(this.cliqueComponents[1].connectedComponents,idx);
                                this.edgeToIndex.delete(returnEdgeCode.value);
                                if(idx<this.cliqueComponents[1].connectedComponents.length){
                                    const cc:KCliqueCC=this.cliqueComponents[1].connectedComponents[idx];
                                    this.edgeToIndex.set(this.graph.getEdgeHashCode(cc.vertices[0].id,cc.vertices[1].id),idx);
                                }*/
                                break Label_0;
                            }
                            ++i;
                        }
                    }
                    
                    if(next.connectedComponents.length>0){
                        this.cliqueComponents.push(next);
                    }else{
                        break;
                    }
                }
            }

            //clean up, remove the subcliques of larger clique
            for(let i:number=1,j:number=2;j<this.cliqueComponents.length;i=j,++j){
                const previous:KCliqueCC[]=this.cliqueComponents[i].connectedComponents;
                const next:KCliqueCC[]=this.cliqueComponents[j].connectedComponents;
                
                for(let b:number=0;b<next.length;++b){
                    for(let a:number=0;a<previous.length;){
                        this.set.clear();
                        for(const v of previous[a].vertices){
                            this.set.add(v.id);
                        }
                        for(const v of next[b].vertices){
                            this.set.delete(v.id);
                        }

                        if(this.set.size<=0){
                            KCliqueCC.POOL.release(previous[a]);
                            removeAsSwapBack(previous,a);
                        }else{
                            ++a;
                        }
                    }
                }
            }

            for(const kc of this.cliqueComponents){
                const ccs:KCliqueCC[]=kc.connectedComponents;
                for(let idx:number=0;idx<ccs.length;++idx){
                    for(const v of ccs[idx].vertices){
                        const infos:ConnectedComponetInfo[]|undefined=this.vertexToInfo.get(v.id);
                        if(infos==undefined){
                            this.vertexToInfo.set(v.id,[new ConnectedComponetInfo(kc.clique,idx)]);
                            continue;
                        }
                        infos.push(new ConnectedComponetInfo(kc.clique,idx));
                    }
                }
            }

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
                let previous:KCliqueCC[]=[];
                let newGenerated:KCliqueCC[]=[];
                let remainVertices:Vertex[]=[];
                const previousEdgeColor:Map<number,string>=new Map();
                
                for(const e of this.graph.edges){
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.clique=2;
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
                for(let noUpdate:boolean;true;){
                    noUpdate=true;
                    newGenerated.length=0;
                    this.states.localStatePush({step:step,codeStep:3,stepDescription:`for ${currentClique+1}-Clique`});
                    ++step;

                    for(let i:number=0;i<previous.length;++i){
                        function ccToString(cc:KCliqueCC):string{
                            let ret:string="";
                            for(const v of cc.vertices){
                                ret+=`${v.id},`
                            }
                            return ret.substring(0,ret.length-1);
                        }

                        const highlightCC=(cc:KCliqueCC,opacity:number,edgeWidth:number,updateEdgeColor:boolean=false):void=>{
                            const clique:number=cc.clique;
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
                        highlightCC(first,1,1+(first.clique*3/(this.cliqueComponents.length+2)));
                        this.states.localStatePush({step:step,codeStep:4,stepDescription:`clique: ${ccToString(first)}`});
                        ++step;

                        /**
                         * @summary note that here is slightly different from the createState()
                         */
                        Label_1:for(let j:number=i+1;j<previous.length;++j){
                            const second:KCliqueCC=previous[j];
                            this.set.clear();
                            remainVertices.length=0;
                            
                            for(const v of first.vertices){
                                this.set.add(v.id);
                            }
                            
                            for(const v of second.vertices){
                                if(this.set.has(v.id)){
                                    this.set.delete(v.id);
                                }else{
                                    remainVertices.push(v);
                                }
                            }

                            const highlightRemainVertices=(clique:number,opacity:number,width:number):void=>{
                                for(let i:number=0;i<remainVertices.length;++i){
                                    const v0:Vertex=remainVertices[i];
                                    const vertexColor:string=this.cliqueComponents[clique-1].color.toString();
                                    let ds:DataState=DataState.POOL.get();
                                    ds.step=step;
                                    ds.color=vertexColor;
                                    ds.opacity=opacity;
                                    (this.states as State).dataStatePush(v0.id,ds);
    
                                    const helper=(vA:Vertex,vB:Vertex):void=>{
                                        const e:Edge|undefined=this.graph.getEdge(vA.id,vB.id);
                                        if(e==undefined){return;}
                                        const code:number=this.graph.getEdgeHashCode(vA.id,vB.id);
                                        ds=DataState.POOL.get();
                                        ds.step=step;
                                        ds.color=previousEdgeColor.get(code) as string;
                                        ds.opacity=opacity;
                                        ds.width=width;
                                        (this.states as State).dataStatePush(code,ds);
                                    }
    
                                    for(const v1 of first.vertices){
                                        helper(v1,v0);
                                    }
                                    for(let j:number=i+1;j<remainVertices.length;++j){
                                        helper(remainVertices[j],v0);
                                    }
                                }
                            }
                            
                            highlightRemainVertices(second.clique,1,this.getEdgeStorkeWidth(second.clique));
                            this.states.localStatePush({step:step,codeStep:5,stepDescription:`check with clique: ${ccToString(second)}`});
                            ++step;

                            if(remainVertices.length>1){//i hate early continue, make sure the state has poped
                                highlightRemainVertices(second.clique,KClique.OPACITY,1);
                                this.states.localStatePop(step);
                                ++step;
                                continue;
                            }
                            
                            const left_v:Vertex=remainVertices[0];
                            let the_v:Vertex=left_v;//just to prevent use of unassigned local variable error
                            for(const v of this.set){
                                the_v=(this.graph.adjacencyList.get(v) as VerticeList).main;
                            }

                            if(this.graph.getEdge(the_v.id,left_v.id)==undefined){
                                highlightRemainVertices(second.clique,KClique.OPACITY,1);
                                this.states.localStatePop(step);
                                ++step;
                                continue;
                            }
                            
                            first.vertices.push(left_v);
                            newGenerated.push(first);
                            
                            removeAsSwapBack(previous,j);
                            if(i<previous.length-1){
                                removeAsSwapBack(previous,i);
                                --i;//prevent the increment of i
                            }
                            noUpdate=false;
                            
                            first.clique=currentClique+1;
                            highlightCC(first,1,this.getEdgeStorkeWidth(currentClique),true);
                            this.states.localStateTop({step:step,codeStep:6,stepDescription:`merge`});
                            ++step;
                            this.states.localStateTop({step:step,codeStep:7,stepDescription:`set no_update=false`});
                            ++step;
                            this.states.localStatePop(step);
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

                    {//swap two buffer
                        const temp=previous;
                        previous=newGenerated;
                        newGenerated=temp;
                    }
                    if(noUpdate){
                        break;
                    }
                    ++currentClique;
                }

                this.states.localStateTop({step:step,codeStep:8,stepDescription:`highest clique:${currentClique}`});
                ++step;
            }
            this.states.localStatePop(step);
            this.states.onInitEnd(step);
            VisualizationUtils.VideoControl.maxStepSpan.innerText=`${this.states.maxStep}`;
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
            let dataStates:DataState[]|null;
            this.states.resetStep();
            VisualizationUtils.Algorithm.setCurrentStep(0);
            
            AnimtaionLoop:while(true){
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
                VisualizationUtils.DescriptionDisplay.highlightCode(arrayLast(descriptionStates).codeStep);
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
            cc.clique=1;
            cc.vertices.push(newV);
            const ccs:KCliqueCC[]=this.cliqueComponents[0].connectedComponents;
            this.vertexToInfo.set(a,[new ConnectedComponetInfo(1,ccs.length)]);
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

            for(const info of infos){
                const theIndex:number=info.index;
                let theClique:number=info.clique;
                const kc:CliqueComponets=this.cliqueComponents[theClique-1];
                const theCC:KCliqueCC=kc.connectedComponents[theIndex];

                --theClique;
                if(theClique<=0){
                    this.removeCC(info);
                    KCliqueCC.POOL.release(theCC);
                }else{
                    for(let i:number=0;i<theCC.vertices.length;++i){
                        if(theCC.vertices[i].id==a){
                            removeAsSwapBack(theCC.vertices,i);
                            break;
                        }
                    }

                    if(this.tryMoveCC(theCC,info)==false){
                        this.removeCC(info);
                        KCliqueCC.POOL.release(theCC);
                    }
                }
            }

            this.vertexToInfo.delete(a);
            this.checkCCs();
            return true;
        }


        protected addEdge(from:number,to:number):boolean {
            if(this.graph.addEdge(from,to)==false){
                return false;
            }
            this.graphWindow.updateSimulation();
            if(this.subCliqueGeneratorA==undefined){
                this.subCliqueGeneratorA=new SubCliqueGenerator();
                this.subCliqueGeneratorB=new SubCliqueGenerator();
            }
            const generatorFrom=this.subCliqueGeneratorA as SubCliqueGenerator;
            const generatorTo=this.subCliqueGeneratorB as SubCliqueGenerator;
            const fromInfos=this.vertexToInfo.get(from) as ConnectedComponetInfo[];
            const toInfos=this.vertexToInfo.get(to) as ConnectedComponetInfo[];
            generatorFrom.set(fromInfos,this.cliqueComponents);
            generatorTo.set(toInfos as ConnectedComponetInfo[],this.cliqueComponents);

            const newGeneratedCCs:KCliqueCC[]=[];

            for(let currentClique:number=1;true;){
                const subCCsFrom:KCliqueCC[]=generatorFrom.generateSubCliques(currentClique);
                const subCCsTo:KCliqueCC[]=generatorTo.generateSubCliques(currentClique);

                //merging two sub clique
                for(let i:number=0;i<subCCsFrom.length;++i){
                    const first:KCliqueCC=subCCsFrom[i];
                    for(let j:number=0;j<subCCsTo.length;++j){
                        const second:KCliqueCC=subCCsTo[j];
                        const left_v:Vertex|null=this.testCombine(first,second);
                        if(left_v==null){
                            continue;
                        }
                        //the two remain vertices must be from and to....
                        first.clique=currentClique+1;
                        first.vertices.push(left_v);
                        newGeneratedCCs.push(first);
                        KCliqueCC.POOL.release(second);

                        removeAsSwapBack(subCCsFrom,i);//remove first from subCCsFrom to prevent first got freed
                        removeAsSwapBack(subCCsTo,j);//remove second from subCCsTo since it is merged and freed
                        --i;
                        break;
                    }
                }

                //merging one sub clique and one existing clique
                for(const info of fromInfos){
                    if(info.clique!=currentClique){continue;}
                    const first:KCliqueCC=this.cliqueComponents[info.clique-1].connectedComponents[info.index];
                    for(let j:number=0;j<subCCsTo.length;++j){
                        const second:KCliqueCC=subCCsTo[j];
                        const left_v:Vertex|null=this.testCombine(first,second);
                        if(left_v==null){
                            continue;
                        }
                        //the two remain vertices must be from and to....
                        first.clique=currentClique+1;
                        first.vertices.push(left_v);
                        this.moveCC(currentClique+1,info);
                        KCliqueCC.POOL.release(second);
                        
                        removeAsSwapBack(subCCsTo,j)//remove second from subCCsTo since it is merged and freed
                    }
                }

                for(const info of toInfos){
                    if(info.clique!=currentClique){continue;}
                    const first:KCliqueCC=this.cliqueComponents[info.clique-1].connectedComponents[info.index];
                    for(let j:number=0;j<subCCsFrom.length;++j){
                        const second:KCliqueCC=subCCsFrom[j];
                        const left_v:Vertex|null=this.testCombine(first,second);
                        if(left_v==null){
                            continue;
                        }
                        //the two remain vertices must be from and to....
                        first.clique=currentClique+1;
                        first.vertices.push(left_v);
                        this.moveCC(currentClique+1,info);
                        KCliqueCC.POOL.release(second);
                        
                        removeAsSwapBack(subCCsFrom,j);//remove second from subCCsTo since it is merged and freed
                    }
                }

                //merge two existing clique
                for(const fromInfo of fromInfos){
                    if(fromInfo.clique!=currentClique){continue;}
                    const fromCC:KCliqueCC=this.cliqueComponents[fromInfo.clique-1].connectedComponents[fromInfo.index];

                    for(const toInfo of toInfos){
                        if(toInfo.clique!=currentClique){continue;}
                        const toCC:KCliqueCC=this.cliqueComponents[toInfo.clique-1].connectedComponents[toInfo.index];

                        const left_v:Vertex|null=this.testCombine(fromCC,toCC);
                        if(left_v==null){
                            continue;
                        }
                        //the two remain vertices must be from and to....
                        fromCC.clique=currentClique+1;
                        fromCC.vertices.push(left_v);
                        this.moveCC(currentClique+1,fromInfo);
                        KCliqueCC.POOL.release(this.removeCC(toInfo));
                    }
                }

                for(const cc of subCCsFrom){KCliqueCC.POOL.release(cc);}
                for(const cc of subCCsTo){KCliqueCC.POOL.release(cc);}

                break;
            }

            for(const cc of newGeneratedCCs){
                this.addCC(cc);
            }
            this.checkCCs();
            return true;
        }


        protected removeEdge(from: number, to: number): boolean {
            if(this.graph.removeEdge(from,to)==false){
                return false;
            }
            this.graphWindow.updateSimulation();
            const fromInfos=this.vertexToInfo.get(from) as ConnectedComponetInfo[];
            const toInfos=this.vertexToInfo.get(to) as ConnectedComponetInfo[];

            for(let i:number=0;i<fromInfos.length;++i){
                const fromInfo:ConnectedComponetInfo=fromInfos[i];
                for(let j:number=0;j<toInfos.length;){
                    const toInfo:ConnectedComponetInfo=toInfos[j];
                    if(fromInfo.clique!=toInfo.clique||fromInfo.index!=toInfo.index){
                        ++j;
                        continue;
                    }//find the common clique contains from and to
                    
                    const newClique:number=fromInfo.clique-1;
                    const newCC:KCliqueCC=KCliqueCC.POOL.get();
                    const theCC:KCliqueCC=this.cliqueComponents[newClique].connectedComponents[fromInfo.index];
                    newCC.clique=newClique;
                    removeAsSwapBack(toInfos,j);//remove toInfo since theCC not storing "to" anymore (toInfo and fromInfo both pointing to theCC)

                    for(let idx:number=0;idx<theCC.vertices.length;){
                        const v:Vertex=theCC.vertices[idx];
                        if(v.id==to){
                            removeAsSwapBack(theCC.vertices,idx);//theCC contains "from", and remove "to"
                            newCC.vertices.push(v);//newCC contains "to"
                        }else if(v.id==from){
                            ++idx;
                            //newCC not contains "from"
                        }else{
                            ++idx;
                            newCC.vertices.push(v);
                        }
                    }

                    //not storing 1-clique
                    if(this.tryMoveCC(theCC,fromInfo)==false){;
                        KCliqueCC.POOL.release(theCC);
                        this.removeCC(fromInfo);
                        removeAsSwapBack(fromInfos,i);
                        if(i<fromInfos.length){
                            --i;
                        }
                    }

                    if(newCC.vertices.length<=1){
                        if((this.graph.adjacencyList.get(to) as VerticeList).others.length<=0){
                            this.addCC(newCC);
                        }else{
                            KCliqueCC.POOL.release(newCC);
                        }
                    }else{
                        this.addCC(newCC);
                    }
                }
            }
            this.checkCCs();
            return true;
        }


        /**
         * @summary remove the CC pointed by info from this.cliqueComponents[infro.clique-1] and return the CC back
         */
        private removeCC(info:ConnectedComponetInfo):KCliqueCC{
            const theClique:number=info.clique;
            const theIndex:number=info.index;
            const kc:CliqueComponets=this.cliqueComponents[theClique-1];
            const theCC:KCliqueCC=kc.connectedComponents[theIndex];

            for(const v of theCC.vertices){//for all other vertices
                const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                for(let i:number=0;i<infos.length;++i){//find the info that pointing to this CC, remove it
                    const info:ConnectedComponetInfo=infos[i];
                    if(info.clique!=theClique||info.index!=theIndex){continue;}
                    removeAsSwapBack(infos,i);
                    break;
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
         * @summary move the ConnectedComponet pointed by originalInfo to CliqueComponets that stores newClique-clique
         * @param newClique
         * @param originalInfo index and clique before move
         */
        private moveCC(newClique:number,originalInfo:ConnectedComponetInfo):void{
            const oldClique:number=originalInfo.clique;
            const oldIndex:number=originalInfo.index;
            const destination:CliqueComponets=this.cliqueComponents[newClique-1];
            const source:CliqueComponets=this.cliqueComponents[oldClique-1];
            const cc:KCliqueCC=source.connectedComponents[oldIndex];
            
            function helper(infos:ConnectedComponetInfo[],oldClique_:number,oldIndex_:number,newClique_:number,newIndex_:number):void{
                for(const info of infos){
                    if(info.clique!=oldClique_||info.index!=oldIndex_){continue;}
                    info.clique=newClique_;
                    info.index=newIndex_;
                    return;
                }
            }
            
            let lastIdx:number=destination.connectedComponents.length;
            cc.clique=newClique;
            for(const v of cc.vertices){//move the cc from source to destination and change the info of vertices of that cc
                const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                helper(infos,oldClique,oldIndex,newClique,lastIdx);
            }
            destination.connectedComponents.push(cc);

            lastIdx=source.connectedComponents.length-1;
            if(oldIndex<lastIdx){//move the last cc in source to originalInfo.Index and change ithe info
                const lastCC:KCliqueCC=source.connectedComponents[lastIdx];
                for(const v of lastCC.vertices){
                    const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                    helper(infos,oldClique,lastIdx,oldClique,oldIndex);
                }
                source.connectedComponents[oldIndex]=lastCC;
            }
            source.connectedComponents.pop();
        }


        /**
         * @param cc contains the new clique==vertices.length
         */
        private addCC(cc:KCliqueCC):void{
            const kc:CliqueComponets=this.cliqueComponents[cc.clique-1];
            const lastIdx:number=kc.connectedComponents.length;

            for(const v of cc.vertices){
                const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                infos.push(new ConnectedComponetInfo(cc.clique,lastIdx));
            }
            kc.connectedComponents.push(cc);
        }


        /**
         * @summary index structure only store highest unique clique as possible
         * test if this is one clique, and if the vertex is isolated
         */
        private tryMoveCC(cc:KCliqueCC,info:ConnectedComponetInfo):boolean{
            if(cc.vertices.length<=1){
                if((this.graph.adjacencyList.get(cc.vertices[0].id) as VerticeList).others.length<=0){
                    this.moveCC(1,info);
                    return true;
                }else{
                    return false;
                }
            }else{
                this.moveCC(cc.vertices.length,info);
                return true;
            }
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
        private testCombine(a:KCliqueCC,b:KCliqueCC,outEdgeCode?:NumberReference):Vertex|null{
            this.set.clear();
            let left_v:Vertex|null=null;
            for(const v of a.vertices){
                this.set.add(v.id);
            }
            Label_0:{
                for(const v of b.vertices){
                    if(this.set.has(v.id)){
                        this.set.delete(v.id);
                    }else if(left_v!=null){
                        left_v=null;
                        break Label_0;
                    }else{
                        left_v=v;
                    }
                }
                
                for(const v_id of this.set){//only one v_id
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

                a.setColor(this.cliqueComponents[arrayLast(aInfos).clique-1].color);
                for(let j:number=0;j<verticesCount;++j){
                    const b:Vertex=cc.vertices[j];
                    const bInfos:ConnectedComponetInfo[]=this.vertexToInfo.get(b.id) as ConnectedComponetInfo[];
                    bInfos.sort((a,b):number=>{
                        if(a.clique==b.clique){
                            return a.index-b.index;
                        }
                        return a.clique-b.clique;
                    });
                    b.setColor(this.cliqueComponents[arrayLast(bInfos).clique-1].color);
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
                    for(const v of this.cliqueComponents[info.clique-1].connectedComponents[info.index].vertices){
                        if(v.id==kvp[0]){
                            find=true;
                            break;
                        }
                    }
                    if(find==false){
                        throw new Error(`cant find ${kvp[0]} in clique:${info.clique},${info.index}`);
                    }
                }
            }

            for(const kc of this.cliqueComponents){
                let idx:number=0;
                for(const cc of kc.connectedComponents){
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
                            throw new Error(`info of ${v.id} in clique ${kc.clique},${idx} missing`);
                        }
                    }

                    ++idx;
                }
            }
        }
    }


    class SubCliqueGenerator{
        private results:KCliqueCC[]=[];
        private ccs:KCliqueCC[]=[];
        private verticesBuffer:Vertex[]=[];
        private currentCC:KCliqueCC;

        constructor(){
            this.currentCC=KCliqueCC.POOL.get();
            KCliqueCC.POOL.release(this.currentCC);
        }

        public set(infos:ConnectedComponetInfo[],cliqueComponents:CliqueComponets[]):void{
            this.ccs.length=0;
            for(const info of infos){
                this.ccs.push(cliqueComponents[info.clique-1].connectedComponents[info.index]);
            }
            this.ccs.sort((a:KCliqueCC,b:KCliqueCC):number=>{//sort it reversely, from larger clique to smaller clique
                return b.clique-a.clique;
            });
        }


        public generateSubCliques(clique:number):KCliqueCC[]{
            this.verticesBuffer.length=clique;

            this.results.length=0;
            for(const cc of this.ccs){
                if(cc.clique<=clique){break;}
                this.currentCC=cc;
                this.generateClique(0,clique);
            }
            return this.results;
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
            --left;
            for(let i:number=idx;i<this.currentCC.vertices.length-left;++i){
                this.verticesBuffer[left]=this.currentCC.vertices[i];
                this.generateClique(i+1,left);
            }
        }

    }
}