interface IClone<T>{
    clone():T;
}

class Vertex implements d3.SimulationNodeDatum,IClone<Vertex>{
    public id:number;
    public radius:number;
    public x?:number;
    public y?:number;
    public vx?:number;
    public vy?:number;
    public fx?:number;
    public fy?:number;
    public index?:number;
    public circle:SVGCircleElement|null;
    private color:Color;
    public list:VerticeList|undefined=undefined;

    constructor(id:number){
        this.id=id;
        this.radius=5;
        this.circle=null;
        this.color=new Color(0,0,0);
    }

    public clone():Vertex{
        const v=new Vertex(this.id);
        v.radius=this.radius;
        v.x=this.x;
        v.y=this.y;
        v.vx=this.vx;
        v.vy=this.vy;
        v.fx=this.fx;
        v.fy=this.fy;
        v.index=this.index;
        v.circle=null;
        return v;
    }


    public setColor(color:Color):void{
        this.color=color.clone();
        (this.circle as SVGCircleElement).setAttribute("fill",color.toString());
    }


    public setColorString(color:string):void{
        this.color=Color.fromString(color);
        (this.circle as SVGCircleElement).setAttribute("fill",color.toString());
    }


    public getColorHexa():string{
        return this.color.toHexa();
    }


    public getColorString():string{
        return this.color.toString();
    }
}



class Edge implements d3.SimulationLinkDatum<Vertex>{
    public source:Vertex;
    public target:Vertex;
    public line:SVGLineElement|null;

    constructor(from:Vertex,to:Vertex){
        this.source=from;
        this.target=to;
        this.line=null;
    }


    public toString():string{
        if(this.source.id<this.target.id){
            return `${this.source.id}-${this.target.id}`;
        }else{
            return `${this.target.id}-${this.source.id}`;
        }
    }
}


class VerticeList_{
    public main:Vertex;
    public others:Array<number>;
    public otherEdges:Array<Edge>;
    private indexer:Map<number,number>;

    public constructor(v:Vertex){
        this.main=v;
        this.otherEdges=[];
        this.others=[];
        this.indexer=new Map<number,number>();
    }


    public addVertex(v:Vertex,e:Edge):void{
        if(this.indexer.get(v.id)!=undefined){
            return;
        }
        this.indexer.set(v.id,this.others.length);
        this.others.push(v.id);
        this.otherEdges.push(e);
    }
}


class VerticeList implements IClone<VerticeList>{
    public main:Vertex;
    public others:Array<number>;

    constructor(main:Vertex){
        this.main=main;
        this.main.list=this;
        this.others=new Array<number>();
    }


    public remove(other:number):void{
        const length:number=this.others.length;
        for(let i:number=0;i<length;++i){
            if(this.others[i]==other){
                this.others[i]=this.others[length-1];
                this.others.pop();
                return;
            }
        }
    }


    public clone():VerticeList{
        const list:VerticeList=new VerticeList(this.main.clone());
        for(let i=0;i<this.others.length;++i){
            list.others.push(this.others[i]);
        }
        return list;
    }
}


class Graph implements IClone<Graph>{
    public adjacencyList:Map<number,VerticeList>;
    public edges:Array<Edge>;
    public vertices:Array<Vertex>;
    private existsEdges:Map<string,number>;
    private static readonly edgeFormat:RegExp=/[\s?\d+\s?][,|\s?][\d+\s?]/;


    constructor(){
        this.adjacencyList=new Map<number,VerticeList>();
        this.edges=new Array<Edge>();
        this.vertices=new Array<Vertex>();
        this.existsEdges=new Map<string,number>();
    }


