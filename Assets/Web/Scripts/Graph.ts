interface IClone<T>{
    clone():T;
}

class Vertex implements d3.SimulationNodeDatum,IClone<Vertex>{
    public id:number;
    public shell:number;
    public radius:number;
    public x?:number;
    public y?:number;
    public vx?:number;
    public vy?:number;
    public fx?:number;
    public fy?:number;
    public index?:number;
    public circle:SVGCircleElement|null;
    private color:string;

    constructor(id:number){
        this.id=id;
        this.shell=-1;
        this.radius=5;
        this.circle=null;
        this.color="#ff0000"
    }

    public clone():Vertex{
        const v=new Vertex(this.id);
        v.shell=this.shell;
        v.radius=this.radius;
        v.x=this.x;
        v.y=this.y;
        v.vx=this.vx;
        v.vy=this.vy;
        v.fx=this.fx;
        v.fy=this.fy;
        v.index=this.index;
        v.circle=this.circle?.cloneNode(true) as SVGCircleElement;
        return v;
    }


    public setColor(color:string):void{
        this.color=color;
        (this.circle as SVGCircleElement).setAttribute("fill",color);
    }


    public getColor():string{
        return this.color;
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
}



class VerticeList implements IClone<VerticeList>{
    public main:Vertex;
    public others:Array<number>;

    constructor(main:Vertex){
        this.main=main;
        this.others=new Array<number>();
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


    constructor(){
        this.adjacencyList=new Map<number,VerticeList>();
        this.edges=new Array<Edge>();
        this.vertices=new Array<Vertex>();
    }


    public from(edgeListRaw:string):Graph{
        const edges:string[]=edgeListRaw.split(/[\r\n|\r|\n]+/);

        edges.forEach((e)=>{
            if(/[\s?\d+\s?][,|\s?][\d+\s?]/.test(e)==false){
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
                    const v:Vertex=new Vertex(parent);
                    list=new VerticeList(v);
                    this.vertices.push(v);
                    this.adjacencyList.set(parent,list);
                }
                list.others.push(child);
                return list.main;
            }
            if(vs[0]==vs[1]){
                if(this.adjacencyList.get(vs[0])==undefined){
                    const v:Vertex=new Vertex(vs[0]);
                    this.adjacencyList.set(vs[0],new VerticeList(v));
                    this.vertices.push(v);
                }
            }else{
                this.edges.push(new Edge(see(vs[0],vs[1]),see(vs[1],vs[0])));
            }
        });
        return this;
    }


    public clone():Graph{
        const g:Graph=new Graph();

        for(let i:number=0;i<this.vertices.length;++i){
            const id:number=this.vertices[i].id;
            const list:VerticeList=<VerticeList>this.adjacencyList.get(id);
            g.adjacencyList.set(id,list.clone());
            g.vertices.push(list.main);
        }

        for(let i:number=0;i<g.edges.length;++i){
            g.edges[i].source=(g.adjacencyList.get(this.edges[i].source.id) as VerticeList).main;
            g.edges[i].source=(g.adjacencyList.get(this.edges[i].target.id) as VerticeList).main;
        }
        return g;
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


    public addVertex(v:number):boolean{
        if(this.adjacencyList.get(v)!=undefined){
            return false;
        }

        this.adjacencyList.set(v,new VerticeList(new Vertex(v)));
        return true;
    }


    public clear(removeSVG:boolean=false):void{
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
}