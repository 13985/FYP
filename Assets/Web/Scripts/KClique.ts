namespace KCliqueAlgorithm{

    class KCliqueCC extends GraphAlgorithm.ConnectedComponent{
        public static readonly pool:GraphAlgorithm.ObjectPool<KCliqueCC>=new GraphAlgorithm.ObjectPool(KCliqueCC);

        public clique:number=-1;
        public polygonOpacity:number=0.4;
        public polygon:SVGPolygonElement|null=null;

        constructor(clique:number=1){
            super();
            this.clique=clique;
        }
    }


    class KCliqueComponets{
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
    export class KClique extends GraphAlgorithm.Algorithm{
        public readonly kCliqueComponents:KCliqueComponets[]=[];


        private readonly set:Set<number>=new Set();

        constructor(graph:Graph,svg:SVGSVGElement){
            super(graph,svg);
            if(graph.vertices.length>0){
                this.preprocess();
            }
        }


        public setColorGradient(start_:Color,end_:Color):this{
            const start:Color=start_.clone();//copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const end:Color=end_.clone();//copy the value, otherwise if it points to the same space of some shellcomponent[].color, broken
            const kCliqueCount:number=this.kCliqueComponents.length;
            const interval:number=kCliqueCount-1;

            for(let i:number=0;i<kCliqueCount;++i){
                Color.lerp(this.kCliqueComponents[i].color,start,end,i/interval);
            }
            return this;
        }


        public setVisualElementsColor(defaultColor:boolean):this{
            if(defaultColor){

            }else{

            }
            return this;
        }
        

        public setGraph(g: Graph):this{
            this.graph=g;
            this.preprocess();
            return this;
        }


        public preprocess():this{
            for(const kc of this.kCliqueComponents){
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
                const kc:KCliqueComponets=new KCliqueComponets(1);
                this.kCliqueComponents.push(kc);
    
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
                const kc:KCliqueComponets=new KCliqueComponets(2);
                this.kCliqueComponents.push(kc);

                for(const e of this.graph.edges){
                    const cc:KCliqueCC=KCliqueCC.pool.get();
                    cc.clique=2;
                    cc.vertices.push(e.source);
                    cc.vertices.push(e.target);
                    kc.connectedComponents.push(cc);
                }
            }

            
            for(let currentClique:number=3,noUpdate:boolean=false;noUpdate==false;++currentClique,noUpdate=true){
                const kc:KCliqueComponets=new KCliqueComponets(currentClique);

                const previous:KCliqueCC[]=this.kCliqueComponents[currentClique-2].connectedComponents;//currentClique == .length+2

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

                this.kCliqueComponents.push(kc);
            }

            return this;
        }


        public createState():this{
            return this;
        }


        public clearState():this{
            return this;
        }


        protected animate():void{

        }
    }
}