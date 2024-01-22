class FloatingPanel{
    private outerDiv:HTMLDivElement;
    private topDiv:HTMLDivElement;
    private contentDiv:HTMLDivElement;
    private closeButton:HTMLButtonElement;
    private originalParent:HTMLElement;

    private previousX:number=0;
    private previousY:number=0;
    private outerOffsetX:number=0;
    private outerOffsetY:number=0;
    private isDragging:boolean=false;

    constructor(selector:string){
        this.outerDiv=<HTMLDivElement>document.querySelector(selector);
        this.originalParent=this.outerDiv.parentElement as HTMLElement;
        this.topDiv=<HTMLDivElement>this.outerDiv.querySelector(".panel-top");
        this.contentDiv=<HTMLDivElement>this.outerDiv.querySelector(".panel-content");
        this.closeButton=<HTMLButtonElement>this.topDiv.querySelector("button[type=button]");
        this.closeButton.addEventListener("click",this.close.bind(this));

        this.topDiv.addEventListener("mousedown",(me:MouseEvent):void=>{
            if(me.button==0){
                this.isDragging=true;
                this.previousX=me.clientX;
                this.previousY=me.clientY;
            }
        });

        this.topDiv.addEventListener("mouseup",():void=>{
            this.isDragging=false;
        });
        this.topDiv.addEventListener("mouseleave",():void=>{
            this.isDragging=false;
        });


        this.topDiv.addEventListener("mousemove",(me:MouseEvent):void=>{
            if(this.isDragging==false){return;}
            me.preventDefault();
            this.outerOffsetX+=me.clientX-this.previousX;
            this.outerOffsetY+=me.clientY-this.previousY;
            this.previousX=me.clientX;
            this.previousY=me.clientY;
            this.outerDiv.style.top=`${this.outerOffsetY}px`;
            this.outerDiv.style.left=`${this.outerOffsetX}px`;
        });
    }


    public setCloseCallback(callback:()=>void):FloatingPanel{
        this.closeButton.addEventListener("click",():void=>{
            callback();
        });
        return this;
    }


    public close():void{
        this.isDragging=false;
        this.outerOffsetX=0;
        this.outerOffsetY=0;
        this.outerDiv.style.top="";
        this.outerDiv.style.left="";
        document.body.removeChild(this.outerDiv);
        this.originalParent.appendChild(this.outerDiv);
        setTimeout(():void=>{
            this.outerDiv.classList.toggle("floating-panel-open");
        },1);//no idea why it needs to wait some time
    }


    public open():void{
        const rect:DOMRect=this.outerDiv.getBoundingClientRect();
        this.outerOffsetX=rect.left+window.scrollX;
        this.outerOffsetY=rect.top+window.scrollY;
        this.outerDiv.style.left=`${this.outerOffsetX}px`;
        this.outerDiv.style.top=`${this.outerOffsetY}px`;
        this.originalParent.removeChild(this.outerDiv);
        document.body.appendChild(this.outerDiv);
        setTimeout(():void=>{
            this.outerDiv.classList.toggle("floating-panel-open");
        },1);//no idea why it needs to wait some time
        
    }
}