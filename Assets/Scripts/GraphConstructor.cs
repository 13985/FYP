using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Runtime.CompilerServices;
using System.IO;
using System.Threading.Tasks;
using System.Diagnostics;

using UnityEngine;
using UnityEditor;
using TMPro;

using Unity.Mathematics;
using Unity.Burst;
using Unity.Collections;
using Unity.Collections.LowLevel.Unsafe;
using Unity.Jobs;

using DotNetGraph.Core;
using DotNetGraph.Compilation;
using DotNetGraph.Extensions;

using Debug=UnityEngine.Debug;

public struct SparseSet{
    public int[] dense{get;private set;}
    public int[] sparse{get;private set;}
    public int count{get;private set;}
    public int maxID {
        get {
            return sparse.Length;
        }
    }
    public int capacity {
        get {
            return dense.Length;
        }
    }

    public SparseSet(int capacity){
        dense=new int[capacity];
        sparse=new int[capacity];
        count=0;
        for(int i=0;i<capacity;i++){
            sparse[i]=-1;
        }
    }

    public bool Remove(int id){
        if(id<0||id>=sparse.Length||sparse[id]<0){
            return false;
        }
        count--;
        int lastOne=dense[count];
        int idx = sparse[id];
        dense[idx]=lastOne;
        sparse[lastOne]=idx;
        sparse[id]=-1;
        return true;
    }

    public int RemoveLast() {
        count--;
        int retValue = dense[count];
        sparse[retValue]=-1;
        return retValue;
    }

    public bool TryRemoveLast(out int x) {
        if(count<=0) {
            x=0;
            return false;
        }
        else {
            count--;
            x=dense[count];
            sparse[x]=-1;
            return true;
        }
    }

    public bool Add(int id){
        if(id<0||id>=sparse.Length||sparse[id]>=0){
            return false;
        }
        dense[count]=id;
        sparse[id]=count;
        count++;
        return true;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public bool Contain(int id) {
        return sparse[id]>=0;
    }

    public void Dispose() {
        dense=null;sparse=null;
    }
}


public class MinHeap{
    private int count;
    public int Count{get{return count;}}
    private int[] values;
    public int[] Values{get{return values;}}
    private int[] items;
    public int[] Items{get{return items;}}
    private Dictionary<int,int> lookup;
    //item to position in heap
    public MinHeap(int length=100){
        values=new int[length];
        items=new int[length];
        count=0;
        lookup=new Dictionary<int,int>(length*2);
    }

    public int MinValue{get{return Values[0];}}

    public bool Enqueue(int _item,int _value){
        /*
        Debug.Log($"add {_item} {_value}");
        Debug.Log("items in lookup");
        foreach(KeyValuePair<int,int> a in lookup){
            Debug.Log($"{a.Key} {a.Value}");
        }
        */
        if(lookup.ContainsKey(_item)){
            //Debug.Log("item found");
            return false;
        }
        else{
            items[count]=_item;
            values[count]=_value;
            lookup.Add(_item,count);
            PropagateUp(count);
            count++;
            return true;
        }
    }

    public int Dequeue(){
        int ret=items[0];
        /*
        if(lookup.Remove(ret)==false)
            Debug.Log($"cannot remove {ret}");
        else
            Debug.Log($"remove {ret}");
        Debug.Log("items in lookup");
        foreach(KeyValuePair<int,int> a in lookup){
            Debug.Log($"{a.Key} {a.Value}");
        }
        */
        count--;
        if(count<=0){
            count=0;
            return ret;
        }
        lookup[items[count]]=0;
        items[0]=items[count];
        values[0]=values[count];

        int now,i=0,le=1,ri;
        while(le<count){
            now=i;
            ri=le+1;
            if(values[le]<values[now]){now=le;}
            if(ri<count&&values[ri]<values[now]){now=ri;}

            if(now==i){break;}
            else{
                lookup[items[now]]=i;
                lookup[items[i]]=now;

                int a=items[now];
                int b=values[now];
                items[now]=items[i];
                values[now]=values[i];
                items[i]=a;
                values[i]=b;

                i=now;
                le=(i*2)+1;
            }
        }
        return ret;
    }

