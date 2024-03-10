namespace GraphAlgorithm{
    type NormalFunction=()=>void;


    export const enum VideoControlStatus{
        noAction=0,nextStep=1,prevStep=2,randomStep=3,stop=4
    }
    
    
    //only one video control i believe....
    export namespace VideoControl{
        export let videoControl:FloatingPanel;
        export let prevStepButton:HTMLButtonElement;
        export let nextStepButton:HTMLButtonElement;
        export let pauseButton:HTMLButtonElement;
        export let speedControl:HTMLInputElement;
        export let progressBar:HTMLInputElement;

        export let runButton:HTMLButtonElement;
        export let stopButton:HTMLButtonElement;
    }


    //one panel for code description and pseudo code
    export namespace DescriptionDisplay{
        export class PseudoCode{
            public readonly code:string;
            public readonly step?:number;
            public li?:HTMLLIElement;

            constructor(code:string,step?:number){
                this.code=code;
                this.step=step;
            }
        }

        export let panel:FloatingPanel;
        export let codeDescription:HTMLParagraphElement;
        export let stepDescription:HTMLUListElement;
        let codesUl:HTMLUListElement;

        let pseudoCodes:PseudoCode[]|null;


        export function main(panel_:FloatingPanel):void{
            panel=panel_;
            codesUl=panel.contentDiv.querySelector("ul.pseudo-codes") as HTMLUListElement;
            codeDescription=panel.contentDiv.querySelector("p.code.description") as HTMLParagraphElement;
            stepDescription=panel.contentDiv.querySelector("ul.steps.description") as HTMLUListElement;
        }


        export function reset():void{
            for(const pc of (pseudoCodes as PseudoCode[])){
                (pc.li as HTMLLIElement).classList.toggle("current-code",false);
            }
            stepDescription.innerText="";
        }


        export function clearPanel():void{
            codeDescription.innerHTML="";
            stepDescription.innerHTML="";
            codesUl.innerHTML="";
            pseudoCodes=null;
        }


        export function setCodes(theCodes:PseudoCode[]):void{
            pseudoCodes=theCodes;
            for(const code of theCodes){
                const liStr:string=`
                <li class="pseudo-code">
                    <i class="step-number">${code.step!=undefined?code.step:""}</i>
                    <code>${code.code}</code>
                </li>
                `;
                codesUl.insertAdjacentHTML("beforeend",liStr);
                code.li=codesUl.lastElementChild as HTMLLIElement;
            }
        }


        export function highlightCode(step:number):void{
            for(const pc of (pseudoCodes as PseudoCode[])){
                (pc.li as HTMLLIElement).classList.toggle("current-code",pc.step!=undefined&&pc.step==step);
            }
        }
    }


    export abstract class Algorithm{
        private static visualizationTarget?:Algorithm;
        private static otherInstances?:Algorithm;
        protected static readonly codeDescripton:string;


        public static setVisualizationVideoControl(videoControl:FloatingPanel):void{
            VideoControl.videoControl=videoControl;
            VideoControl.prevStepButton=videoControl.contentDiv.querySelector("button.previousStep") as HTMLButtonElement;
            VideoControl.nextStepButton=videoControl.contentDiv.querySelector("button.nextStep") as HTMLButtonElement;
            VideoControl.pauseButton=videoControl.contentDiv.querySelector("button.pause") as HTMLButtonElement;

            VideoControl.progressBar=videoControl.contentDiv.querySelector("input.progress-bar") as HTMLInputElement;
            VideoControl.speedControl=videoControl.contentDiv.querySelector("input.speed-control") as HTMLInputElement;
            VideoControl.speedControl.min="0.05";
            VideoControl.speedControl.max="5";
            VideoControl.speedControl.step="0.001";
        }


        public static setStateDisplayPanel(panel:FloatingPanel):void{
            DescriptionDisplay.main(panel);
        }


        public static setVisualizationControl(run:HTMLButtonElement,stop:HTMLButtonElement):void{
            VideoControl.runButton=run;
            VideoControl.stopButton=stop;
            VideoControl.stopButton.disabled=true;
            VideoControl.runButton.disabled=false;

            VideoControl.runButton.addEventListener("click",():void=>{
                if(Algorithm.visualizationTarget){
                    Algorithm.visualizationTarget.start();
                    VideoControl.videoControl.open();
                    DescriptionDisplay.panel.open();
                }
            });

            VideoControl.stopButton.addEventListener("click",():void=>{
                if(Algorithm.visualizationTarget){
                    Algorithm.visualizationTarget.videoControlStatus=VideoControlStatus.stop;
                }
            });
        }


        public static changeAlgorithm(algo:Algorithm):void{
            if(Algorithm.visualizationTarget){
                Algorithm.visualizationTarget.unregisterSelf();
            }
            Algorithm.visualizationTarget=algo;
            Algorithm.visualizationTarget.registerSelf();
        }


        public static async start(onEnd?:()=>void):Promise<void>{
            Algorithm.visualizationTarget?.start(onEnd);
        }

        public static preprocess():void{
            Algorithm.visualizationTarget?.preprocess();
        }

        public static createState():void{
            Algorithm.visualizationTarget?.createState();
        }

        public static addVertex(a:number):any{
            Algorithm.visualizationTarget?.addVertex(a);
        }

        public static removeVertex(a:number):any{
            Algorithm.visualizationTarget?.removeVertex(a);
        }

        public static addEdge(from:number,to:number):any{
            Algorithm.visualizationTarget?.addEdge(from,to);
        }

        public static removeEdge(from:number,to:number):any{
            Algorithm.visualizationTarget?.removeEdge(from,to);
        }

        public static setAllVerticesColor(defaultColor:boolean):any{
            Algorithm.visualizationTarget?.setVisualElementsColor(defaultColor);
        }

        public static setAllEdgesColor(defaultColor:boolean):any{
            Algorithm.visualizationTarget?.setAllEdgesColor(defaultColor);
        }

        public graph:Graph;
        public svgContainer:SVGSVGElement;
        public showDefaultColor:boolean=true;

        private videoControlStatus:VideoControlStatus=VideoControlStatus.noAction;//if the user is fast enough he can cancel the "stop animation" action by replace it to be another action (pressing other button/input)

        protected isAnimating:boolean=false;
        protected isPause:boolean=false;
        protected currentStep:number=0;


        constructor(g:Graph,svg:SVGSVGElement){
            this.graph=g;
            this.svgContainer=svg;
        }


        public async start(onEnd?:()=>void):Promise<void>{
            if(this.isAnimating){return;}
            this.isAnimating=true;
            this.isPause=false;
            this.videoControlStatus=VideoControlStatus.noAction;
            
            DescriptionDisplay.reset();
            VideoControl.stopButton.disabled=false;
            VideoControl.runButton.disabled=true;
            VideoControl.progressBar.valueAsNumber=0;

            await this.animate();

            this.isAnimating=false;
            this.isPause=false;
            this.videoControlStatus=VideoControlStatus.noAction;

            VideoControl.stopButton.disabled=true;
            VideoControl.runButton.disabled=false;
            if(onEnd){onEnd();}
        }


        public abstract setColorGradient(start:Color,end:Color):this;

        public abstract setVisualElementsColor(defaultColor:boolean):this;

        public abstract setGraph(g:Graph):this;

        public abstract preprocess():this;

        /**
         * @brief
         * if the alogrithmm instance will be visualized and animated, call this function
         * @implements
         * note that the content inside #state-panel also needed to be setted in here
         */
        public abstract createState():this;

        public abstract clearState():this;

        protected abstract animate():void;

        protected readonly onPrevStepPressed:NormalFunction=():void=>{
            this.videoControlStatus=VideoControlStatus.prevStep;
        }

        protected readonly onNextStepPressed:NormalFunction=():void=>{
            this.videoControlStatus=VideoControlStatus.nextStep;
        }

        protected readonly onPauseButtonPressed:NormalFunction=():void=>{
            if(this.isPause){
                this.isPause=false;
                VideoControl.pauseButton.innerText=">";
            }else{
                this.isPause=true;
                VideoControl.pauseButton.innerText="||";
            }
        }

        protected readonly onProgressChanged:NormalFunction=():void=>{
            this.currentStep=VideoControl.progressBar.valueAsNumber;
            this.videoControlStatus=VideoControlStatus.randomStep;
        }


        protected registerSelf():void{
            VideoControl.pauseButton.addEventListener("click",this.onPauseButtonPressed);
            VideoControl.nextStepButton.addEventListener("click",this.onNextStepPressed);
            VideoControl.prevStepButton.addEventListener("click",this.onPrevStepPressed);
            VideoControl.progressBar.addEventListener("input",this.onProgressChanged);
        }


        protected unregisterSelf():void{
            VideoControl.pauseButton.removeEventListener("click",this.onPauseButtonPressed);
            VideoControl.nextStepButton.removeEventListener("click",this.onNextStepPressed);
            VideoControl.prevStepButton.removeEventListener("click",this.onPrevStepPressed);
            VideoControl.progressBar.removeEventListener("input",this.onProgressChanged);

            DescriptionDisplay.clearPanel();
        }


        protected async waitfor():Promise<VideoControlStatus>{
            for(let timePassed:number=0;this.videoControlStatus==VideoControlStatus.noAction&&(this.isPause||timePassed<(VideoControl.speedControl.valueAsNumber)*1000);){
                const before:number=Date.now();
                await new Promise((r)=>{setTimeout(r,5);});
                const after:number=Date.now();
                timePassed+=(after-before);
            }
            const vcs:VideoControlStatus=this.videoControlStatus;
            this.videoControlStatus=VideoControlStatus.noAction;
            return vcs;
        }


        public addVertex(a:number):any{}
        public removeVertex(a:number):any{}
        public addEdge(from:number,to:number):any{}
        public removeEdge(from:number,to:number):any{}
        public setAllEdgesColor(defaultColor:boolean):any{}
    }


    export interface IStep{
        step:number;
    }


    export interface IClearable{
        clear():void;
    }


    export class ObjectPool<T extends IClearable>{
        private pool:T[]=[];
        private iNew:new()=>T;

        public constructor(iNew:new()=>T,poolCapacity:number=128){
            this.iNew=iNew;
            for(let i:number=0;i<poolCapacity;++i){
                this.pool.push(new iNew());
            }
        }


        public get():T{
            if(this.pool.length>0){
                return this.pool.pop() as T;
            }else{
                return new this.iNew();
            }
        }


        public release(t:T):void{
            t.clear();
            this.pool.push(t);
        }
    }


    export abstract class ConnectedComponent implements IClearable{
        public vertices:Vertex[]=[];

        constructor(){}

        public removeVertex(v_id:number):void{
            for(let i:number=0;i<this.vertices.length;++i){
                if(this.vertices[i].id==v_id){
                    this.vertices.splice(i,1);
                    return;
                }
            }
        }

                
        clear(): void {
            this.vertices.length=0;
        }
    }


    /**
     * @brief
     * maintain a data structure as (5 vertex, step=20):
     * v id: info at step X
     * 0:1 3 5 9 10 15
     * 1:6 7 8 9 10 11 15 16 17 19
     * 2:0 1 2 3 7 9 15 16 18
     * 3:0 3 4 7 8 9 
     * 4:0 8 16 17 18 19
     * 
     * query state of vertex at target_step: lower bound search (search the state with step<=target_step)
     * eg
     * query states of vertex 1 at
     * step 10-->return state at step 9
     * step 3--->return state at step 3
     * 
     * query all states at 
     * step 15--->return
     * 0:15
     * 1:15
     * 2:15
     * 3:9
     * 4:8
     * step 19--->return
     * 0:15
     * 1:19
     * 2:18
     * 3:9
     * 4:19
     * 
     * @complexity
     * same as time complexity of the target algorithm (since the step is linerally related to the time complexity)
     */

    export class DescriptionStateInfo implements IStep{
        public step:number=0;
        public stepDescription:string="";
        public codeStep:number=0;
    }

    export abstract class StateManager<DataState extends IStep,DescriptionState extends IStep>{
        public maxStep:number=0;
        public currentStep:number=0;
        protected vertexStates:Map<number,Array<DataState>>=new Map();//for O(vertices.length * log(maxStep)) random step
        protected vertexStatesIndices:number[]=[];//for O(vertices.length) prev step/next step

        protected descriptionStates:Array<DescriptionState>=[];
        protected descriptionStatesIndex:number=0;
        protected returnbuffer:DataState[]=[];

        protected graph:Graph;


        constructor(graph:Graph){
            this.graph=graph;
        }


        public init(graph?:Graph):void{
            if(graph!=undefined){
                this.graph=graph;
            }
            this.returnbuffer.length=this.graph.vertices.length;
            this.vertexStatesIndices.length=this.graph.vertices.length;
            this.descriptionStates.length=0;
            this.resetStep();
        }

        
        public onInitEnd(step:number):void{
            this.maxStep=step;
        }


        public clear():void{
            this.maxStep=0;
            this.vertexStates.clear();
        }


        public resetStep():void{
            this.currentStep=0;
            for(let i:number=0;i<this.vertexStatesIndices.length;++i){
                this.vertexStatesIndices[i]=0;
            }
            this.descriptionStatesIndex=0;
            /*
            for(let v_idx:number=0;v_idx<this.graph.vertices.length;++v_idx){
                const stateInfos:DataState[]=this.vertexStates.get(this.graph.vertices[v_idx].id) as DataState[];
                this.returnbuffer[v_idx]=stateInfos[0];
            }
            */
        }


        /**
         * @returns order is same as graph.vertices
         * ie 
         * vertex at idx 0<=>info at idx 0
         * vertex at idx 1<=>info at idx 1
         * vertex at idx 2<=>info at idx 2
         * ...
         */
        public nextStep():DataState[]|null{
            if(this.currentStep>=this.maxStep){
                return null;
            }
            ++this.currentStep;

            for(let v_idx:number=0;v_idx<this.graph.vertices.length;++v_idx){
                const idx:number=this.vertexStatesIndices[v_idx];
                const stateInfos:DataState[]=this.vertexStates.get(this.graph.vertices[v_idx].id) as DataState[];
                const nextIdx:number=idx+1;
                if(nextIdx<stateInfos.length&&stateInfos[nextIdx].step<=this.currentStep){
                    this.vertexStatesIndices[v_idx]=nextIdx;
                    this.returnbuffer[v_idx]=stateInfos[nextIdx];
                }else{
                    this.returnbuffer[v_idx]=stateInfos[idx];
                }
            }
            {
                const nextIdx=this.descriptionStatesIndex+1;
                if(nextIdx<this.descriptionStates.length&&this.descriptionStates[nextIdx].step<=this.currentStep){
                    this.descriptionStatesIndex=nextIdx;
                }
            }
            return this.returnbuffer;
        }


        public previousStep():DataState[]|null{
            if(this.currentStep<=0){
                return null;
            }
            --this.currentStep;

            for(let v_idx:number=0;v_idx<this.graph.vertices.length;++v_idx){
                const idx:number=this.vertexStatesIndices[v_idx];
                const stateInfos:DataState[]=this.vertexStates.get(this.graph.vertices[v_idx].id) as DataState[];
                const nextIdx:number=idx-1;
                if(stateInfos[idx].step>this.currentStep){
                    this.vertexStatesIndices[v_idx]=nextIdx;
                    this.returnbuffer[v_idx]=stateInfos[nextIdx];
                }else{
                    this.returnbuffer[v_idx]=stateInfos[idx];
                }
            }
            {
                if(this.descriptionStates[this.descriptionStatesIndex].step>this.currentStep){
                    --this.descriptionStatesIndex;
                }
            }
            return this.returnbuffer;
        }


        public randomStep(targetStep:number):DataState[]|null{
            if(targetStep<0||targetStep>=this.maxStep){
                return null;
            }
            this.currentStep=targetStep;
            
            for(let v_idx:number=0;v_idx<this.graph.vertices.length;++v_idx){
                const stateInfos=this.vertexStates.get(this.graph.vertices[v_idx].id) as Array<DataState>;
                this.returnbuffer[v_idx]=stateInfos[0];
                this.vertexStatesIndices[v_idx]=0;

                for(let le:number=0,ri:number=stateInfos.length;le<ri;){
                    const mid:number=Math.floor((le+ri)/2);
                    const theStep:number=stateInfos[mid].step;
                    if(theStep==this.currentStep){
                        this.returnbuffer[v_idx]=stateInfos[mid];
                        this.vertexStatesIndices[v_idx]=mid;
                        break;
                    }else if(theStep<this.currentStep){
                        this.returnbuffer[v_idx]=stateInfos[mid];
                        this.vertexStatesIndices[v_idx]=mid;
                        le=mid+1;
                    }else{
                        ri=mid;
                    }
                }
            }
            
            for(let le:number=0,ri:number=this.descriptionStates.length;le<ri;){
                const mid:number=Math.floor((le+ri)/2);
                const theStep:number=this.descriptionStates[mid].step;
                if(theStep==this.currentStep){
                    this.descriptionStatesIndex=mid;
                    break;
                }else if(theStep<this.currentStep){
                    this.descriptionStatesIndex=mid;
                    le=mid+1;
                }else{
                    ri=mid;
                }
            }
            return this.returnbuffer;
        }


        public addDataState(vertexId:number,info:DataState):void{
            (this.vertexStates.get(vertexId) as DataState[]).push(info);
        }


        public addDescriptionState(info:DescriptionState):void{
            this.descriptionStates.push(info);
        }


        public currentDescriptionState():DescriptionState{
            return this.descriptionStates[this.descriptionStatesIndex];
        }
    }
}


