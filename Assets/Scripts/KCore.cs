using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using TMPro;
using System.Reflection;
using System.Runtime.CompilerServices;

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


    private static Color UnprocessedColor;
    private static Color[] CoreColor;

    private const int MaximumDegree=7;

    [SerializeField]private TextMeshProUGUI messageText;

    private Coroutine runningKCore=null;
    private bool isRunning=false;
    private bool stopRunning=false;

    static KCore(){
        UnprocessedColor=new Color(1,1,1,0.2f);
        CoreColor=new Color[MaximumDegree];
        for(int i=0;i<MaximumDegree;i++){
            CoreColor[i]=Color.HSVToRGB(i/(float)MaximumDegree,1,1);
        }
    }

    private class ConnectedComponent{
        public List<int> vertice;
        public Vector2[] bounds;
        public int kValue;
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
        }

        public void Add(int v){
            vertice.Add(v);
        }
    }

    private class CoreComponents{
        public List<ConnectedComponent> components;
        public readonly int k;
        public CoreComponents(int k){
            this.k=k;
            components=new List<ConnectedComponent>();
        }
        public void Add(ConnectedComponent g){
            components.Add(g);
        }
    }

    private CoreComponents[] coreDiffentComponents;

    void Awake() {
        _instance=this;
        coreDiffentComponents=null;
    }

    void OnDrawGizmos() {
        if(Application.isPlaying==true&&coreDiffentComponents!=null) {
            Gizmos.color=Color.yellow;
            for(int i = 0;i<coreDiffentComponents.Length;i++) {
                for(int j = 0;j<coreDiffentComponents[i].components.Count;j++) {
                    ConnectedComponent component = coreDiffentComponents[i].components[j];
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


    public void PauseRunning(){
        stopRunning=true;
        if(stopRunning){
            messageText.text="pause";
        }
        else{
            messageText.text="start running";
        }
    }

    public void ResumeRunning(){
        stopRunning=false;
    }

    public void StartRunning(){
        if(isRunning){
            StopCoroutine(runningKCore);
        }
        else{
            isRunning=true;
        }
        coreDiffentComponents=null;
        messageText.text="start running";
        runningKCore=StartCoroutine(RunKCore_());
    }

    public void StopRunning(){
        if(isRunning){
            StopCoroutine(runningKCore);
            isRunning=false;
            messageText.text="";
        }
        else{
            messageText.text="no algorithm is running";
        }
    }

    /*
    #if NAIVE
    public IEnumerator RunKCore(){
        Dictionary<GameObject,int> mapping=constructor.Mapping;
        GameObject[] reverseMapping=constructor.ReverseMapping;
        int vertexNumber=constructor.VertexNumber;
        List<int>[] adjacencyList=constructor.AdjacencyList;

        MinHeap pq=new MinHeap(vertexNumber);
        int i,k=0;

        for(i=0;i<vertexNumber;i++){
            pq.Enqueue(i,adjacencyList[i].Count);
            reverseMapping[i].GetComponent<SpriteRenderer>().color=UnprocessedColor;
        }
        /*
        Debug.Log(pq.Values[0]);
        for(i=1;i<pq.Count;i++){
            Debug.Log(pq.Values[i]+$" is larger than or equal to parent {pq.Values[i]>=pq.Values[(i-1)/2]}");
        }Debug.Log("start");
        //pq.Show();
        yield return new WaitForSeconds(showTime);

        while(true){
            while(stopRunning==true){yield return null;}
            if(pq.Count>0&&pq.MinValue>=MaximumDegree){
                messageText.text="degree is too high...";
                break;
            }
            else{
                if(pq.Count<=0){
                    messageText.text="finish";
                    break;
                }
                else{
                    for(;pq.MinValue>k;k++){}//set current k value
                }
            }
            
            //Debug.Log(pq.Items[0]+" "+pq.Values[0]);
            int vertex=pq.Dequeue();//get the vertex of lowest degree

            //Debug.Log("parent="+reverseMapping[vertex].name);
            reverseMapping[vertex].GetComponent<SpriteRenderer>().color=CoreColor[k];//set color
            yield return new WaitForSeconds(showTime);

            for(i=0;i<adjacencyList[vertex].Count;i++){
                int neighbour=adjacencyList[vertex][i];
                //Debug.Log(reverseMapping[neighbour].name);
                if(!pq.DecreaseValueOfItem(neighbour,1)){continue;}

                reverseMapping[neighbour].GetComponent<SpriteRenderer>().color=Color.white;
                yield return new WaitForSeconds(showTime);
                reverseMapping[neighbour].GetComponent<SpriteRenderer>().color=UnprocessedColor;
                while(stopRunning==true){yield return null;}

            }//decrease all unprocessed neighbours' degree by one
            yield return new WaitForSeconds(showTime/2);
        }
        isRunning=false;
    }
    #else
    
    public IEnumerator RunKCore(){
        Dictionary<GameObject,int> mapping=constructor.Mapping;
        GameObject[] reverseMapping=constructor.ReverseMapping;
        int vertexNumber=constructor.VertexNumber;
        List<int>[] adjacencyList=constructor.AdjacencyList;

        int i,currentK;
        int minimumNextK;
        int[,] group=new int[2,vertexNumber];
        int group0Count=0,group1Count=0;
        //group[0] for storing the vertex which have degree<=k
        //group[1] for storing the vertex which have degree>k

        int[] getIndex=new int[vertexNumber];
        int[] degree=new int[vertexNumber];
        int[] vertexKValue=new int[vertexNumber];
        UnionFind union=new UnionFind(vertexNumber);


        Action<int> moveDown=(vertex)=>{
            group1Count--;
            int index=getIndex[vertex];
            int tailVertex=group[1,group1Count];
            group[1,index]=tailVertex;
            getIndex[tailVertex]=index;
            
            getIndex[vertex]=-1;
            group[0,group0Count++]=vertex;
        };

        minimumNextK=int.MaxValue;
        currentK=0;
        for(int vertex=0;vertex<vertexNumber;vertex++){     
            degree[vertex]=adjacencyList[vertex].Count;
            if(degree[vertex]<=currentK){
                //at first, no vertex can affect those vertice have zero degree
                group[0,group0Count++]=vertex;
                getIndex[vertex]=-1;
            }
            else{
                getIndex[vertex]=group1Count;
                group[1,group1Count++]=vertex;
                minimumNextK=degree[vertex]<minimumNextK?degree[vertex]:minimumNextK;
            }
            reverseMapping[vertex].GetComponent<SpriteRenderer>().color=UnprocessedColor;
        }

        if(group0Count==0){
            currentK=minimumNextK;
        }

        for(int unprocessed=vertexNumber;true;){
            while(stopRunning==true){yield return null;}

            while(group0Count>0){
                group0Count--;
                int vertex=group[0,group0Count];
                vertexKValue[vertex]=currentK;
                degree[vertex]=-1;

                unprocessed--;
                reverseMapping[vertex].GetComponent<SpriteRenderer>().color=CoreColor[currentK];
                yield return new WaitForSeconds(showTime/2);

                for(i=0;i<adjacencyList[vertex].Count;i++){
                    int neighbor=adjacencyList[vertex][i];
                    if(degree[neighbor]<=0){
                        if(vertexKValue[neighbor]==currentK) {
                            union.Union(neighbor,vertex);
                        }
                        continue;
                    }
                    degree[neighbor]--;

                    if(degree[neighbor]<=currentK){//getIndex[neighbor]<0 means its already in group0, no need to moveDown again
                        if(getIndex[neighbor]>=0) {
                            moveDown(neighbor);
                        }
                        //union.Union(neighbor,vertex);//the neighbor and vertex are belong to same connected component
                    }
                    else{
                        minimumNextK=degree[neighbor]<minimumNextK?degree[neighbor]:minimumNextK;
                    }

                    reverseMapping[neighbor].GetComponent<SpriteRenderer>().color=Color.white;
                    yield return new WaitForSeconds(showTime);
                    reverseMapping[neighbor].GetComponent<SpriteRenderer>().color=UnprocessedColor;

                    while(stopRunning==true){yield return null;}
                }
            }

            if(unprocessed<=0){
                break;
            }

            currentK=minimumNextK;
            minimumNextK=currentK+1;
            if(currentK>=MaximumDegree){
                messageText.text="degree is too high...";
                break;
            }

            //find those vertex in group1 has degree<=k
            for(i=0;i<group1Count;){
                int vertex=group[1,i];
                if(degree[vertex]>=0&&degree[vertex]<=currentK){
                    moveDown(vertex);
                }
                else{
                    i++;
                }
                while(stopRunning==true){yield return null;}
            }

            yield return new WaitForSeconds(showTime/2);
        }

        ConnectedComponentsInDifferentKValue(union,vertexKValue,currentK+1);

        messageText.text="finish";
        isRunning=false;
        System.GC.Collect();
    }
    */

    private IEnumerator RunKCore_() {
        Dictionary<GameObject,int> mapping=GraphConstructor.instance.Mapping;
        GameObject[] reverseMapping=GraphConstructor.instance.ReverseMapping;
        List<int>[] adjacencyList=GraphConstructor.instance.AdjacencyList;
        int vertexNumber=adjacencyList.Length;

        int i,currentK;
        int minimumNextK;
        SparseSet[] candiates=new SparseSet[2];
        candiates[0]=new SparseSet(vertexNumber);
        candiates[1]=new SparseSet(vertexNumber);
        //candiates[0] for storing the vertex which have degree<=k
        //candiates[1] for storing the vertex which have degree>k

        int[] degree=new int[vertexNumber];
        int[] vertexKValue=new int[vertexNumber];
        UnionFind union=new UnionFind(vertexNumber);

        currentK=0;
        for(int vertex=0;vertex<vertexNumber;vertex++){
            degree[vertex]=adjacencyList[vertex].Count;//find the degree of each vertex
            currentK=degree[vertex]<currentK?degree[vertex]:currentK;
            if(degree[vertex]<=currentK){
                //at first, no vertex can affect those vertice have zero degree
                candiates[0].Add(vertex);
            }
            else{
                candiates[1].Add(vertex);
            }
            reverseMapping[vertex].GetComponent<SpriteRenderer>().color=UnprocessedColor;
        }
        minimumNextK=currentK+1;

        for(int unprocessed=vertexNumber;true;){
            while(stopRunning==true){yield return null;}

            while(candiates[0].TryRemoveLast(out int vertex)){//get one vertex in first list
                vertexKValue[vertex]=currentK;
                degree[vertex]=-1;

                unprocessed--;
                reverseMapping[vertex].GetComponent<SpriteRenderer>().color=CoreColor[currentK];
                yield return new WaitForSeconds(UIController.instance.animationSpeed);

                for(i=0;i<adjacencyList[vertex].Count;i++){//process all its neighbor (decrement their degree)
                    int neighbor=adjacencyList[vertex][i];
                    if(degree[neighbor]<=0){//an already processed vertex
                        if(vertexKValue[neighbor]==currentK) {//check if the k value same as vertex itself, if yes, union
                            union.Union(neighbor,vertex);
                        }
                        continue;
                    }
                    degree[neighbor]--;

                    if(degree[neighbor]<=currentK){//getIndex[neighbor]<0 means its already in group0, no need to moveDown again
                        if(candiates[1].Remove(neighbor)){
                            candiates[0].Add(neighbor);
                        }
                    }
                    else{
                        minimumNextK=degree[neighbor]<minimumNextK?degree[neighbor]:minimumNextK;
                    }

                    reverseMapping[neighbor].GetComponent<SpriteRenderer>().color=Color.white;
                    yield return new WaitForSeconds(UIController.instance.animationSpeed);
                    reverseMapping[neighbor].GetComponent<SpriteRenderer>().color=UnprocessedColor;

                    while(stopRunning==true){yield return null;}
                }
            }

            if(unprocessed<=0){
                break;
            }

            currentK=minimumNextK;
            minimumNextK=currentK+1;
            if(currentK>=MaximumDegree){
                messageText.text="degree is too high...";
                break;
            }

            //find those vertex in group1 has degree<=k
            for(i=0;i<candiates[1].count;){
                int vertex = candiates[1].dense[i];
                if(degree[vertex]>=0&&degree[vertex]<=currentK){
                    candiates[1].Remove(vertex);
                    candiates[0].Add(vertex);
                }
                else{
                    i++;
                }
            }

            yield return new WaitForSeconds(UIController.instance.animationSpeed);
        }

        ConnectedComponentsInDifferentKValue(union,vertexKValue,currentK+1);

        messageText.text="finish";
        isRunning=false;
        candiates[0].Dispose();
        candiates[1].Dispose();
        vertexKValue=null;
        degree=null;
        union=null;
        System.GC.Collect();
    }

    private void ConnectedComponentsInDifferentKValue(UnionFind union,int[] vertexKValue,in int MaxK){
        /*
        Debug.Log("Before:");
        for(int i = 0;i<union.parent.Length;i++) {
            Debug.Log($"V:{i}  its p:{union.parent[i]}");
        }
        */
        union.Flatten();
        int[] parent=union.parent;
        int[] depth=union.depth;
        int[] parentToIndexInCoreComponents=new int[parent.Length];
        int differentComponent=1;
        int kValue;

        coreDiffentComponents=new CoreComponents[MaxK];
        for(int k=0;k<MaxK;k++){
            coreDiffentComponents[k]=new CoreComponents(k);
        }
        coreDiffentComponents[0].Add(new ConnectedComponent(0,0));

        /*
        Debug.Log("After:");
        for(int i = 0;i<parent.Length;i++) {
            Debug.Log($"V:{i}  its p:{parent[i]}  k value:{vertexKValue[i]}");
        }
        */
        
        for(int vertex=0;vertex<parent.Length;vertex++){
            if(depth[vertex]==0){//not parent
                parentToIndexInCoreComponents[vertex]=-1;
            }
            else{//parent, create a new connected component for it 
                kValue=vertexKValue[vertex];
                if(kValue==0) {
                }
                else {
                    ConnectedComponent connectedComponent=new ConnectedComponent(kValue,differentComponent);
                    connectedComponent.Add(vertex);//add the parent in to this connected component
                    
                    parentToIndexInCoreComponents[vertex]=coreDiffentComponents[kValue].components.Count;//find the index of that connected component in all connected component with k value same as this parent
                    coreDiffentComponents[kValue].Add(connectedComponent);
                    differentComponent++;
                }
            }
        }

        for(int vertex=0;vertex<parent.Length;vertex++){
            if(depth[vertex]==0){//either node has parent or isolated node
                int index=parentToIndexInCoreComponents[parent[vertex]];
                coreDiffentComponents[vertexKValue[vertex]].components[index].Add(vertex);//find the connected component of its parent 
            }
            else{//depth[vertex]==1, parent node, ignore, all parent nodes have already added to connected component array
                if(vertexKValue[vertex]==0){//isolated node
                    coreDiffentComponents[0].components[0].Add(vertex);
                }
            }
        }

        for(int k = 0;k<coreDiffentComponents.Length;++k) {
            for(int c = 0;c<coreDiffentComponents[k].components.Count;++c) {
                //find all convex hull of differen connected componet of differenk k value
                coreDiffentComponents[k].components[c].bounds=ConvexHull.Solve(coreDiffentComponents[k].components[c],GraphConstructor.instance.ReverseMapping);
            }
        }
    }


    /*
     *reference:https://web.ntnu.edu.tw/~algo/ConvexHull.html
     *Andrew's Monotone Chain
     *
     */
    private static class ConvexHull {
        private static List<Transform> vertice=new List<Transform>();
        private static List<Vector2> bounds=new List<Vector2>();

        private class Comparator:IComparer<Transform> {
            public int Compare(Transform a, Transform b) {
                Vector2 posA=a.position,posB=b.position;
                if(Mathf.Approximately(posA.x,posB.x)) {
                    if(Mathf.Approximately(posA.y,posB.y)) {
                        return 0;
                    }
                    else if(posA.y < posB.y) {
                        return -1;
                    }
                    else if(posA.y > posB.y) {
                        return 1;
                    }
                }
                else if(posA.x < posB.x) {
                    return -1;
                }
                else if(posA.x > posB.x) {
                    return 1;
                }

                return 123456789;
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
            /*
            for(int i = 0;i<component.Count;i++) {
                Debug.Log(vertice[i].position);
            }
            */

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
            Debug.Log($"end with {m}");
            return result;
        }
    
    }
}