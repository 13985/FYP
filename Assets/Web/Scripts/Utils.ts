namespace GraphAlgorithm{
    export abstract class Algorithm{
        public static statePanel:HTMLElement;
        private static currentAlgorithm?:Algorithm;

        public static changeAlgorithm(algo:Algorithm):void{
            if(Algorithm.currentAlgorithm){

            }
            Algorithm.currentAlgorithm=algo;
        }


        public static async start(onEnd?:()=>void):Promise<void>{
            Algorithm.currentAlgorithm?.start(onEnd);
        }


        public static preprocess():void{
            Algorithm.currentAlgorithm?.preprocess();
        }


        public static addVertex(a:number):any{
            Algorithm.currentAlgorithm?.addVertex(a);
        }

        public static removeVertex(a:number):any{
            Algorithm.currentAlgorithm?.removeVertex(a);
        }

        public static addEdge(from:number,to:number):any{
            Algorithm.currentAlgorithm?.addEdge(from,to);
        }

        public static removeEdge(from:number,to:number):any{
            Algorithm.currentAlgorithm?.removeEdge(from,to);
        }

        public static setAllVerticesColor(defaultColor:boolean):any{
            Algorithm.currentAlgorithm?.setAllVerticesColor(defaultColor);
        }

        public static setAllEdgesColor(defaultColor:boolean):any{
            Algorithm.currentAlgorithm?.setAllEdgesColor(defaultColor);
        }


        public graph:Graph;
        public waitTime:number=0;
        public svgContainer:SVGSVGElement;
        public showDefaultColor:boolean=true;

        protected isAnimating:boolean=false;
        protected isPause:boolean=false;
        protected nextStep:boolean=false;
        protected stopAnimating:boolean=false;

        protected pauseButton:HTMLButtonElement|undefined=undefined;
        protected nextStepButton:HTMLButtonElement|undefined=undefined;
        protected stopButton:HTMLButtonElement|undefined=undefined;
        protected speedControl:HTMLInputElement|undefined=undefined;


        constructor(g:Graph,svg:SVGSVGElement){
            this.graph=g;
            this.svgContainer=svg;
        }

        public abstract start(onEnd?:()=>void):Promise<void>;

        public abstract preprocess():void;

        public abstract createState():void;

        protected abstract animate():void;

        protected beforeAnimate():void{
            this.isAnimating=true;
            this.isPause=this.nextStep=this.stopAnimating=false;
        }

        protected afterAnimate():void{
            this.isAnimating=true;
            this.isPause=this.nextStep=this.stopAnimating=false;
            Algorithm.statePanel.innerHTML="";
        }


        public setSpeedInput(speed:HTMLInputElement):this{
            this.speedControl=speed;
            this.speedControl.min="0.05";
            this.speedControl.max="5";
            this.speedControl.step="0.001";
            return this;
        }


        public setButtons(pause:HTMLButtonElement,nextStep:HTMLButtonElement):this{
            this.pauseButton=pause;
            this.nextStepButton=nextStep;
            this.pauseButton.addEventListener("click",():void=>{
                if(this.isPause){
                    this.isPause=false;
                    (this.pauseButton as HTMLButtonElement).innerText=">";
                    //displayPartialResult(false);
                }else{
                    this.isPause=true;
                    (this.pauseButton as HTMLButtonElement).innerText="||";
                }
            });
            this.nextStepButton.addEventListener("click",():void=>{
                this.nextStep=true;
            });
            return this;
        }


        protected async waitfor():Promise<void>{
            for(let timePassed:number=0;this.nextStep==false&&this.stopAnimating==false&&(this.isPause||timePassed<((this.speedControl as HTMLInputElement).valueAsNumber)*1000);){
                const before:number=Date.now();
                await new Promise((r)=>{setTimeout(r,10);});
                const after:number=Date.now();
                timePassed+=(after-before);
            }
            this.nextStep=false;
        }


        public addVertex(a:number):any{}
        public removeVertex(a:number):any{}
        public addEdge(from:number,to:number):any{}
        public removeEdge(from:number,to:number):any{}
        public setAllVerticesColor(defaultColor:boolean):any{}
        public setAllEdgesColor(defaultColor:boolean):any{}
    }


    export interface ICommand{
        undo():void;
        redo():void;
    }
}