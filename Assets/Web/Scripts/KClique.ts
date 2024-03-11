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


    class DataState implements VisualizationUtils.IStep{
        public step:number=0;

        constructor(step:number){
            this.step=step;
        }
    }


    class State extends VisualizationUtils.StateManager<DataState,VisualizationUtils.DescriptionState>{
        protected setDataKeys(): void {
            throw new Error("Method not implemented.");
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

        /**************************UI******************************************/

        /**************************helper data structures**********************/
        private readonly set:Set<number>=new Set();

        /**************************index data structures**********************/
        private cliqueComponents:Array<CliqueComponets>=[];
        private readonly vertexToInfo:Map<number,ConnectedComponetInfo>=new Map();

        /**************************animation state***************************/

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
                                line.setAttribute("stroke-width",`${1+cc.clique*2/this.cliqueComponents.length}`);
                                from.setColorString(colorStr);
                                (from.circle as SVGCircleElement).setAttribute("fill-opacity","0.5");
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
            /*
            foreach k-clique=>find k+1-clique
            
            foreach x in  k-clique 
                foreach vertex in x
                    foreach neighbor of vertex
                        if
                        this vertex connected to all vertices in x && not in x
                        then update this clique to k+1, break;

            */

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

                for(const e of this.graph.edges){
                    const cc:KCliqueCC=KCliqueCC.POOL.get();
                    cc.clique=2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }
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

            return this;
        }


        public createState():this{
            return this;
        }


        public clearState():this{
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