class Color implements IClone<Color>{
    public r:number;
    public g:number;
    public b:number;
    public a:number;

    constructor(r:number,g:number,b:number,a:number=255){
        this.r=r;
        this.g=g;
        this.b=b;
        this.a=a;
    }


    public validate():Color{
        this.r=Math.max(0,Math.min(this.r,255));
        this.g=Math.max(0,Math.min(this.g,255));
        this.b=Math.max(0,Math.min(this.b,255));
        this.a=Math.max(0,Math.min(this.a,255));
        return this;
    }


    public toString(a?:number):string{
        return `rgb(${this.r},${this.g},${this.b},${a==undefined?this.a:a})`;
    }


    public toHexa():string{
        return `#${Color.toHexaHelper(this.r)}${Color.toHexaHelper(this.g)}${Color.toHexaHelper(this.b)}`;
    }


    private static toHexaHelper(val:number):string{
        let first:string=Math.floor(val).toString(16);
        if(first.length<=1){
            return `0${first}`;
        }else{
            return first;
        }
    }


    public assignFrom(other:Color):Color{
        this.r=other.r;
        this.g=other.g;
        this.b=other.b;
        this.a=other.a;
        return this;
    }


    public clone(): Color {
        return new Color(this.r,this.g,this.b,this.a);
    }


