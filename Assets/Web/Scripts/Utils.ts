namespace VisualizationUtils{
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


        export function setLocalDescriptionNumber(num:number):HTMLCollection{
            let diff=num-stepDescription.children.length;
            if(diff<=0){
                for(let i:number=0;i<stepDescription.children.length;++i){
                    stepDescription.children[i].classList.toggle("hide",i>=num);//hide all li with index >= num
                }
            }else if(diff>0){
                for(let i:number=0;i<stepDescription.children.length;++i){
                    stepDescription.children[i].classList.toggle("hide",false);
                }
                for(let i:number=stepDescription.children.length;i<num;++i){
                    stepDescription.insertAdjacentHTML("beforeend",'<li class="step"></li>');
                }
            }
            return stepDescription.children;
        }


        export function reset():void{
            for(const pc of (pseudoCodes as PseudoCode[])){
                (pc.li as HTMLLIElement).classList.toggle("current-code",false);
            }
            stepDescription.innerText="";
        }


        export function clearPanel():void{
            codeDescription.innerHTML="";
            for(let i:number=0;i<stepDescription.children.length;++i){
                stepDescription.children[i].classList.toggle("hidden",true);//hide all li with index >= num
            }
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


    /**
     * @summary 
     * note that visualizationTarget and resultTarget share the same index structure
     * if resultTarget is defined then it creates index structure and visualizationTarget uses it,
     * to prevent running the same algorithm three time:
     * resultTarget:1 (createIndexStructure()) + visualizationTarget:2 (createIndexStructure()+createState())
     * createIndexStructure maybe slower then createState
     * 
     * since visualizationTarget must rerun the algorithm and use the information of preprocessed index structure
     * resultTarget will try to do the curd first then visualizationTarget uses it results
     */
    export abstract class Algorithm{
        private static visualizationTarget?:Algorithm;
        public static VisualizationTarget():Algorithm{
            return Algorithm.visualizationTarget as Algorithm;
        }
        private static resultTarget?:Algorithm;
        public static ResultTarget():Algorithm|undefined{
            return Algorithm.resultTarget
        }
        public static onGraphChange?:()=>void;

        protected static readonly codeDescripton:string;

        public static isVisualizing():boolean{
            if(Algorithm.visualizationTarget){
                return Algorithm.visualizationTarget.isAnimating;
            }else{
                return false;
            }
        }

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
                    if(Algorithm.visualizationTarget instanceof KCoreAlgorithm.KCore){
                        /**
                         * @summary
                         * since start animation will hide all visual element color
                         * in case if kcore, since visualizationTarget and resultTarget share same index structure (which contains the polygon)
                         * starting animation will hide the polygon in another graph window of resultTarget, so setVisualElementsColor(false)
                         * needed to be called again
                         */
                        (Algorithm.resultTarget as KCoreAlgorithm.KCore).displayPolygons(true);
                    }
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


        public static changeAlgorithm(algo:Algorithm,other?:Algorithm):void{
            if(Algorithm.visualizationTarget){
                VideoControl.pauseButton.removeEventListener("click",Algorithm.visualizationTarget.onPauseButtonPressed);
                VideoControl.nextStepButton.removeEventListener("click",Algorithm.visualizationTarget.onNextStepPressed);
                VideoControl.prevStepButton.removeEventListener("click",Algorithm.visualizationTarget.onPrevStepPressed);
                VideoControl.progressBar.removeEventListener("input",Algorithm.visualizationTarget.onProgressChanged);
                DescriptionDisplay.clearPanel();

                Algorithm.visualizationTarget.onUnregisterSelf();
            }
            if(Algorithm.resultTarget){
                Algorithm.resultTarget.onUnregisterSelf();
            }

            Algorithm.visualizationTarget=algo;
            Algorithm.resultTarget=other;
            VideoControl.pauseButton.addEventListener("click",algo.onPauseButtonPressed);
            VideoControl.nextStepButton.addEventListener("click",algo.onNextStepPressed);
            VideoControl.prevStepButton.addEventListener("click",algo.onPrevStepPressed);
            VideoControl.progressBar.addEventListener("input",algo.onProgressChanged);
            Algorithm.visualizationTarget.onRegisterSelf();
        }


        public static loadUpdatedGraph():void{
            if(Algorithm.resultTarget!=undefined){
                Algorithm.resultTarget.createIndexStructure().setColorGradient(VertexGradient.start,VertexGradient.end).setVisualElementsColor(false);
                Algorithm.visualizationTarget?.setIndexStructure(Algorithm.resultTarget).createState().setVisualElementsColor(true);
            }else{
                Algorithm.visualizationTarget?.createIndexStructure().setColorGradient(VertexGradient.start,VertexGradient.end).createState().setVisualElementsColor(true);
            }
        }


        public static createState():void{
            Algorithm.visualizationTarget?.createState();
        }


        public static addVertex(v:number):boolean{
            if(Algorithm.resultTarget!=undefined){
                if(Algorithm.resultTarget.addVertex(v)){
                    Algorithm.graphChangeCallBack();
                    Algorithm.visualizationTarget?.graph.addVertex(v);//change the graph directly
                    Algorithm.visualizationTarget?.graphWindow.updateSimulation();
                    Algorithm.visualizationTarget?.createState();
                    return true;
                }
            }else if(Algorithm.visualizationTarget!=undefined){
                if(Algorithm.visualizationTarget.addVertex(v)){
                    Algorithm.graphChangeCallBack();
                    Algorithm.visualizationTarget.createState();
                    return true;
                }
            }

            return false;
        }

        public static removeVertex(v:number):boolean{
            if(Algorithm.resultTarget!=undefined){
                if(Algorithm.resultTarget.removeVertex(v)){
                    Algorithm.graphChangeCallBack();
                    Algorithm.visualizationTarget?.graph.removeVertex(v);//change the graph directly
                    Algorithm.visualizationTarget?.graphWindow.updateSimulation();
                    Algorithm.visualizationTarget?.createState();
                    return true;
                }
            }else if(Algorithm.visualizationTarget!=undefined){
                if(Algorithm.visualizationTarget.removeVertex(v)){
                    Algorithm.graphChangeCallBack();
                    Algorithm.visualizationTarget.createState();
                    return true;
                }
            }
            return false;
        }

        public static addEdge(from:number,to:number):boolean{
            if(Algorithm.resultTarget!=undefined){
                if(Algorithm.resultTarget.addEdge(from,to)){
                    Algorithm.graphChangeCallBack();
                    Algorithm.visualizationTarget?.graph.addEdge(from,to);//change the graph directly
                    Algorithm.visualizationTarget?.graphWindow.updateSimulation();
                    Algorithm.visualizationTarget?.createState();
                    return true;
                }
            }else if(Algorithm.visualizationTarget!=undefined){
                if(Algorithm.visualizationTarget.addEdge(from,to)){
                    Algorithm.graphChangeCallBack();
                    Algorithm.visualizationTarget.createState();
                    return true;
                }
            }
            return false;
        }

        public static removeEdge(from:number,to:number):boolean{
            if(Algorithm.resultTarget!=undefined){
                if(Algorithm.resultTarget.removeEdge(from,to)){
                    Algorithm.graphChangeCallBack();
                    Algorithm.visualizationTarget?.graph.removeEdge(from,to);//change the graph directly
                    Algorithm.visualizationTarget?.graphWindow.updateSimulation();
                    Algorithm.visualizationTarget?.createState();
                    return true;
                }
            }else if(Algorithm.visualizationTarget!=undefined){
                if(Algorithm.visualizationTarget.removeEdge(from,to)){
                    Algorithm.graphChangeCallBack();
                    Algorithm.visualizationTarget.createState();
                    return true;
                }
            }
            return false;
        }

        private static graphChangeCallBack():void{
            if(Algorithm.onGraphChange!=undefined){
                Algorithm.onGraphChange();
            }
        }

        public static setColorGradient(start:Color,end:Color):void{
            if(Algorithm.resultTarget){
                Algorithm.resultTarget.setColorGradient(start,end);
            }else{
                Algorithm.visualizationTarget?.setColorGradient(start,end);
            }
        }

        public static setAllVerticesColor(defaultColor:boolean):void{
            Algorithm.visualizationTarget?.setVisualElementsColor(defaultColor);
        }

        public graph:Graph;
        public svgContainer:SVGSVGElement;
        public showDefaultColor:boolean=true;

        private videoControlStatus:VideoControlStatus=VideoControlStatus.noAction;//if the user is fast enough he can cancel the "stop animation" action by replace it to be another action (pressing other button/input)

        protected isAnimating:boolean=false;
        protected isPause:boolean=false;
        protected currentStep:number=0;
        protected graphWindow:GraphWindow;


        constructor(g:Graph,svg:SVGSVGElement,gw:GraphWindow){
            this.graph=g;
            this.svgContainer=svg;
            this.graphWindow=gw;
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

        public abstract createIndexStructure():this;

        /**
         * @summary
         * if the alogrithmm instance will be visualized and animated, call this function to create the states
         * @implements
         * note that the content inside #state-panel also needed to be setted in here
         */
        public abstract createState():this;

        /**
         * note that this viusalization is designed to have two displays so two Algorithm instances.
         * first is animtion and second is the "colorful result and other visual elements",
         * so createState() must be reran after any CURD on the graph of first Algorithm instance
         * but changing index structure is enough after any CURD on the graph of second Algorithm instance
         * 
         * though generally copy the results from the first instance should be fast enough, if there
         * is any "other visual elements" eg the polygons in kcore, then index structure is necessary
         */

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


        /**
         * @brief clean up
         */
        protected onUnregisterSelf():void{
            this.isAnimating=false;
            this.currentStep=0;
            this.videoControlStatus=VideoControlStatus.stop;
            this.isPause=false;
        }


        /**
         * @summary used to set some visualization realted stuff eg description/pseudo code
         */
        protected onRegisterSelf():void{}


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

        protected abstract addVertex(a:number):boolean;
        protected abstract removeVertex(a:number):boolean;
        protected abstract addEdge(from:number,to:number):boolean;
        protected abstract removeEdge(from:number,to:number):boolean;
        
        public abstract setIndexStructure(other:this):this;
        public copyIndexStructure(other:this){}
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

        public constructor(iNew:new(...args:any)=>T,poolCapacity:number=128){
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


    export class DescriptionState implements IStep{
        public step:number=0;
        public stepDescription:string="";
        public codeStep:number=0;
    }


    /**
     * @summary
     * query the display of stack
     * eg
     * [            ][                           ][                                ][              ] base   descripton...
     * [  ][][][    ][         ][       ][  ][   ][      ][       ][ ][      ][][  ][ ][   ][ ][   ]  |     descripton...
     * [][]    [][  ][     ][][][   ][  ][][][ ][][   ][ ][       ][] [   ][ ]   [ ] [] [  ][] [   ]  |     descripton...
     *           [][][][   ]    [][ ][][]    []   [] [] [][   ][  ]   [] []      []     [][]   [  ]   V     descripton...
     *                 [][ ]       []                     [  ]  []                              [ ]  top
     */
    export abstract class TreeNodeBase<TLocalState extends IStep> implements IClearable{
        public parent?:TreeNodeBase<TLocalState>;
        public children:TreeNodeBase<TLocalState>[]=[];

        public left:number=0;
        public right:number=0;
        public state?:TLocalState;

        public set(le:number,ri:number,parent?:TreeNodeBase<TLocalState>,state?:TLocalState):this{
            this.state=state;
            this.parent=parent;
            this.left=le;
            this.right=ri;
            return this;
        }

        public getChild(step:number):TreeNodeBase<TLocalState>|null{
            for(let le:number=0,ri:number=this.children.length;le<ri;){
                const mid:number=Math.floor((le+ri)/2);
                const node:TreeNodeBase<TLocalState>=this.children[mid];
                const status:number=node.compareToBound(step);
                switch(status){
                case -1:
                    le=mid+1;
                    break;
                case 0:
                    return node;
                case 1:
                    ri=mid;
                    break;
                }
            }
            return null;
        }

        /** 
         * @return
         * [....le)[le,ri)[ri....)
         *     -1     0       1
         */
        public compareToBound(step:number):number{
            if(step<this.left){
                return 1;
            }else if(step>=this.right){
                return -1;
            }else{
                return 0;
            }
        }

        public clear():void{}
    }


     /**
     * @summary
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
     * 
     * @note
     * doesnt support "global values" only support local value changes
     * each push must be followed by pop as stack, otherwise the right bound wont be updated correctly
     */
    export abstract class StateManager<TDataState extends IStep,TLocalState extends IStep>{
        public maxStep:number=0;
        public currentStep:number=0;
        public dataKeys:number[]=[];

        protected dataStates:Map<number,Array<TDataState>>=new Map();//for O(vertices.length * log(maxStep)) random step
        protected dataStatesIndices:number[]=[];//for O(vertices.length) prev step/next step
        protected dataStatesCurrent:TDataState[]=[];
        public getCurrentDataStates():TDataState[]{
            return this.dataStatesCurrent;
        }

        protected localStates:TreeNodeBase<TLocalState>;
        protected localStatesIndex:TreeNodeBase<TLocalState>;
        protected localStatesCurrent:TLocalState[]=[];
        public getCurrentLocalStates():TLocalState[]{
            return this.localStatesCurrent;
        }


        constructor(){
            this.localStates=this.getTreeNode();
            this.localStatesIndex=this.localStates;
        }


        /**
         * @summary datakeys must be called before creating state since the data is identified by dataKey:number
         */
        protected abstract setDataKeys():void;


        public init():void{
            this.setDataKeys();
            this.dataStatesCurrent.length=this.dataKeys.length;
            this.dataStatesIndices.length=this.dataKeys.length;
            this.resetStep();
        }

        
        public onInitEnd(step:number):void{
            this.maxStep=step;
            (this.localStates as TreeNodeBase<TLocalState>).right=step;
            this.localStatesIndex=this.localStates;
        }


        public clear():void{
            this.maxStep=0;
            this.dataStates.clear();
            this.clearTreeChild(this.localStates);
            this.localStatesIndex=this.localStates;
        }


        protected clearTreeChild(root:TreeNodeBase<TLocalState>):void{
            for(const node of root.children){
                this.clearTreeChild(node);
                this.releaseTreeNode(node);
            }
            root.children.length=0;
        }


        public resetStep():void{
            this.currentStep=0;
            for(let i:number=0;i<this.dataStatesIndices.length;++i){
                this.dataStatesIndices[i]=0;
            }
            this.localStatesIndex=this.localStates;
            this.localStatesCurrent.length=0;
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
        public nextStep():TDataState[]|null{
            if(this.currentStep>=this.maxStep){
                return null;
            }
            ++this.currentStep;

            for(let i:number=0;i<this.dataKeys.length;++i){
                const dataKey:number=this.dataKeys[i];
                const idx:number=this.dataStatesIndices[i];
                const dataStates:TDataState[]=this.dataStates.get(dataKey) as TDataState[];
                const nextIdx:number=idx+1;
                if(nextIdx<dataStates.length&&dataStates[nextIdx].step<=this.currentStep){
                    this.dataStatesIndices[i]=nextIdx;
                    this.dataStatesCurrent[i]=dataStates[nextIdx];
                }else{
                    this.dataStatesCurrent[i]=dataStates[idx];
                }
            }

            while(this.localStatesIndex.right<=this.currentStep){
                this.localStatesCurrent.pop();
                if(this.localStatesIndex.parent){
                    this.localStatesIndex=this.localStatesIndex.parent;
                }else{
                    break;
                }
            }

            while(true){
                const child:TreeNodeBase<TLocalState>|null=this.localStatesIndex.getChild(this.currentStep);
                if(child==null){break;}
                this.localStatesCurrent.push(child.state as TLocalState);
                this.localStatesIndex=child;
            }
            return this.dataStatesCurrent;
        }


        public previousStep():TDataState[]|null{
            if(this.currentStep<=0){
                return null;
            }
            --this.currentStep;

            for(let i:number=0;i<this.dataKeys.length;++i){
                const dataKey:number=this.dataKeys[i];
                const idx:number=this.dataStatesIndices[i];
                const dataStates:TDataState[]=this.dataStates.get(dataKey) as TDataState[];
                const nextIdx:number=idx-1;
                if(dataStates[idx].step>this.currentStep){
                    this.dataStatesIndices[i]=nextIdx;
                    this.dataStatesCurrent[i]=dataStates[nextIdx];
                }else{
                    this.dataStatesCurrent[i]=dataStates[idx];
                }
            }

            while(this.localStatesIndex.left>this.currentStep){
                this.localStatesCurrent.pop();
                if(this.localStatesIndex.parent){
                    this.localStatesIndex=this.localStatesIndex.parent;
                }else{
                    break;
                }
            }

            while(true){
                const child:TreeNodeBase<TLocalState>|null=this.localStatesIndex.getChild(this.currentStep);
                if(child==null){break;}
                this.localStatesCurrent.push(child.state as TLocalState);
                this.localStatesIndex=child;
            }
            return this.dataStatesCurrent;
        }


        public randomStep(targetStep:number):TDataState[]|null{
            if(targetStep<0||targetStep>=this.maxStep){
                return null;
            }
            this.currentStep=targetStep;
            
            for(let i:number=0;i<this.dataKeys.length;++i){
                const dataKey:number=this.dataKeys[i];
                const stateInfos=this.dataStates.get(dataKey) as Array<TDataState>;
                this.dataStatesCurrent[i]=stateInfos[0];
                this.dataStatesIndices[i]=0;

                for(let le:number=0,ri:number=stateInfos.length;le<ri;){
                    const mid:number=Math.floor((le+ri)/2);
                    const theStep:number=stateInfos[mid].step;
                    if(theStep==this.currentStep){
                        this.dataStatesCurrent[i]=stateInfos[mid];
                        this.dataStatesIndices[i]=mid;
                        break;
                    }else if(theStep<this.currentStep){
                        this.dataStatesCurrent[i]=stateInfos[mid];
                        this.dataStatesIndices[i]=mid;
                        le=mid+1;
                    }else{
                        ri=mid;
                    }
                }
            }
            
            {
                this.localStatesCurrent.length=0;
                this.localStatesIndex=this.localStates;
                while(true){
                    const child:TreeNodeBase<TLocalState>|null=this.localStatesIndex.getChild(targetStep);
                    if(child==null){
                        break;
                    }
                    this.localStatesCurrent.push(child.state as TLocalState);
                    this.localStatesIndex=child;
                }
            }
            return this.dataStatesCurrent;
        }


        public dataStatePush(dataKey:number,info:TDataState):void{
            (this.dataStates.get(dataKey) as TDataState[]).push(info);
        }


        public localStatePush(state:TLocalState):void{
            const newNode:TreeNodeBase<TLocalState>=this.getTreeNode().set(state.step,state.step,this.localStatesIndex,state);
            this.localStatesIndex.children.push(newNode);
            this.localStatesIndex=newNode;
        }
        
        public localStatePop(step:number):void{
            this.localStatesIndex.right=step;
            this.localStatesIndex=this.localStatesIndex.parent as TreeNodeBase<TLocalState>;
        }

        public localStateTop(state:TLocalState):void{
            this.localStatePop(state.step);
            this.localStatePush(state);
        }

        protected abstract getTreeNode():TreeNodeBase<TLocalState>;
        protected abstract releaseTreeNode(node:TreeNodeBase<TLocalState>):void;
    }


    export abstract class GraphStateManager<TDataState extends IStep,TLocalState extends IStep> extends StateManager<TDataState,TLocalState>{
        protected graph:Graph;
        constructor(g:Graph){
            super();
            this.graph=g;
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


function arrayLast<T>(arr:T[]):T{
    return arr[arr.length-1];
}

function removeAsSwapBack<T>(arr:T[],idx:number):void{
    arr[idx]=arr[arr.length-1];
    arr.pop();
}