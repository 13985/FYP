/**************************************************Flags************************************************************/

let graphHasUpdated:boolean=false;

const enum AlgorithmType{
    K_CORE=0,K_CLIQUE=1,BOTH=2,
}


namespace AlgorithmSelect{
    let tagInpus:HTMLInputElement[]=[];
    let tagLabels:HTMLLabelElement[]=[];
    let previousChecked:AlgorithmType;
    const TYPE_NUMBER=3;

    export function main():void{
        tagInpus.length=TYPE_NUMBER;
        const nav=document.querySelector("nav.algorithm-select") as HTMLElement;
        tagInpus[AlgorithmType.K_CORE]=nav.querySelector("input#select-kcore") as HTMLInputElement;
        tagInpus[AlgorithmType.K_CLIQUE]=nav.querySelector("input#select-kclique") as HTMLInputElement;
        tagInpus[AlgorithmType.BOTH]=nav.querySelector("input#select-kclique-and-kcore") as HTMLInputElement;
        tagLabels[AlgorithmType.K_CORE]=nav.querySelector("input#select-kcore + label") as HTMLLabelElement;
        tagLabels[AlgorithmType.K_CLIQUE]=nav.querySelector("input#select-kclique + label") as HTMLLabelElement;
        tagLabels[AlgorithmType.BOTH]=nav.querySelector("input#select-kclique-and-kcore + label") as HTMLLabelElement;

        addInputEventListener(tagInpus[AlgorithmType.K_CORE],AlgorithmType.K_CORE);
        addInputEventListener(tagInpus[AlgorithmType.K_CLIQUE],AlgorithmType.K_CLIQUE);
        addInputEventListener(tagInpus[AlgorithmType.BOTH],AlgorithmType.BOTH);
    }

    function addInputEventListener(input:HTMLInputElement,type:AlgorithmType){
        if(input.checked){
            MainApp.instance().tryChangeAlgo(type);
            previousChecked=type;
        }

        input.addEventListener("input",():void=>{
            if(input.checked&&MainApp.instance().tryChangeAlgo(type)){
                previousChecked=type;
            }else{
                input.checked=false;
                tagInpus[previousChecked].checked=true;
            }
        });
    }

    export function showOthers(show:boolean):void{
        if(show){
            for(let i:number=0;i<TYPE_NUMBER;++i){
                if(i==previousChecked){continue;}
                tagLabels[i].removeAttribute("style");
            }
        }else{
            for(let i:number=0;i<TYPE_NUMBER;++i){
                if(i==previousChecked){continue;}
                tagLabels[i].setAttribute("style","display:none;");
            }
        }
    }
}


function setThemeToggle():void{
    const themeButton:HTMLInputElement=<HTMLInputElement>document.getElementById("theme-button-set");
    const html:HTMLElement=<HTMLElement>document.body.parentNode;
    themeButton.addEventListener("change",():void=>{
        if(themeButton.checked==true){
            for(let i:number=0;i<5;++i){
                html.style.setProperty(`--main-color${i}`,`var(--dark-theme-color${i})`);
                html.style.setProperty(`--reverse-color${i}`,`var(--light-theme-color${i})`);
            }
        }else{
            for(let i:number=0;i<5;++i){
                html.style.setProperty(`--main-color${i}`,`var(--light-theme-color${i})`);
                html.style.setProperty(`--reverse-color${i}`,`var(--dark-theme-color${i})`);
            }
        }
    });
}


namespace VertexGradient{
    export const start:Color=new Color(255,255,0);
    export const end:Color=new Color(255,0,0);
}


//class supports readonly so it is class
class MainApp{
    private static _instance:MainApp;

    public static create():MainApp{
        GraphWindow.main();//must call before new MainApp(), since MainApp use GraphWindow
        MainApp._instance=new MainApp();
        AlgorithmSelect.main();
        return MainApp._instance;
    }

    public static instance():MainApp{
        return MainApp._instance;
    }