    public static fromString(val:string):Color{
        let r:number,g:number,b:number,a:number;

        if(val[0].startsWith("#")){
            if(val.length==7){
                r=parseInt(val.substring(1,3),16);
                g=parseInt(val.substring(3,5),16);
                b=parseInt(val.substring(5,7),16);
                a=255;
            }
            else if(val.length==9){
                r=parseInt(val.substring(1,3),16);
                g=parseInt(val.substring(3,5),16);
                b=parseInt(val.substring(5,7),16);
                a=parseInt(val.substring(7,9),16);
            }else{
                return new Color(-1,-1,-1);
            }
        }else if(val.startsWith("rgb(")){
            const numbers:number[]=val.split(/\d+/g).map((val:string):number=>parseFloat(val));
            if(numbers.length==3){
                r=numbers[0];
                g=numbers[1];
                b=numbers[2];
                a=255;
            }else if(numbers.length==4){
                r=numbers[0];
                g=numbers[1];
                b=numbers[2];
                a=numbers[3];
            }else{
                return new Color(-1,-1,-1);
            }
        }else{
            return new Color(-1,-1,-1);
        }

        return new Color(r,g,b,a).validate();
    }


    public static lerp(ret:Color,start:Color,end:Color,t:number):void{
        ret.r=start.r*(1-t)+end.r*t;
        ret.g=start.g*(1-t)+end.g*t;
        ret.b=start.b*(1-t)+end.b*t;
        ret.a=start.a*(1-t)+end.a*t;
    }
}