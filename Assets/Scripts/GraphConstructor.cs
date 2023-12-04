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
    private static readonly Color VertexInitialColor=Color.cyan;

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
    private int[] shells;
    public int[] Shells{get{return shells;}}
    [SerializeField]private int vertexNumber;
    public int VertexNumber{get{return vertexNumber;}}

    [SerializeField]private GameObject input;
    [SerializeField]private PhysicsGraph physicsModel;
    [SerializeField]private TextAsset inputFile;
    [SerializeField]private GameObjectPool vertexPool,edgePool;
    [SerializeField]private float radiusDiff,vertexSeparation;
    private List<List<int>> orbits=new List<List<int>>();
    private Dictionary<int,int> getOrbit=new Dictionary<int,int>(MaximumVertexNumber*2);//vertex->orbit locate at
    private Dictionary<int2,GameObject> showedEdges;
    private bool showingSelectedVertexEdge;
    private MinHeap availableOrbits;
    private SparseSet vertice;
    public Transform folder;

    private void CreateSample(){
        Dictionary<GameObject,int> map = new Dictionary<GameObject,int>();
        int sample=1;
        foreach(Transform child in folder){
            map.EnsureCapacity(child.transform.childCount);
            int i=0;
            Debug.Log(child.gameObject.name);
            foreach(Transform v in child){
                map.Add(v.gameObject,i++);
            }
            using(StreamWriter write=File.CreateText($"{Application.dataPath}/Graph/sample{sample}.txt")){
                foreach(Transform _v in child){
                    Debug.Log(_v.gameObject.name);
                    Vertex v=_v.GetComponent<Vertex>();
                    int from=map[v.gameObject];
                    if(v.Neighbour.Length<=0){
                        write.WriteLine($"{from} {from}");
                    }
                    else{
                        foreach(GameObject n in v.Neighbour){
                            write.WriteLine($"{from} {map[n]}");
                        }
                    }
                }
            }
            sample++;
            map.Clear();
        }
    }

    unsafe private void Awake(){
        instance=this;
        Application.targetFrameRate=30;
        //CreateSample();
        //return;
        if(vertexSeparation<=0||radiusDiff<=0){
            Debug.Log("vertexSeparation and radiusDiff require a positive float");
            EditorApplication.isPlaying=false;
        }

        mapping=new Dictionary<GameObject, int>();
        showedEdges=new Dictionary<int2,GameObject>();
        reverseMapping=null;
        shells=null;
        physicsModel.Init().SetSize(250);
        if(inputFile!=null) {
            ProcessTextFile(inputFile.text);
        }

        showingSelectedVertexEdge=false;
    }


    unsafe public void ProcessTextFile(string file){
        fixed(char* str = file) {
            ProcessTextFile(str,file.Length);
        }

        if(reverseMapping!=null){
            UpdateAllEdges(true);
            for(int i=0;i<reverseMapping.Length;i++){
                vertexPool.Release(reverseMapping[i]);
            }
        }

        reverseMapping=new GameObject[adjacencyList.Length];
        mapping.Clear();
        mapping.EnsureCapacity(adjacencyList.Length*3/2);
        for(int i = 0;i<adjacencyList.Length;i++) {
            reverseMapping[i]=vertexPool.Get();
            reverseMapping[i].GetComponent<SpriteRenderer>().color=VertexInitialColor;
            reverseMapping[i].transform.position=Vector3.zero;
            mapping[reverseMapping[i]]=i;
            //reverseMapping[i].transform.GetComponentInChildren<TMP_Text>().text=i.ToString();
        }
        physicsModel.LoadGraph(this.adjacencyList,reverseMapping);

        if(KCore.Instance!=null){
            KCore.Instance.PreProcess(out shells);
            Layout1();
        }
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
        if(max==int.MinValue) {
            return;
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

            if(parent==child){continue;}
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


    private struct GetCoordinatesHelper {
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
            }
            catch(Exception e) {
                Debug.Log($"exception when starting process: {e.Data}");
            }
            return this;
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

    private async void GetCoordinates() {
        await CreateDotFile();
        Vector2[] results=new GetCoordinatesHelper(adjacencyList.Length).LayoutProcess().results;
        for(int i = 0;i<results.Length;i++) {
            physicsModel.SetVertex((Vector2)cam.ScreenToWorldPoint(results[i]),i);
        }
    }


    #pragma warning disable CS0162
    private void Start(){
        if(shells==null){
            KCore.Instance.PreProcess(out shells);
            Layout1();
        }
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
        if(adjacencyList==null||adjacencyList.Length<=0||KCore.Instance.isRunning){return;}
        physicsModel.ClearGeometric();
        UpdateAllEdges(true);
        Layout1();
    }


    unsafe private void Layout1(){
        KCore.CoreComponents[] components=KCore.Instance.shellDiffentComponents;
        HashSet<int> sameComponent=new HashSet<int>();
        float radius=0;

        for(int shell=components.Length-1;shell>=0;shell--){
            float total=0;
            int count=0;
            foreach(KCore.ConnectedComponent cc in components[shell].components){
                total+=cc.Count;
            }
            //random put the vertex in donut shape
            const float MinAreaMultiplier=10;
            const float MinRadiusIncrement=2.5f;
            //(new_r^2)*pi=A+(r^2)*pi
            float newRadius=Mathf.Max(Mathf.Sqrt(MinAreaMultiplier*physicsModel.vertexRadius*2/Mathf.PI+radius*radius)-radius,MinRadiusIncrement*physicsModel.vertexRadius*2)+radius;
            float startAngle=0;

            foreach(KCore.ConnectedComponent cc in components[shell].components){//iterate all connected component in this shell
                count+=cc.Count;
                float endAngle=count/total*360f;
                sameComponent.Clear();

                foreach(int id in cc.vertice){
                    sameComponent.Add(id);
                }

                foreach(int id in cc.vertice){//iterate all vertex inside this component
                    Vector2 pos=Quaternion.Euler(0,0,UnityEngine.Random.Range(startAngle,endAngle))*new Vector2(UnityEngine.Random.Range(radius,newRadius),0);
                    PhysicsGraph.Vertex* v=physicsModel.GetVertex(id);
                    //some random function for setting mass and repulse, then pray
                    if(shell==0){
                        v->mass=16;
                        v->repulse=7;//constant
                    }
                    else{
                        v->mass=13*shell*shell;
                        v->repulse=2.5f*math.sqrt(shell);
                        foreach(int neighbor in adjacencyList[id]){
                            float attraction;
                            if(sameComponent.Contains(neighbor)){
                                attraction=v->mass*10f/components.Length;
                            }
                            else{
                                attraction=v->mass*shell/(Mathf.Abs(shells[neighbor]-shell)+0.75f);
                            }
                            physicsModel.TrySetAttraction(new int2(id,neighbor),attraction);
                        }
                    }
                    physicsModel.SetVertex(pos,id);
                }
                startAngle=endAngle;
            }

            if(total>0){
                radius=newRadius+physicsModel.vertexRadius;
            }
        }
        sameComponent=null;
    }


    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void RefreshLayout(){
        if(KCore.Instance.isRunning){return;}
        physicsModel.Refresh(50);
    }


    public void AssignChildren(){
        int parent=GetParentInText();
        Action<int> CheckVertexExists=(ID)=>{
            if(reverseMapping[ID]==null){
                GameObject v=vertexPool.Get();
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
                vertexPool.Release(vertex);
                
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

    public void UpdateAllEdges(bool hideAll,bool changeVertexColor=false){
        if(hideAll){
            if(showingSelectedVertexEdge==false){
                foreach(KeyValuePair<int2,GameObject> kvp in showedEdges){
                    //if(kvp.Key.x==UIController.instance.selectedVertexID||kvp.Key.y==UIController.instance.selectedVertexID){continue;}
                    edgePool.Release(kvp.Value);
                }
                showedEdges.Clear();
                showingSelectedVertexEdge=true;
            }
            else{

            }
        }
        else if(KCore.Instance.isRunning==false){
            PhysicsGraph.Bound b;
            b.min=(Vector2)cam.ViewportToWorldPoint(new Vector3(0,0,0));
            b.max=(Vector2)cam.ViewportToWorldPoint(new Vector3(1,1,0));
            //Debug.Log($"min:{b.min} max:{b.max}");

            foreach(KeyValuePair<int2,GameObject> kvp in showedEdges){
                edgePool.Release(kvp.Value);
            }
            showedEdges.Clear();
            if(changeVertexColor){
                for(int i=0;i<physicsModel.showingVertex.Length;i++){
                    reverseMapping[physicsModel.showingVertex[i]].GetComponent<SpriteRenderer>().color=VertexInitialColor;
                }
            }

            physicsModel.FindShowingVertices(b);
            //Debug.Log($"{physicsModel.showingVertex.Length} v are shown");

            for(int i=0;i<physicsModel.showingVertex.Length;i++){
                int from=physicsModel.showingVertex[i];
                List<int> children=adjacencyList[from];
                for(int j=0;j<children.Count;j++){
                    if(showedEdges.ContainsKey(new int2(from,children[j]))||showedEdges.ContainsKey(new int2(children[j],from))){}
                    else{
                        GameObject e=edgePool.Get();
                        showedEdges.Add(new int2(from,children[j]),e);
                        Vector3 v0=reverseMapping[from].transform.position,v1=reverseMapping[children[j]].transform.position;
                        Vector3 centerPosition=(v0+v1)/2;
                        Vector3 direction=v0-v1;
                        e.transform.position=centerPosition;
                        e.transform.localScale=new Vector3(1,direction.magnitude);
                        e.transform.up=direction;
                    }
                }
            }
            SetAllEdgeThinness(KCore.Instance.hasRan==false);
            showingSelectedVertexEdge=false;
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
    public void SetVertexPosition(in GameObject v) {
        if(mapping.TryGetValue(v,out int id)) {
            physicsModel.UpdateVertex((Vector2)v.transform.position,(short)id);
        }
    }


    public void MoveEdgePosition(in int vertexID,in Vector3 pos){
        List<int> neighbors=adjacencyList[vertexID];
        for(int i=0;i<neighbors.Count;i++){
            GameObject edge;
            int n=neighbors[i];
            bool x=showedEdges.TryGetValue(new int2(vertexID,n),out edge)||showedEdges.TryGetValue(new int2(n,vertexID),out edge);
            Vector3 v0=reverseMapping[n].transform.position;
            Vector3 centerPosition=(v0+pos)/2;
            Vector3 direction=v0-pos;;
            edge.transform.position=centerPosition;
            edge.transform.localScale=new Vector3(physicsModel.vertexRadius/4,direction.magnitude);
            edge.transform.up=direction;
        }
    }


    public void ShowEdgesOfVertex(in int vertexID){
        if(UIController.instance.HideEdge(true)){
            if(showedEdges.Count>0){
                UpdateAllEdges(true);
            }
            return;
        }
        List<int> neighbors=adjacencyList[vertexID];
        for(int i=0;i<neighbors.Count;i++){
            int n=neighbors[i];
            GameObject e=edgePool.Get();
            showedEdges.Add(new int2(vertexID,n),e);
            Vector3 v0=reverseMapping[vertexID].transform.position,v1=reverseMapping[n].transform.position;
            Vector3 centerPosition=(v0+v1)/2;
            Vector3 direction=v0-v1;;
            e.transform.position=centerPosition;
            e.transform.localScale=new Vector3(physicsModel.vertexRadius/4,direction.magnitude);
            e.transform.up=direction;
        }
    }


    public void HideEdgesOfVertex(in int vertexID){
        if(showedEdges.Count<=0){
            return;
        }
        List<int> neighbors=adjacencyList[vertexID];
        for(int i=0;i<neighbors.Count;i++){
            int n=neighbors[i];
            if(showedEdges.TryGetValue(new int2(vertexID,n),out GameObject e)){
                edgePool.Release(e);
            }
        }
        showedEdges.Clear();
    }


    public void SetAllVerticesColor(bool initial){
        if(initial){
            foreach(GameObject v in reverseMapping){
                v.GetComponent<SpriteRenderer>().color=VertexInitialColor;
            }
        }
        else{
            Color[] colors=KCore.Instance.shellColor;
            int i=0;
            foreach(GameObject v in reverseMapping){
                v.GetComponent<SpriteRenderer>().color=colors[shells[i]];
                i++;
            }
        }
    }


    public void SetAllEdgeThinness(bool initial){
        float MaxWidth=physicsModel.vertexRadius/4;
        if(initial){
            foreach(KeyValuePair<int2,GameObject> kvp in showedEdges){
                Vector3 scale=kvp.Value.transform.localScale;
                scale.x=MaxWidth;
                kvp.Value.transform.localScale=scale;
            }
        }
        else{
            int maximumShell=KCore.Instance.shellColor.Length;

            float Width(int value){
                return math.pow((float)value/maximumShell,3)*MaxWidth;
            }

            foreach(KeyValuePair<int2,GameObject> kvp in showedEdges){
                int s0=shells[kvp.Key.x],s1=shells[kvp.Key.y];
                Vector3 scale=kvp.Value.transform.localScale;
                if(s0==s1){
                    scale.x=Width(s0);
                }
                else{
                    scale.x=0;
                }
                kvp.Value.transform.localScale=scale;
            }
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public int GetShellOfVertex(int v){
        if(shells==null){
            return -1;
        }
        return shells[v];
    }
}