    /****************************************************Graph expand**************************************************/
    private readonly fileInput:HTMLInputElement;
    private readonly graphUploadButton:HTMLButtonElement;
    private readonly graphStatusP:HTMLParagraphElement;

    /**************************************************Vertex expand****************************************************/
    private readonly vertexExpandContainer:HTMLElement;
    private readonly vertexExpandInput:HTMLInputElement;
    private readonly vertexSetColor:HTMLInputElement;
    private readonly vertexUpdateSelect:HTMLSelectElement;
    private readonly vertexUpdateButton:HTMLButtonElement;
    
    /****************************************************edge expand *****************************************************/
    private readonly edgeExpandContainer:HTMLElement;
    private readonly edgeUpdateSelect:HTMLSelectElement;
    private readonly edgeExpandInput:HTMLInputElement;
    private readonly edgeUpdateButton:HTMLButtonElement;
    private readonly edgeEditMode:HTMLInputElement;

    /**************************************************Animation expand****************************************************/
    private readonly animationExpand:HTMLLIElement;
    private readonly minShellFilter:HTMLSelectElement;
    private readonly maxShellFilter:HTMLSelectElement;


    private readonly graph:Graph;
    private readonly resultGraph:Graph;
    
    private readonly gw:GraphWindow;
    public readonly resultGW:GraphWindow;
    
    private readonly kCore:KCoreAlgorithm.KCore;
    private readonly resultKCore:KCoreAlgorithm.KCore;

    private readonly kClique:KCliqueAlgorithm.KClique;
    private readonly resultKClique:KCliqueAlgorithm.KClique;


