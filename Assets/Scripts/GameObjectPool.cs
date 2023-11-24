using System.Collections;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using UnityEngine;

public class GameObjectPool : MonoBehaviour{
    [SerializeField]private GameObject Prefab;
    private Stack<GameObject> pool;
    
    //order in script execution order is earlier than other script
    void Awake(){
        const int size=300;
        pool=new Stack<GameObject>(size);
        
        for(int i=0;i<size;i++){
            GameObject obj=Instantiate(Prefab,transform);
            obj.SetActive(false);
            pool.Push(obj);
        }
    }

    public GameObject Get(){
        if(pool.Count==0){
            return Instantiate(Prefab,transform);
        }
        else{
            GameObject obj=pool.Pop();
            obj.SetActive(true);
            return obj;
        }
    }

    public void Release(GameObject obj){
        obj.SetActive(false);
        pool.Push(obj);
    }
}