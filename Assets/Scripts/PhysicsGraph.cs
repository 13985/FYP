using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Unity.Collections;
using Unity.Collections.LowLevel.Unsafe;
using Unity.Mathematics;
using Unity.Burst;
using System.Runtime.CompilerServices;
using Unity.Jobs;


public sealed class PhysicsGraph:MonoBehaviour{
    private const byte BOTTOM=0b00,TOP=0b10,LEFT=0b00,RIGHT=0b01;
    private const byte BOTTOMLEFT=BOTTOM|LEFT,BOTTOMRIGHT=BOTTOM|RIGHT,TOPLEFT=TOP|LEFT,TOPRIGHT=TOP|RIGHT;
    private const int MaximumJob=32;
    public struct Vertex{
        private const float Threshold=0.01f;

        private float _repulse,_effectRadius;
        public float repulse {
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            get{ return _repulse;}
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            set {
                _repulse = value;
                _effectRadius = Mathf.Sqrt(_repulse/Threshold);
                //solve for F/r^2<threshold
            }
        }
        public float effectRadius {
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            get {
                return _effectRadius;
            }
        }

        public float mass;
        public short id;
        private short padding0;
        public int node,positionInNode;
        public float2 position;
        public UnsafeList<int> neighbors;

        public void Init(int capacity) {
            neighbors=new UnsafeList<int>(capacity,Allocator.Persistent);
        }
    }

    [SerializeField]private float vertexRadius;

    private UnsafeList<Vertex> graph;
    private UnsafeHashMap<int2,float> edgesAttractions;

    private GameObject[] vertices;//the gameobject in world
    private int vertexNumber;

    [BurstCompile]
    public struct Bound{
        public float2 min, max;
        public float2 center {
            get {
                return (max+min)/2;
            }
        }
        
        public float2 size {
            get {
                return max-min;
            }
        }