    private constructor(){
        /**************************************************Vertex expand****************************************************/
        this.vertexExpandContainer=<HTMLElement>document.getElementById("vertex-expand-li");
        this.vertexExpandInput=<HTMLInputElement>document.getElementById("vertex-expand-input");
        this.vertexSetColor=<HTMLInputElement>document.getElementById("vertex-set-color");
        this.vertexUpdateSelect=<HTMLSelectElement>document.getElementById("vertex-update");
        this.vertexUpdateButton=<HTMLButtonElement>document.getElementById("vertex-update-button");
        
        /****************************************************Graph expand**************************************************/
        this.fileInput=<HTMLInputElement>document.getElementById("graphupload");
        this.graphUploadButton=<HTMLButtonElement>document.getElementById("graph-upload-button");
        this.graphStatusP=<HTMLParagraphElement>document.getElementById("graph-VE-status");
        
        /****************************************************edge expand *****************************************************/
        this.edgeExpandContainer=<HTMLElement>document.getElementById("edge-expand-li");
        this.edgeUpdateSelect=<HTMLSelectElement>document.getElementById("edge-update");
        this.edgeExpandInput=<HTMLInputElement>document.getElementById("edge-expand-input");
        this.edgeUpdateButton=<HTMLButtonElement>document.getElementById("edge-update-button");
        this.edgeEditMode=<HTMLInputElement>document.getElementById("edge-edit-mode");

        /****************************************************Algo expand **********************************************/
        const visualizationControl:FloatingPanel=new FloatingPanel("#video-control",<HTMLInputElement>document.getElementById("show-video-control"));
        const statePanel:FloatingPanel=new FloatingPanel("#state-panel",<HTMLInputElement>document.getElementById("show-algo-state"));
        VisualizationUtils.Algorithm.setVisualizationVideoControl(visualizationControl);
        VisualizationUtils.Algorithm.setVisualizationControl(<HTMLButtonElement>document.getElementById("run-algo"),<HTMLButtonElement>document.getElementById("stop-algo"));
        VisualizationUtils.Algorithm.setStateDisplayPanel(statePanel);

        this.animationExpand=document.querySelector("li.expand.animation") as HTMLLIElement;

        this.graph=new Graph();
        this.resultGraph=new Graph();
        
        this.gw=new GraphWindow(this.graph).setWH(450,500).hideCommandModule().display(true);
        this.resultGW=new GraphWindow(this.resultGraph).setWH(450,500);
        
        this.kCore=new KCoreAlgorithm.KCore(this.graph,this.gw.innerSVG as SVGSVGElement,this.gw);
        this.resultKCore=new KCoreAlgorithm.KCore(this.resultGraph,this.resultGW.innerSVG as SVGSVGElement,this.resultGW);

        this.minShellFilter=<HTMLSelectElement>document.getElementById("from-shell-value");
        this.maxShellFilter=<HTMLSelectElement>document.getElementById("to-shell-value");
        this.kCore.setSelects(this.minShellFilter,this.maxShellFilter);
        //gw.display(false);
        this.resultKCore.setVisualElementsColor(false);

        this.kClique=new KCliqueAlgorithm.KClique(this.graph,this.gw.innerSVG as SVGSVGElement,this.gw);
        this.resultKClique=new KCliqueAlgorithm.KClique(this.resultGraph,this.resultGW.innerSVG as SVGSVGElement,this.resultGW);

        /****************************************************Graph expand***************************************************/

        this.graphUploadButton.addEventListener("click",():void=>{
            if(this.fileInput.files==null||this.fileInput.files.length<=0){
                return;
            }
            else if(VisualizationUtils.Algorithm.isVisualizing()){return;}
            const f:File=this.fileInput.files[0];
            (f as Blob).text().then((value:string):void=>{
                this.loadGraph(value);
                this.fileInput.value="";
            },null).catch((reason:any):void=>{
                console.log(reason);
            });
        });

        /****************************************************Vertex expand**************************************************/

        this.vertexUpdateSelect.addEventListener("input",()=>{
            this.vertexSetColor.style.display=this.vertexUpdateSelect.value=="color"?"block":"none";
        });


        if(this.vertexUpdateSelect.value!="color"){
            this.vertexSetColor.style.display="none";
        }

        
        this.vertexExpandInput.addEventListener("change",()=>{
            if(this.vertexExpandInput.value.length==0){
                return;
            }
            const theVertex:number=parseInt(this.vertexExpandInput.value);
            switch(this.vertexUpdateSelect.value){
                case "color":{
                const vl:VerticeList|undefined=this.graph.adjacencyList.get(theVertex);
                if(vl==undefined){
                    break;
                }
                this.vertexSetColor.value=vl.main.getColorHexa();
                break;
            }
            case "create":
            case "remove":
                break;
            }
        });


        this.vertexUpdateButton.addEventListener("click",()=>{
            if(this.vertexExpandInput.value.length==0){
                return;
            }
            const theVertex:number=parseInt(this.vertexExpandInput.value);
            switch(this.vertexUpdateSelect.value){
            case "create":{
                graphHasUpdated=VisualizationUtils.Algorithm.addVertex(theVertex)||graphHasUpdated;
                break;
            }
            case "remove":{
                graphHasUpdated=VisualizationUtils.Algorithm.removeVertex(theVertex)||graphHasUpdated;
                break;
            }
            case "color":
                const vl:VerticeList|undefined=this.graph.adjacencyList.get(theVertex);
                if(vl==undefined){
                    break;
                }
                vl.main.setColorString(this.vertexSetColor.value);
                (this.resultGraph.adjacencyList.get(theVertex) as VerticeList).main.setColorString(this.vertexSetColor.value);
                break;
            }
        });

        /****************************************************edge expand *****************************************************/
 
        this.edgeEditMode.addEventListener("input",():void=>{
            this.resultGW.pressToAddEdge(this.edgeEditMode.checked);
            this.setEditAction();
        });

        this.edgeUpdateButton.addEventListener("click",()=>{
            this.resultGW.doEdgeAction();
            /*
            if(this.edgeexpandInput.value.length==0){
                return;
            }
            const edgeFormat:RegExp=/(\d+\s?,\s?\d+\s?)/g;
            const edgesString:string[]=this.edgeexpandInput.value.split(edgeFormat);

            switch(this.edgeUpdateSelect.value){
            case "create":{
                for(const str of edgesString){
                    const numbers:string[]=str.split(/(\d+)/g);
                    const from:number=parseInt(numbers[0]);
                    const to:number=parseInt(numbers[0]);
                    graphHasUpdated=graphHasUpdated||VisualizationUtils.Algorithm.addEdge(from,to);
                }
                break;
            }
            case "remove":{
                for(const str of edgesString){
                    const numbers:string[]=str.split(/(\d+)/g);
                    const from:number=parseInt(numbers[0]);
                    const to:number=parseInt(numbers[0]);
                    graphHasUpdated=graphHasUpdated||VisualizationUtils.Algorithm.removeEdge(from,to);
                }
                break;
            }
            }
            */
        });

        this.edgeUpdateSelect.addEventListener("input",()=>{
            this.vertexSetColor.style.display=this.vertexUpdateSelect.value=="color"?"block":"none";
            this.setEditAction();
        });

    }


