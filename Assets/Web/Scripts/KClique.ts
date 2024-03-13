namespace KCliqueAlgorithm{

    class KCliqueCC extends VisualizationUtils.ConnectedComponent{
        public static readonly POOL:VisualizationUtils.ObjectPool<KCliqueCC>=new VisualizationUtils.ObjectPool(KCliqueCC);

        public clique:number=-1;
        public polygonOpacity:number=0.4;
        public polygon:SVGPolygonElement|null=null;

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
        public static readonly POOL=new VisualizationUtils.ObjectPool<DataState>(DataState);
        public step:number=0;
        public color:string="var(--reverse-color-2)";
        public opacity:number=0.4;
        public width:number=1;

        constructor(){
        }

        public clear(): void {
            
        }
    }


    class State extends VisualizationUtils.StateManager<DataState,VisualizationUtils.DescriptionState>{
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
                this.dataStates.set(v.id,[ds]);
            }
            for(const e of this.graph.edges){
                const ds:DataState=DataState.POOL.get();
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
        protected static readonly VERTEX_OPACITY:number=0.4;
        protected static readonly CODE_DESCRIPTION:string=
`iteration manner`;

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
        private cliqueComponents:Array<CliqueComponets>=[];
        private readonly vertexToInfo:Map<number,ConnectedComponetInfo>=new Map();

        /**************************animation state***************************/
        private state?:State;

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
                        const colorStr:string=cc_.color.toString();
                        for(const from of cc.vertices){
                            for(const to of cc.vertices){
                                if(from.id==to.id){continue;}
                                const e=this.graph.getEdge(from.id,to.id) as Edge;
                                const line=e.line as SVGLineElement;
                                line.setAttribute("stroke",colorStr);
                                line.setAttribute("stroke-opacity","1");
                                line.setAttribute("stroke-width",`${1+cc.clique*3/(this.cliqueComponents.length)}`);
                                from.setColorString(colorStr);
                                (from.circle as SVGCircleElement).setAttribute("fill-opacity",KClique.VERTEX_OPACITY.toString());
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

            return this;
        }


        public createState():this{
            if(this.state==undefined){
                this.state=new State(this.graph);
            }else{
                this.state.init();
            }
            VisualizationUtils.DescriptionDisplay.codeDescription.innerHTML=KClique.CODE_DESCRIPTION;
            VisualizationUtils.DescriptionDisplay.setCodes(KClique.PSEUDO_CODES);

            let step:number=1;

            {//for 1 cliques
                const color:string=this.cliqueComponents[0].color.toString();
                for(const v of this.graph.vertices){
                    const ds:DataState=DataState.POOL.get();
                    ds.color=color;
                    ds.step=step;
                    this.state.dataStatePush(v.id,ds);
                }
                this.state.localStatePush({step:step,codeStep:1,stepDescription:"set all vertices"});
                ++step;
            }
            
            if(this.graph.edges.length<=0){
                this.state.localStatePush({step:step,codeStep:1,stepDescription:"highest clique:1"});
                ++step;
            }else{
                let previous:KCliqueCC[]=[];
                let newGenerated:KCliqueCC[]=[];
                
                for(const e of this.graph.edges){
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.clique=2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    previous.push(cc);
                }

                const string=this.cliqueComponents[1].color.toString();
                for(const v of this.graph.vertices){
                    const ds:DataState=DataState.POOL.get();
                    ds.step=step;
                    ds.color
                    this.state.dataStatePush(v.id,ds);
                }
                for(const e of this.graph.edges){
                    const ds:DataState=DataState.POOL.get();
                    ds.step=step;
                    this.state.dataStatePush(this.graph.getEdgeHashCode(e.source.id,e.target.id),ds);
                }
                this.state.localStatePush({step:step,codeStep:2,stepDescription:"set all connected vertices to 2-clique"});
                ++step;
                
                for(let currentClique:number=3,noUpdate:boolean=false;noUpdate==false;++currentClique){
                    noUpdate=true;
                    newGenerated.length=0;
                    this.state.localStatePush({step:step,codeStep:3,stepDescription:`for ${currentClique}-Clique`});
                    ++step;

                    for(let i:number=0;i<previous.length;++i){
                        function ccToString(cc:KCliqueCC):string{
                            let ret:string="";
                            for(const v of cc.vertices){
                                ret+=`${v.id},`
                            }
                            return ret.substring(0,ret.length-1);
                        }

                        /**
                         * @todo find a way to do this....
                         */
                        const highlightCC=(cc:KCliqueCC):void=>{
                            for(const v of cc.vertices){
                                const ds:DataState=DataState.POOL.get();
                                ds.opacity=1;
                                ds.step=step;
                                this.state?.dataStatePush(v.id,ds);
                            }
                            const verticesCount:number=cc.vertices.length;
                            for(let i:number=0;i<verticesCount;++i){
                                for(let j:number=i+1;j<verticesCount;++j){
                                    const ds:DataState=DataState.POOL.get();
                                    ds.opacity=1;
                                    ds.step=step;
                                    ds.width=1+(cc.clique*3/this.cliqueComponents.length+2);
                                    this.state?.dataStatePush(this.graph.getEdgeHashCode(cc.vertices[i].id,cc.vertices[j].id),ds);
                                }
                            }
                        }

                        const unhighlightCC=(cc:KCliqueCC):void=>{
                            for(const v of cc.vertices){
                                const ds:DataState=DataState.POOL.get();
                                ds.opacity=KClique.VERTEX_OPACITY;
                                ds.step=step;
                                this.state?.dataStatePush(v.id,ds);
                            }
                            const verticesCount:number=cc.vertices.length;
                            for(let i:number=0;i<verticesCount;++i){
                                for(let j:number=i+1;j<verticesCount;++j){
                                    const ds:DataState=DataState.POOL.get();
                                    ds.opacity=KClique.VERTEX_OPACITY;
                                    ds.step=step;
                                    ds.width=1;
                                    this.state?.dataStatePush(this.graph.getEdgeHashCode(cc.vertices[i].id,cc.vertices[j].id),ds);
                                }
                            }
                        }

                        const first:KCliqueCC=previous[i];
                        highlightCC(first);
                        this.state.localStatePush({step:step,codeStep:4,stepDescription:`clique: ${ccToString(first)}`});
                        ++step;

                        Label_1:for(let j:number=i+1;j<previous.length;++j){
                            const second:KCliqueCC=previous[j];
                            highlightCC(second);
                            this.set.clear();

                            this.state.localStatePush({step:step,codeStep:5,stepDescription:`check with clique: ${ccToString(second)}`});
                            ++step;
                            
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
                                newGenerated.push(first);
                                
                                previous[j]=previous[previous.length-1];
                                previous.pop();
                                if(i<previous.length-1){
                                    previous[i]=previous[previous.length-1];
                                    previous.pop();
                                    --i;//prevent the increment of i
                                }
    
                                noUpdate=false;

                                this.state.localStateTop({step:step,codeStep:6,stepDescription:`merge`});
                                ++step;
                                this.state.localStateTop({step:step,codeStep:7,stepDescription:`set no_update=false`});
                                ++step;
                                this.state.localStatePop(step);
                                ++step;
                                unhighlightCC(second);
                                ++step;
                                break Label_1;
                            }
                            this.state.localStatePop(step);
                            ++step;
                            unhighlightCC(second);
                        }
                        unhighlightCC(first);
                        this.state.localStatePop(step);
                        ++step;
                    }
                    this.state.localStatePop(step);
                    ++step;
                }
            }
            this.state.localStatePop(step);
            return this;
        }


        protected async animate():Promise<void>{
            


        }

        protected addVertex(a: number): boolean {
            if(this.graph.addVertex(a)==null){
                return false;
            }
            throw new Error("Method not implemented.");
            return true;
        }
        protected removeVertex(a: number): boolean {
            if(this.graph.removeVertex(a)==null){
                return false;
            }
            throw new Error("Method not implemented.");
            return true;
        }
        protected addEdge(from: number, to: number): boolean {
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
            throw new Error("Method not implemented.");
            return true;
        }
    }
}