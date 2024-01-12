using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using TMPro;
using System.Runtime.CompilerServices;
using Unity.Mathematics;

public sealed class UnionFind{
    public int[] parent;
    public int[] depth;
    private Stack<int> path;
    public int Count{get{return parent.Length;}}
    public UnionFind(int count){
        parent=new int[count];
        depth=new int[count];
        path=new Stack<int>();
        for(int i=0;i<count;i++){
            parent[i]=i;
            depth[i]=0;
        }
    }

    public int Find(int node){
        while(parent[node]!=node){
            path.Push(node);
            node=parent[node];
        }
        int p=node;
        while(path.TryPop(out node)){
            parent[node]=p;
        }
        return p;
    }

    public void Union(int a,int b){
        int aParent=Find(a),bParent=Find(b);
        if(aParent==bParent){
            return;
        }
        else if(depth[aParent]<depth[bParent]){
            parent[aParent]=bParent;
        }
        else if(depth[aParent]>depth[bParent]){
            parent[bParent]=aParent;
        }
        else{
            parent[aParent]=bParent;
            depth[bParent]++;
        }
        //attach the tree of lower depth to the tree that is higher depth
    }

    public void Flatten(){
        //for all v->find its p
        //then parent[v]=p and their depth=0 (depth[v]=0) while depth[p]=1;
        int count=Count;
        for(int i=0;i<count;i++){
            int node=i,p;
            while(parent[node]!=node){
                path.Push(node);
                node=parent[node];
            }

            p=node;
            if(p==i){}
            else{
                while(path.TryPop(out node)){
                    parent[node]=p;
                    depth[node]=0;
                }
            }
            depth[p]=1;
        }
    }
}

public sealed class KCore:MonoBehaviour{
    private static KCore _instance;
    public static KCore Instance {
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{
            return _instance;
        }
    }

    [Header("showing status")]
    [SerializeField]private GameObject statusBoard;
    [SerializeField]private TextMeshProUGUI ancestorText,descendantText,shellText;
    [SerializeField]private GameObject progressPanel;
    [SerializeField]private Slider mainStepSlider,subStepSlider;
    [Header("On/Off floating panel")]
    [SerializeField]private UIController.ToggleButton statusPanelButton;
    [SerializeField]private UIController.ToggleButton progressPanelButton;
    [SerializeField]private UIController.Detail algoDetail;
    [Header("Other UI")]
    [SerializeField]private TMP_Dropdown smallSelect;
    [SerializeField]private TMP_Dropdown largeSelect;


    private Color unprocessedColor;
    private Color[] _shellColor;
    public Color[] shellColor{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{return _shellColor;}
    }
    private int maximumDegree;
    private Coroutine runningKCore=null;
    private bool _isRunning=false,stopRunning=false,forceNextStep=false,_hasRan=false,forcePreviousStep;
    public bool isRunning{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{return _isRunning;}
    }

    public bool hasRan{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{return _hasRan;}
    }

    private struct Steps{
        public int mainStep,substep;
    }

    private Steps[] toSteps;//provides mapping from vertex->step
    private int[] toVertex;//provides mapping from step->vertex

    public class ConnectedComponent{
        public List<int> vertice;
        public Vector2[] bounds;
        public Mesh areaMesh;
        public readonly int kValue;
        public int Count{get{return vertice.Count;}}

        public int this[int idx]{
            get {
                return vertice[idx];
            }
            set {
                vertice[idx]= value;
            }
        }

        public ConnectedComponent(int kValue,int capacity){
            vertice=new List<int>(capacity);
            this.kValue=kValue;
            areaMesh=null;
        }

        public void Add(int v){
            vertice.Add(v);
        }
    }


    public class ShellComponents{
        public List<ConnectedComponent> components;
        public readonly int k;
        public ShellComponents(int k){
            this.k=k;
            components=new List<ConnectedComponent>();
        }
        public void Add(ConnectedComponent g){
            components.Add(g);
        }
    }

    private ShellComponents[] _shellDiffentComponents;
    public ShellComponents[] shellDiffentComponents{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{return _shellDiffentComponents;}
    }


