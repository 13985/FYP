using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

public class Testtttt : MonoBehaviour{
    public GameObject[] others;

    void OnDrawGizmos(){
        Handles.color=Color.red;
        Handles.zTest=UnityEngine.Rendering.CompareFunction.Less;
        Vector3 pos1=transform.position;
        pos1.z=1;
        for(int i=0;i<others.Length;i++){
            Vector3 pos2=others[i].transform.position;
            pos2.z=1;
            Handles.DrawLine(pos1,pos2);
        }
    }

}
