using System.Collections;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using UnityEngine;

public class VertexPool : MonoBehaviour{
    private static VertexPool _instance;
    public static VertexPool instance{
        [MethodImpl(MethodImplOptions.AggressiveInlining)]get{
            return _instance;
        }
    }

    [SerializeField]private GameObject vertexPrefab;
    private Stack<GameObject> pool;
    
    //order in script execution order is earlier than other script
    void Awake(){
        _instance=this;

        const int size=300;
        pool=new Stack<GameObject>(size);
        
        for(int i=0;i<size;i++){
            GameObject newV=Instantiate(vertexPrefab,transform);
            newV.SetActive(false);
            pool.Push(newV);
        }
    }

    public GameObject Get(){
        if(pool.Count==0){
            return Instantiate(vertexPrefab);
        }
        else{
            GameObject v=pool.Pop();
            v.SetActive(true);
            return v;
        }
    }

    public void Release(GameObject v){
        v.SetActive(false);
        pool.Push(v);
    }
}