    public tryChangeAlgo(type:AlgorithmType):boolean{
        if(VisualizationUtils.Algorithm.isVisualizing()){return false;}

        this.resultKCore.displayPolygons(false);
        this.resultGraph.resetVisualElements();
        this.graph.resetVisualElements();

        const helper=(vt:VisualizationUtils.Algorithm,rt:VisualizationUtils.Algorithm):void=>{
            VisualizationUtils.Algorithm.changeAlgorithm(vt,rt);
            if(graphHasUpdated){
                this.gw.resetContainerTransform().updateSimulation();
                this.resultGW.resetContainerTransform().updateSimulation();
                rt.createIndexStructure().setColorGradient(VertexGradient.start,VertexGradient.end).setVisualElementsColor(false);
                vt.setIndexStructure(rt).createState().setVisualElementsColor(true);
                graphHasUpdated=false;
            }else{
                rt.setVisualElementsColor(false);
                vt.setVisualElementsColor(true);
            }
        }

        this.animationExpand.removeAttribute("style");
        this.resultGW.hideCommandModule(false);
        switch(type){
            case AlgorithmType.K_CORE:{
            this.showModificationExpands(true);
            this.animationExpand.removeAttribute("style");

            helper(this.kCore,this.resultKCore);
            this.resultKCore.displayPolygons(true);//note they may have the same index structure
            this.resultGW.setVertexMovingCallback(this.resultKCore.calculateBound.bind(this.resultKCore));
            this.gw.setVertexMovingCallback(this.kCore.calculateBound.bind(this.kCore));
            break;
        }
        case AlgorithmType.K_CLIQUE:{
            this.showModificationExpands(true);
            this.animationExpand.removeAttribute("style");

            helper(this.kClique,this.resultKClique);
            this.kCore.displayPolygons(false);
            this.resultGW.setVertexMovingCallback(undefined);
            this.gw.setVertexMovingCallback(undefined);
            break;
        }
        case AlgorithmType.BOTH:{
            this.showModificationExpands(false);
            this.animationExpand.setAttribute("style","display:none;");
            this.resultGW.hideCommandModule();
            
            if(graphHasUpdated){
                if(VisualizationUtils.Algorithm.VisualizationTarget()==this.kCore){
                    this.resultKClique.createIndexStructure().setColorGradient(VertexGradient.start,VertexGradient.end);
                    this.kClique.setIndexStructure(this.resultKClique).createState();
                }else{
                    this.resultKCore.createIndexStructure().setColorGradient(VertexGradient.start,VertexGradient.end).setVisualElementsColor(true);
                    this.kCore.setIndexStructure(this.resultKCore).createState();
                }
                graphHasUpdated=false;
            }
            //the left graph window is associated with this.kCore/this.kClique
            //the right graph window is associated with this.resultkCore/this.resultKClique
            VisualizationUtils.Algorithm.changeAlgorithm(this.kCore,this.resultKClique);
            this.gw.setVertexMovingCallback(this.kCore.calculateBound.bind(this.kCore));
            this.resultGW.setVertexMovingCallback(undefined);
            this.kCore.setVisualElementsColor(false);
            this.resultKClique.setVisualElementsColor(false);
            break;
        }
        default:{
            console.log(`unknown value!!!!`);
            break;
        }
        }
        return true;
    }