    public bool DecreaseValueOfItem(int _item,int change){
        int pos;
        if(lookup.TryGetValue(_item,out pos)){
            values[pos]-=Mathf.Abs(change);
            PropagateUp(pos);
            return true;
        }
        else{
            return false;
        }
    }


    private void PropagateUp(int now){
        int par=(now-1)/2;
        while(values[now]<values[par]){
            lookup[items[par]]=now;
            lookup[items[now]]=par;

            int a=items[now];
            int b=values[now];
            items[now]=items[par];
            values[now]=values[par];
            items[par]=a;
            values[par]=b;
            
            now=par;
            par=(now-1)/2;
        }
    }    
}


public sealed class GraphConstructor:MonoBehaviour{
    public const int MaximumVertexNumber=10000;
    public static GraphConstructor instance {get;private set;}
    public bool showEdge;

    [SerializeField]private Camera cam;
    [SerializeField]private TMP_InputField parentInput,childrenInput;

    private Dictionary<GameObject,int> mapping;//GameObject->vertex index in matrix
    public Dictionary<GameObject,int> Mapping{get{return mapping;}}

    private GameObject[] reverseMapping;//vertex index in this array->GameObject;
    public GameObject[] ReverseMapping{get{return reverseMapping;}}

    private bool[,] adjacencyMatrix;
    public bool[,] AdjacencyMatrix{get{return adjacencyMatrix;}}

    private List<int>[] adjacencyList;
    public List<int>[] AdjacencyList{get{return adjacencyList;}}

    [SerializeField]private int vertexNumber;
    public int VertexNumber{get{return vertexNumber;}}

    [SerializeField]private GameObject input;
    [SerializeField]private PhysicsGraph physicsModel;
    [SerializeField]private TextAsset inputFile;


    [SerializeField]private float radiusDiff,vertexSeparation;
    private List<List<int>> orbits=new List<List<int>>();
    private Dictionary<int,int> getOrbit=new Dictionary<int,int>(MaximumVertexNumber*2);//vertex->orbit locate at
    private MinHeap availableOrbits;
    
    private SparseSet vertice;

    unsafe private void Awake(){
        instance=this;
        Application.targetFrameRate=30;
        //return;
        if(vertexSeparation<=0||radiusDiff<=0){
            Debug.Log("vertexSeparation and radiusDiff require a positive float");
            EditorApplication.isPlaying=false;
        }

        mapping=new Dictionary<GameObject, int>();
        reverseMapping=null;
        physicsModel.Init().SetSize(250);
        if(inputFile!=null) {
            ProcessTextFile(inputFile.text);
        }
    }


    unsafe public void ProcessTextFile(string file){
        fixed(char* str = file) {
            ProcessTextFile(str,file.Length);
        }

        if(reverseMapping!=null){
            for(int i=0;i<reverseMapping.Length;i++){
                VertexPool.instance.Release(reverseMapping[i]);
            }
        }

        reverseMapping=new GameObject[adjacencyList.Length];
        mapping.Clear();
        mapping.EnsureCapacity(adjacencyList.Length*3/2);
        for(int i = 0;i<adjacencyList.Length;i++) {
            reverseMapping[i]=VertexPool.instance.Get();
            reverseMapping[i].transform.position=Vector3.zero;
            mapping[reverseMapping[i]]=i;
            //reverseMapping[i].transform.GetComponentInChildren<TMP_Text>().text=i.ToString();
        }

        physicsModel.LoadGraph(this.adjacencyList,reverseMapping);
        //GetCoordinates();
        System.GC.Collect();
    }