    public from(edgeListRaw:string):Graph{
        this.adjacencyList.clear();
        this.vertices.length=0;
        this.edges.length=0;
        this.existsEdges.clear();
        const edges:string[]=edgeListRaw.split(/[\r\n|\r|\n]+/);

        edges.forEach((e)=>{
            if(Graph.edgeFormat.test(e)==false){
                return;
            }
            const matchedValues=e.match(/(\d+)/g);
            if(matchedValues==undefined){
                return;
            }
            const vs:number[]=matchedValues.map<number>((val:string,_i:number,_arr:string[]):number=>parseInt(val));

            const see=(parent:number,child:number):Vertex=>{
                let list:VerticeList|undefined=this.adjacencyList.get(parent);
                if(list==undefined){
                    list=new VerticeList(new Vertex(parent));
                    this.vertices.push(list.main);
                    this.adjacencyList.set(parent,list);
                }
                list.others.push(child);
                return list.main;
            }
            if(vs[0]==vs[1]){
                if(this.adjacencyList.get(vs[0])==undefined){
                    const list:VerticeList=new VerticeList(new Vertex(vs[0]));
                    this.adjacencyList.set(vs[0],list);
                    this.vertices.push(list.main);
                }
            }else{
                const code:string=Graph.getEdgeHashCode(vs[0],vs[1]);
                if(this.existsEdges.get(code)!=undefined){
                    return;
                }
                this.existsEdges.set(code,this.edges.length);
                this.edges.push(new Edge(see(vs[0],vs[1]),see(vs[1],vs[0])));
            }
        });
        return this;
    }


    public static getEdgeHashCode(v0:number,v1:number):string{
        return v0<v1?`${v0}-${v1}`:`${v1}-${v0}`;
    }


    public clone():Graph{
        const g:Graph=new Graph();
        this.copyTo(g);
        return g;
    }


    public copyTo(g:Graph):void{
        for(let i:number=0;i<this.vertices.length;++i){
            const id:number=this.vertices[i].id;
            const list:VerticeList=<VerticeList>this.adjacencyList.get(id);
            const listClone=list.clone();
            g.adjacencyList.set(id,listClone);
            g.vertices.push(listClone.main);
        }

        for(let i:number=0;i<this.edges.length;++i){
            g.edges.push(new Edge(
                (g.adjacencyList.get(this.edges[i].source.id) as VerticeList).main,
                (g.adjacencyList.get(this.edges[i].target.id) as VerticeList).main
            ));
        }

        this.existsEdges.forEach((val:number,key:string):void=>{
            g.existsEdges.set(`${key}`,val);
        });
    }


    public vertexCount():number{
        return this.adjacencyList.size;
    }


    public removeVertex(v:number):boolean{
        const list:VerticeList|undefined=this.adjacencyList.get(v);
        if(list==undefined){
            return false;
        }

        for(let i:number=0;i<list.others.length;++i){
            const _l:VerticeList=<VerticeList>this.adjacencyList.get(list.others[i]);
            for(let j:number=0;j<_l.others.length;++j){
                if(_l.others[j]==v){
                    _l.others[j]==_l.others[_l.others.length-1];
                    _l.others.pop();
                    break;
                }
            }
        }

        return true;
    }


    public clear(removeSVG:boolean=false):this{
        this.adjacencyList.clear();
        if(removeSVG){
            for(let i:number=0;i<this.vertices.length;++i){
                (this.vertices[i].circle as SVGCircleElement).remove();
            }
            for(let i:number=0;i<this.edges.length;++i){
                (this.edges[i].line as SVGLineElement).remove();
            }
        }
        this.edges.length=0;
        this.vertices.length=0;
        this.existsEdges.clear();
        return this;
    }


    public translate(dx:number,dy:number):void{
        const translate:string=`translate(${dx}px,${dy}px);`;
        for(let i:number=0;i<this.vertices.length;++i){
            const v:Vertex=this.vertices[i];
            if(v.circle!=null){
                v.circle.style.transform=translate;
            }
        }
        for(let i:number=0;i<this.edges.length;++i){
            const e:Edge=this.edges[i];
            if(e.line){
                e.line.style.transform=translate;
            }
        }
    }


