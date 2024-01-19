
namespace KCoreAlgorithm{
    export class UnionFind{
        public parents:number[];
        public stack:number[]=[];

        constructor(size:number){
            this.parents=new Array<number>(size);
            for(let i=0;i<size;++i){
                this.parents[i]=i;
            }
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

    export class ConnectedComponent{
        public vertices:Array<Vertex>=[];
        public shell:number=-1;
        public polygon:SVGPolygonElement|null=null;
    }


    export class ShellComponets{
        public connectedComponents:Array<ConnectedComponent>=[];
        public shell:number=-1;
    }

    
    export class KCore{
        public graph:Graph;
        public shellComponents:Array<ShellComponets>=[];

        /*****************UI********************/
        public maxOption:HTMLSelectElement|null;
        public minOption:HTMLSelectElement|null;


        constructor(g:Graph){
            this.graph=g;
            this.maxOption=null;
            this.minOption=null;
        }


        public fastIteration():void{
            const shells:Map<number,number>=new Map();
            const degrees:Map<number,number>=new Map();
            const inSet1:Map<number,number>=new Map();
            const set0:number[]=[];
            const set1:number[]=[];
            const unionFind=new UnionFind(this.graph.vertices.length);
            let currentShell=0,nextShell=0;

            function removeFromSet1(target:number):void{
                const last:number=set1.pop() as number;
                const idx:number=inSet1.get(target) as number;
                set0[idx]=last;
                inSet1.set(last,idx);
                inSet1.delete(target);
                degrees.set(target,-1);
            }

            this.graph.adjacencyList.forEach((vl:VerticeList,k:number):void=>{
                if(vl.others.length<=0){
                    set0.push(k);
                    degrees.set(k,0);
                }else{
                    shells.set(k,-1);
                    inSet1.set(k,set1.length);
                    set1.push(k);
                    degrees.set(k,vl.others.length);
                }
            });
            
            while(set0.length>0){
                const v_id:number=<number>set0.pop();
                const vl:VerticeList|undefined=this.graph.adjacencyList.get(v_id);
                shells.set(v_id,currentShell);
                nextShell=currentShell+1;
                if(vl){
                    const neighbors:number[]=vl.others;
                    for(const neighbor of neighbors){
                        let degree:number=(degrees.get(neighbor) as number);
                        if(degree<0){
                            if(shells.get(neighbor) as number==currentShell){
                                unionFind.union(neighbor,v_id);
                            }
                            continue;
                        }
                        --degree;
                        if(degree<=currentShell){
                            removeFromSet1(neighbor);
                        }else{
                            nextShell=Math.min(nextShell,degree);
                            degrees.set(neighbor,degree);
                        }
                    }
                }

                currentShell=nextShell;
                for(let i:number=0;i<set1.length;){
                    const d:number=degrees.get(set0[i]) as number;
                    if(d<=currentShell){
                        removeFromSet1(d);
                    }else{
                        ++i;
                    }
                }
            }

            for(const v of this.graph.vertices){
                v.shell=shells.get(v.id) as number;
            }
            //at the end currenttShell=currentShell-1 (no change in nextShell and nextShell=currentShell+1)
            for(let i:number=0;i<currentShell-1;++i){
                this.shellComponents.push(new ShellComponets());
                this.shellComponents[i].shell=i;
            }
            degrees.clear();

            unionFind.flatten();
            const pComponentIndex:Map<number,number>=degrees;
            for(let node:number=0;node<unionFind.parents.length;++node){
                if(node!=unionFind.parents[node])continue;
                const shell:number=shells.get(node) as number;
                const sc:ConnectedComponent[]=this.shellComponents[shell].connectedComponents;
                const cc:ConnectedComponent=new ConnectedComponent();
                pComponentIndex.set(node,sc.length);
                cc.vertices.push((this.graph.adjacencyList.get(node) as VerticeList).main);
                cc.shell=shell;
                sc.push(cc);
            }

            for(let node:number=0;node<unionFind.parents.length;++node){
                if(node==unionFind.parents[node])continue;
                this.shellComponents[shells.get(node) as number].connectedComponents[pComponentIndex.get(unionFind.parents[node]) as number].vertices.push((this.graph.adjacencyList.get(node) as VerticeList).main);
            }
        }


        public async slowIteration():Promise<void>{
            
        }


        public translate(dx:number,dy:number):void{
            this.graph.translate(dx,dy);
            for(const shellComponet of this.shellComponents){
                for(const connectedComponent of shellComponet.connectedComponents){
                    const polygon:SVGPolygonElement=connectedComponent.polygon as SVGPolygonElement;
                    const points:SVGPointList=polygon.points;
                    for(let i:number=0;i<points.length;++i){
                        const p:DOMPoint=points[i];
                        p.x+=dx;
                        p.y+=dy;
                        points[i]=p;
                    }
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
        private static points:Point[];


        private static cross(o:Point,a:Point,b:Point):number{
            return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
        }


        public static Solve(cc:ConnectedComponent):void{
            const polygon:SVGPolygonElement=cc.polygon as SVGPolygonElement;
            polygon.points.clear();
            if(cc.vertices.length<4){
                for(const vertex of cc.vertices){
                    const p:DOMPoint=new DOMPoint(vertex.x,vertex.y);
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
                polygon.points.appendItem(new DOMPoint(p.x,p.y));
            }
        }
    }
}