    unsafe private void ProcessTextFile(in char*str,in int len) {
        int le,ri;
        int max=int.MinValue;

        for(le=0,ri=-1;true;){
            for(ri++;ri<len;ri++) {
                if(str[ri]>='0'&&str[ri]<='9') {
                    goto _Have_Number_;
                }
            }
            if(ri>=len) {
                break;
            }

            _Have_Number_:;
            for(le=ri, ri++;ri<len;ri++) {
                if((str[ri]>='0'&&str[ri]<='9')==false) {
                    break;
                }
            }

            System.ReadOnlySpan<char> s=new System.ReadOnlySpan<char>(str+le,ri-le);
            if(int.TryParse(s,out int val)) {
                if(val>max) { 
                    max=val;
                }
            }
            else {
                Debug.Log($"fail to parse string {s.ToString()}");
            }
        }

        int num=max+1;
        int edgeNumber=0;
        adjacencyList=new List<int>[num];
        adjacencyMatrix=new bool[num,num];
        for(int i = 0;i<num;i++) {
            adjacencyList[i]=new List<int>();
        }

        for(le=0,ri=-1;true;){
            int parent,child;
            for(ri++;ri<len;ri++) {
                if(str[ri]>='0'&&str[ri]<='9') {
                    goto _Have_Number_0_;
                }
            }
            if(ri>=len) {
                break;
            }

            _Have_Number_0_:;
            for(le=ri, ri++;ri<len;ri++) {
                if((str[ri]>='0'&&str[ri]<='9')==false) {
                    break;
                }
            }

            {
                System.ReadOnlySpan<char> s=new System.ReadOnlySpan<char>(str+le,ri-le);
                if(int.TryParse(s,out parent)) {
                    
                }
                else {
                    Debug.Log($"fail to parse string {s.ToString()}");
                }
            }

            for(ri++;ri<len;ri++) {
                if(str[ri]>='0'&&str[ri]<='9') {
                    goto _Have_Number_1_;
                }
            }
            if(ri>=len) {
                Debug.Log($"no another vertex connected {parent},ignored");
                break;
            }

            _Have_Number_1_:;
            for(le=ri, ri++;ri<len;ri++) {
                if((str[ri]>='0'&&str[ri]<='9')==false) {
                    break;
                }
            }

            {
                System.ReadOnlySpan<char> s=new System.ReadOnlySpan<char>(str+le,ri-le);
                if(int.TryParse(s,out child)) {
                    
                }
                else {
                    Debug.Log($"fail to parse string {s.ToString()}");
                }
            }
            if(adjacencyMatrix[parent,child]==false) {
                adjacencyMatrix[parent,child] = true;
                adjacencyList[parent].Add(child);
            }
            if(adjacencyMatrix[child,parent]==false) {
                adjacencyMatrix[child,parent] = true;
                adjacencyList[child].Add(parent);
            }
            edgeNumber++;
        }

        UIController.instance.SetGraphData(AdjacencyList.Length,edgeNumber);
    }


    private class GetCoordinatesHelper {
        private int vertex,count;

        public Vector2[] results;

        public GetCoordinatesHelper(int vertexNum) {
            vertex=-1;
            count=0;
            results=new Vector2[vertexNum];
        }

        public GetCoordinatesHelper LayoutProcess() {
            Process p=new Process();
            p.StartInfo.UseShellExecute = false;
            p.StartInfo.Arguments=$"{Application.dataPath}/Temp/graph.dot -Tdot";
            p.StartInfo.FileName=$"{Application.dataPath}/Graphviz/bin/circo.exe";
            p.StartInfo.RedirectStandardOutput = true ;
            p.OutputDataReceived+=new DataReceivedEventHandler(OnLayoutOutput);
            try {
                p.Start();
                p.BeginOutputReadLine();
                p.WaitForExit();
                p.Close();
                p.Dispose();
                return this;
            }
            catch(Exception e) {
                Debug.Log($"exception when starting process: {e.Data}");
                return null;
            }
        }