    public tryRemoveVertex(theVertex:number):Vertex|null{
        const vl:VerticeList|undefined=this.adjacencyList.get(theVertex);
        if(vl==undefined){
            return null;
        }

        for(const v_id of vl.others){
            const other_vl:VerticeList=<VerticeList>this.adjacencyList.get(v_id);
            for(let i:number=0;i<other_vl.others.length;++i){
                if(other_vl.others[i]!=theVertex){continue;}
                other_vl.others.splice(i,1);
                break;
            }
        }
        this.adjacencyList.delete(theVertex);
        for(let i:number=0;i<this.vertices.length;++i){
            if(this.vertices[i].id!=vl.main.id){continue;}
            //(graph.vertices[i].circle as SVGCircleElement).remove();
            this.vertices.splice(i,1);
            break;
        }

        let lengthLeft:number=this.edges.length;
        for(let i:number=0;i<lengthLeft;){
            const e:Edge=this.edges[i];
            if(e.source.id!=theVertex&&e.target.id!=theVertex){
                ++i;
            }else{
                //(e.line as SVGLineElement).remove();
                this.edges[i]=this.edges[lengthLeft-1];
                --lengthLeft;
            }
        }
        this.edges.length=lengthLeft;
        return vl.main;
    }


    public tryAddVertex(theVertex:number):Vertex|null{
        if(this.adjacencyList.get(theVertex)!=undefined){
            return null;
        }
        const v:Vertex=new Vertex(theVertex);
        const vl:VerticeList=new VerticeList(v);
        v.list=vl;
        this.adjacencyList.set(theVertex,vl);
        this.vertices.push(v);
        return v;
    }


    public addEdge(a:number,b:number):boolean{
        if(this.adjacencyList.get(a)==undefined||this.adjacencyList.get(b)==undefined){
            return false;
        }
        const code:string=Graph.getEdgeHashCode(a,b);
        if(this.existsEdges.get(code)!=undefined){
            return false;
        }
        const a_vl:VerticeList=this.adjacencyList.get(a) as VerticeList;
        const b_vl:VerticeList=this.adjacencyList.get(b) as VerticeList;
        const e:Edge=new Edge(a_vl.main,b_vl.main);
        this.existsEdges.set(code,this.edges.length);
        this.edges.push(e);
        a_vl.others.push(b);
        b_vl.others.push(a);
        return true;
    }


    public removeEdge(a:number,b:number):boolean{
        if(this.adjacencyList.get(a)==undefined||this.adjacencyList.get(b)==undefined){
            return false;
        }
        const code:string=Graph.getEdgeHashCode(a,b);
        const idx:number|undefined=this.existsEdges.get(code);
        if(idx==undefined){
            return false;
        }
        const e:Edge=this.edges[this.edges.length-1];
        this.existsEdges.set(Graph.getEdgeHashCode(e.source.id,e.target.id),idx);
        this.existsEdges.delete(code);
        this.edges[idx]=e;
        this.edges.pop();

        const a_vl:VerticeList=this.adjacencyList.get(a) as VerticeList;
        const b_vl:VerticeList=this.adjacencyList.get(b) as VerticeList;
        a_vl.remove(b);
        b_vl.remove(a);
        return true;
    }


    public getEdge(v0:number,v1:number):Edge|undefined{
        const code:string=Graph.getEdgeHashCode(v0,v1);
        const idx:number|undefined=this.existsEdges.get(code);
        if(idx==undefined){
            return undefined;
        }
        return this.edges[idx];
    }


    public displayVertex(v_id:number,visible:boolean):void{
        const value:string=visible?"visible":"hidden";
        const vl:VerticeList=this.adjacencyList.get(v_id) as VerticeList;
        (vl.main.circle as SVGElement).setAttribute("visibility",value);
        for(const n of vl.others){
            const code:string=Graph.getEdgeHashCode(v_id,n);
            const e:Edge=this.edges[this.existsEdges.get(code) as number];
            (e.line as SVGElement).setAttribute("visibility",value);
        }
    }
}