    /****************************************************Graph expand**************************************************/

    public setVENumber():void{
        this.graphStatusP.innerHTML=`|V|: ${this.graph.vertices.length}<br>|E|: ${this.graph.edges.length}`;
    }


    public loadGraph(edgeList:string):void{
        this.graph.clear(true);
        this.graph.from(edgeList);
        this.gw.resetContainerTransform().updateSimulation();
        this.setVENumber();
        
        this.graph.copyTo(this.resultGraph.clear(true));
        this.resultGW.resetContainerTransform().updateSimulation();

        VisualizationUtils.Algorithm.loadUpdatedGraph();
        const rt:VisualizationUtils.Algorithm|undefined=VisualizationUtils.Algorithm.ResultTarget();
        if(rt){
            if(rt instanceof KCoreAlgorithm.KCore){
                rt.displayPolygons(true);
            }else if(rt instanceof KCliqueAlgorithm.KClique){
                
            }
        }
        graphHasUpdated=true;
    }


    private setEditAction():void{
        switch(this.edgeUpdateSelect.value){
        case "create":
            this.resultGW.isCreateEdge=true;
            break;
        case "remove":
            this.resultGW.isCreateEdge=false;
            break;
        }
    }


    public setVertexInput(v:Vertex):void{
        this.vertexExpandInput.value=v.id.toString();
        this.vertexSetColor.value=v.getColorHexa();
    }


    public showModificationExpands(show:boolean):void{
        if(show==false){
            this.vertexExpandContainer.setAttribute("style","display:none;");
            this.edgeExpandContainer.setAttribute("style","display:none;");
            this.graphUploadButton.disabled=true;
        }else{
            this.vertexExpandContainer.removeAttribute("style");
            this.edgeExpandContainer.removeAttribute("style");
            this.graphUploadButton.disabled=false;
        }
    }
}