        unsafe private void OnLayoutOutput(object sender, DataReceivedEventArgs e) {
            string output=e.Data.ToString();
            int length=output.Length;
            int slow=0,fast=0;
            //Debug.Log(output);
            fixed(char* str = output) {
                while(fast<length) {
                    char c = str[fast];
                    if(c=='[') {
                        fast++;
                        count++;
                    }
                    else if(c==']') {
                        fast++;
                        count--;
                    }
                    else if(count==0&&c>='0'&&c<='9') {
                        slow=fast++;
                        bool isVertex=true;
                        while(fast<length) {
                            c=str[fast++];
                            if(c==' '||c=='\t'||(c>='0'&&c<='9')) {}
                            else if(c=='-') {
                                isVertex=false;
                            }
                            else if(c=='[') {
                                count++;
                                break;
                            }
                        }

                        if(isVertex) {
                            int _fast=slow+1;
                            while(_fast<length&&str[_fast]>='0'&&str[_fast]<='9') {
                                _fast++;
                            }
                            vertex=int.Parse(new ReadOnlySpan<char>(str+slow,_fast-slow));
                            //Debug.Log($"set {vertex}");
                        }
                    }
                    else if(vertex!=-1&&count>0&&c=='p') {
                        fast++;
                        if(str[fast]!='o') {
                            goto _Not_Pos_;
                        }
                        fast++;
                        if(str[fast]!='s') {
                            goto _Not_Pos_;
                        }
                        Vector2 pos;
                        for(fast++;str[fast]!='\"';fast++) {}
                        for(fast++,slow=fast;str[fast]!=',';fast++) {}
                        pos.x=float.Parse(new ReadOnlySpan<char>(str+slow,fast-slow));

                        for(fast++,slow=fast;str[fast]!='\"';fast++) {}
                        pos.y=float.Parse(new ReadOnlySpan<char>(str+slow,fast-slow));
                        //idk why the editor freezes when i call cam.screentoworldpoint here
                        //Debug.Log($"{vertex} position is {pos}");
                        results[vertex]=pos;
                        vertex=-1;
                        _Not_Pos_:;
                        fast++;
                    }
                    else {
                        fast++;
                    }
                }
            }
        }
    }


    private async void GetCoordinates() {
        await CreateDotFile();
        Vector2[] results=new GetCoordinatesHelper(adjacencyList.Length).LayoutProcess().results;
        for(int i = 0;i<results.Length;i++) {
            physicsModel.SetVertex((Vector2)cam.ScreenToWorldPoint(results[i]),i);
        }
    }


    private async Task CreateDotFile() {
        DotGraph dotGraph = new DotGraph();
        dotGraph.Directed=false;
        dotGraph.WithIdentifier("My Graph");

        DotNode[] nodes=new DotNode[adjacencyList.Length];
        for(int i=0;i<adjacencyList.Length;i++) {
            nodes[i]=new DotNode().WithIdentifier($"{i}");
        }

        for(int i = 0;i<adjacencyList.Length;i++) {
            for(int j = 0;j<adjacencyList[i].Count;j++) {
                DotEdge edge=new DotEdge().From(nodes[i]).To(nodes[j]);
                dotGraph.Add(edge);
            }
        }
        StringWriter writer=new StringWriter();
        CompilationContext context=new CompilationContext(writer,new CompilationOptions());
        await dotGraph.CompileAsync(context);
        try {
            File.WriteAllText($"{Application.dataPath}/Temp/graph.dot", writer.GetStringBuilder().ToString());
        }
        catch(Exception e) {
            Debug.Log($"catch exception {e.Data}");
        }
    }

    private struct Layout_1{
        private readonly List<int>[] graph;
        private readonly BitArray visited;
        private readonly float vertexRadius;
        private readonly PhysicsGraph physicsGraph;

        public Layout_1(List<int>[] graph,float radius,PhysicsGraph physicsGraph) {
            this.graph=graph;
            this.visited=new BitArray(graph.Length);
            this.vertexRadius=radius;
            this.physicsGraph=physicsGraph;
        }


