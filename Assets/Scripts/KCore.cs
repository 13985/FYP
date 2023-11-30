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

    private const int MaximumDegree=17;

    [SerializeField]private TextMeshProUGUI messageText;

    [Header("showing status")]
    [SerializeField]private GameObject statusBoard;
    [SerializeField]private Button closeStatusBoardButton;
    [SerializeField]private TextMeshProUGUI ancestorText,descendantText,shellText;

    private Coroutine runningKCore=null;
    private bool _isRunning=false;
    public bool isRunning{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{return _isRunning;}
    }
    private bool stopRunning=false;
    private bool forceNextStep=false;

    static KCore(){
        UnprocessedColor=new Color(1,1,1,0.2f);
        CoreColor=new Color[MaximumDegree];
        for(int i=0;i<MaximumDegree;i++){
            CoreColor[i]=Color.HSVToRGB(i/(float)MaximumDegree,1,1);
        }
    }

    public class ConnectedComponent{
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

    public class CoreComponents{
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

    private CoreComponents[] shellDiffentComponents;

    void Awake() {
        _instance=this;
        shellDiffentComponents=null;
        statusBoard.SetActive(false);
    }

    void OnDrawGizmos() {
        if(Application.isPlaying==true&&shellDiffentComponents!=null) {
            Gizmos.color=Color.yellow;
            for(int i = 0;i<shellDiffentComponents.Length;i++) {
                for(int j = 0;j<shellDiffentComponents[i].components.Count;j++) {
                    ConnectedComponent component = shellDiffentComponents[i].components[j];
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
        if(_isRunning){
            return;
            //StopCoroutine(runningKCore);
        }
        else{
            _isRunning=true;
        }
        shellDiffentComponents=null;
        statusBoard.SetActive(true);
        GraphConstructor.instance.UpdateAllEdges(true);
        runningKCore=StartCoroutine(RunKCore());
    }

    public void StopRunning(){
        if(_isRunning){
            StopCoroutine(runningKCore);
            CleanUp();
            _isRunning=false;
            statusBoard.SetActive(false);
        }
        else{
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void ForceNextStep(){
        forceNextStep=true;
    }


    //return the k-shell of each vertex and each connected component in each shell
    public CoreComponents[] RunKCore(out int[] vertexKValue){
        List<int>[] adjacencyList=GraphConstructor.instance.AdjacencyList;
        int vertexNumber=adjacencyList.Length;

        int currentK,minimumNextK;
        SparseSet[] candiates=new SparseSet[2];
        candiates[0]=new SparseSet(vertexNumber);
        candiates[1]=new SparseSet(vertexNumber);
        //candiates[0] for storing the vertex which have degree<=k
        //candiates[1] for storing the vertex which have degree>k

        int[] degree=new int[vertexNumber];
        vertexKValue=new int[vertexNumber];
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
        }
        minimumNextK=currentK+1;

        for(int unprocessed=vertexNumber;true;){
            while(candiates[0].TryRemoveLast(out int vertex)){//get one vertex in first list
                vertexKValue[vertex]=currentK;
                degree[vertex]=-1;
                unprocessed--;

                for(int i=0;i<adjacencyList[vertex].Count;i++){//process all its neighbor (decrement their degree)
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
                }
            }

            if(unprocessed<=0){
                break;
            }

            currentK=minimumNextK;
            minimumNextK=currentK+1;
            if(currentK>=MaximumDegree){
                break;
            }

            //find those vertex in group1 has degree<=k
            for(int i=0;i<candiates[1].count;){
                int vertex = candiates[1].dense[i];
                if(degree[vertex]>=0&&degree[vertex]<=currentK){
                    candiates[1].Remove(vertex);
                    candiates[0].Add(vertex);
                }
                else{
                    i++;
                }
            }
        }
        candiates[0].Dispose();
        candiates[1].Dispose();
        degree=null;

        ConnectedComponentsInDifferentKShell(union,vertexKValue,currentK+1);
        union=null;
        System.GC.Collect();
        return shellDiffentComponents;
    }


    private IEnumerator RunKCore() {
        closeStatusBoardButton.gameObject.SetActive(false);

        Dictionary<GameObject,int> mapping=GraphConstructor.instance.Mapping;
        GameObject[] reverseMapping=GraphConstructor.instance.ReverseMapping;
        List<int>[] adjacencyList=GraphConstructor.instance.AdjacencyList;
        int vertexNumber=adjacencyList.Length;

        int currentK,minimumNextK;
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
            shellText.text=$"shell: {currentK}";
            while(forceNextStep==false&&stopRunning==true){yield return null;}
            forceNextStep=false;

            while(candiates[0].TryRemoveLast(out int vertex)){//get one vertex in first list
                ancestorText.text=$"processing: {vertex}";
                GraphConstructor.instance.ShowEdgesOfVertex(vertex);

                vertexKValue[vertex]=currentK;
                degree[vertex]=-1;

                unprocessed--;
                reverseMapping[vertex].GetComponent<SpriteRenderer>().color=CoreColor[currentK];
                if(forceNextStep==false){
                    yield return new WaitForSeconds(UIController.instance.animationSpeed);
                    while(forceNextStep==false&&stopRunning==true){yield return null;}
                }
                forceNextStep=false;

                for(int i=0;i<adjacencyList[vertex].Count;i++){//process all its neighbor (decrement their degree)
                    int neighbor=adjacencyList[vertex][i];
                    if(degree[neighbor]<=0){//an already processed vertex
                        if(vertexKValue[neighbor]==currentK) {//check if the k value same as vertex itself, if yes, union
                            union.Union(neighbor,vertex);
                        }
                        continue;
                    }

                    reverseMapping[neighbor].GetComponent<SpriteRenderer>().color=Color.white;
                    descendantText.text=$"neighbor: {neighbor}\ndegree: {degree[neighbor]}";
                    if(forceNextStep==false){
                        yield return new WaitForSeconds(UIController.instance.animationSpeed);
                        while(forceNextStep==false&&stopRunning==true){yield return null;}
                    }
                    forceNextStep=false;

                    degree[neighbor]--;

                    if(degree[neighbor]<=currentK){//getIndex[neighbor]<0 means its already in group0, no need to moveDown again
                        if(candiates[1].Remove(neighbor)){
                            candiates[0].Add(neighbor);
                        }
                    }
                    else{
                        minimumNextK=degree[neighbor]<minimumNextK?degree[neighbor]:minimumNextK;
                    }

                    reverseMapping[neighbor].GetComponent<SpriteRenderer>().color=UnprocessedColor;
                    descendantText.text=$"neighbor: {neighbor}\ndegree: {degree[neighbor]}";
                    if(forceNextStep==false){
                        yield return new WaitForSeconds(UIController.instance.animationSpeed);
                        while(forceNextStep==false&&stopRunning==true){yield return null;}
                    }
                    forceNextStep=false;
                }
                GraphConstructor.instance.HideEdgesOfVertex(vertex);
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
            for(int i=0;i<candiates[1].count;){
                int vertex = candiates[1].dense[i];
                if(degree[vertex]>=0&&degree[vertex]<=currentK){
                    candiates[1].Remove(vertex);
                    candiates[0].Add(vertex);
                }
                else{
                    i++;
                }
            }

            if(forceNextStep==false){
                yield return new WaitForSeconds(UIController.instance.animationSpeed);
            }
            forceNextStep=false;
        }

        candiates[0].Dispose();
        candiates[1].Dispose();
        degree=null;

        ConnectedComponentsInDifferentKShell(union,vertexKValue,currentK+1);
        vertexKValue=null;
        union=null;
        _isRunning=false;
        forceNextStep=false;
        messageText.text="finish";

        CleanUp();
        System.GC.Collect();
    }

    private void ConnectedComponentsInDifferentKShell(UnionFind union,int[] vertexKValue,in int MaxK){
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

        shellDiffentComponents=new CoreComponents[MaxK];
        for(int k=0;k<MaxK;k++){
            shellDiffentComponents[k]=new CoreComponents(k);
        }
        shellDiffentComponents[0].Add(new ConnectedComponent(0,0));

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
                    
                    parentToIndexInCoreComponents[vertex]=shellDiffentComponents[kValue].components.Count;//find the index of that connected component in all connected component with k value same as this parent
                    shellDiffentComponents[kValue].Add(connectedComponent);
                    differentComponent++;
                }
            }
        }

        for(int vertex=0;vertex<parent.Length;vertex++){
            if(depth[vertex]==0){//either node has parent or isolated node
                int index=parentToIndexInCoreComponents[parent[vertex]];
                shellDiffentComponents[vertexKValue[vertex]].components[index].Add(vertex);//find the connected component of its parent 
            }
            else{//depth[vertex]==1, parent node, ignore, all parent nodes have already added to connected component array
                if(vertexKValue[vertex]==0){//isolated node
                    shellDiffentComponents[0].components[0].Add(vertex);
                }
            }
        }

        for(int k = 0;k<shellDiffentComponents.Length;++k) {
            for(int c = 0;c<shellDiffentComponents[k].components.Count;++c) {
                //find all convex hull of differen connected componet of differenk k value
                shellDiffentComponents[k].components[c].bounds=ConvexHull.Solve(shellDiffentComponents[k].components[c],GraphConstructor.instance.ReverseMapping);
            }
        }
    }

    private void CleanUp(){
        closeStatusBoardButton.gameObject.SetActive(true);
        UIController.instance.OnAlgorithmEnd();
        GraphConstructor.instance.UpdateAllEdges(UIController.instance.HideEdge());
    }

    /*
     *reference:https://web.ntnu.edu.tw/~algo/ConvexHull.html
     *Andrew's Monotone Chain
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
            //Debug.Log($"end with {m}");
            return result;
        }
    }

    public void OnCloseStausBoardPressed(){
        statusBoard.SetActive(false);
    }
}