    private int2 showShellRange;//used to filter the shell when visualizing

    void Awake() {
        _instance=this;
        _shellDiffentComponents=null;
        statusBoard.SetActive(false);
        unprocessedColor=new Color(1,1,1,0.2f);
        mainStepSlider.wholeNumbers=true;
        
        statusBoard.SetActive(false);
        statusPanelButton.Init();
        progressPanelButton.Init();
        algoDetail.Init();

        smallSelect.onValueChanged.AddListener(OnSmallChange);
        largeSelect.onValueChanged.AddListener(OnLargeChange);
    }

    
    void OnDrawGizmos() {
        if(Application.isPlaying==true&&shellDiffentComponents!=null) {
            Gizmos.color=Color.yellow;
            for(int i = 0;i<shellDiffentComponents.Length;i++) {
                for(int j = 0;j<shellDiffentComponents[i].components.Count;j++) {
                    ConnectedComponent component = shellDiffentComponents[i].components[j];
                    if(component.bounds==null)continue;
                    for(int k = 1;k<component.bounds.Length;k++) {
                        Gizmos.DrawLine(component.bounds[k-1],component.bounds[k]);
                    }
                    if(component.bounds.Length > 0) {
                        Gizmos.DrawLine(component.bounds[component.bounds.Length-1],component.bounds[0]);
                    }
                }
            }
        }
    }
    

    void OnDestroy(){
        ClearMeshes();
    }

    public void PauseRunning(){
        stopRunning=true;
    }

    public void ResumeRunning(){
        stopRunning=false;
    }

    public void StartRunning(){
        if(_isRunning){
            return;
        }
        _hasRan=false;
        _isRunning=true;
        statusBoard.SetActive(true);
        //progressPanel.SetActive(true);
        GraphConstructor.instance.UpdateAllEdges(true);
        runningKCore=StartCoroutine(Animate(true));
    }