        public void Place() {
            Queue<int> bfs=new Queue<int>();
            int start=RandomStart();
            int step=0;
            bfs.Enqueue(start);
            visited[start]=true;

            unsafe {
                PhysicsGraph.Vertex* vertex = physicsGraph.GetVertex(start);
                vertex->repulse=49f;
                vertex->mass=1000f;
                physicsGraph.SetVertex(0,start);
            }

            while(bfs.Count>0) {
                int j=bfs.Count;
                step++;
                do {
                    int v=bfs.Dequeue();
                    int count=graph[v].Count;
                    Vector2 centerPosition;
                    unsafe {
                        centerPosition=physicsGraph.GetVertex(v)->position;
                    }
                    Vector2 SeparationBound=new Vector2(
                        (float)((count*2*vertexRadius+(count-1)*3.1*vertexRadius)/2f/Mathf.PI),
                        (float)((count*2*vertexRadius+(count-1)*7.5*vertexRadius)/2f/Mathf.PI)
                    );

                    for(int i = 0;i<count;i++) {
                        if(visited[graph[v][i]]){ continue; }
                        visited[graph[v][i]]=true;
                        bfs.Enqueue(graph[v][i]);
                        physicsGraph.SetAttraction(new int2(v,i),46f/(step+2));
                        unsafe {
                            PhysicsGraph.Vertex* vertex = physicsGraph.GetVertex(graph[v][i]);
                            vertex->repulse=35f/(step+1);
                            vertex->mass=9f/(step+2);
                            physicsGraph.SetVertex(UnityEngine.Random.insideUnitCircle.normalized*UnityEngine.Random.Range(SeparationBound.x,SeparationBound.y)+centerPosition,graph[v][i]);
                        }
                    }
                    j--;
                }while(j>0);
            }
        }

        //pick a random vertex with maximum degree
        private int RandomStart() {
            int max=-1,count=0;
            for(int i = 0;i<graph.Length;i++) {
                max=Mathf.Max(max,graph[i].Count);
            }

            for(int i = 0;i<graph.Length;i++) {
                count+=graph[i].Count==max?1:0;
            }

            int idx=UnityEngine.Random.Range(0,count);
            count=0;
            for(int i = 0;i<graph.Length;i++) {
                if(graph[i].Count==max) {
                    if(count>=idx) {
                        return i;
                    }
                    count++;
                }
            }
            return 0;
        }
    }


    #pragma warning disable CS0162
    private void Start(){
        return;
        ConstructGraph();return;

        mapping=new Dictionary<GameObject,int>(MaximumVertexNumber*2);
        reverseMapping=new GameObject[MaximumVertexNumber];
        adjacencyList=new List<int>[MaximumVertexNumber];
        adjacencyMatrix=new bool[MaximumVertexNumber,MaximumVertexNumber];

        vertice=new SparseSet(MaximumVertexNumber);

        for(int i=0;i<MaximumVertexNumber;i++){
            adjacencyList[i]=new List<int>();
            reverseMapping[i]=null;
        }

        orbits.Add(new List<int>(1));//center
        float currentRadius=radiusDiff,angularDiff;
        float half=vertexSeparation/2;
        int orbitCapacity;
        int currentOrbit=1;
        
        for(int i=MaximumVertexNumber-1;i>0;i-=orbitCapacity){
            angularDiff=2*Mathf.Asin(half/currentRadius)*Mathf.Rad2Deg;
            orbitCapacity=Mathf.CeilToInt(360/angularDiff);
            //an isosceles triangle with two edges length=currentRadius,
            //the one edge remain length=vertexSeparation;

            orbits.Add(new List<int>(orbitCapacity));
            Debug.Log($"{orbitCapacity}");
            currentOrbit++;
            currentRadius=currentOrbit*radiusDiff;
        }
        availableOrbits=new MinHeap(currentOrbit);
        availableOrbits.Enqueue(0,0);

    }
    #pragma warning restore CS0162

