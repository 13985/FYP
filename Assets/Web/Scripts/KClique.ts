namespace KCliqueAlgorithm{

    class KCliqueCC extends VisualizationUtils.ConnectedComponent{
        public static readonly pool:VisualizationUtils.ObjectPool<KCliqueCC>=new VisualizationUtils.ObjectPool(KCliqueCC);

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


    /**
     * @brief
     * note that any subgraph of a fully connected graph is also fully connected
     */
    export class KClique extends VisualizationUtils.Algorithm{
        public readonly CliqueComponents:CliqueComponets[]=[];

        /**************************UI******************************************/

        /**************************helper data structures**********************/
        private readonly set:Set<number>=new Set();

        /**************************index data structures**********************/
        public readonly KCliqueComponets:Array<CliqueComponets>=[];
        private readonly vertexToInfo:Map<number,ConnectedComponetInfo>=new Map();

        /**************************animation state***************************/

        constructor(graph:Graph,svg:SVGSVGElement){
            super(graph,svg);
            if(graph.vertices.length>0){
                this.createIndexStructure();
            }
        }


        public setColorGradient(start_:Color,end_:Color):this{
            const start:Color=start_.clone();//copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const end:Color=end_.clone();//copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const kCliqueCount:number=this.CliqueComponents.length;
            const interval:number=kCliqueCount-1;

            for(let i:number=0;i<kCliqueCount;++i){
                Color.lerp(this.CliqueComponents[i].color,start,end,i/interval);
            }
            return this;
        }


        public setVisualElementsColor(defaultColor:boolean):this{
            if(defaultColor){

            }else{
                for(const cc_ of this.CliqueComponents){
                    if(cc_.clique<=1){
                        continue;
                    }
                    for(const cc of cc_.connectedComponents){
                        const colorStr:string=cc_.color.toString();
                        for(const from of cc.vertices){
                            for(const to of cc.vertices){
                                if(from.id==to.id){continue;}
                                const e=this.graph.getEdge(from.id,to.id) as Edge;
                                (e.line as SVGLineElement).setAttribute("stroke",colorStr);
                                (e.line as SVGLineElement).setAttribute("opacity","1");
                            }
                        }
                    }
                }
            }
            return this;
        }


        public createIndexStructure():this{
            for(const kc of this.CliqueComponents){
                for(const cc of kc.connectedComponents){
                    KCliqueCC.pool.release(cc);
                }
            }
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
                this.CliqueComponents.push(kc);
    
                this.graph.adjacencyList.forEach((vl:VerticeList,v_id:number):void=>{
                    if(vl.others.length>0){
                        return;
                    }
                    const cc:KCliqueCC=KCliqueCC.pool.get();
                    cc.clique=1;
                    cc.vertices.push(vl.main);
                    kc.connectedComponents.push(cc);
                });
            }
            
            if(this.graph.edges.length<=0){
                
            }else{
                const kc:CliqueComponets=new CliqueComponets(2);
                this.CliqueComponents.push(kc);

                for(const e of this.graph.edges){
                    const cc:KCliqueCC=KCliqueCC.pool.get();
                    cc.clique=2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }
            }

            
            for(let currentClique:number=3,noUpdate:boolean=false;noUpdate==false;++currentClique,noUpdate=true){
                const kc:CliqueComponets=new CliqueComponets(currentClique);

                const previous:KCliqueCC[]=this.CliqueComponents[currentClique-2].connectedComponents;//currentClique == .length+2

                for(let i:number=0;i<previous.length;++i){

                    Label_1:for(let j:number=i+1;j<previous.length;++j){
                        for(const v of previous[i].vertices){
                            this.set.add(v.id);
                        }
                        let nonIntersectSize:number=0;

                        Label_2:{
                            let left_v:Vertex|undefined;
                            for(const v of previous[j].vertices){
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

                            previous[i].vertices.push(left_v as Vertex);
                            previous[i]=previous[previous.length-1];
                            previous.pop();
                            kc.connectedComponents.push(previous[i]);

                            KCliqueCC.pool.release(previous[j]);
                            previous[j]=previous[previous.length-1];
                            previous.pop();

                            --i;//prevent the increment of i
                            noUpdate=false;
                            break Label_1;
                        }
                    }
                }

                this.CliqueComponents.push(kc);
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
    }
}