window.onload=():void=>{
    setThemeToggle();
    MainApp.create().loadGraph("0 1\r\n\
    1 2\r\n\
    1 14\r\n\
    1 15\r\n\
    2 2\r\n\
    3 3\r\n\
    4 3\r\n\
    5 5\r\n\
    6 4\r\n\
    6 7\r\n\
    7 19\r\n\
    8 5\r\n\
    8 3\r\n\
    9 4\r\n\
    9 3\r\n\
    9 13\r\n\
    9 6\r\n\
    9 10\r\n\
    9 12\r\n\
    10 3\r\n\
    11 11\r\n\
    11 12\r\n\
    11 10\r\n\
    12 12\r\n\
    13 15\r\n\
    13 3\r\n\
    13 9\r\n\
    13 4\r\n\
    14 14\r\n\
    15 15\r\n\
    16 16\r\n\
    17 17\r\n\
    18 18\r\n\
    19 19\r\n\
    20 8\r\n\
    21 7\r\n\
    21 22\r\n\
    22 21\r\n\
    23 23\r\n\
    24 24\r\n\
    ");
    /*
    MainApp.instance().loadGraph("0 1\r\n\
    0 2\r\n\
    0 3\r\n\
    0 4\r\n\
    1 3\r\n\
    1 2\r\n\
    1 4\r\n\
    3 1\r\n\
    3 4\r\n\
    2 3\r\n\
    ");
    */

    /*
    VisualizationUtils.Algorithm.addEdge(23,17);
    VisualizationUtils.Algorithm.addEdge(15,4);
    VisualizationUtils.Algorithm.addEdge(15,3);
    VisualizationUtils.Algorithm.removeEdge(15,1);
    VisualizationUtils.Algorithm.removeVertex(13);
    VisualizationUtils.Algorithm.addEdge(7,4);
    VisualizationUtils.Algorithm.addEdge(4,12);
    VisualizationUtils.Algorithm.removeVertex(3);
    VisualizationUtils.Algorithm.addVertex(3);
    VisualizationUtils.Algorithm.addEdge(3,6);
    VisualizationUtils.Algorithm.addVertex(30);
    VisualizationUtils.Algorithm.addVertex(31);
    VisualizationUtils.Algorithm.addVertex(32);
    VisualizationUtils.Algorithm.addEdge(7,30);
    VisualizationUtils.Algorithm.removeEdge(7,4);
    VisualizationUtils.Algorithm.removeEdge(4,6);
    VisualizationUtils.Algorithm.removeEdge(7,6);
    VisualizationUtils.Algorithm.addEdge(19,22);
    VisualizationUtils.Algorithm.addEdge(7,22);
    VisualizationUtils.Algorithm.addEdge(19,21);
    VisualizationUtils.Algorithm.addEdge(5,20);
    VisualizationUtils.Algorithm.addEdge(8,21);
    VisualizationUtils.Algorithm.addEdge(2,21);
    VisualizationUtils.Algorithm.addEdge(0,21);
    VisualizationUtils.Algorithm.addEdge(30,19);
    VisualizationUtils.Algorithm.addEdge(30,22);
    VisualizationUtils.Algorithm.addEdge(30,21);
    VisualizationUtils.Algorithm.addEdge(4,10);
    VisualizationUtils.Algorithm.addEdge(4,11);
    VisualizationUtils.Algorithm.removeVertex(12);
    VisualizationUtils.Algorithm.addEdge(9,11);
    VisualizationUtils.Algorithm.addEdge(10,7);
    VisualizationUtils.Algorithm.addEdge(9,7);
    VisualizationUtils.Algorithm.addEdge(4,7);
    VisualizationUtils.Algorithm.addEdge(11,7);
    VisualizationUtils.Algorithm.removeVertex(7);
    VisualizationUtils.Algorithm.addEdge(6,11);
    VisualizationUtils.Algorithm.addEdge(6,4);
    VisualizationUtils.Algorithm.addEdge(6,10);
    VisualizationUtils.Algorithm.addEdge(3,15);
    VisualizationUtils.Algorithm.addEdge(16,6);
    VisualizationUtils.Algorithm.addEdge(16,4);
    VisualizationUtils.Algorithm.addEdge(16,11);
    VisualizationUtils.Algorithm.addEdge(16,10);
    VisualizationUtils.Algorithm.addEdge(16,9);
    VisualizationUtils.Algorithm.addEdge(0,19);
    VisualizationUtils.Algorithm.addEdge(0,2);
    VisualizationUtils.Algorithm.addEdge(0,22);
    VisualizationUtils.Algorithm.removeEdge(30,19);
    VisualizationUtils.Algorithm.addEdge(1,21);
    VisualizationUtils.Algorithm.removeVertex(21);
    VisualizationUtils.Algorithm.addEdge(8,6);
    VisualizationUtils.Algorithm.addEdge(20,6);
    VisualizationUtils.Algorithm.addEdge(5,6);
    VisualizationUtils.Algorithm.addEdge(18,6);
    VisualizationUtils.Algorithm.addEdge(30,6);
    VisualizationUtils.Algorithm.addEdge(31,6);
    VisualizationUtils.Algorithm.addEdge(18,32);
    VisualizationUtils.Algorithm.addEdge(31,32);
    VisualizationUtils.Algorithm.addEdge(23,6);
    VisualizationUtils.Algorithm.removeVertex(6);
    */
}