    public void RandomLayout() {
        if(adjacencyList==null||adjacencyList.Length<=0){return;}
        physicsModel.ClearGeometric();
        new Layout_1(adjacencyList,0.5f,physicsModel).Place();
        RefreshLayout();
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void RefreshLayout(){
        physicsModel.Refresh(50);
    }

    public void AssignChildren(){
        int parent=GetParentInText();
        Action<int> CheckVertexExists=(ID)=>{
            if(reverseMapping[ID]==null){
                GameObject v=VertexPool.instance.Get();
                reverseMapping[ID]=v;

                mapping.Add(v,ID);
                v.transform.GetChild(0).GetComponent<TMP_Text>().text=$"{ID}";
                vertice.Add(ID);
                PlaceVertexOnScene(ID);
            }
        };

        if(parent<0){
            foreach(int child in ProcessVertice()){
                //Debug.Log($"child:{child}");
                //continue;
                CheckVertexExists(child);
            }    
        }
        else{
            //Debug.Log($"parent:{parent}");
            CheckVertexExists(parent);

            foreach(int child in ProcessVertice()){
                //Debug.Log($"child:{child}");
                //continue;

                if(parent==child){continue;}

                CheckVertexExists(child);
                if(!adjacencyMatrix[parent,child]){
                    adjacencyMatrix[parent,child]=true;
                    adjacencyList[parent].Add(child);
                }
                if(!adjacencyMatrix[child,parent]){
                    adjacencyMatrix[child,parent]=true;
                    adjacencyList[child].Add(parent);
                }
            }    
        }
    }


    public void DeleteVertice(){
        foreach(int v in ProcessVertice()){
            //Debug.Log($"delete {v}");
            //continue;
            GameObject vertex=reverseMapping[v];
            if(vertex==null){
                Debug.Log($"no such vertex {v}");
            }
            else{
                RemoveVertexOnScene(v);
                mapping.Remove(vertex);
                VertexPool.instance.Release(vertex);
                
                for(int i=0;i<adjacencyList[v].Count;i++){
                    adjacencyMatrix[v,adjacencyList[v][i]]=false;
                    if(adjacencyMatrix[adjacencyList[v][i],v]){
                        adjacencyList[adjacencyList[v][i]].Remove(v);
                        adjacencyMatrix[adjacencyList[v][i],v]=false;
                    }
                }
                adjacencyList[v].Clear();

                reverseMapping[v]=null;
                vertice.Remove(v);
            }
        }
        //childrenInput.text="";
    }


    public void UnconnectChild(){
        int parent=GetParentInText();
        if(parent<0||reverseMapping[parent]==null){
            return;
        }
        foreach(int child in ProcessVertice()){
            if(adjacencyMatrix[parent,child]){
                adjacencyList[parent].Remove(child);
                adjacencyMatrix[parent,child]=false;
            }
            if(adjacencyMatrix[child,parent]){
                adjacencyList[child].Remove(parent);
                adjacencyMatrix[child,parent]=false;
            }
        }
    }

    private WaitForSeconds AAAA=new WaitForSeconds(0.025f);
    public void MoveVertex(){
        int v=GetParentInText();
        if(v<0||reverseMapping[v]==null){
            return;
        }
        StartCoroutine(FollowMouse(reverseMapping[v].transform));
    }

    IEnumerator FollowMouse(Transform v){
        while(true){
            if(Input.GetKey(KeyCode.Return)){
                break;
            }
            Vector3 mousePos=Camera.main.ScreenToWorldPoint(Input.mousePosition);
            mousePos.z=0;
            v.position=mousePos;
            yield return AAAA;
        }
    }

    public void ClearText(){
        parentInput.text="";
        childrenInput.text="";
    }

    private int GetParentInText(){
        if(parentInput.text.Length==0){
            Debug.Log("no parent is inputted");
            return -1;
        }
        int i,parent;
        char digit;
        for(i=0,parent=0;i<parentInput.text.Length;i++){
            digit=(parentInput.text)[i];
            if(digit<'0'||digit>'9'){
                Debug.Log($"invalid character detected at {i+1}-th char in parent input field");
            }
            else{
                parent=parent*10+digit-'0';
            }
        }

        if(parent>=MaximumVertexNumber){
            Debug.Log($"value of parent exceed maximum vertex allowed {MaximumVertexNumber}");
            return -1;
        }
        else{
            return parent;
        }
    }


    IEnumerable<int> ProcessVertice(){
        if(childrenInput.text.Length==0){
            Debug.Log("no children are inputted");
            yield break;
        }
        int i=0,j,V;
        int number;
        char digit=(childrenInput.text)[i];
        while(digit==' '||digit==' '){
            i++;
            if(i>=childrenInput.text.Length)break;
            digit=(childrenInput.text)[i];
        }

        for(number=1;i<childrenInput.text.Length;i=j,number++){
            for(j=i,V=0;j<childrenInput.text.Length;j++){
                digit=(childrenInput.text)[j];
                if(digit==' '||digit==' '){
                    do{
                        j++;
                        if(j>=childrenInput.text.Length)break;
                        digit=(childrenInput.text)[j];
                    }while(digit==' '||digit==' ');
                    break;
                }
                else{
                    if(digit<'0'||digit>'9'){
                        Debug.Log($"invalid character detected at {j+1}-th char in parent input field");
                    }
                    else{
                        V=V*10+(digit-'0');
                    }
                }
            }
            if(V>=MaximumVertexNumber){
                Debug.Log($"value of {number}-th child exceed maximum vertex allowed {MaximumVertexNumber}");
                continue;
            }
            else{
                yield return V;
            }
            
        }
    }


    private void ConstructGraph(){
        GameObject[] allVertice=GameObject.FindGameObjectsWithTag("Vertex");
        mapping=new Dictionary<GameObject,int>(allVertice.Length*2);
        reverseMapping=new GameObject[allVertice.Length];
        int i,j;

        for(i=0,vertexNumber=0;i<allVertice.Length;i++){
            if(allVertice[i].GetComponent<Vertex>()==null){
                Debug.Log("missing \"Vertex\" script on"+allVertice[i]);
                allVertice[i]=null;
            }
            else{
                mapping.Add(allVertice[i],vertexNumber);
                reverseMapping[vertexNumber]=allVertice[i];
                allVertice[i].transform.GetChild(0).GetComponent<TMP_Text>().text=$"{vertexNumber}";
                vertexNumber++;
            }
        }

        adjacencyMatrix=new bool[vertexNumber,vertexNumber];
        adjacencyList=new List<int>[vertexNumber];
        for(i=0;i<vertexNumber;i++){
            adjacencyList[i]=new List<int>();
        }

        for(i=0;i<allVertice.Length;i++){
            if(allVertice[i]==null){continue;}
            GameObject[] neighbour=allVertice[i].GetComponent<Vertex>().Neighbour;
            int parent=mapping[allVertice[i]],child;

            for(j=0;j<neighbour.Length;j++){
                if(!mapping.TryGetValue(neighbour[j],out child)){
                    Debug.Log($"{j}-th child (0-indexed) of {allVertice[i]} is not tagged \"Vertex\"");
                }
                else{
                    if(parent==child){continue;}
                    if(!adjacencyMatrix[parent,child]){
                        adjacencyMatrix[parent,child]=true;
                        adjacencyList[parent].Add(child);
                    }
                    if(!adjacencyMatrix[child,parent]){
                        adjacencyMatrix[child,parent]=true;
                        adjacencyList[child].Add(parent);
                    }
                    //block repeated child
                }
            }
        }
    }

    private void PlaceVertexOnScene(int vertex){
        int smallestOrbit=availableOrbits.Items[0];
        getOrbit.Add(vertex,smallestOrbit);
        orbits[smallestOrbit].Add(vertex);

        if(smallestOrbit==0){
            reverseMapping[vertex].transform.position=Vector3.zero;
        }
        else{
            float angularDiff=360f/orbits[smallestOrbit].Count;
            Vector3 radius=new Vector3(smallestOrbit*radiusDiff,0,0);
            for(int i=0;i<orbits[smallestOrbit].Count;i++){
                reverseMapping[orbits[smallestOrbit][i]].transform.position=radius;
                radius=Quaternion.Euler(0,0,angularDiff)*radius;
            }
        }

        if(orbits[smallestOrbit].Count>=orbits[smallestOrbit].Capacity){
            availableOrbits.Dequeue();
            availableOrbits.Enqueue(smallestOrbit+1,smallestOrbit+1);
        }
    }


    private void RemoveVertexOnScene(int vertex){
        int orbitAt=getOrbit[vertex];
        getOrbit.Remove(vertex);
        availableOrbits.Enqueue(orbitAt,orbitAt);
        orbits[orbitAt].Remove(vertex);

        if(orbits[orbitAt].Count>0){
            float angularDiff=360f/orbits[orbitAt].Count;
            Vector3 radius=new Vector3(orbitAt*radiusDiff,0,0);
            for(int i=0;i<orbits[orbitAt].Count;i++){
                reverseMapping[orbits[orbitAt][i]].transform.position=radius;
                radius=Quaternion.Euler(0,0,angularDiff)*radius;
            }
        }

    }

    private const float RadiusOfSprite=0.5f;
    public void OnDrawGizmos(){
        if(!showEdge||!Application.isPlaying||adjacencyList==null||reverseMapping==null){
            return;
        }
        int p,c,d;
        //Gizmos.color=Color.blue;
        Handles.color=Color.blue;
        Handles.zTest=UnityEngine.Rendering.CompareFunction.Less;

        for(p = 0;p<adjacencyList.Length;p++) {
            Vector3 from=reverseMapping[p].transform.position,to;
            for(c = 0;c<adjacencyList[p].Count;c++) {
                to=reverseMapping[adjacencyList[p][c]].transform.position;
                to.z=10;
                Vector3 rotatedRadiusVector=Vector3.ClampMagnitude(to-from,RadiusOfSprite);
                //Gizmos.DrawLine(from+rotatedRadiusVector,to-rotatedRadiusVector);
                Handles.DrawLine(from+rotatedRadiusVector,to-rotatedRadiusVector);
            }
        }

        return;
        for(d=0;d<vertice.count;d++){
            p=vertice.dense[d];
            Vector3 from=reverseMapping[p].transform.position,to;
            from.z=10;

            for(c=0;c<adjacencyList[p].Count;c++){
                to=reverseMapping[adjacencyList[p][c]].transform.position;
                to.z=10;
                Vector3 rotatedRadiusVector=Vector3.ClampMagnitude(to-from,RadiusOfSprite);
                //Gizmos.DrawLine(from+rotatedRadiusVector,to-rotatedRadiusVector);
                Handles.DrawLine(from+rotatedRadiusVector,to-rotatedRadiusVector);
            }
        }
    }

    public void EnableInput(){
        input.SetActive(true);
    }

    public void DisableInput(){
        input.SetActive(false);
    }

    unsafe public Vector2 GetVertexPosition(int id) {
        return physicsModel.GetVertex(id)->position;
    }

    public GameObject GetVertexGO(int id) {
        return reverseMapping[id].gameObject;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public bool TryGetVertexGO(int id,out GameObject go) {
        if(reverseMapping==null||id>=reverseMapping.Length) {
            go=null;
            return false;
        }
        else {
            go=reverseMapping[id].gameObject;
            return true;
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    unsafe public int TryGetVertexGO(Vector2 position,out GameObject go) {
        PhysicsGraph.Vertex* v=physicsModel.GetVertex(position);
        if(v!=null) {
            go=reverseMapping[v->id];
            return v->id;
        }
        else {
            go=null;
            return -1;
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void SetVertexPosition(GameObject v) {
        if(mapping.TryGetValue(v,out int id)) {
            physicsModel.UpdateVertex((Vector2)v.transform.position,(short)id);
        }
    }
}