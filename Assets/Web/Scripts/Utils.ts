namespace GraphAlgorithm{
    export abstract class Algorithm{
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

        protected abstract animate():void;

        protected beforeAnimate():void{
            this.isAnimating=true;
            this.isPause=this.nextStep=this.stopAnimating=false;
        }

        protected afterAnimate():void{
            this.isAnimating=true;
            this.isPause=this.nextStep=this.stopAnimating=false;
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
}