    public void StopRunning(bool forceFinish=false){
        if(_isRunning){
            StopCoroutine(runningKCore);
            CleanUp();
            statusBoard.SetActive(false);
        }
        else{}
        _hasRan=forceFinish;
    }


    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void NextStep(){
        forceNextStep=true;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void PreviousStep(){
        forcePreviousStep=true;
    }


    //return the k-shell of each vertex and each connected component in each shell
    public void PreProcess(out int[] vertexKValue){
        List<int>[] adjacencyList=GraphConstructor.instance.AdjacencyList;
        int vertexNumber=adjacencyList.Length,currentShell;
        SparseSet[] candiates=new SparseSet[2];
        int[] degree=new int[vertexNumber];
        UnionFind union=new UnionFind(vertexNumber);
        candiates[0]=new SparseSet(vertexNumber);
        candiates[1]=new SparseSet(vertexNumber);
        vertexKValue=new int[vertexNumber];

        toSteps=new Steps[vertexNumber];
        toVertex=new int[vertexNumber];
        mainStepSlider.minValue=1;
        mainStepSlider.maxValue=vertexNumber;

        currentShell=0;
        for(int vertex=0;vertex<vertexNumber;vertex++){
            degree[vertex]=adjacencyList[vertex].Count;//find the degree of each vertex
            currentShell=degree[vertex]<currentShell?degree[vertex]:currentShell;
            if(degree[vertex]<=currentShell){//at first, no vertex can affect those vertice have zero degree
                candiates[0].Add(vertex);
            }else{
                candiates[1].Add(vertex);
            }
        }

        for(int step=0;true;){
            int number=0;
            while(candiates[0].TryRemoveLast(out int vertex)){//get one vertex in first list
                number++;
                vertexKValue[vertex]=currentShell;
                degree[vertex]=-1;

                toSteps[vertex].mainStep=step;
                toSteps[vertex].substep=0;
                toVertex[step]=vertex;
                step++;

                for(int i=0;i<adjacencyList[vertex].Count;i++){//process all its neighbor (decrement their degree)
                    int neighbor=adjacencyList[vertex][i];
                    if(degree[neighbor]<=0){//an already processed vertex
                        if(vertexKValue[neighbor]==currentShell) {//check if the k value same as vertex itself, if yes, union
                            union.Union(neighbor,vertex);
                        }
                        continue;
                    }
                    toSteps[vertex].substep++;
                    degree[neighbor]--;

                    if(degree[neighbor]<=currentShell&&candiates[1].Remove(neighbor)){//getIndex[neighbor]<0 means its already in group0, no need to moveDown again
                        candiates[0].Add(neighbor);
                    }
                }
            }

            Debug.Log($"{number} vertices at {currentShell}-shell");
            if(candiates[1].count<=0){
                break;
            }

            currentShell=int.MaxValue;
            for(int i=0;i<candiates[1].count;i++){
                currentShell=math.min(degree[candiates[1].dense[i]],currentShell);
            }

            //find those vertex in group1 has degree<=k
            for(int i=0;i<candiates[1].count;){
                int vertex = candiates[1].dense[i];
                if(degree[vertex]<=currentShell){
                    candiates[1].Remove(vertex);
                    candiates[0].Add(vertex);
                }else{
                    i++;
                }
            }
        }

        showShellRange.x=0;
        showShellRange.y=currentShell;
        smallSelect.ClearOptions();
        largeSelect.ClearOptions();
        for(int i=0;i<=currentShell;++i){
            smallSelect.options.Add(new TMP_Dropdown.OptionData($"{i}",null));
            largeSelect.options.Add(new TMP_Dropdown.OptionData($"{i}",null));
        }
        smallSelect.SetValueWithoutNotify(showShellRange.x);
        largeSelect.SetValueWithoutNotify(showShellRange.y);

        maximumDegree=currentShell+1;
        candiates[0].Dispose();
        candiates[1].Dispose();
        degree=null;

        ConnectedComponentsInDifferentKShell(union,vertexKValue,maximumDegree);
        union=null;

        _shellColor=new Color[maximumDegree];
        for(int i=1;i<=maximumDegree;i++){
            _shellColor[maximumDegree-i]=Color.HSVToRGB(i*0.75f/maximumDegree,1,1);
        }

        System.GC.Collect();
    }
    

    private IEnumerator Animate(bool old){
        GameObject[] reverseMapping=GraphConstructor.instance.ReverseMapping;
        List<int>[] adjacencyList=GraphConstructor.instance.AdjacencyList;
        int vertexNumber=adjacencyList.Length,currentShell;
        SparseSet[] candiates=new SparseSet[2];
        candiates[0]=new SparseSet(vertexNumber);//candiates[0] for storing the vertex which have degree<=k
        candiates[1]=new SparseSet(vertexNumber);//candiates[1] for storing the vertex which have degree>k
        int[] degree=new int[vertexNumber];
        int[] vertexKValue=new int[vertexNumber];
        
        currentShell=0;
        for(int vertex=0;vertex<vertexNumber;vertex++){
            degree[vertex]=adjacencyList[vertex].Count;//find the degree of each vertex
            currentShell=degree[vertex]<currentShell?degree[vertex]:currentShell;
            if(degree[vertex]<=currentShell){//at first, no vertex can affect those vertice have zero degree
                candiates[0].Add(vertex);
            }else{
                candiates[1].Add(vertex);
            }
            reverseMapping[vertex].GetComponent<SpriteRenderer>().color=unprocessedColor;
        }

        IEnumerator Wait(){
            if(forceNextStep==false){
                for(float passedTime=0;passedTime<UIController.instance.animationSpeed;passedTime+=Time.deltaTime){
                    yield return null;
                }
                while(forceNextStep==false&&stopRunning==true){yield return null;}
            }
            forceNextStep=false;
        }

        while(true){
            shellText.text=$"shell: {currentShell}";
            if(currentShell>=showShellRange.x&&currentShell<=showShellRange.y){
                yield return Wait();
            }
            while(candiates[0].TryRemoveLast(out int vertex)){//get one vertex in first list
                ancestorText.text=$"processing: {vertex}";
                GraphConstructor.instance.ShowEdgesOfVertex(vertex);
                vertexKValue[vertex]=currentShell;
                degree[vertex]=-1;
                reverseMapping[vertex].GetComponent<SpriteRenderer>().color=_shellColor[currentShell];
                if(currentShell>=showShellRange.x&&currentShell<=showShellRange.y){
                    yield return Wait();
                }

                for(int i=0;i<adjacencyList[vertex].Count;i++){//process all its neighbor (decrement their degree)
                    int neighbor=adjacencyList[vertex][i];
                    if(degree[neighbor]<=0){//an already processed vertex
                        continue;
                    }
                    reverseMapping[neighbor].GetComponent<SpriteRenderer>().color=Color.white;
                    descendantText.text=$"neighbor: {neighbor}\ndegree: {degree[neighbor]}";
                    if(currentShell>=showShellRange.x&&currentShell<=showShellRange.y){
                        yield return Wait();
                    }

                    degree[neighbor]--;
                    if(degree[neighbor]<=currentShell&&candiates[1].Remove(neighbor)){//getIndex[neighbor]<0 means its already in group0, no need to moveDown again
                        candiates[0].Add(neighbor);
                    }
                    reverseMapping[neighbor].GetComponent<SpriteRenderer>().color=unprocessedColor;
                    descendantText.text=$"neighbor: {neighbor}\ndegree: {degree[neighbor]}";
                    if(currentShell>=showShellRange.x&&currentShell<=showShellRange.y){
                        yield return Wait();
                    }
                }
                GraphConstructor.instance.HideEdgesOfVertex(vertex);
            }

            if(candiates[1].count<=0){
                break;
            }

            currentShell=int.MaxValue;
            for(int i=0;i<candiates[1].count;i++){
                currentShell=math.min(degree[candiates[1].dense[i]],currentShell);
            }

            //find those vertex in group1 has degree<=k
            for(int i=0;i<candiates[1].count;){
                int vertex = candiates[1].dense[i];
                if(degree[vertex]<=currentShell){
                    candiates[1].Remove(vertex);
                    candiates[0].Add(vertex);
                }else{
                    i++;
                }
            }
        }
        candiates[0].Dispose();
        candiates[1].Dispose();
        degree=null;
        vertexKValue=null;
        CleanUp();
        _hasRan=true;
        GraphConstructor.instance.SetAllEdgeThinness(false);
        System.GC.Collect();
    }


    private IEnumerator Animate() {
        GameObject[] reverseMapping=GraphConstructor.instance.ReverseMapping;
        List<int>[] adjacencyList=GraphConstructor.instance.AdjacencyList;
        int[] shells=GraphConstructor.instance.Shells;
        int vertexNumber=adjacencyList.Length;
        int[] degree=new int[vertexNumber];

        int programCounter=0;
        int step=0;
        int currentVertex=0;
        int shell=0;
        int substep=0;
        int neighborIndex=0;

        for(int i=0;i<vertexNumber;i++){
            degree[i]=adjacencyList[i].Count;
        }

        IEnumerator Wait(){
            if(forceNextStep==false){
                for(float passedTime=0;passedTime<UIController.instance.animationSpeed;passedTime+=Time.deltaTime){
                    yield return null;
                }
                while(forceNextStep==false&&stopRunning==true){yield return null;}
            }
            forceNextStep=false;
            yield break;
        }

        void SetVisual(int v,Color c){
            reverseMapping[v].GetComponent<SpriteRenderer>().color=c;
            descendantText.text=$"neighbor: {v}\ndegree: {degree[v]}";
            substep++;
            subStepSlider.value=substep;
        }

        void SetAncestor(){
            currentVertex=toVertex[step];
            shell=shells[currentVertex];
            shellText.text=$"shell: {shell}";
            ancestorText.text=$"processing: {currentVertex}";
            reverseMapping[currentVertex].GetComponent<SpriteRenderer>().color=shellColor[shell];
            GraphConstructor.instance.ShowEdgesOfVertex(currentVertex);

            subStepSlider.minValue=1;
            subStepSlider.maxValue=(toSteps[currentVertex].substep<<1)+1;
            subStepSlider.value=1;
            substep=1;
            mainStepSlider.value=step+1;
        }

        //note that case 2*n+1 is the reverse operation of case 2*n
        while(step<vertexNumber){
            switch(programCounter){
            case 0:{
                SetAncestor();
                yield return Wait();

                if(forcePreviousStep){
                    forcePreviousStep=false;
                    if(step<=0){//doesnt have previous step
                        programCounter=0;
                    }else{
                        programCounter=9;
                    }
                }else if(toSteps[currentVertex].substep==0){
                    programCounter=8;
                }else{
                    neighborIndex=-1;//set the for loop variable here
                    programCounter=2;
                }
                break;
            }
            case 1:{//reverse operation of above
                SetAncestor();
                yield return Wait();
                neighborIndex=adjacencyList[currentVertex].Count;//set the for loop variable here
                programCounter=3;
                break;
            }
            case 2:{//iterate only
                neighborIndex++;
                List<int> neighbors=adjacencyList[currentVertex];
                while(true){
                    if(neighborIndex>=neighbors.Count){
                        programCounter=8;
                        break;
                    }else if(toSteps[neighbors[neighborIndex]].mainStep<step){
                        neighborIndex++;
                    }else{
                        programCounter=4;
                        break;
                    }   
                }break;
            }
            case 3:{//reverse operation of above
                neighborIndex--;
                List<int> neighbors=adjacencyList[currentVertex];
                while(true){
                    if(neighborIndex<0){
                        programCounter=9;
                        break;
                    }else if(toSteps[neighbors[neighborIndex]].mainStep<step){
                        neighborIndex--;
                    }else{
                        programCounter=6;
                        break;
                    }
                }break;
            }
            case 4:{
                SetVisual(adjacencyList[currentVertex][neighborIndex],Color.white);
                degree[adjacencyList[currentVertex][neighborIndex]]--;
                yield return Wait();

                if(forcePreviousStep){
                    forcePreviousStep=false;
                    programCounter=5;
                }else{
                    programCounter=6;
                }
                break;
            }
            case 5:{
                degree[adjacencyList[currentVertex][neighborIndex]]++;
                reverseMapping[adjacencyList[currentVertex][neighborIndex]].GetComponent<SpriteRenderer>().color=unprocessedColor;
                substep--;
                subStepSlider.value=substep;
                programCounter=3;
                break;
            }
            case 6:{
                SetVisual(adjacencyList[currentVertex][neighborIndex],unprocessedColor);
                yield return Wait();

                if(forcePreviousStep){
                    forcePreviousStep=false;
                    programCounter=7;
                }else{
                    programCounter=2;
                }
                break;
            }
            case 7:{
                substep--;
                subStepSlider.value=substep;
                programCounter=4;
                break;
            }
            case 8:{
                step++;
                programCounter=0;
                break;
            }
            case 9:{
                step--;
                programCounter=1;
                break;
            }
            case 10:{
                break;
            }
            case 11:{
                break;
            }
            }

            if((programCounter&1)==1){}
            //handle vertexProgess and subStepSlider Change only when no reversed operation
            else if(mainStepSlider.value-1!=step){
                int val=(int)mainStepSlider.value;

                void Iterate(int _step,int change){
                    int v=toVertex[_step];
                    reverseMapping[v].GetComponent<SpriteRenderer>().color=shellColor[shells[v]];
                    List<int> neighbors=adjacencyList[v];
                    for(;neighborIndex<neighbors.Count;neighborIndex++){
                        int neighbor=neighbors[neighborIndex];
                        if(toSteps[neighbor].mainStep<_step){continue;}
                        degree[neighbor]+=change;
                    }
                    neighborIndex=0;
                }

                if(step<val){
                    for(int i=step;i<val;i++){
                        Iterate(i,-1);
                    }
                }else if(step>val){
                    int v=toVertex[step];
                    reverseMapping[v].GetComponent<SpriteRenderer>().color=unprocessedColor;
                    List<int> neighbors=adjacencyList[v];
                    for(;neighborIndex>=0;neighborIndex--){
                        int neighbor=neighbors[neighborIndex];
                        if(toSteps[neighbor].mainStep<step){continue;}
                        degree[neighbor]++;
                    }
                    for(int i=step-1;i>val;i--){
                        Iterate(i,1);
                    }
                }

                programCounter=0;
                step=val;
            }else if(subStepSlider.value!=substep){
                int val=(int)subStepSlider.value;
                List<int> neighbors=adjacencyList[currentVertex];
                
                if(substep<val){
                    do{
                        if(programCounter==4){
                            programCounter=6;
                        }else if(programCounter==6){
                            degree[neighbors[neighborIndex]]--;
                            neighborIndex++;
                            while(neighborIndex<neighbors.Count){
                                if(toSteps[neighbors[neighborIndex]].mainStep<step){
                                    neighborIndex++;
                                }else{
                                    break;
                                }
                            }
                            programCounter=4;
                        }
                        substep++;
                    }while(substep<val);

                    if(val==(toSteps[currentVertex].substep<<1)+1){
                        programCounter=6;
                    }
                }
                else if(substep>val){
                    do{
                        if(programCounter==4){
                            programCounter=6;
                        }else if(programCounter==6){
                            degree[neighbors[neighborIndex]]++;

                            neighborIndex--;
                            while(neighborIndex>=0){
                                if(toSteps[neighbors[neighborIndex]].mainStep<step){
                                    neighborIndex--;
                                }else{
                                    break;
                                }
                            }
                            programCounter=4;
                        }
                        substep--;
                    }while(substep>val);

                    if(val==1){
                        programCounter=0;
                    }
                }
            }
        }

        /*
        for(step=0;step<vertexNumber;step++){
            vertexProgress.value=step+1;

            currentVertex=toVertex[step];
            shell=shells[currentVertex];

            shellText.text=$"shell: {shell}";
            ancestorText.text=$"processing: {currentVertex}";
            reverseMapping[currentVertex].GetComponent<SpriteRenderer>().color=shellColor[shell];

            subStepSlider.minValue=1;
            subStepSlider.maxValue=(toSteps[currentVertex].substep<<1)+1;
            subStepSlider.value=1;
            yield return Wait();
            if(toSteps[currentVertex].substep==0){continue;}

            substep=1;
            for(neighborIndex=0;neighborIndex<adjacencyList[currentVertex].Count;neighborIndex++){
                int neighbor=adjacencyList[currentVertex][neighborIndex];
                if(toSteps[neighbor].mainStep<step){continue;}
                SetVisual(neighbor,Color.white);
                degree[neighbor]--;
                yield return Wait();
                SetVisual(neighbor,unprocessedColor);
                yield return Wait();
            }
        }
        */

        degree=null;
        _hasRan=true;
        CleanUp();
        GraphConstructor.instance.SetAllEdgeThinness(false);
        System.GC.Collect();
    }


    private void ConnectedComponentsInDifferentKShell(UnionFind union,int[] vertexKValue,in int MaxK){
        union.Flatten();
        int[] parent=union.parent;
        int[] depth=union.depth;
        int[] parentToIndexInCoreComponents=new int[parent.Length];
        int differentComponent=1;
        int kValue;

        _shellDiffentComponents=new ShellComponents[MaxK];
        for(int k=0;k<MaxK;k++){
            _shellDiffentComponents[k]=new ShellComponents(k);
        }
        _shellDiffentComponents[0].Add(new ConnectedComponent(0,0));
        
        for(int vertex=0;vertex<parent.Length;vertex++){
            if(depth[vertex]==0){//not parent
                parentToIndexInCoreComponents[vertex]=-1;
            }
            else{//parent, create a new connected component for it 
                kValue=vertexKValue[vertex];
                if(kValue==0) {}
                else {
                    ConnectedComponent connectedComponent=new ConnectedComponent(kValue,differentComponent);
                    connectedComponent.Add(vertex);//add the parent in to this connected component
                    
                    parentToIndexInCoreComponents[vertex]=_shellDiffentComponents[kValue].components.Count;//find the index of that connected component in all connected component with k value same as this parent
                    _shellDiffentComponents[kValue].Add(connectedComponent);
                    differentComponent++;
                }
            }
        }

        for(int vertex=0;vertex<parent.Length;vertex++){
            if(depth[vertex]==0){//either node has parent or isolated node
                int index=parentToIndexInCoreComponents[parent[vertex]];
                _shellDiffentComponents[vertexKValue[vertex]].components[index].Add(vertex);//find the connected component of its parent 
            }
            else{//depth[vertex]==1, parent node, ignore, all parent nodes have already added to connected component array
                if(vertexKValue[vertex]==0){//isolated node
                    _shellDiffentComponents[0].components[0].Add(vertex);
                }
            }
        }    
    }

    private void CleanUp(){
        _isRunning=false;
        forceNextStep=false;
        UIController.instance.OnAlgoEnd();
        GraphConstructor.instance.UpdateAllEdges(UIController.instance.HideEdge());
    }


    /*
     *reference:https://web.ntnu.edu.tw/~algo/ConvexHull.html
     *Andrew's Monotone Chain
    */
    private static class ConvexHull {
        private static List<Transform> vertice=new List<Transform>();
        private static List<Vector2> bounds=new List<Vector2>();

        private struct Comparator:IComparer<Transform> {
            public int Compare(Transform a, Transform b) {
                Vector2 posA=a.position,posB=b.position;
                if(Mathf.Approximately(posA.x,posB.x)) {
                    if(Mathf.Approximately(posA.y,posB.y)) {
                        return 0;
                    }else if(posA.y < posB.y) {
                        return -1;
                    }else if(posA.y > posB.y) {
                        return 1;
                    }else{
                        return 0;
                    }
                }else if(posA.x < posB.x) {
                    return -1;
                }else if(posA.x > posB.x) {
                    return 1;
                }else{
                    return 0;
                }
            }
        }

        private static float Cross(Vector2 o,Vector2 a,Vector2 b) {
            return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
        }

        public static Vector2[] Solve(ConnectedComponent component,GameObject[] mapping) {
            vertice.Clear();
            bounds.Clear();
            for(int i = 0;i<component.Count;i++) {
                vertice.Add(mapping[component[i]].transform);
            }
            vertice.Sort(new Comparator());

            if(component.Count<4) {
                for(int i = 0;i<component.Count;i++) {
                    bounds.Add(vertice[i].position);
                }
                return bounds.ToArray();
            }
            int m=0,t;

            for(int i = 0;i<vertice.Count;i++) {
                while(m>1&&Cross(bounds[m-2],bounds[m-1],vertice[i].position)<=0) {//check if last two point and a new coming point is rotated anticlockwise
                    m--;
                }

                if(m>=bounds.Count) {
                    bounds.Add(vertice[i].position);
                    m=bounds.Count;
                }
                else {
                    bounds[m++]=vertice[i].position;
                }
            }
            //----->

            t=m;//the rightmost point at index=m
            for(int i = vertice.Count-2;i>=0;i--) {//skip the rightmost point
                while(m>t&&Cross(bounds[m-2],bounds[m-1],vertice[i].position)<=0) {//check if last two point and a new coming point is rotated anticlockwise
                    m--;
                }

                if(m>=bounds.Count) {
                    bounds.Add(vertice[i].position);
                    m=bounds.Count;
                }
                else {
                    bounds[m++]=vertice[i].position;
                }
            }
            //<-----

            m--;
            Vector2[] result=new Vector2[m];
            for(int i = 0;i<m;i++) {
                result[i]=bounds[i];
            }
            //Debug.Log($"end with {m}");
            return result;
        }


        public static Mesh CreateMesh(Vector2[] polygon,Color32 color){
            if(polygon.Length<3){return null;}
            Mesh mesh=new Mesh();
            Vector3[] vertices=new Vector3[polygon.Length],normals=new Vector3[polygon.Length];
            Vector2[] uv=new Vector2[polygon.Length];
            for(int i=0;i<polygon.Length;++i){
                vertices[i].x=polygon[i].x;
                vertices[i].y=polygon[i].y;
                vertices[i].z=0;
                normals[i]=-Vector3.forward;
                uv[i]=Vector2.one;
            }
            mesh.vertices=vertices;
            mesh.normals=normals;
            uv[0]=Vector2.zero;
            mesh.uv=uv;
            
            Color32[] colors32=new Color32[polygon.Length];
            for(int i=0;i<polygon.Length;++i){
                colors32[i]=color;
            }
            mesh.colors32=colors32;

            Debug.Assert(3 * (polygon.Length-2)>0&&3 * (polygon.Length-2)<3000);

            int[] triangles=new int[3 * (polygon.Length-2)];
            for(int i=0,j=0;i<vertices.Length-2;++i,++j){
                triangles[3*j]=0;
                triangles[3*j+1]=i+2;
                triangles[3*j+2]=i+1;
            }
            mesh.triangles=triangles;
            return mesh;
        }
    }


    public void GenerateBoundary(){
        for(int k = 0;k<shellDiffentComponents.Length;++k) {
            for(int c = 0;c<shellDiffentComponents[k].components.Count;++c) {
                //find all convex hull of differen connected componet of differenk k value
                shellDiffentComponents[k].components[c].bounds=ConvexHull.Solve(shellDiffentComponents[k].components[c],GraphConstructor.instance.ReverseMapping);
            }
        }
    }
    

    public void ClearMeshes(){
        foreach(ShellComponents sc in shellDiffentComponents){
            foreach(ConnectedComponent cc in sc.components){
                if(cc.areaMesh==null){continue;}
                Destroy(cc.areaMesh);
                cc.areaMesh=null;
            }
        }
    }


    public ShellComponents[] GenerateMeshes(){
        for(int shell=1;shell<shellDiffentComponents.Length;++shell){
            ShellComponents sc=shellDiffentComponents[shell];
            foreach(ConnectedComponent cc in sc.components){
                cc.bounds=ConvexHull.Solve(cc,GraphConstructor.instance.ReverseMapping);
                Color32 color=shellColor[shell];
                color.a=(byte)(0.1*255);
                cc.areaMesh=ConvexHull.CreateMesh(cc.bounds,color);
            }
        }

        return shellDiffentComponents;
    }


    public void CloseAlgoDetail(){
        algoDetail.Set(false);
    }

    public void OnToggleProgessPanel(){
        progressPanel.SetActive(progressPanelButton.Toggle());
    }

    public void OnToggleStatusPanel(){
        statusBoard.SetActive(statusPanelButton.Toggle());
    }

    public void OnAlgoDetail(){
        algoDetail.Toggle();
        UIController.instance.CloseAllDetails();
    }


    private void OnSmallChange(int val){
        int value=int.Parse(smallSelect.options[val].text);
        if(showShellRange.x==value){
            return;
        }
        else if(showShellRange.y<value){
            showShellRange.y=shellDiffentComponents.Length-1;
        }
        showShellRange.x=value;

        largeSelect.ClearOptions();
        for(int i=showShellRange.x;i<shellDiffentComponents.Length;++i){
            largeSelect.options.Add(new TMP_Dropdown.OptionData($"{i}",null));
        }
        Debug.Log($"set {showShellRange.y-showShellRange.x}");
        largeSelect.SetValueWithoutNotify(showShellRange.y-showShellRange.x);
    }


    private void OnLargeChange(int val){
        int value=int.Parse(largeSelect.options[val].text);
        if(showShellRange.y==value){
            return;
        }
        else if(showShellRange.x>value){
            showShellRange.x=0;
        }
        showShellRange.y=value;

        smallSelect.ClearOptions();
        for(int i=0;i<=showShellRange.y;++i){
            smallSelect.options.Add(new TMP_Dropdown.OptionData($"{i}",null));
        }
        smallSelect.SetValueWithoutNotify(showShellRange.x);
    }
}