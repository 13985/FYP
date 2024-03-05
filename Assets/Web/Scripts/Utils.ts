namespace GraphAlgorithm{
    type NormalFunction=()=>void;


    export const enum VideoControlStatus{
        noAction=0,nextStep=1,prevStep=2,randomStep=3
    }


    export abstract class Algorithm{
        public static statePanel:HTMLElement;
        private static visualizationTarget?:Algorithm;

        //only one video control i believe....
        protected static prevStepButton:HTMLButtonElement;
        protected static nextStepButton:HTMLButtonElement;
        protected static pauseButton:HTMLButtonElement;
        protected static speedControl:HTMLInputElement;
        protected static progressBar:HTMLInputElement;

        protected static runButton:HTMLButtonElement;
        protected static stopButton:HTMLButtonElement;


        public static setVisualizationVideoControl(videoControl:HTMLElement):void{
            Algorithm.prevStepButton=videoControl.querySelector("button.previousStep") as HTMLButtonElement;
            Algorithm.nextStepButton=videoControl.querySelector("button.pause") as HTMLButtonElement;
            Algorithm.pauseButton=videoControl.querySelector("button.nextStep") as HTMLButtonElement;

            Algorithm.progressBar=videoControl.querySelector("input.progress-bar") as HTMLInputElement;
            Algorithm.speedControl=videoControl.querySelector("input.speed-control") as HTMLInputElement;
            Algorithm.speedControl.min="0.05";
            Algorithm.speedControl.max="5";
            Algorithm.speedControl.step="0.001";
        }


        public static setVisualizationControl(run:HTMLButtonElement,stop:HTMLButtonElement):void{
            Algorithm.runButton=run;
            Algorithm.stopButton=stop;
            Algorithm.stopButton.disabled=false;
            Algorithm.runButton.disabled=true;

            Algorithm.runButton.addEventListener("click",():void=>{
                if(Algorithm.visualizationTarget){
                    Algorithm.visualizationTarget.start();
                }
            });

            Algorithm.stopButton.addEventListener("click",():void=>{
                if(Algorithm.visualizationTarget){
                    Algorithm.visualizationTarget.stopAnimating=true;
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
            Algorithm.visualizationTarget?.setAllSVGsColor(defaultColor);
        }

        public static setAllEdgesColor(defaultColor:boolean):any{
            Algorithm.visualizationTarget?.setAllEdgesColor(defaultColor);
        }


        public graph:Graph;
        public waitTime:number=0;
        public svgContainer:SVGSVGElement;
        public showDefaultColor:boolean=true;


        private videoControlStatus:VideoControlStatus=VideoControlStatus.noAction;

        protected isAnimating:boolean=false;
        protected isPause:boolean=false;
        protected stopAnimating:boolean=false;
        protected currentStep:number=0;


        constructor(g:Graph,svg:SVGSVGElement){
            this.graph=g;
            this.svgContainer=svg;
        }

        public async start(onEnd?:()=>void):Promise<void>{
            if(this.isAnimating){return;}
            this.isAnimating=true;
            this.isPause=this.stopAnimating=false;
            this.videoControlStatus=VideoControlStatus.noAction;

            Algorithm.stopButton.disabled=true;
            Algorithm.runButton.disabled=false;

            this.beforeAnimate();
            await this.animate();
            this.afterAnimate();

            this.isAnimating=true;
            this.isPause=this.stopAnimating=false;
            this.videoControlStatus=VideoControlStatus.noAction;
            Algorithm.statePanel.innerHTML="";

            Algorithm.stopButton.disabled=false;
            Algorithm.runButton.disabled=true;
            if(onEnd){onEnd();}
        }

        public abstract preprocess():void;

        public abstract createState():void;

        protected abstract animate():void;

        protected abstract beforeAnimate():void;

        protected abstract afterAnimate():void;

        protected readonly onPrevStepPressed:NormalFunction=():void=>{
            this.videoControlStatus=VideoControlStatus.prevStep;
        }

        protected readonly onNextStepPressed:NormalFunction=():void=>{
            this.videoControlStatus=VideoControlStatus.nextStep;
        }

        protected readonly onPauseButtonPressed:NormalFunction=():void=>{
            if(this.isPause){
                this.isPause=false;
                (Algorithm.pauseButton as HTMLButtonElement).innerText=">";
            }else{
                this.isPause=true;
                (Algorithm.pauseButton as HTMLButtonElement).innerText="||";
            }
        }

        protected readonly onProgressChanged:NormalFunction=():void=>{
            this.currentStep=Algorithm.progressBar.valueAsNumber;
            this.videoControlStatus=VideoControlStatus.randomStep;
        }


        public registerSelf():void{
            Algorithm.pauseButton.addEventListener("click",this.onPauseButtonPressed);
            Algorithm.nextStepButton.addEventListener("click",this.onNextStepPressed);
            Algorithm.prevStepButton.addEventListener("click",this.onPrevStepPressed);
            Algorithm.progressBar.addEventListener("input",this.onProgressChanged);
        }


        public unregisterSelf():void{
            Algorithm.pauseButton.removeEventListener("click",this.onPauseButtonPressed);
            Algorithm.nextStepButton.removeEventListener("click",this.onNextStepPressed);
            Algorithm.prevStepButton.removeEventListener("click",this.onPrevStepPressed);
            Algorithm.progressBar.removeEventListener("input",this.onProgressChanged);
        }


        protected async waitfor():Promise<VideoControlStatus>{
            for(let timePassed:number=0;this.videoControlStatus==VideoControlStatus.noAction&&this.stopAnimating==false&&(this.isPause||timePassed<((Algorithm.speedControl as HTMLInputElement).valueAsNumber)*1000);){
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
        public setAllSVGsColor(defaultColor:boolean):any{}
        public setAllEdgesColor(defaultColor:boolean):any{}
    }


    export interface IStep{
        step:number;
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

    export abstract class StateManager<DataState extends IStep,DisplayState extends IStep>{
        public maxStep:number=0;
        public currentStep:number=0;
        public vertexStates:Map<number,Array<DataState>>=new Map();//for O(vertices.length * log(maxStep)) random step
        public displayStates:Array<DisplayState>=[];
        protected returnbuffer:DataState[]=[];
        protected indices:number[]=[];//for O(vertices.length) prev step/next step

        protected graph:Graph;


        constructor(graph:Graph){
            this.graph=graph;
        }


        public init(graph?:Graph):void{
            if(graph!=undefined){
                this.graph=graph;
            }
            this.returnbuffer.length=this.graph.vertices.length;
            this.indices.length=this.graph.vertices.length;
            this.displayStates.length=0;
            this.resetStep();
        }

        
        public onInitEnd(step:number):void{
            this.maxStep=step;
        }


        public clear():void{
            this.maxStep=0;
            this.vertexStates.clear();
        }


        public resetStep():DataState[]{
            this.currentStep=0;
            for(let i:number=0;i<this.indices.length;++i){
                this.indices[i]=0;
            }
            if(this.vertexStates.size<=0){
                return this.returnbuffer;
            }
            for(let v_idx:number=0;v_idx<this.graph.vertices.length;++v_idx){
                const stateInfos:DataState[]=this.vertexStates.get(this.graph.vertices[v_idx].id) as DataState[];
                this.returnbuffer[v_idx]=stateInfos[0];
            }
            return this.returnbuffer;
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
                const idx:number=this.indices[v_idx];
                const stateInfos:DataState[]=this.vertexStates.get(this.graph.vertices[v_idx].id) as DataState[];
                const nextIdx:number=idx+1;
                if(nextIdx<stateInfos.length&&stateInfos[nextIdx].step<=this.currentStep){
                    this.indices[v_idx]=nextIdx;
                    this.returnbuffer[v_idx]=stateInfos[nextIdx];
                }else{
                    this.returnbuffer[v_idx]=stateInfos[idx];
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
                const idx:number=this.indices[v_idx];
                const stateInfos:DataState[]=this.vertexStates.get(this.graph.vertices[v_idx].id) as DataState[];
                const nextIdx:number=idx-1;
                if(stateInfos[idx].step>this.currentStep){
                    this.indices[v_idx]=nextIdx;
                    this.returnbuffer[v_idx]=stateInfos[nextIdx];
                }else{
                    this.returnbuffer[v_idx]=stateInfos[idx];
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
                this.indices[v_idx]=0;

                for(let le:number=0,ri:number=stateInfos.length;le<ri;){
                    const mid:number=(le+ri)/2;
                    const theStep:number=stateInfos[mid].step;
                    if(theStep==this.currentStep){
                        this.returnbuffer[v_idx]=stateInfos[mid];
                        this.indices[v_idx]=mid;
                        break;
                    }else if(theStep<this.currentStep){
                        this.returnbuffer[v_idx]=stateInfos[mid];
                        this.indices[v_idx]=mid;
                        le=mid+1;
                    }else{
                        ri=mid;
                    }
                }
            }
            return this.returnbuffer;
        }


        public addState(vertexId:number,info:DataState):void{
            (this.vertexStates.get(vertexId) as DataState[]).push(info);
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