        public Bound this[int idx] { 
            get{
                float2 center=this.center;
                switch(idx){
                case BOTTOMLEFT: 
                    return new Bound() {
                        max=center,
                        min=this.min,
                    };
                case BOTTOMRIGHT: 
                    return new Bound() {
                        max=new float2(this.max.x,center.y),
                        min=new float2(center.x,this.min.y),
                    };
                case TOPLEFT:
                    return new Bound() {
                        max=new float2(this.center.x,this.max.y),
                        min=new float2(this.min.x,center.y),
                    };
                case TOPRIGHT:
                    return new Bound() {
                        max=this.max,
                        min=center,
                    };
                }
                return new Bound();
            }
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public byte GetDirection(float2 p) {
            float2 center=this.center;
            return unchecked((byte)((p.x<center.x?LEFT:RIGHT)|(p.y<center.y?BOTTOM:TOP)));
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public bool IsOutside(float2 p) {
            return p.x<min.x||p.y<min.y||p.x>=max.x||p.y>=max.y;
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public float2 Clamp(float2 p) {
            if(p.x<min.x) {
                p.x=min.x;
            }
            else if(p.x>=max.x) {
                p.x=max.x-0.01f;
            }
            if(p.y<min.y) {
                p.y=min.y;
            }
            else if(p.y>=max.y) {
                p.y=max.y-0.01f;
            }
            return p;
        }
    }

    //16+4*4+2+1+1+8*2=56 bytes
    unsafe public struct TreeNode{
        public const int Capacity=2;
        public Bound bound;
        public fixed int children[4];
        public int parent;
        public short vertexCount;
        public byte direction;
        public bool isLeaf;
        public fixed short vertices[Capacity];
    }

    private struct Allocate {
        public int freed,start,next;
    }

    private UnsafeList<TreeNode> nodes;

    private int head;

    private Allocate nodeAllocator;
    private UnsafeList<float2> resultPositions;
    private NativeArray<JobHandle> jobs;
    private UnsafeList<UnsafeList<int>> stacks;


    public enum DrawMode {
        Area,Node,Index,None,Count
    }
    [SerializeField]private DrawMode drawMode;
    unsafe void OnDrawGizmos() {
        if(UnityEditor.EditorApplication.isPlaying==false||head<0) {
            return;
        }
        switch(drawMode) {
        case DrawMode.None: {
            break;
        }
        case DrawMode.Area: {
            Bound b = nodes[head].bound;
            Gizmos.color=Color.white;
            Gizmos.DrawWireCube((Vector2)b.center,(Vector2)(b.max-b.min));
            break;
        }
        case DrawMode.Node: {
            UnsafeList<int> stack = stacks[0];
            stack.Add(head);
            while(stack.Length>0) {
                int n = stack[stack.Length-1];
                stack.Length--;
                int* children = (nodes.Ptr+n)->children;
                if((nodes.Ptr+n)->isLeaf) {
                    Bound b= nodes[n].bound;
                    Gizmos.DrawWireCube((Vector2)b.center,(Vector2)(b.max-b.min));
                }
                else {
                    for(int i = 0;i<4;i++) {
                        if(children[i]<0) {
                            Bound b= nodes[n].bound[i];
                            Gizmos.DrawWireCube((Vector2)b.center,(Vector2)(b.max-b.min));
                        }
                        else {
                            stack.Add(children[i]);
                        }
                    }
                }
            }
            stacks[0]=stack;
            break;
        }
        case DrawMode.Index: {
            UnsafeList<int> stack = stacks[0];
            UnityEditor.Handles.BeginGUI();
            GUIStyle style=new GUIStyle();
            style.alignment=TextAnchor.MiddleCenter;
            style.normal.textColor=Color.white;
            stack.Add(head);
            while(stack.Length>0) {
                int n = stack[stack.Length-1];
                stack.Length--;
                int* children = (nodes.Ptr+n)->children;
                if((nodes.Ptr+n)->isLeaf) {
                    Bound b= nodes[n].bound;
                    Gizmos.DrawWireCube((Vector2)b.center,(Vector2)(b.max-b.min));
                    UnityEditor.Handles.Label((Vector2)b.center,$"{n}",style);
                }
                else {
                    for(int i = 0;i<4;i++) {
                        if(children[i]<0) {
                            Bound b= nodes[n].bound[i];
                            Gizmos.DrawWireCube((Vector2)b.center,(Vector2)(b.max-b.min));
                            UnityEditor.Handles.Label((Vector2)b.center,$"{n}:-1",style);
                        }
                        else {
                            stack.Add(children[i]);
                        }
                    }
                }
            }
            UnityEditor.Handles.EndGUI();
            stacks[0]=stack;
            break;
        }
        case DrawMode.Count: {
            UnsafeList<int> stack = stacks[0];
            UnityEditor.Handles.BeginGUI();
            GUIStyle style=new GUIStyle();
            style.alignment=TextAnchor.MiddleCenter;
            style.normal.textColor=Color.white;
            stack.Add(head);
            while(stack.Length>0) {
                int n = stack[stack.Length-1];
                stack.Length--;
                int* children = (nodes.Ptr+n)->children;
                if((nodes.Ptr+n)->isLeaf) {
                    Bound b= nodes[n].bound;
                    Gizmos.DrawWireCube((Vector2)b.center,(Vector2)(b.max-b.min));
                    UnityEditor.Handles.Label((Vector2)b.center,$"{nodes[n].vertexCount}",style);
                }
                else {
                    for(int i = 0;i<4;i++) {
                        if(children[i]<0) {
                            Bound b= nodes[n].bound[i];
                            Gizmos.DrawWireCube((Vector2)b.center,(Vector2)(b.max-b.min));
                            UnityEditor.Handles.Label((Vector2)b.center,$"{nodes[n].vertexCount}:-1",style);
                        }
                        else {
                            stack.Add(children[i]);
                        }
                    }
                }
            }
            UnityEditor.Handles.EndGUI();
            stacks[0]=stack;
            break;
        }
        }
    }

    void OnDestroy() {
        for(int i = 0;i<graph.Length;i++) {
            graph[i].neighbors.Dispose();
        }
        graph.Dispose();
        edgesAttractions.Dispose();
        nodes.Dispose();

        jobs.Dispose();
        for(int i = 0;i<MaximumJob;i++) {
            stacks[i].Dispose();
        }
        stacks.Dispose();
    }

    public unsafe PhysicsGraph Init(int reserveVertexNumber=512) {
        head=-1;
        nodeAllocator.start=0;
        nodeAllocator.freed=0;
        nodes=new UnsafeList<TreeNode>(4096,Allocator.Persistent);
        nodes.Length=nodes.Capacity;

        graph=new UnsafeList<Vertex>(reserveVertexNumber,Allocator.Persistent);
        edgesAttractions=new UnsafeHashMap<int2,float>(reserveVertexNumber,Allocator.Persistent);
        resultPositions=new UnsafeList<float2>(reserveVertexNumber,Allocator.Persistent);

        jobs=new NativeArray<JobHandle> (MaximumJob,Allocator.Persistent);
        stacks=new UnsafeList<UnsafeList<int>>(MaximumJob,Allocator.Persistent);
        for(int i = 0;i<MaximumJob;i++) {
            stacks.Add(new UnsafeList<int>(16,Allocator.Persistent));
        }

        vertexNumber=0;
        return this;
    }

    [BurstCompile]
    unsafe public void ClearGeometric() {
        for(short i = 0;i<vertexNumber;i++) {
            Vertex*v=i+graph.Ptr;
            v->node=-1;
        }
        if(head>=0) {
            nodeAllocator.freed=0;
            nodeAllocator.start=1;
            UnsafeUtility.MemSet((head+nodes.Ptr)->children,0xFF,16);
        }
    }


    [BurstCompile]
    unsafe public void ClearGraph() {
        edgesAttractions.Clear();
        for(short i = 0;i<vertexNumber;i++) {
            Vertex*v=i+graph.Ptr;
            v->node=-1;
            v->neighbors.Length=0;
        }
        if(head>=0) {
            nodeAllocator.freed=0;
            nodeAllocator.start=1;
            UnsafeUtility.MemSet((head+nodes.Ptr)->children,0xFF,16);
        }
    }


    unsafe public PhysicsGraph LoadGraph(List<int>[] inputGraph,GameObject[] vertices) {
        ClearGraph();
        this.vertices=vertices;
        vertexNumber=inputGraph.Length;
        int minLength=math.min(graph.Length,vertexNumber);

        for(int i = 0;i<minLength;i++) {
            (graph.Ptr+i)->neighbors.Length=inputGraph[i].Count;
        }
        if(vertexNumber>graph.Length) {//increment graph.Length and allocate new unsafe lists
            int i=graph.Length;
            graph.Length=vertexNumber;

            for(;i<vertexNumber;i++) {
                (graph.Ptr+i)->neighbors=new UnsafeList<int>(inputGraph[i].Count,Allocator.Persistent);
                (graph.Ptr+i)->neighbors.Length=inputGraph[i].Count;
            }
        }

        resultPositions.Length=vertexNumber;
        edgesAttractions.Capacity=math.max(vertexNumber,edgesAttractions.Capacity);
        
        for(short i = 0;i<vertexNumber;i++) {
            vertices[i].transform.localScale=new Vector3(vertexRadius*2,vertexRadius*2,0);
            Vertex*v=i+graph.Ptr;
            v->id=i;
            v->node=-1;
            for(int j = 0;j<inputGraph[i].Count;j++) {
                (v->neighbors)[j]=inputGraph[i][j];
            }
        }
        return this;
    }

    public void SetSize(float size) {
        Bound b;
        b.min=-size;
        b.max=size;
        head=GetNode(-1,b,0);
    }

    //[BurstCompile]
    public async void Refresh(int iteration=15) {
        const float THRESHOLD=0.1f;
        int t=iteration;
        float maximumMovedDistance;
        do {
            await System.Threading.Tasks.Task.Delay(100);

            t--;
            float coolingFactor=1f/(iteration-t)*1f;
            unsafe {
                for(int i = 0;i<vertexNumber;i+=32) {
                    int end=Mathf.Min(i+MaximumJob,vertexNumber);
                    for(int j = i;j<end;j++) {
                        int mod=(j%MaximumJob);
                        jobs[mod]=new FindForce() {
                            Stack=stacks.Ptr+(mod),
                            graph=graph.Ptr,
                            vertex=graph.Ptr+j,
                            nodesAddr=nodes.Ptr,
                            resultPosition=resultPositions.Ptr+j,
                            edgesAttraction=this.edgesAttractions,
                            treeHead=head,
                            coolingFactor=coolingFactor,
                        }.Schedule();
                        
                        /*
                        new FindForce(){
                            Stack=stacks.Ptr+mod,
                            graph=graph.Ptr,
                            vertex=graph.Ptr+j,
                            nodesAddr=nodes.Ptr,
                            resultPosition=resultPositions.Ptr+j,
                            edgesAttraction=this.edgesAttractions,
                            treeHead=head,
                            coolingFactor=coolingFactor,
                        }.Execute();
                        */
                        
                    }
                    JobHandle.CompleteAll(jobs);
                }
            }

            maximumMovedDistance=THRESHOLD;
            for(short i = 0;i<vertexNumber;i++) {
                float ret=UpdateVertex(resultPositions[i],i);
                maximumMovedDistance=ret>0?math.max(maximumMovedDistance,ret):maximumMovedDistance;
            }
            Debug.Log($"max:{maximumMovedDistance} with colling factor {coolingFactor}");
        }while(t>=0&&maximumMovedDistance>THRESHOLD);
    }

    [BurstCompile]
    unsafe private struct FindForce:IJob{
        [NativeDisableUnsafePtrRestriction]public UnsafeList<int>*Stack;
        [NativeDisableUnsafePtrRestriction][ReadOnly]public Vertex* vertex,graph;
        [NativeDisableUnsafePtrRestriction][ReadOnly]public TreeNode* nodesAddr;
        [NativeDisableUnsafePtrRestriction][WriteOnly]public float2* resultPosition;
        [ReadOnly]public UnsafeHashMap<int2,float> edgesAttraction;

        public int treeHead;
        public float coolingFactor;

        private float2 center;
        private UnsafeList<int> stack;
        public void Execute() {
            stack=*Stack;
            center=vertex->position;
            float2 force=((vertex->repulse*Repulsion())+Attraction())/vertex->mass;
            
            float2 finalPosition=center+coolingFactor*force;
            Bound b = nodesAddr[treeHead].bound;
            finalPosition=b.Clamp(finalPosition);
            *resultPosition=finalPosition;

            *Stack=stack;
            //Check();
        }

        [BurstDiscard]
        private void Check(){
            if(float.IsNaN(resultPosition->x)){
                Debug.Log($"WTF with {vertex->repulse*Repulsion()} {Attraction()}");
            }
        }

        //Find Total Repulsion force
        public float2 Repulsion() {
            float sqrRadius=vertex->effectRadius*vertex->effectRadius;
            float2 force=0;

            stack.Add(treeHead);
            while(stack.Length>0) {
                int node = stack[stack.Length-1];
                stack.Length--;
                if((node+nodesAddr)->isLeaf==false) {
                    for(int i = 0;i<4;i++) {
                        if((node+nodesAddr)->children[i]<0) {//no child at this direction
                            continue;
                        }
                        TreeNode*child=(node+nodesAddr)->children[i]+nodesAddr;
                        if(OverlapCircle(child->bound,sqrRadius)) {
                            stack.Add((int)(child-nodesAddr));
                        }
                    }
                }
                
                TreeNode*n=node+nodesAddr;
                for(int i = n->vertexCount-1;i>=0;i--) {
                    if(n->vertices[i]==vertex->id) {
                        continue;
                    }
                    float2 forceVector=center-(n->vertices[i]+graph)->position;
                    float sqrDist=forceVector.x*forceVector.x+forceVector.y*forceVector.y;
                    if(sqrDist>sqrRadius) {
                        continue;
                    }
                    //normalize the vector
                    forceVector.x=forceVector.x/Unity.Mathematics.math.sqrt(sqrDist);
                    forceVector.y=forceVector.y/Unity.Mathematics.math.sqrt(sqrDist);

                    force+=((n->vertices[i]+graph)->repulse/sqrDist)*(forceVector);
                }
            }

            return force;
        }

        public float2 Attraction() {
            int idx=(int)(vertex-graph);
            float2 force=0;
            int*i=vertex->neighbors.Ptr;
            int*end=i+vertex->neighbors.Length;

            for(;i<end;i++) {
                int neighbor=*i;
                //Debug.Log($"neighbor is {neighbor}");
                if((neighbor+graph)->node<0) {
                    continue;
                }

                float forceFactor;
                if(edgesAttraction.TryGetValue(new int2(idx,neighbor),out forceFactor)==false) {}
                else if(edgesAttraction.TryGetValue(new int2(neighbor,idx),out forceFactor)==false) {}
                else{
                    forceFactor=1;
                }
                float2 forceVector=(neighbor+graph)->position-center;
                float sqrDist=forceVector.x*forceVector.x+forceVector.y*forceVector.y;
                float dist=Unity.Mathematics.math.sqrt(sqrDist);
                forceVector.x=forceVector.x/dist;
                forceVector.y=forceVector.y/dist;
                force+=(forceFactor/dist)*forceVector;
            }
            return force;
        }

        private bool OverlapCircle(Bound b,float sqrRadius) {
            float2 project=center;
            if(project.x>b.min.x){
                project.x=b.min.x;
            }
            else if(project.x<b.min.x){
                project.x=b.min.x;
            }
            if(project.y>b.max.y){
                project.y=b.max.y;
            }
            else if(project.y<b.max.y){
                project.y=b.max.y;
            }
            float2 delta=center-project;
            return delta.x*delta.x+delta.y*delta.y<=sqrRadius;
        }
    }
    

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void SetAttraction(int2 pair,float value) {
        edgesAttractions[pair]=value;
    }
    
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    unsafe public Vertex* GetVertex(int id) {
        return graph.Ptr+id;
    }


    unsafe public void SetVertex(float2 position,int id) {
        Vertex*v=graph.Ptr+id;
        if(v->node>=0) {
            Debug.LogWarning($"Cant set vertex {id} again");
            return;
        }
        
        Bound b=nodes[head].bound;
        if(b.IsOutside(position)) {
            Debug.LogWarning($"point at position {position} exists tree bound");
            position=b.Clamp(position);
        }
        v->position=position;
        vertices[id].transform.position=(Vector2)position;
        Insert(this.head,v);
    }


    //TODO: parent field of parent sometimes point to child, fix it
    [BurstCompile]
    unsafe private void Insert(int parent,Vertex*vertex) {
        float2 position=vertex->position;
        TreeNode*current=nodes.Ptr+parent;
        int child;

        while(true) {
            if(current->vertexCount<TreeNode.Capacity) {//meet a treenode that can store this vertex while traversal
                current->vertices[current->vertexCount]=vertex->id;
                vertex->node=(int)(current-nodes.Ptr);
                vertex->positionInNode=current->vertexCount;
                current->vertexCount++;
                goto _Return_;
            }

            byte dir=(current->bound).GetDirection(position);
            if((child=current->children[dir])<0) {//no child, insert a child node in this direction to store the vertex
                current->isLeaf=false;//not leaf node
                parent=(int)(current-nodes.Ptr);

                child = GetNode(parent,current->bound[dir],dir);
                (nodes.Ptr+parent)->children[dir]=child;//attach the child to parent
                (nodes.Ptr+child)->vertexCount=1;
                (nodes.Ptr+child)->vertices[0]=vertex->id;//add the point to child node
                vertex->node=child;//reference back to the node
                vertex->positionInNode=0;//stored the index of points
                goto _Return_;
            }
            current=(nodes.Ptr+child);
        }
        _Return_:;
        return;
    }


    //return the distance moved, if the vertex is stored in tree
    #pragma warning disable UNT0006
    unsafe public float UpdateVertex(float2 newPosition,short id) {
        Vertex* v=id+graph.Ptr;
        if(v->node<0) {//not stored in tree, return
            return -1;
        }
        TreeNode*node=v->node+nodes.Ptr;
        float moved=((Vector2)(newPosition-v->position)).magnitude;
        v->position=newPosition;
        vertices[id].transform.position=(Vector2)newPosition;
        if((node->bound).IsOutside(v->position)==false) {//still in the same node, return
            return moved;
        }
        int parent=Remove(node,v);

        if(parent>=0) {
            //int iteration=1000;
            do{
                node=parent+nodes.Ptr;
                if((node->bound).IsOutside(v->position)==false) {
                    Insert(parent,v);
                    break;
                }
                parent=node->parent;
            //}while(parent>=0&&--iteration>0);
            }while(parent>=0);
            //if(iteration<=0) {Debug.LogError("Dead loop");}
        }
        else {//return the root node,the parent of root node is -1
            Insert(head,v);
        }
        return moved;
    }
    #pragma warning restore UNT0006

    unsafe public void RemoveVertex(short id) {
        Vertex* v=id+graph.Ptr;
        TreeNode*node=v->node+nodes.Ptr;
        Remove(node,v);
        v->node=-1;
    }

    //remove the specific vertex from tree, and return the parent's index, only remove the vertex if it is leaf and count<=0
    [BurstCompile]
    unsafe private int Remove(TreeNode*node,Vertex*v) {
        node->vertexCount--;
        (node->vertices[node->vertexCount]+graph.Ptr)->positionInNode=v->positionInNode;//set tht positionInNode of last vertex
        node->vertices[v->positionInNode]=node->vertices[node->vertexCount];//remove as swap back

        int parent=node->parent;
        while(node->isLeaf){
            if(parent>=0&&node->vertexCount<=0) {
                (parent+nodes.Ptr)->children[node->direction]=-1;//null the pointer to that node in parent's children[]
                ReleaseNode(node);
            }
            else{//root node or vertexs are stored
                goto _Return_;
            }
            
            node=parent+nodes.Ptr;//go to parent node, check if it be the leaf node now
            
            for(int i = 0;i<4;i++) {//check the remaining point in children of parent node
                if(node->children[i]>=0) {//one of the children is not null, parent is not leaf node
                    goto _Return_;
                }
            }
            node->isLeaf=true;//parent is leaf node, continue loop
            parent=node->parent;//get the parent of current node
        }

        _Return_:;
        return parent;
    }

    [BurstCompile]
    unsafe public Vertex* GetVertex(Vector2 _position) {
        TreeNode* node=head+nodes.Ptr;
        float sqrRadius=vertexRadius*vertexRadius;
        while(true){
            for(int i = node->vertexCount-1;i>=0;i--) {
                Vertex* v = node->vertices[i]+graph.Ptr;
                if(((Vector2)v->position-_position).sqrMagnitude<=sqrRadius) {
                    return v;
                }
            }
            
            node=node->children[node->bound.GetDirection(_position)]+nodes.Ptr;
            if(node<nodes.Ptr) {//children is -1 so address is smaller then nodes.Ptr
                break;
            }
        }
        return null;
    }


    [BurstCompile]
    unsafe private int GetNode(int p,Bound b,byte dir) {
        TreeNode* ret;
        if(nodeAllocator.freed>0) {
            ret=nodes.Ptr+nodeAllocator.next;
            nodeAllocator.next=ret->parent;
            nodeAllocator.freed--;
        }
        else {
            if(nodeAllocator.start>=nodes.Capacity) {
                nodes.Capacity*=2;
                nodes.Length=nodes.Capacity;
            }
            ret=nodes.Ptr+nodeAllocator.start;
            nodeAllocator.start++;
        }
        ret->parent=p;
        ret->vertexCount=0;
        ret->bound=b;
        ret->direction=dir;
        ret->isLeaf=true;
        UnsafeUtility.MemSet(ret->children,0xFF,16);
        return (int)(ret-nodes.Ptr);
    }


    [BurstCompile]
    unsafe private void ReleaseNode(TreeNode*n) {
        nodeAllocator.freed++;
        n->parent=nodeAllocator.next;
        nodeAllocator.next=(int)(n-nodes.Ptr);
    }

    [BurstCompile]
    unsafe private void ReleaseNode(int n) {
        nodeAllocator.freed++;
        (nodes.Ptr+n)->parent=nodeAllocator.next;
        nodeAllocator.next=n;
    }
}
