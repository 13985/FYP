namespace KCliqueAlgorithm{

    class KCliqueCC extends VisualizationUtils.ConnectedComponent{
        public static readonly POOL:VisualizationUtils.ObjectPool<KCliqueCC>=new VisualizationUtils.ObjectPool(KCliqueCC);

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

        constructor(){
        }

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

        constructor(graph:Graph,svg:SVGSVGElement){
            super(graph,svg);
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
                                v.setColor(cc_.color);
                                (v.circle as SVGCircleElement).setAttribute("fill-opacity","0.5");
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
                /**
                clique 1 {a0 a1 a2 ai an} 
                clique 2 {a0 a1 a2 aj an}

                 */
                const kc:CliqueComponets=new CliqueComponets(2);
                this.cliqueComponents.push(kc);

                for(const e of this.graph.edges){
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.clique=2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }

                for(let currentClique:number=3,noUpdate:boolean=false;noUpdate==false;++currentClique){
                    const kc:CliqueComponets=new CliqueComponets(currentClique);
                    noUpdate=true;
                    const previous:KCliqueCC[]=this.cliqueComponents[currentClique-2].connectedComponents;//currentClique == .length+2
    
                    for(let i:number=0;i<previous.length;++i){
                        const first:KCliqueCC=previous[i];
                        Label_1:for(let j:number=i+1;j<previous.length;++j){
                            const second:KCliqueCC=previous[j];
                            this.set.clear();
                            for(const v of first.vertices){
                                this.set.add(v.id);
                            }
                            let nonIntersectSize:number=0;
    
                            Label_2:{
                                let left_v:Vertex|undefined;
                                for(const v of second.vertices){
                                    if(this.set.has(v.id)){
                                        this.set.delete(v.id);
                                    }else if(nonIntersectSize>=1){
                                        break Label_2;
                                    }else{
                                        left_v=v;
                                        nonIntersectSize=1;
                                    }
                                }
    
                                for(const v_id of this.set){
                                    if(this.graph.getEdge((left_v as Vertex).id,v_id)==undefined){
                                        break Label_2;
                                    }
                                }
                                first.vertices.push(left_v as Vertex);
                                KCliqueCC.POOL.release(second);
                                kc.connectedComponents.push(first);
                                
                                previous[j]=previous[previous.length-1];
                                previous.pop();
                                if(i<previous.length-1){
                                    previous[i]=previous[previous.length-1];
                                    previous.pop();
                                    --i;//prevent the increment of i
                                }
    
                                noUpdate=false;
                                break Label_1;
                            }
                        }
                    }
    
                    this.cliqueComponents.push(kc);
                }
            }

            for(const kc of this.cliqueComponents){
                for(const cc of kc.connectedComponents){
                    const vertices:Vertex[]=cc.vertices;
                    for(let idx:number=0;idx<vertices.length;++idx){
                        const infos:ConnectedComponetInfo[]|undefined=this.vertexToInfo.get(vertices[idx].id);
                        if(infos==undefined){
                            this.vertexToInfo.set(vertices[idx].id,[new ConnectedComponetInfo(kc.clique,idx)]);
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
                            
                            previous[j]=previous[previous.length-1];
                            previous.pop();
                            if(i<previous.length-1){
                                previous[i]=previous[previous.length-1];
                                previous.pop();
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
                VisualizationUtils.DescriptionDisplay.highlightCode(descriptionStates[descriptionStates.length-1].codeStep);
            }else{
                VisualizationUtils.DescriptionDisplay.highlightCode(-1);
            }
        }


        protected addVertex(a:number):boolean{
            const newV:Vertex|null=this.graph.addVertex(a);
            if(newV==null){
                return false;
            }
            const cc:KCliqueCC=KCliqueCC.POOL.get();
            cc.clique=1;
            cc.vertices.push(newV);
            const ccs:KCliqueCC[]=this.cliqueComponents[0].connectedComponents;
            this.vertexToInfo.set(a,[new ConnectedComponetInfo(1,ccs.length)]);
            ccs.push(cc);
            return true;
        }


        protected removeVertex(a:number):boolean{
            if(this.graph.removeVertex(a)==null){
                return false;
            }
            const infos=this.vertexToInfo.get(a) as ConnectedComponetInfo[];

            for(const info of infos){
                const theIndex:number=info.index;
                const theClique:number=info.clique;
                const kc:CliqueComponets=this.cliqueComponents[theClique-1];
                const theCC:KCliqueCC=kc.connectedComponents[theIndex];

                for(let i:number=0;i<theCC.vertices.length;++i){
                    if(theCC.vertices[i].id==a){
                        theCC.vertices.splice(i,1);
                        break;
                    }
                }

                this.removeCC(info);
                if(theClique==1){
                    KCliqueCC.POOL.release(theCC);
                }else{
                    theCC.clique=theClique-1;
                    this.moveCC(theCC,info);
                }
            }

            this.vertexToInfo.delete(a);
            return true;
        }


        protected addEdge(from:number,to:number):boolean {
            if(this.graph.addEdge(from,to)==false){
                return false;
            }
            throw new Error("Method not implemented.");
            return true;
        }


        protected removeEdge(from: number, to: number): boolean {
            if(this.graph.removeEdge(from,to)==false){
                return false;
            }
            const fromInfos=this.vertexToInfo.get(from) as ConnectedComponetInfo[];
            const toInfos=this.vertexToInfo.get(to) as ConnectedComponetInfo[];

            for(const fromInfo of fromInfos){
                for(const toInfo of toInfos){
                    if(fromInfo.clique!=toInfo.clique||fromInfo.index!=toInfo.index){continue;}
                    const theCC:KCliqueCC=this.removeCC(fromInfo);
                    const newCC:KCliqueCC=KCliqueCC.POOL.get();
                    for(let idx:number=0;idx<theCC.vertices.length;++idx){
                        const v:Vertex=theCC.vertices[idx];
                        if(v.id==from){
                            theCC.vertices.splice(idx,1);//theCC contains to
                            newCC.vertices.push(v);//newCC contains from
                            --idx;
                        }else if(v.id==to){
                            //newCC not contains to
                        }else{
                            newCC.vertices.push(v);
                        }
                    }
                    const newClique:number=fromInfo.clique-1;
                    newCC.clique=newClique;
                    theCC.clique=newClique;
                    this.moveCC(theCC,fromInfo);
                    this.addCC(newCC);
                }
            }
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
         * @param originalInfo index and clique before move
         */
        private moveCC(cc:KCliqueCC,originalInfo:ConnectedComponetInfo):void{
            const kc:CliqueComponets=this.cliqueComponents[cc.clique-1];
            const lastIdx:number=kc.connectedComponents.length-1;

            for(const v of cc.vertices){
                const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                for(const info of infos){
                    if(info.clique!=originalInfo.clique||info.index!=originalInfo.index){continue;}
                    info.clique=cc.clique;
                    info.index=lastIdx;
                    break;
                }
            }
        }


        /**
         * @param cc contains the new clique==vertices.length
         */
        private addCC(cc:KCliqueCC):void{
            const kc:CliqueComponets=this.cliqueComponents[cc.clique-1];
            const lastIdx:number=kc.connectedComponents.length-1;

            for(const v of cc.vertices){
                const infos=this.vertexToInfo.get(v.id) as ConnectedComponetInfo[];
                infos.push(new ConnectedComponetInfo(cc.clique,lastIdx));
            }
        }


        private getEdgeStorkeWidth(clique:number):number{
            return 1+(clique*3)/(this.cliqueComponents.length+2);
        }
    }
}