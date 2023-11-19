using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class VertexPool : MonoBehaviour{
    public Transform folder;

    private GameObject vertex;
    private Stack<GameObject> pool;

    public void CreatePool(in int size,GameObject v){
        vertex=v;
        pool=new Stack<GameObject>(size);
        
        v.SetActive(false);
        pool.Push(v);
        for(int i=1;i<size;i++){
            GameObject newV=Instantiate(v,folder);
            newV.SetActive(false);
            pool.Push(newV);
        }
    }

    public GameObject GetGO(){
        if(pool.Count==0){
            return Instantiate(vertex);
        }
        else{
            GameObject v=pool.Pop();
            v.SetActive(true);
            return v;
        }
    }

    public void ReturnGO(GameObject v){
        v.SetActive(false);
        pool.Push(v);
    }
}