namespace KCliqueAlgorithm{
    class ConnectedComponent{
        public vertices:Array<Vertex>=[];
        public shell:number=-1;
        public polygonOpacity:number=0.4;
        public polygon:SVGPolygonElement|null=null;

        constructor(shell:number=1){
            this.shell=shell;
        }
    }


    class KCliqueComponet{
        public connectedComponents:Array<ConnectedComponent>=[];
        public clique:number=-1;
        public color:Color=new Color(0,0,0);
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
     * 
     */
    export class KClique extends GraphAlgorithm.Algorithm{
        public readonly kCliqueComponents:KCliqueComponet[]=[];

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
            /*
            foreach k-clique=>find k+1-clique
            
            foreach x in  k-clique 
                foreach vertex in x
                    foreach neighbor of vertex
                        if
                        this vertex connected to all vertices in x && not in x
                        then update this clique to k+1, break;

            */

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